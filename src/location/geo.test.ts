import { describe, expect, it } from 'vitest'
import {
  facingOnScreen,
  averageFixes,
  bearingDeg,
  circleRing,
  distanceM,
  formatLngLat,
  isGoodAccuracy,
  nextHeading,
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

describe('bearingDeg', () => {
  it('points north, east, south, west', () => {
    expect(bearingDeg(A, [A[0], A[1] + 0.01])).toBeCloseTo(0, 0)
    expect(bearingDeg(A, [A[0] + 0.01, A[1]])).toBeCloseTo(90, 0)
    expect(bearingDeg(A, [A[0], A[1] - 0.01])).toBeCloseTo(180, 0)
    expect(bearingDeg(A, [A[0] - 0.01, A[1]])).toBeCloseTo(270, 0)
  })
})

describe('nextHeading', () => {
  it('keeps the old heading until the player moves far enough', () => {
    const r = nextHeading(A, [A[0], A[1] + 0.00001], 123)
    expect(r.heading).toBe(123)
    expect(r.anchor).toEqual(A)
  })
  it('turns to face the direction of a real move', () => {
    const r = nextHeading(A, [A[0] + 0.001, A[1]], null)
    expect(r.heading).toBeCloseTo(90, 0)
  })
  it('has no heading on the very first fix', () => {
    expect(nextHeading(null, A, null).heading).toBeNull()
  })
})

describe('facingOnScreen', () => {
  it('faces the viewer with no heading', () => {
    expect(facingOnScreen(null)).toBe('front')
  })
  it('maps compass quadrants on a north-up map', () => {
    expect(facingOnScreen(0)).toBe('back')
    expect(facingOnScreen(90)).toBe('right')
    expect(facingOnScreen(180)).toBe('front')
    expect(facingOnScreen(270)).toBe('left')
    expect(facingOnScreen(359)).toBe('back')
  })
  it('accounts for map rotation', () => {
    // Walking east on a map rotated 90deg (east is up) means walking away from the viewer.
    expect(facingOnScreen(90, 90)).toBe('back')
    expect(facingOnScreen(0, 90)).toBe('left')
    expect(facingOnScreen(10, -350)).toBe('back')
  })
})
