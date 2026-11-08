import { describe, expect, it } from 'vitest'
import { catchResultFor } from './scoring'

describe('catchResultFor', () => {
  it('maps correct answers to a catch result', () => {
    expect(catchResultFor(3)).toBe('caught')
    expect(catchResultFor(2)).toBe('caught')
    expect(catchResultFor(1)).toBe('escaped')
    expect(catchResultFor(0)).toBe('escaped')
  })
})
