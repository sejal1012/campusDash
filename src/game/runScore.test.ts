import { describe, expect, it } from 'vitest'
import { parMsFor, scoreRun, type StopResult } from './runScore'

const stop = (i: number, correct: number): StopResult => ({ stopId: `s${i}`, creatureId: `c${i}`, correct, caught: correct >= 2 })
const all = (correct: number) => [0, 1, 2, 3, 4].map((i) => stop(i, correct))

describe('scoreRun', () => {
  it('gives a perfect run 100 points, 3 stars and all badges', () => {
    const s = scoreRun(all(3), 300_000, 600_000)
    expect(s.points.total).toBe(100)
    expect(s.stars).toBe(3)
    expect(s.badges).toEqual(['Full Dex', 'Perfect quiz', 'Speed runner'])
  })
  it('loses speed points the slower you are and gets none at twice par', () => {
    expect(scoreRun(all(3), 900_000, 600_000).points.speed).toBe(10)
    expect(scoreRun(all(3), 1_200_000, 600_000).points.speed).toBe(0)
    expect(scoreRun(all(3), 5_000_000, 600_000).points.speed).toBe(0)
  })
  it('counts caught creatures and right answers', () => {
    const s = scoreRun([stop(0, 3), stop(1, 1), stop(2, 2), stop(3, 0), stop(4, 3)], 600_000, 600_000)
    expect(s.caught).toBe(3)
    expect(s.quizRight).toBe(9)
    expect(s.quizTotal).toBe(15)
  })
  it('always gives at least one star for finishing', () => {
    const s = scoreRun(all(0), 9_999_999, 600_000)
    expect(s.points.total).toBe(0)
    expect(s.stars).toBe(1)
  })
  it('gives 2 stars for a decent run', () => {
    expect(scoreRun(all(2), 900_000, 600_000).stars).toBe(2)
  })
})

describe('parMsFor', () => {
  it('grows with route length and number of stops', () => {
    const near = parMsFor([[-78.787, 43.001], [-78.788, 43.001]], 1)
    const far = parMsFor([[-78.787, 43.001], [-78.79, 43.001]], 1)
    expect(far).toBeGreaterThan(near)
    expect(parMsFor([], 5)).toBeGreaterThan(parMsFor([], 1))
  })
})
