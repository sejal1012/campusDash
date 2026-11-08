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
