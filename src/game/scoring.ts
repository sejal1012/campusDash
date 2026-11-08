export type CatchResult = 'gold' | 'caught' | 'escaped'

/** 3 of 3 = gold, 2 of 3 = caught, 0 or 1 = escaped. */
export function catchResultFor(correct: number): CatchResult {
  if (correct >= 3) return 'gold'
  if (correct === 2) return 'caught'
  return 'escaped'
}
