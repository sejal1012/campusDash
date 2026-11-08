// Which creatures are in this run (set once, when the run picks its locations).
// Before that, a placeholder set of the same size is shown so screens are never empty.
import { useMemo, useSyncExternalStore } from 'react'
import { CONFIG } from '../config'
import { ROSTER, type CreatureInfo } from '../data/roster'

let runIds: string[] | null = null
const listeners = new Set<() => void>()

export function setRunCreatureIds(ids: string[]) {
  runIds = ids
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Creatures in this run, in roster order. */
export function useRunRoster(): CreatureInfo[] {
  const ids = useSyncExternalStore(subscribe, () => runIds)
  return useMemo(() => (ids ? ROSTER.filter((c) => ids.includes(c.id)) : ROSTER.slice(0, CONFIG.stopsPerRun)), [ids])
}

/** True once this run's locations have been chosen (the game has started and found the player). */
export function useRunPicked(): boolean {
  return useSyncExternalStore(subscribe, () => runIds !== null)
}
