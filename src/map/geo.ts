import distance from '@turf/distance'
import { CONFIG } from '../config'
import type { LngLat, PlayerFix } from '../types'

/** Distance in meters between two [lng, lat] points. */
export function distanceM(a: LngLat, b: LngLat): number {
  return distance(a, b, { units: 'meters' })
}

/** Accuracy gate: true when a reading is good enough to use. */
export function isGoodAccuracy(accuracy: number, maxM = CONFIG.maxAccuracyM): boolean {
  return Number.isFinite(accuracy) && accuracy <= maxM
}

/** Exponential smoothing: new = old + alpha * (raw - old). First fix passes through. */
export function smooth(
  prev: LngLat | null,
  raw: LngLat,
  alpha = CONFIG.smoothingAlpha,
): LngLat {
  if (!prev) return raw
  return [prev[0] + alpha * (raw[0] - prev[0]), prev[1] + alpha * (raw[1] - prev[1])]
}

/**
 * Off-campus: farther than offCampusM from every stop that has coords.
 * Returns false (not off-campus) when no stop has coords, so the check is skipped.
 */
export function isOffCampus(
  pos: LngLat,
  stopCoords: Array<LngLat | null>,
  limitM = CONFIG.offCampusM,
): boolean {
  const known = stopCoords.filter((c): c is LngLat => c !== null)
  if (known.length === 0) return false
  return known.every((c) => distanceM(pos, c) > limitM)
}

/** Average of several fixes (for collecting sign coordinates). Null when empty. */
export function averageFixes(fixes: PlayerFix[]): LngLat | null {
  if (fixes.length === 0) return null
  const sum = fixes.reduce<LngLat>((s, f) => [s[0] + f.pos[0], s[1] + f.pos[1]], [0, 0])
  return [sum[0] / fixes.length, sum[1] / fixes.length]
}

/** Keep only the last `n` fixes. */
export function pushRecent(fixes: PlayerFix[], fix: PlayerFix, n: number): PlayerFix[] {
  return [...fixes, fix].slice(-n)
}

/** Format as the [lng, lat] text used in data files. */
export function formatLngLat(p: LngLat, digits = 6): string {
  return `[${p[0].toFixed(digits)}, ${p[1].toFixed(digits)}]`
}
