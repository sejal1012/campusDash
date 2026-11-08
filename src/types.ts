export type LngLat = [number, number] // ALWAYS [lng, lat]

export interface Stop {
  id: string
  name: string
  address?: string
  coords: LngLat | null // null until collected at the sign (TODO)
  photo: string
  fact: string
  creatureId: string
}

export interface Creature {
  id: string
  name: string
  stopId: string
  coords: LngLat
  art: string
  question?: { text: string; options: string[]; answerIndex: number } // quiz lives in data/questions.json
}

export interface PlayerFix {
  pos: LngLat
  accuracy: number
  timestamp: number
}

export type Phase =
  | 'intro'
  | 'requesting-location'
  | 'denied'
  | 'off-campus'
  | 'ready'
  | 'playing'
  | 'catching'
  | 'stop-card'
  | 'finished'

export type GpsStatus = 'idle' | 'ok' | 'denied' | 'unavailable' | 'weak'
