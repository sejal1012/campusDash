import { distanceM } from '../location/geo'
import type { LngLat } from '../types'

/** Pick `count` different items at random (Fisher-Yates). Never returns more than exist. `rng` is injectable for tests. */
export function pickRandom<T>(items: readonly T[], count: number, rng: () => number = Math.random): T[] {
  const pool = [...items]
  const n = Math.max(0, Math.min(count, pool.length))
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

/**
 * The locations for one run: the one closest to `from` first, then random ones from the rest.
 * With no position (GPS failed or too slow), all of them are random.
 */
export function pickRun<T extends { coords: LngLat }>(all: readonly T[], from: LngLat | null, count: number, rng: () => number = Math.random): T[] {
  if (!from || all.length === 0) return pickRandom(all, count, rng)
  const nearest = all.reduce((a, b) => (distanceM(from, b.coords) < distanceM(from, a.coords) ? b : a))
  return [nearest, ...pickRandom(all.filter((l) => l !== nearest), count - 1, rng)]
}
