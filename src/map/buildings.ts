import type { ExpressionSpecification, Map as MapboxMap } from 'mapbox-gl'

const WALL = { low: '#b4c6ea', tall: '#9db3e0' }
const GLASS = { low: '#e3efff', tall: '#c9dcff' }
const ROOF = '#d3def2'
const EDGE = '#4c6199'

/** Draws one tile of wall: floors as horizontal bands with rows of windows. */
function wallImage(wall: string, glass: string): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = wall
  g.fillRect(0, 0, size, size)
  // floor line at the bottom of the tile
  g.fillStyle = 'rgba(20,35,80,0.35)'
  g.fillRect(0, size - 4, size, 4)
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.fillRect(0, 0, size, 3)
  // two windows per floor
  for (const x of [8, 36]) {
    g.fillStyle = 'rgba(20,35,80,0.55)'
    g.fillRect(x - 2, 10, 24, 36)
    g.fillStyle = glass
    g.fillRect(x, 12, 20, 32)
    g.fillStyle = 'rgba(255,255,255,0.6)'
    g.fillRect(x, 12, 20, 6)
    g.fillStyle = 'rgba(20,35,80,0.4)'
    g.fillRect(x + 9, 12, 2, 32)
  }
  const img = g.getImageData(0, 0, size, size)
  return { width: size, height: size, data: img.data }
}

/**
 * Real-looking cartoon buildings: window walls, flat light roofs and dark footprint outlines.
 * Needs the 'composite' source of the Mapbox streets style.
 */
export function addBuildings(map: MapboxMap): void {
  if (map.getLayer('3d-buildings')) return

  if (!map.hasImage('wall-low')) map.addImage('wall-low', wallImage(WALL.low, GLASS.low), { pixelRatio: 2 })
  if (!map.hasImage('wall-tall')) map.addImage('wall-tall', wallImage(WALL.tall, GLASS.tall), { pixelRatio: 2 })

  const h: ExpressionSpecification = ['coalesce', ['get', 'height'], 12]
  const base: ExpressionSpecification = ['coalesce', ['get', 'min_height'], 0]
  const notUnderground: ExpressionSpecification = ['!=', ['get', 'underground'], 'true']

  const wall = (id: string, image: string, filter: ExpressionSpecification) =>
    map.addLayer({
      id,
      source: 'composite',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 15,
      filter,
      paint: {
        'fill-extrusion-pattern': image,
        'fill-extrusion-height': h,
        'fill-extrusion-base': base,
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
      },
    })
  wall('3d-buildings', 'wall-low', ['all', notUnderground, ['<=', h, 25]])
  wall('3d-buildings-tall', 'wall-tall', ['all', notUnderground, ['>', h, 25]])

  // Flat light roof slab sitting on top of the walls.
  map.addLayer({
    id: 'building-roofs',
    source: 'composite',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    filter: notUnderground,
    paint: {
      'fill-extrusion-color': ROOF,
      'fill-extrusion-base': h,
      'fill-extrusion-height': ['+', h, 0.6],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': false,
    },
  })

  // Dark outline where the building meets the ground.
  map.addLayer({
    id: 'building-outline',
    source: 'composite',
    'source-layer': 'building',
    type: 'line',
    minzoom: 15,
    filter: notUnderground,
    paint: { 'line-color': EDGE, 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.6, 19, 2.5], 'line-opacity': 0.9 },
  })
}
