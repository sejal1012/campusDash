import type { ExpressionSpecification, Map as MapboxMap } from 'mapbox-gl'

/** Cartoon palette, matched to the concept screens (green ground, tan paths, blue-grey buildings). */
export const CARTOON = {
  ground: '#467a3c',
  grass: '#4f8a43',
  park: '#3e7336',
  water: '#3f8fd6',
  road: '#e6d6ae',
  roadEdge: '#b9a577',
  buildingLow: '#b8c7e6',
  buildingHigh: '#8ea3d4',
  fog: '#1a3556',
  fogHigh: '#0b1b33',
}

const ROAD_WIDTH: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 14, 2, 17, 8, 19, 22]
const EDGE_WIDTH: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 14, 3, 17, 11, 19, 27]

const HIDE_IDS = /(hillshade|water-shadow|water-depth|pitch-outline|golf|turning-feature|aerialway|ferry|rail|tunnel|pattern|admin|waterway-shadow|building-underground)/

/**
 * Turns the streets style into a flat, chunky, cartoon map with 3D buildings.
 * Layer ids come from mapbox streets-v12. Every step is guarded so a renamed layer
 * never breaks the map.
 */
export function applyCartoonStyle(map: MapboxMap): void {
  const layers = map.getStyle()?.layers ?? []

  const set = (fn: () => void, id: string) => {
    try {
      fn()
    } catch (e) {
      console.error('Cartoon style skipped layer', id, e)
    }
  }

  for (const layer of layers) {
    const { id, type } = layer
    const src = (layer as { 'source-layer'?: string })['source-layer']

    if (type === 'symbol') {
      set(() => map.setLayoutProperty(id, 'visibility', 'none'), id)
      continue
    }
    if (HIDE_IDS.test(id) || type === 'circle') {
      set(() => map.setLayoutProperty(id, 'visibility', 'none'), id)
      continue
    }

    if (type === 'background') {
      set(() => map.setPaintProperty(id, 'background-color', CARTOON.ground), id)
    } else if (type === 'fill') {
      if (id === 'water') set(() => map.setPaintProperty(id, 'fill-color', CARTOON.water), id)
      else if (id === 'building') set(() => map.setLayoutProperty(id, 'visibility', 'none'), id) // replaced by 3D layer
      else if (src === 'road') set(() => map.setPaintProperty(id, 'fill-color', CARTOON.road), id)
      else if (id === 'national-park') set(() => map.setPaintProperty(id, 'fill-color', CARTOON.park), id)
      else set(() => map.setPaintProperty(id, 'fill-color', CARTOON.grass), id)
      if (id !== 'water' && src !== 'road') set(() => map.setPaintProperty(id, 'fill-opacity', 1), id)
    } else if (type === 'line' && src === 'road') {
      const edge = id.includes('case') || id.endsWith('-bg')
      set(() => {
        map.setPaintProperty(id, 'line-color', edge ? CARTOON.roadEdge : CARTOON.road)
        map.setPaintProperty(id, 'line-width', edge ? EDGE_WIDTH : ROAD_WIDTH)
        map.setPaintProperty(id, 'line-opacity', 1)
        map.setPaintProperty(id, 'line-dasharray', [1, 0])
      }, id)
    } else if (type === 'line' && id === 'waterway') {
      set(() => map.setPaintProperty(id, 'line-color', CARTOON.water), id)
    }
  }

  // Chunky 3D buildings: taller = darker blue, lighter roof from the vertical gradient.
  if (!map.getLayer('3d-buildings')) {
    map.addLayer({
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'height'], 12], 0, CARTOON.buildingLow, 40, CARTOON.buildingHigh],
        'fill-extrusion-height': ['coalesce', ['get', 'height'], 12],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
      },
    })
  }

  // Fades the horizon into navy so it meets the HUD haze.
  set(
    () =>
      map.setFog({
        color: CARTOON.fog,
        'high-color': CARTOON.fogHigh,
        'horizon-blend': 0.12,
        'space-color': CARTOON.fogHigh,
        'star-intensity': 0,
      }),
    'fog',
  )
}
