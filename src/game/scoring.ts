export type CatchResult = 'caught' | 'escaped'

/** 2 or 3 right = caught, 0 or 1 right = escaped. */
export function catchResultFor(correct: number): CatchResult {
  return correct >= 2 ? 'caught' : 'escaped'
}
