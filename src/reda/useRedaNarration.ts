/**
 * Reda speaks game moments out loud using the backend voice API:
 *
 *   run-started          → POST /api/voice/narration { event: 'welcome' }
 *   leg-start (target)   → POST /api/voice/narration { event: 'leg-start', stopId }
 *   midpoint             → POST /api/voice/narration { event: 'midpoint', stopId }
 *   destination-reached  → POST /api/voice/narration { event: 'arrival', stopId }
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
import { onGameEvent, type Emotion, type GameEvent } from './redaEvents'
import type { RedaControls } from './useRedaState'

// The backend's stops.json and place-info.json use the game's own stop ids (capen, lockwood, …),
// so ids are sent exactly as the game has them.

/** Drop clips that were ready too late to still make sense. */
const STALE_MS = 40_000

interface QueueItem {
  clip: Promise<Clip | null>
  emotion: Emotion
  at: number
  /** Settles the promise returned to whoever emitted the event. */
  done: () => void
}

/** Which clip (if any) a game event should produce. */
function clipFor(e: GameEvent): { clip: Promise<Clip | null>; emotion: Emotion } | null {
  const id = e.id
  switch (e.type) {
    case 'run-started':
      return { clip: fetchNarration('welcome'), emotion: 'happy' }
    case 'leg-start':
      return id ? { clip: fetchNarration('leg-start', id), emotion: 'excited' } : null
    case 'midpoint':
      return id ? { clip: fetchNarration('midpoint', id), emotion: 'encouraging' } : null
    case 'destination-reached':
      return id ? { clip: fetchNarration('arrival', id), emotion: 'celebrating' } : null
    // Back on the map after a stop: tell the player about the place they just explored.
    case 'creature-unlocked':
    case 'challenge-failed':
    case 'mission-complete':
      return id ? { clip: fetchPlaceInfo('tell me about this place', id), emotion: 'happy' } : null
    default:
      return null
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
      // Skip if it's too old, or the player is talking to Reda right now.
      if (Date.now() - item.at > STALE_MS || r.interactionRef.current !== 'idle') {
        URL.revokeObjectURL(clip.url)
        return
      }
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
      const next = clipFor(e)
      if (!next) return
      return new Promise<void>((done) => {
        if (e.type === 'destination-reached') {
          // The arrival line matters most: drop what's waiting and cut what's playing.
          queue.splice(0).forEach((old) => old.done())
          stopVoice()
        }
        queue.push({ ...next, at: Date.now(), done })
        void run()
      })
    })
    return () => {
      cancelled = true
      off()
      queue.splice(0).forEach((item) => item.done())
    }
  }, [enabled])
}
