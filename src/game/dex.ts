// Which creatures the player has caught, saved in localStorage.
// A tiny store: any component can call useDex() and re-renders when it changes. No library needed.
import { useSyncExternalStore } from 'react'
import type { CatchResult } from './scoring'

export type DexEntry = 'caught'
export type Dex = Record<string, DexEntry>

const KEY = 'campusDash.dex.v1'

function load(): Dex {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Dex) : {}
  } catch {
    return {}
  }
}

let dex: Dex = load()
const listeners = new Set<() => void>()

function save(next: Dex) {
  dex = next
  try {
    localStorage.setItem(KEY, JSON.stringify(dex))
  } catch (e) {
    console.error('Could not save the Dex', e)
  }
  listeners.forEach((l) => l())
}

/** Escaped does nothing. */
export function recordCatch(creatureId: string, result: CatchResult) {
  if (result === 'escaped' || dex[creatureId] === result) return
  save({ ...dex, [creatureId]: result })
}

export function resetDex() {
  save({})
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDex(): Dex {
  return useSyncExternalStore(subscribe, () => dex)
}
