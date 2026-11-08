// Final score for a finished run: 100 points, 1 to 3 stars.
//   Creatures caught  50 pts   (caught / stops)
//   Quiz answers      30 pts   (right answers / 3 per stop)
//   Speed             20 pts   (full marks at or under par time, none at twice par)
import { CONFIG } from '../config'
import { distanceM } from '../location/geo'
import type { LngLat } from '../types'

export interface StopResult {
  stopId: string
  creatureId: string
  /** Right answers at this stop, 0 to 3. */
  correct: number
  caught: boolean
}

export const POINTS = { creatures: 50, quiz: 30, speed: 20 }
export const QUESTIONS_PER_STOP = 3
/** Time at each stop for the quiz and reading the facts, used when working out par time. */
const STOP_ALLOWANCE_S = 60
const STAR_AT = { two: 60, three: 85 }

/** Par time: walk the route at walking speed (with a detour allowance) plus time at each stop, with some slack. */
export function parMsFor(route: LngLat[], stopCount: number): number {
  let meters = 0
  for (let i = 1; i < route.length; i++) meters += distanceM(route[i - 1], route[i])
  const walkS = (meters * CONFIG.detourFactor) / CONFIG.walkSpeedMps
  return Math.round((walkS + STOP_ALLOWANCE_S * stopCount) * CONFIG.parFactor * 1000)
}

export interface RunScore {
  caught: number
  stopCount: number
  quizRight: number
  quizTotal: number
  elapsedMs: number
  parMs: number
  points: { creatures: number; quiz: number; speed: number; total: number }
  stars: 1 | 2 | 3
  badges: string[]
}

export function scoreRun(results: StopResult[], elapsedMs: number, parMs: number): RunScore {
  const stopCount = results.length
  const caught = results.filter((r) => r.caught).length
  const quizRight = results.reduce((n, r) => n + r.correct, 0)
  const quizTotal = stopCount * QUESTIONS_PER_STOP
  const creatures = stopCount ? Math.round((POINTS.creatures * caught) / stopCount) : 0
  const quiz = quizTotal ? Math.round((POINTS.quiz * quizRight) / quizTotal) : 0
  const over = parMs > 0 ? (elapsedMs - parMs) / parMs : 0 // 0 at par, 1 at twice par
  const speed = Math.round(POINTS.speed * Math.min(1, Math.max(0, 1 - over)))
  const total = creatures + quiz + speed
  const stars = total >= STAR_AT.three ? 3 : total >= STAR_AT.two ? 2 : 1 // finishing is always worth a star
  const badges: string[] = []
  if (stopCount && caught === stopCount) badges.push('Full Dex')
  if (quizTotal && quizRight === quizTotal) badges.push('Perfect quiz')
  if (speed === POINTS.speed) badges.push('Speed runner')
  return { caught, stopCount, quizRight, quizTotal, elapsedMs, parMs, points: { creatures, quiz, speed, total }, stars, badges }
}
