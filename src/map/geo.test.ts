import { describe, expect, it } from 'vitest'
import {
  averageFixes,
  circleRing,
  distanceM,
  formatLngLat,
  isGoodAccuracy,
  isOffCampus,
  pushRecent,
  smooth,
} from './geo'
import type { LngLat, PlayerFix } from '../types'

const A: LngLat = [-78.787, 43.001]

describe('distanceM', () => {
  it('is zero for the same point', () => {
    expect(distanceM(A, A)).toBe(0)
  })
  it('measures about 111 m per 0.001 degree of latitude', () => {
    const d = distanceM(A, [A[0], A[1] + 0.001])
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
  it('uses [lng, lat] order (a lng shift is shorter at this latitude)', () => {
    const d = distanceM(A, [A[0] + 0.001, A[1]])
    expect(d).toBeGreaterThan(79)
    expect(d).toBeLessThan(82)
  })
})

describe('isGoodAccuracy', () => {
  it('accepts at or below the limit', () => {
    expect(isGoodAccuracy(50)).toBe(true)
    expect(isGoodAccuracy(5)).toBe(true)
  })
  it('rejects above the limit or non-finite', () => {
    expect(isGoodAccuracy(51)).toBe(false)
    expect(isGoodAccuracy(NaN)).toBe(false)
  })
})

describe('smooth', () => {
  it('passes the first fix through', () => {
    expect(smooth(null, A)).toEqual(A)
  })
  it('moves alpha of the way toward raw', () => {
    const r = smooth([0, 0], [10, 20], 0.3)
    expect(r[0]).toBeCloseTo(3)
    expect(r[1]).toBeCloseTo(6)
  })
})

describe('isOffCampus', () => {
  it('skips the check when no stop has coords', () => {
    expect(isOffCampus(A, [null, null])).toBe(false)
    expect(isOffCampus(A, [])).toBe(false)
  })
  it('is false when near any stop', () => {
    const far: LngLat = [A[0] + 1, A[1]]
    expect(isOffCampus(A, [far, [A[0] + 0.001, A[1]]])).toBe(false)
  })
  it('is true when farther than the limit from all stops', () => {
    expect(isOffCampus([A[0] + 1, A[1]], [A, null])).toBe(true)
  })
})

describe('averageFixes / pushRecent', () => {
  const mk = (lng: number, lat: number): PlayerFix => ({ pos: [lng, lat], accuracy: 5, timestamp: 0 })
  it('averages positions', () => {
    expect(averageFixes([mk(0, 0), mk(2, 4)])).toEqual([1, 2])
  })
  it('returns null for no fixes', () => {
    expect(averageFixes([])).toBeNull()
  })
  it('keeps only the last n', () => {
    let list: PlayerFix[] = []
    for (let i = 0; i < 15; i++) list = pushRecent(list, mk(i, 0), 10)
    expect(list).toHaveLength(10)
    expect(list[0].pos[0]).toBe(5)
  })
})

describe('formatLngLat', () => {
  it('prints [lng, lat]', () => {
    expect(formatLngLat([-78.7871234, 43.0012345])).toBe('[-78.787123, 43.001235]')
  })
})

describe('circleRing', () => {
  it('is closed and every point is about the radius away', () => {
    const ring = circleRing(A, 30)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    for (const p of ring) expect(Math.abs(distanceM(A, p) - 30)).toBeLessThan(0.5)
  })
})
