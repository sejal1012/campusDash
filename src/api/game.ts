/**
 * Game data endpoints: health, stops, creatures, answer checking.
 */
import type { LngLat, Stop } from '../types'
import { getJson, postJson, type ApiResult } from './http'

/** Creature as the backend returns it: the correct answer is stripped. */
export interface ApiCreature {
  id: string
  name: string
  stopId: string
  coords: LngLat
  art: string
  question?: { text: string; options: string[] }
}

/** GET /api/health → true if the server is up. */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  const res = await getJson<{ status: string }>('/api/health', signal)
  return res.ok && res.data.status === 'ok'
}

/** GET /api/stops */
export function getStops(signal?: AbortSignal): Promise<ApiResult<Stop[]>> {
  return getJson<Stop[]>('/api/stops', signal)
}

/** GET /api/stops/:id */
export function getStop(id: string, signal?: AbortSignal): Promise<ApiResult<Stop>> {
  return getJson<Stop>(`/api/stops/${encodeURIComponent(id)}`, signal)
}

/** GET /api/creatures */
export function getCreatures(signal?: AbortSignal): Promise<ApiResult<ApiCreature[]>> {
  return getJson<ApiCreature[]>('/api/creatures', signal)
}

/** GET /api/creatures/:id */
export function getCreature(id: string, signal?: AbortSignal): Promise<ApiResult<ApiCreature>> {
  return getJson<ApiCreature>(`/api/creatures/${encodeURIComponent(id)}`, signal)
}

/** POST /api/creatures/:id/answer → { correct } (answerIndex is 0..2). */
export function checkAnswer(
  creatureId: string,
  answerIndex: number,
  signal?: AbortSignal,
): Promise<ApiResult<{ correct: boolean }>> {
  return postJson<{ correct: boolean }>(
    `/api/creatures/${encodeURIComponent(creatureId)}/answer`,
    { answerIndex },
    signal,
  )
}
