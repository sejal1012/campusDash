/**
 * Shared HTTP helpers for the Campus Dash backend.
 *
 * Base URL comes from VITE_API_URL, falling back to the hosted Railway backend.
 * Every helper is "never throw": failures come back as an `ApiResult` with ok=false,
 * so the game never breaks because the backend is down.
 */

export const API_URL: string = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://ubmon-backend-production.up.railway.app'
).replace(/\/+$/, '')

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string }

const DEFAULT_TIMEOUT_MS = 15_000

/** fetch with a timeout. Throws on network error / timeout. */
export async function rawFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  // Respect an external abort signal too.
  init.signal?.addEventListener('abort', () => ctrl.abort())
  try {
    return await fetch(`${API_URL}${path}`, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? res.statusText
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    const res = await rawFetch(path, { signal })
    if (!res.ok) return { ok: false, status: res.status, error: await readError(res) }
    return { ok: true, status: res.status, data: (await res.json()) as T }
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  try {
    const res = await rawFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) return { ok: false, status: res.status, error: await readError(res) }
    return { ok: true, status: res.status, data: (await res.json()) as T }
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
