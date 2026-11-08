import { describe, expect, it } from 'vitest'
import { pickRandom } from './pickLocations'
import { ALL_LOCATIONS } from './locations'

describe('pickRandom', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8]
  it('returns the requested count of distinct items', () => {
    const out = pickRandom(items, 5)
    expect(out).toHaveLength(5)
    expect(new Set(out).size).toBe(5)
    out.forEach((x) => expect(items).toContain(x))
  })
  it('caps at the list size and handles zero', () => {
    expect(pickRandom([1, 2], 5)).toHaveLength(2)
    expect(pickRandom(items, 0)).toEqual([])
  })
  it('does not change the input', () => {
    const copy = [...items]
    pickRandom(items, 5)
    expect(items).toEqual(copy)
  })
  it('can reach every item over many runs (new locations get picked too)', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) pickRandom(items, 5).forEach((x) => seen.add(x))
    expect(seen.size).toBe(items.length)
  })
})

describe('location data', () => {
  it('has unique ids and [lng, lat] coords on UB North Campus', () => {
    expect(new Set(ALL_LOCATIONS.map((l) => l.id)).size).toBe(ALL_LOCATIONS.length)
    ALL_LOCATIONS.forEach(({ coords: [lng, lat] }) => {
      expect(lng).toBeGreaterThan(-79)
      expect(lng).toBeLessThan(-78.7)
      expect(lat).toBeGreaterThan(42.9)
      expect(lat).toBeLessThan(43.1)
    })
  })
})
