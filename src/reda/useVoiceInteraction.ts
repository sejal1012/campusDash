/**
 * Press-and-hold voice for Reda, on top of the backend's existing AI pipeline:
 * GET /api/voice/guide/token → live ElevenLabs agent session (speech-to-text + AI + voice).
 *
 * The session is opened on the first hold and kept warm for a minute. The mic is only
 * unmuted while Reda is held, so holding = recording, releasing = submitting the question.
 * Nothing here invents answers: every reply comes from the agent.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Conversation } from '@elevenlabs/client'
import { fetchGuideToken, isVoiceMuted, setVoiceMuted, stopVoice } from '../api'
import type { RedaControls } from './useRedaState'

type Session = Awaited<ReturnType<typeof Conversation.startSession>>

export type BubbleKind = 'listening' | 'thinking' | 'answer' | 'error' | 'hint'
export interface Bubble {
  kind: BubbleKind
  text: string
  /** What the player said (speech-to-text), shown above the answer. */
  heard?: string
}

/** Shorter holds count as a tap, not a question. */
const TAP_MS = 350
/** Keep the mic open a moment after release so the last word isn't cut off. */
const MIC_TAIL_MS = 300
/** Give up waiting for an answer after this. */
const THINK_TIMEOUT_MS = 15_000
/** Close the live session after this long without talking. */
const SESSION_IDLE_MS = 3 * 60_000
/** The guide may check in on its own ("are you still there, Bull?") at most this often. Others stay silent. */
const CHECKIN_GAP_MS = 60_000
const ERROR_SHOW_MS = 3_400
const ANSWER_LINGER_MS = 5_000
/** Peak mic level below this means the hold was silent. */
const SILENCE_LEVEL = 0.03

/**
 * Who the live agent is, sent as context when each conversation opens.
 * Context only (no agent overrides), so it works whatever the agent's security settings are.
 */
export const REDA_PERSONA =
  "Your name is Reda. You are a friendly, playful floating robotic buffalo, the player's companion in Campus Dash, a game exploring UB's North Campus. " +
  "In your first reply of this conversation, introduce yourself as Reda in a few words before answering. Always call yourself Reda. Keep answers short and upbeat, because they are spoken aloud."

const ERRORS = {
  mic: 'I need your microphone to hear you. Allow it in your browser settings, then hold me again.',
  offline: "I can't reach my voice right now. Try again in a moment.",
  connect: "I couldn't connect. Try again in a moment.",
  waking: 'I was still waking up! Hold me and ask again.',
  empty: "I didn't hear anything. Hold me while you talk.",
  noAnswer: 'Hmm, I lost my train of thought. Try asking again.',
  lost: 'Our connection dropped. Hold me to try again.',
} as const
type ErrorKind = keyof typeof ERRORS

interface Options {
  /** Current target, sent to the agent as context (never GPS positions). */
  targetName: string | null
  /** Element that receives the live `--level` CSS variable (0..1) for the sound waves. */
  levelElRef: RefObject<HTMLElement | null>
}

export function useVoiceInteraction(reda: RedaControls, { targetName, levelElRef }: Options) {
  const [bubble, setBubble] = useState<Bubble | null>(null)

  const session = useRef<Session | null>(null)
  const connecting = useRef<Promise<Session | null> | null>(null)
  const holding = useRef(false)
  const pressAt = useRef(0)
  const peak = useRef(0)
  const levelWorks = useRef(false) // some browsers report 0 always; only trust silence if we've seen sound
  const heard = useRef('')
  const answer = useRef('')
  /** True only between releasing Reda (a question was asked) and the end of the answer. */
  const wantsAnswer = useRef(false)
  /** The guide is speaking on its own (a check-in), not answering. */
  const checkingIn = useRef(false)
  const lastCheckIn = useRef(0)
  const audioClaimed = useRef<boolean | null>(null) // previous narrator mute setting while Reda owns the audio
  const raf = useRef(0)
  const timers = useRef<Record<string, number>>({})
  const targetRef = useRef(targetName)
  const redaRef = useRef(reda)
  useEffect(() => {
    redaRef.current = reda
  }, [reda])

  // ---------- small helpers ----------

  const setTimer = (name: string, ms: number, fn: () => void) => {
    window.clearTimeout(timers.current[name])
    timers.current[name] = window.setTimeout(fn, ms)
  }
  const clearTimer = (name: string) => window.clearTimeout(timers.current[name])

  /** Only one voice at a time: silence the narrator while Reda listens or talks. */
  const claimAudio = () => {
    stopVoice()
    if (audioClaimed.current === null) {
      audioClaimed.current = isVoiceMuted()
      setVoiceMuted(true)
    }
  }
  const releaseAudio = () => {
    if (audioClaimed.current !== null) {
      setVoiceMuted(audioClaimed.current)
      audioClaimed.current = null
    }
  }

  const stopLevels = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    levelElRef.current?.style.setProperty('--level', '0')
  }, [levelElRef])

  /** Streams mic (listening) or voice (speaking) volume into --level. */
  const startLevels = useCallback(
    (source: 'input' | 'output') => {
      cancelAnimationFrame(raf.current)
      let smooth = 0
      const tick = () => {
        const s = session.current
        let v = 0
        try {
          v = s ? (source === 'input' ? s.getInputVolume() : s.getOutputVolume()) : 0
        } catch {
          v = 0
        }
        if (!Number.isFinite(v)) v = 0
        if (source === 'input' && holding.current) {
          if (v > 0) levelWorks.current = true
          peak.current = Math.max(peak.current, v)
        }
        smooth = smooth * 0.7 + Math.min(1, v * 2.2) * 0.3
        levelElRef.current?.style.setProperty('--level', smooth.toFixed(3))
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    },
    [levelElRef],
  )

  const endSession = useCallback(async () => {
    const s = session.current
    session.current = null
    if (s) {
      try {
        await s.endSession()
      } catch {
        /* already closed */
      }
    }
  }, [])

  /** The guide is only audible when it's answering a question the player just asked. */
  const setGuideAudible = (on: boolean) => {
    try {
      session.current?.setVolume({ volume: on ? 1 : 0 })
    } catch {
      /* session closing */
    }
  }

  const scheduleSessionClose = () => setTimer('session', SESSION_IDLE_MS, () => void endSession())

  const fail = useCallback(
    (kind: ErrorKind) => {
      const r = redaRef.current
      holding.current = false
      wantsAnswer.current = false
      setGuideAudible(false)
      clearTimer('think')
      try {
        session.current?.setMicMuted(true)
      } catch {
        /* ignore */
      }
      stopLevels()
      r.transition('error')
      r.react([{ emotion: 'confused', ms: 1400 }, { emotion: 'sad', ms: 900 }, { emotion: 'encouraging', ms: 1100 }], 3)
      setBubble({ kind: 'error', text: ERRORS[kind] })
      setTimer('error', ERROR_SHOW_MS, () => {
        if (redaRef.current.transition('idle')) setBubble(null)
        releaseAudio()
        scheduleSessionClose()
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopLevels],
  )

  // ---------- agent callbacks ----------

  const onAgentSpeaking = () => {
    const r = redaRef.current
    if (holding.current) {
      setGuideAudible(false)
      return
    }
    // Unprompted check-in ("are you still there?"): let one through per CHECKIN_GAP_MS.
    if (!wantsAnswer.current) {
      const now = Date.now()
      if (r.interactionRef.current !== 'idle' || now - lastCheckIn.current < CHECKIN_GAP_MS) {
        setGuideAudible(false)
        return
      }
      lastCheckIn.current = now
      checkingIn.current = true
      setGuideAudible(true)
    }
    clearTimer('think')
    clearTimer('linger')
    if (r.transition('speaking') || r.interactionRef.current === 'speaking') {
      claimAudio()
      r.react([{ emotion: 'happy', ms: 60_000 }], 3) // settles when speech ends
      setBubble({ kind: 'answer', text: answer.current || '…', heard: heard.current || undefined })
      startLevels('output')
    }
  }

  const onAgentListening = () => {
    const r = redaRef.current
    if (r.interactionRef.current !== 'speaking') return
    const wasCheckIn = checkingIn.current
    checkingIn.current = false
    wantsAnswer.current = false
    setGuideAudible(false)
    stopLevels()
    r.transition('idle')
    r.settle()
    if (!wasCheckIn) r.trigger('answered') // wink → happy after helping
    releaseAudio()
    setTimer('linger', ANSWER_LINGER_MS, () => setBubble((b) => (b?.kind === 'answer' ? null : b)))
    scheduleSessionClose()
  }

  const ensureSession = (): Promise<Session | null> => {
    if (session.current) return Promise.resolve(session.current)
    if (connecting.current) return connecting.current
    connecting.current = (async () => {
      try {
        try {
          const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
          probe.getTracks().forEach((t) => t.stop())
        } catch {
          fail('mic')
          return null
        }
        const token = await fetchGuideToken()
        if (!token?.conversationToken && !token?.signedUrl) {
          fail('offline')
          return null
        }
        const callbacks = {
          onMessage: ({ message, role }: { message: string; role: string }) => {
            const text = message?.trim() ?? ''
            if (!text) return
            if (role === 'user') {
              heard.current = text
              setBubble((b) => (b && (b.kind === 'thinking' || b.kind === 'answer') ? { ...b, heard: text } : b))
            } else {
              answer.current = text
              if (redaRef.current.interactionRef.current === 'speaking') {
                setBubble({ kind: 'answer', text, heard: heard.current || undefined })
              }
            }
          },
          onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => (mode === 'speaking' ? onAgentSpeaking() : onAgentListening()),
          onDisconnect: (details: { reason: string }) => {
            session.current = null
            stopLevels()
            if (details.reason !== 'user' && redaRef.current.interactionRef.current !== 'idle') fail('lost')
          },
          onError: (message: string) => {
            console.warn('Reda voice error', message)
            if (redaRef.current.interactionRef.current !== 'idle') fail('connect')
          },
        }
        const s = token.signedUrl
          ? await Conversation.startSession({ signedUrl: token.signedUrl, connectionType: 'websocket', ...callbacks })
          : await Conversation.startSession({ conversationToken: token.conversationToken!, connectionType: 'webrtc', ...callbacks })
        s.setMicMuted(!holding.current)
        s.setVolume({ volume: wantsAnswer.current ? 1 : 0 })
        session.current = s
        s.sendContextualUpdate(REDA_PERSONA)
        if (targetRef.current) s.sendContextualUpdate(`The player is walking to ${targetRef.current}.`)
        if (holding.current) startLevels('input')
        return s
      } catch (err) {
        console.warn('Reda could not start a voice session', err)
        fail('connect')
        return null
      } finally {
        connecting.current = null
      }
    })()
    return connecting.current
  }

  // ---------- press and hold ----------

  const pressStart = () => {
    const r = redaRef.current
    if (holding.current) return
    if (r.interactionRef.current === 'thinking') return // one question at a time
    holding.current = true
    pressAt.current = performance.now()
    peak.current = 0
    heard.current = ''
    answer.current = ''
    ;['think', 'error', 'linger', 'hint', 'session'].forEach(clearTimer)
    r.markActivity()

    // A new question (or interrupting an answer): mute the guide until this one is asked.
    wantsAnswer.current = false
    checkingIn.current = false
    setGuideAudible(false)
    if (!r.transition('listening')) {
      holding.current = false
      return
    }
    claimAudio()
    r.settle()
    setBubble({ kind: 'listening', text: 'Listening…' })

    const s = session.current
    if (s) {
      s.setMicMuted(false)
      startLevels('input')
    } else {
      // Don't open a session (or ask for the mic) for a quick tap.
      setTimer('connect', TAP_MS * 0.6, () => {
        if (holding.current) void ensureSession()
      })
    }
  }

  const pressEnd = () => {
    const r = redaRef.current
    if (!holding.current) return
    holding.current = false
    clearTimer('connect')
    const held = performance.now() - pressAt.current

    if (held < TAP_MS) {
      session.current?.setMicMuted(true)
      stopLevels()
      r.transition('idle')
      releaseAudio()
      r.trigger('player-interacted')
      setBubble(null)
      if (session.current) scheduleSessionClose()
      return
    }

    const s = session.current
    if (!s) {
      fail(connecting.current ? 'waking' : 'connect')
      return
    }
    if (levelWorks.current && peak.current < SILENCE_LEVEL) {
      s.setMicMuted(true)
      fail('empty')
      return
    }

    setTimer('micTail', MIC_TAIL_MS, () => {
      if (!holding.current) session.current?.setMicMuted(true)
    })
    stopLevels()
    wantsAnswer.current = true
    lastCheckIn.current = Date.now() // a question counts as contact: no check-in right after
    setGuideAudible(true)
    r.transition('thinking')
    r.trigger('question-asked')
    setBubble({ kind: 'thinking', text: 'Thinking…' })
    setTimer('think', THINK_TIMEOUT_MS, () => fail(heard.current ? 'noAnswer' : 'empty'))
  }

  /** Pointer cancelled (scroll, system gesture, permission prompt): drop the recording. */
  const pressCancel = () => {
    const r = redaRef.current
    if (!holding.current) return
    holding.current = false
    clearTimer('connect')
    session.current?.setMicMuted(true)
    stopLevels()
    r.transition('idle')
    setBubble(null)
    releaseAudio()
    if (session.current) scheduleSessionClose()
  }

  const dismissBubble = () => {
    if (redaRef.current.interactionRef.current === 'idle') setBubble(null)
  }

  // Keep the agent up to date on where the player is heading.
  useEffect(() => {
    targetRef.current = targetName
    if (targetName) session.current?.sendContextualUpdate(`The player is now walking to ${targetName}.`)
  }, [targetName])

  // Cleanup: close the session, stop timers and give the narrator its audio back.
  useEffect(() => {
    const t = timers.current
    return () => {
      Object.values(t).forEach((id) => window.clearTimeout(id))
      cancelAnimationFrame(raf.current)
      void endSession()
      if (audioClaimed.current !== null) setVoiceMuted(audioClaimed.current)
      audioClaimed.current = null
    }
  }, [endSession])

  return { bubble, pressStart, pressEnd, pressCancel, dismissBubble }
}
