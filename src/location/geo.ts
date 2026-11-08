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

/**
 * Closed ring of [lng, lat] points approximating a circle of `radiusM` meters
 * (drawing only; use distanceM for any distance check).
 */
export function circleRing(center: LngLat, radiusM: number, steps = 64): LngLat[] {
  const mPerDegLat = 111_320
  const mPerDegLng = mPerDegLat * Math.cos((center[1] * Math.PI) / 180)
  const ring: LngLat[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    ring.push([center[0] + (radiusM * Math.cos(a)) / mPerDegLng, center[1] + (radiusM * Math.sin(a)) / mPerDegLat])
  }
  return ring
}

/** Initial compass bearing in degrees (0 = north, clockwise) from a to b. For the hint arrow only. */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180
  const dLng = (b[0] - a[0]) * rad
  const y = Math.sin(dLng) * Math.cos(b[1] * rad)
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos(dLng)
  return (Math.atan2(y, x) / rad + 360) % 360
}

/**
 * Facing direction from movement. Only updates once the player has moved `minMoveM`
 * from the anchor, so standing still never makes the heading jitter.
 */
export function nextHeading(
  anchor: LngLat | null,
  pos: LngLat,
  prev: number | null,
  minMoveM = 4,
): { heading: number | null; anchor: LngLat } {
  if (!anchor) return { heading: prev, anchor: pos }
  if (distanceM(anchor, pos) < minMoveM) return { heading: prev, anchor }
  return { heading: bearingDeg(anchor, pos), anchor: pos }
}
