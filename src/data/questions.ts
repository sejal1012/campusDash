import data from './questions.json'

export interface Question {
  text: string
  options: string[]
  /** Index into options of the right answer. */
  answer: number
  /** One line shown after answering (right or wrong). Also used as a "fact" on the Place learned card. */
  explain: string
  /** false = the team still has to check it on-site. */
  verified: boolean
  /** Team-only note. Never shown to players. */
  note?: string
}

const PLACEHOLDER: Question = {
  text: 'TODO: no questions for this stop yet.',
  options: ['TODO', 'TODO', 'TODO'],
  answer: 0,
  explain: 'TODO',
  verified: false,
}

/** Always returns exactly 3 questions (placeholders fill any gaps). */
export function questionsFor(stopId: string): Question[] {
  const found = (data.stops.find((s) => s.stopId === stopId)?.questions ?? []) as Question[]
  return [0, 1, 2].map((i) => found[i] ?? PLACEHOLDER)
}
