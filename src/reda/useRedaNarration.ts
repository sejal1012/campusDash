/**
 * Reda speaks game moments out loud using the backend voice API:
 *
 *   run-started          → POST /api/voice/narration { event: 'welcome' }
 *   leg-start (target)   → POST /api/voice/narration { event: 'leg-start', stopId }
 *   midpoint             → POST /api/voice/narration { event: 'midpoint', stopId }
 *   destination-reached  → POST /api/voice/narration { event: 'arrival', stopId }
 *                          then POST /api/voice/place-info { text: 'orient me', stopId } (the full script)
 *   back on the map after a stop → POST /api/voice/place-info { text, stopId }
 *
 * Clips are fetched as soon as the event fires (so they're ready sooner) and played
 * one at a time, in order. Reda shows SPEAKING while a clip plays. Anything that
 * fails (404, offline, voice off) is skipped silently.
 *
 * Each event's listener returns a promise that settles when its clip has finished (or
 * was skipped), so the game can wait for a line — e.g. the arrival line before the quiz.
 * The arrival line jumps the queue: older lines still waiting are dropped and the one
 * playing is cut short, so the player isn't kept waiting at the building.
 */
import { useEffect, useRef } from 'react'
import { fetchNarration, fetchPlaceInfo, getVoiceStatus, playClip, stopVoice, type Clip } from '../api'
import { logSpeech, onGameEvent, talkedWithin, type Emotion, type GameEvent } from './redaEvents'
import type { RedaControls } from './useRedaState'

// The backend's stops.json and place-info.json use the game's own stop ids (capen, lockwood, …),
// so ids are sent exactly as the game has them.

/** Drop clips that were ready too late to still make sense. */
const STALE_MS = 40_000
/** After a live conversation, narration stays quiet this long so the two never run together. */
const QUIET_AFTER_TALK_MS = 8_000

interface QueueItem {
  clip: Promise<Clip | null>
  emotion: Emotion
  at: number
  /** For the dev log. */
  label: string
  /** Must be heard (the arrival lines before the quiz): ignores the quiet-after-talk window. */
  mustPlay: boolean
  /** Settles the promise returned to whoever emitted the event. */
  done: () => void
}

type Line = { clip: Promise<Clip | null>; emotion: Emotion }

/** Which clips (in order) a game event should produce. All are requested at once. */
function clipsFor(e: GameEvent): Line[] {
  const id = e.id
  switch (e.type) {
    case 'run-started':
      return [{ clip: fetchNarration('welcome'), emotion: 'happy' }]
    case 'leg-start':
      return id ? [{ clip: fetchNarration('leg-start', id), emotion: 'excited' }] : []
    case 'midpoint':
      return id ? [{ clip: fetchNarration('midpoint', id), emotion: 'encouraging' }] : []
    // The short "unlocked!" line, then the full orientation script for the building.
    case 'destination-reached':
      return id
        ? [
            { clip: fetchNarration('arrival', id), emotion: 'celebrating' },
            { clip: fetchPlaceInfo('orient me', id), emotion: 'happy' },
          ]
        : []
    // Back on the map after a stop: tell the player about the place they just explored.
    case 'creature-unlocked':
    case 'challenge-failed':
    case 'mission-complete':
      return id ? [{ clip: fetchPlaceInfo('tell me about this place', id), emotion: 'happy' }] : []
    default:
      return []
  }
}

export function useRedaNarration(reda: RedaControls, enabled = true) {
  const redaRef = useRef(reda)
  useEffect(() => {
    redaRef.current = reda
  }, [reda])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let voiceOn = true
    void getVoiceStatus().then((s) => {
      voiceOn = s.narration
    })
    const queue: QueueItem[] = []
    let running = false

    const playItem = async (item: QueueItem) => {
      const clip = await item.clip
      const r = redaRef.current
      if (cancelled || !clip) return
      // Skip if it's too old, or the player is (or just was) talking with Reda: a scripted
      // line right before or after a live answer sounds like Reda answering from a script.
      // The arrival line is exempt: the player has to hear it before the quiz.
      if (Date.now() - item.at > STALE_MS || r.interactionRef.current !== 'idle' || (!item.mustPlay && talkedWithin(QUIET_AFTER_TALK_MS))) {
        logSpeech(`narration ${item.label} (skipped)`, clip.caption)
        URL.revokeObjectURL(clip.url)
        return
      }
      logSpeech(`narration ${item.label}`, clip.caption)
      r.transition('speaking')
      r.react([{ emotion: item.emotion, ms: 60_000 }], 3)
      await playClip(clip)
      // Only hand back to idle if the player didn't take over (press-and-hold) meanwhile.
      if (redaRef.current.interactionRef.current === 'speaking') {
        redaRef.current.transition('idle')
        redaRef.current.settle()
      }
    }

    const run = async () => {
      if (running) return
      running = true
      while (queue.length && !cancelled) {
        const item = queue.shift()!
        try {
          await playItem(item)
        } finally {
          item.done()
        }
      }
      running = false
    }

    const off = onGameEvent((e) => {
      if (!voiceOn) return
      const lines = clipsFor(e)
      if (lines.length === 0) return
      const mustPlay = e.type === 'destination-reached'
      if (mustPlay) {
        // The arrival lines matter most: drop what's waiting and cut what's playing.
        queue.splice(0).forEach((old) => old.done())
        stopVoice()
      }
      const at = Date.now()
      const finished = lines.map(
        (line, i) =>
          new Promise<void>((done) => {
            queue.push({ ...line, at, label: lines.length > 1 ? `${e.type} ${i + 1}/${lines.length}` : e.type, mustPlay, done })
          }),
      )
      void run()
      return Promise.all(finished).then(() => undefined)
    })
    return () => {
      cancelled = true
      off()
      queue.splice(0).forEach((item) => item.done())
    }
  }, [enabled])
}
