/**
 * Central game-event bus and event → emotion mapping for Reda.
 *
 * The game only *emits* events (emitGameEvent / reportDistanceToTarget).
 * Reda subscribes and decides how to feel. No UI component hardcodes a reaction.
 */
import { CONFIG } from '../config'

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'wink'
  | 'curious'
  | 'surprised'
  | 'sad'
  | 'celebrating'
  | 'sleepy'
  | 'encouraging'
  | 'confused'

export type GameEventType =
  | 'run-started'
  | 'leg-start'
  | 'midpoint'
  | 'building-discovered'
  | 'destination-reached'
  | 'mission-complete'
  | 'creature-unlocked'
  | 'challenge-failed'
  | 'hint-followed'
  | 'moved-closer'
  | 'wrong-direction'
  | 'question-asked'
  | 'answered'
  | 'player-interacted'

export interface GameEvent {
  type: GameEventType
  /** Stop / creature id the event is about, if any. */
  id?: string
}

/** One step of a reaction: show `emotion` for `ms`. The last step settles back to neutral. */
export interface EmotionStep {
  emotion: Emotion
  ms: number
}

interface ReactionRule {
  /** A random variant is picked each time so reactions don't feel canned. */
  variants: EmotionStep[][]
  /** Higher priority reactions can interrupt lower ones, not the other way round. */
  priority: number
  /** The same event is ignored if it fires again within this window. */
  cooldownMs: number
}

/** Gameplay event → Reda's reaction. Edit this table to tune Reda's personality. */
export const REACTIONS: Record<GameEventType, ReactionRule> = {
  'run-started': { priority: 2, cooldownMs: 5_000, variants: [[{ emotion: 'happy', ms: 2600 }], [{ emotion: 'wink', ms: 700 }, { emotion: 'happy', ms: 2000 }]] },
  'leg-start': { priority: 2, cooldownMs: 3_000, variants: [[{ emotion: 'excited', ms: 1800 }], [{ emotion: 'curious', ms: 700 }, { emotion: 'happy', ms: 1400 }]] },
  midpoint: { priority: 2, cooldownMs: 10_000, variants: [[{ emotion: 'encouraging', ms: 2200 }], [{ emotion: 'excited', ms: 1600 }]] },
  'building-discovered': { priority: 3, cooldownMs: 8_000, variants: [[{ emotion: 'excited', ms: 2800 }], [{ emotion: 'surprised', ms: 600 }, { emotion: 'excited', ms: 2400 }]] },
  'destination-reached': { priority: 4, cooldownMs: 5_000, variants: [[{ emotion: 'celebrating', ms: 3200 }]] },
  'mission-complete': { priority: 5, cooldownMs: 5_000, variants: [[{ emotion: 'celebrating', ms: 4200 }, { emotion: 'happy', ms: 2000 }]] },
  'creature-unlocked': { priority: 4, cooldownMs: 3_000, variants: [[{ emotion: 'surprised', ms: 900 }, { emotion: 'excited', ms: 2600 }], [{ emotion: 'surprised', ms: 700 }, { emotion: 'celebrating', ms: 2400 }]] },
  'challenge-failed': { priority: 4, cooldownMs: 3_000, variants: [[{ emotion: 'sad', ms: 1700 }, { emotion: 'encouraging', ms: 2600 }]] },
  'hint-followed': { priority: 2, cooldownMs: 15_000, variants: [[{ emotion: 'happy', ms: 2000 }], [{ emotion: 'wink', ms: 800 }, { emotion: 'happy', ms: 1400 }]] },
  'moved-closer': { priority: 1, cooldownMs: 25_000, variants: [[{ emotion: 'encouraging', ms: 2200 }], [{ emotion: 'excited', ms: 1800 }], [{ emotion: 'happy', ms: 2000 }]] },
  'wrong-direction': { priority: 1, cooldownMs: 30_000, variants: [[{ emotion: 'confused', ms: 2400 }], [{ emotion: 'curious', ms: 900 }, { emotion: 'confused', ms: 1600 }]] },
  'question-asked': { priority: 3, cooldownMs: 0, variants: [[{ emotion: 'curious', ms: 60_000 }]] },
  answered: { priority: 3, cooldownMs: 0, variants: [[{ emotion: 'wink', ms: 900 }, { emotion: 'happy', ms: 1800 }]] },
  'player-interacted': { priority: 1, cooldownMs: 1_500, variants: [[{ emotion: 'happy', ms: 1600 }], [{ emotion: 'wink', ms: 700 }, { emotion: 'happy', ms: 1000 }], [{ emotion: 'excited', ms: 1200 }]] },
}

/** Picks a variant, avoiding the one used last time when there's a choice. */
const lastVariant = new Map<GameEventType, number>()
export function pickReaction(type: GameEventType, rand = Math.random): EmotionStep[] {
  const { variants } = REACTIONS[type]
  let i = Math.floor(rand() * variants.length)
  if (variants.length > 1 && i === lastVariant.get(type)) i = (i + 1) % variants.length
  lastVariant.set(type, i)
  return variants[i]
}

// ---------- bus ----------

/** A listener may return a promise (e.g. Reda finishing a spoken line) that the emitter can wait for. */
type Listener = (e: GameEvent) => unknown
const listeners = new Set<Listener>()

/**
 * Tells Reda something happened. The returned promise settles once every listener is done
 * with it (for example once Reda has finished speaking about it). It never rejects;
 * most callers can ignore it.
 */
export function emitGameEvent(type: GameEventType, id?: string): Promise<void> {
  const e: GameEvent = { type, id }
  const waits: Promise<unknown>[] = []
  listeners.forEach((l) => {
    try {
      const r = l(e)
      if (r instanceof Promise) waits.push(r)
    } catch (err) {
      console.error('Reda event listener failed', err)
    }
  })
  return Promise.allSettled(waits).then(() => undefined)
}

export function onGameEvent(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------- distance → progress events ----------

/** Getting this much closer since the last check-in counts as progress. */
export const CLOSER_STEP_M = 25
/** Walking this far away from the closest point so far counts as the wrong way. */
export const WRONG_WAY_M = 20

interface DistanceState {
  targetId: string
  /** Distance at the last "closer" reaction (or leg start). */
  checkpoint: number
  /** Closest the player has been this leg. */
  best: number
  discovered: boolean
  /** Distance when this target was first seen; halfway = midpoint. */
  start: number
  midpointSaid: boolean
  wrongWaySaid: boolean
}
let dist: DistanceState | null = null

/**
 * Feed the distance the game already computes (meters to the current target).
 * Turns it into moved-closer / wrong-direction / building-discovered events.
 * Only reads the number — navigation and GPS logic are untouched.
 */
export function reportDistanceToTarget(targetId: string | null, meters: number | null) {
  if (!targetId || meters === null || !Number.isFinite(meters)) return
  if (!dist || dist.targetId !== targetId) {
    dist = { targetId, checkpoint: meters, best: meters, discovered: false, wrongWaySaid: false, start: meters, midpointSaid: false }
    return
  }
  if (!dist.discovered && meters <= CONFIG.creatureCatchM) {
    dist.discovered = true
    emitGameEvent('building-discovered', targetId)
  }
  if (!dist.midpointSaid && dist.start > 2 * CONFIG.creatureCatchM && meters <= dist.start / 2) {
    dist.midpointSaid = true
    emitGameEvent('midpoint', targetId)
  }
  if (meters < dist.best) {
    dist.best = meters
    dist.wrongWaySaid = false
  }
  if (dist.checkpoint - meters >= CLOSER_STEP_M) {
    dist.checkpoint = meters
    emitGameEvent('moved-closer', targetId)
  } else if (!dist.wrongWaySaid && meters - dist.best >= WRONG_WAY_M) {
    dist.wrongWaySaid = true
    dist.checkpoint = meters
    emitGameEvent('wrong-direction', targetId)
  }
}

/** Test helper / new run. */
export function resetDistanceTracking() {
  dist = null
}
