/**
 * Voice endpoints (ElevenLabs via the backend). Every audio endpoint returns
 * audio/mpeg with the caption URI-encoded in the X-Voice-Text header.
 *
 * Rules from the backend handoff:
 *  - Never block the game on voice: every function resolves, never throws.
 *  - Call unlockAudio() inside a user tap (Start button) so phones allow playback.
 *  - Never send GPS positions.
 */
import { getJson, rawFetch } from './http'

export type NarrationEvent = 'welcome' | 'leg-start' | 'midpoint' | 'arrival'
export type QuizOutcome = 'correct' | 'retry' | 'ran-away'
export type PlaceIntent = 'about' | 'orient'
export type VoicePath = 'narration' | 'place-info' | 'quiz/question' | 'quiz/reaction'

export interface VoiceStatus {
  narration: boolean
  narratorAgent: boolean
  placeAgent: boolean
  guide: boolean
}

export interface Clip {
  url: string
  caption: string
  /** Only set for place-info. */
  intent?: PlaceIntent
}

const VOICE_OFF: VoiceStatus = { narration: false, narratorAgent: false, placeAgent: false, guide: false }

// ---------- status ----------

let cachedStatus: VoiceStatus | null = null

/** GET /api/voice/status. Cached after the first success; all-false on failure. */
export async function getVoiceStatus(force = false): Promise<VoiceStatus> {
  if (cachedStatus && !force) return cachedStatus
  const res = await getJson<VoiceStatus>('/api/voice/status')
  if (!res.ok) return VOICE_OFF
  cachedStatus = res.data
  return res.data
}

/** GET /api/voice — endpoint listing (debug helper). */
export async function listVoiceEndpoints(): Promise<unknown> {
  const res = await getJson<unknown>('/api/voice')
  return res.ok ? res.data : null
}

// ---------- shared player ----------

const player = typeof Audio !== 'undefined' ? new Audio() : null
let muted = false

export function setVoiceMuted(value: boolean) {
  muted = value
  if (muted) stopVoice()
}

export function isVoiceMuted() {
  return muted
}

/** Call inside the Start button's click handler (mobile audio unlock). */
export function unlockAudio() {
  if (!player) return
  player.src = silentWavUrl()
  player.play().catch(() => {})
}

/** Resolves the promise of the clip currently playing (if any). */
let finishCurrent: (() => void) | null = null

/** Stops whatever clip is currently playing. */
export function stopVoice() {
  player?.pause()
  finishCurrent?.()
}

// ---------- fetch clips ----------

/** POSTs to any voice endpoint and returns the clip without playing it. null on failure. */
export async function fetchVoice(path: VoicePath, body: object): Promise<Clip | null> {
  if (cachedStatus && !cachedStatus.narration) return null
  try {
    const res = await rawFetch(`/api/voice/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const caption = decodeURIComponent(res.headers.get('X-Voice-Text') ?? '')
    const intent = (res.headers.get('X-Place-Intent') ?? undefined) as PlaceIntent | undefined
    return { url: URL.createObjectURL(await res.blob()), caption, intent }
  } catch (err) {
    console.warn(`Voice request failed: ${path}`, err)
    return null
  }
}

/** POST /api/voice/narration. stopId is required for everything except 'welcome'. */
export function fetchNarration(event: NarrationEvent, stopId?: string) {
  return fetchVoice('narration', stopId ? { event, stopId } : { event })
}

/** POST /api/voice/place-info. text: 1–300 chars ("tell me about this hall", "orient me"). */
export function fetchPlaceInfo(text: string, stopId: string) {
  const trimmed = text.trim().slice(0, 300)
  if (!trimmed || !stopId) return Promise.resolve(null)
  return fetchVoice('place-info', { text: trimmed, stopId })
}

/** POST /api/voice/quiz/question. */
export function fetchQuizQuestion(creatureId: string) {
  return fetchVoice('quiz/question', { creatureId })
}

/** POST /api/voice/quiz/reaction. */
export function fetchQuizReaction(creatureId: string, outcome: QuizOutcome) {
  return fetchVoice('quiz/reaction', { creatureId, outcome })
}

// ---------- play ----------

/** Plays a clip, interrupting any clip already playing. Resolves when it ends (or fails). */
export function playClip(clip: Clip | null): Promise<void> {
  if (!clip || muted || !player) return Promise.resolve()
  finishCurrent?.() // the interrupted clip's promise resolves now
  return new Promise((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      if (finishCurrent === done) finishCurrent = null
      URL.revokeObjectURL(clip.url)
      resolve()
    }
    finishCurrent = done
    player.onended = done
    player.onerror = done
    player.src = clip.url
    player.play().catch((err) => {
      console.warn('Audio play blocked', err)
      done()
    })
  })
}

/** Fetch + play. Returns the caption (or null). */
async function fetchAndPlay(clip: Promise<Clip | null>): Promise<string | null> {
  const c = await clip
  const caption = c?.caption ?? null
  await playClip(c)
  return caption
}

/** say('welcome') / say('arrival', stop.id) */
export function say(event: NarrationEvent, stopId?: string) {
  return fetchAndPlay(fetchNarration(event, stopId))
}

export function speakPlaceInfo(text: string, stopId: string) {
  return fetchAndPlay(fetchPlaceInfo(text, stopId))
}

export function speakQuizQuestion(creatureId: string) {
  return fetchAndPlay(fetchQuizQuestion(creatureId))
}

export function speakQuizReaction(creatureId: string, outcome: QuizOutcome) {
  return fetchAndPlay(fetchQuizReaction(creatureId, outcome))
}

// ---------- midpoint helper ----------

/**
 * Tracks one leg so `midpoint` narration fires exactly once, when the remaining
 * distance first drops to half of the leg's starting distance.
 * Feed it distances only (meters) — never positions.
 */
export function createLegTracker() {
  let startDistance: number | null = null
  let targetId: string | null = null
  let said = false
  return {
    /** Call when a new target is shown. */
    startLeg(stopId: string, distanceMeters: number) {
      targetId = stopId
      startDistance = distanceMeters
      said = false
    },
    /** Call on each GPS fix while playing. */
    update(distanceMeters: number) {
      if (said || startDistance === null || !targetId) return
      if (distanceMeters <= startDistance / 2) {
        said = true
        void say('midpoint', targetId)
      }
    },
  }
}

function silentWavUrl(): string {
  const samples = 800
  const buf = new ArrayBuffer(44 + samples * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true)
  v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples * 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}
