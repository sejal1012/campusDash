// Turns the data file of locations into Stops and Creatures the map can show.
import data from '../data/locations.json'
import type { Creature, LngLat, Stop } from '../types'

export interface Location {
  id: string
  name: string
  creatureId: string
  coords: LngLat
}

export const ALL_LOCATIONS = data.locations as Location[]

/** Creature picture for a location. Same convention as the roster: public/assets/creatures/<id>.webp */
export const creatureArtUrl = (creatureId: string) => `/assets/creatures/${creatureId}.webp`

export function toStop(l: Location): Stop {
  return { id: l.id, name: l.name, coords: l.coords, photo: '', fact: '', creatureId: l.creatureId }
}

export function toCreature(l: Location): Creature {
  return { id: l.creatureId, name: l.creatureId, stopId: l.id, coords: l.coords, art: creatureArtUrl(l.creatureId) }
}
