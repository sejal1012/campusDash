import type { LngLat } from './types'

export const CONFIG = {
  arrivalRadiusM: 30,
  arrivalFixesRequired: 2,
  maxAccuracyM: 50,
  smoothingAlpha: 0.3,
  creatureVisibleM: 150,
  creatureCatchM: 40,
  minHopM: 100,
  offCampusM: 1500,
  parFactor: 1.3,
  detourFactor: 1.3,
  walkSpeedMps: 1.4,
  stopsPerRun: 6, // use 3 for demos and testing
  quizTries: 2,
  hintRouteRefreshMs: 20000,
}

// Map settings (Person 1). Center is approximate: TODO tighten after sign coords.
export const MAP_CONFIG = {
  center: [-78.787, 43.001] as LngLat,
  zoom: 17.5,
  minZoom: 15.5,
  maxZoom: 19.5,
  pitch: 60,
  // [[west, south], [east, north]] roughly +/- 1.5 km around center. TODO tighten.
  maxBounds: [
    [-78.805, 42.987],
    [-78.769, 43.015],
  ] as [LngLat, LngLat],
  style: 'mapbox://styles/mapbox/streets-v12', // recolored to a cartoon look in src/map/cartoonStyle.ts
  hazeColor: '11, 27, 51',
  enableTerrain: false, // terrain is off by default
  hazePx: 250,
  captureFixes: 10,
}
