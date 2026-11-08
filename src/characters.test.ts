import { describe, expect, it } from 'vitest'
import { CHARACTERS, carouselSlot, getCharacter } from './characters'

describe('carouselSlot', () => {
  it('puts the selected item in the centre and wraps the rest to -2..2', () => {
    expect([0, 1, 2, 3, 4].map((i) => carouselSlot(i, 2))).toEqual([-2, -1, 0, 1, 2])
    expect([0, 1, 2, 3, 4].map((i) => carouselSlot(i, 0))).toEqual([0, 1, 2, -2, -1])
    expect([0, 1, 2, 3, 4].map((i) => carouselSlot(i, 4))).toEqual([1, 2, -2, -1, 0])
  })
})

describe('getCharacter', () => {
  it('falls back to the classic UBMon for unknown ids', () => {
    expect(getCharacter('nope').id).toBe('classic')
    expect(getCharacter(null).id).toBe('classic')
  })
  it('has five characters, each with full walk sprites', () => {
    expect(CHARACTERS).toHaveLength(5)
    expect(CHARACTERS.every((c) => c.sprites)).toBe(true)
  })
})
