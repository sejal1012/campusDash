import type { ExpressionSpecification, Map as MapboxMap } from 'mapbox-gl'

/**
 * UB-style buildings: red-brown brick walls with dark window bands, and teal, grey or
 * dark roofs. Three looks by height so neighbouring buildings differ.
 * (Mapbox buildings have no names, so the look is chosen by height only.)
 */
const LOOKS = [
  // low, wide buildings: light brick, teal glass, teal roof
  { name: 'low', maxH: 12, brick: '#c0694f', mortar: '#9c4d39', glass: '#3c8c9a', roof: '#2fa08f' },
  // mid-rise: classic red-brown brick, grey roof
  { name: 'mid', maxH: 25, brick: '#a9503c', mortar: '#853b2b', glass: '#2f6f86', roof: '#b9b3aa' },
  // towers: dark brown brick, narrow dark windows, dark roof
  { name: 'tall', maxH: Infinity, brick: '#80432f', mortar: '#5f2f21', glass: '#26485f', roof: '#5d4a44' },
] as const

const EDGE = '#4a2a20'

/** One tile of wall: staggered brick courses plus a dark window band with blinds. */
function wallImage(look: (typeof LOOKS)[number]): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!

  // brick
  g.fillStyle = look.brick
  g.fillRect(0, 0, size, size)
  g.fillStyle = look.mortar
  for (let row = 0; row < 8; row++) {
    g.fillRect(0, row * 8, size, 1)
    const off = row % 2 ? 0 : 8
    for (let x = off; x < size; x += 16) g.fillRect(x, row * 8, 1, 8)
  }

  // window band (top half of the tile) with a frame, glass, blinds and a mullion
  g.fillStyle = 'rgba(15,20,30,0.75)'
  g.fillRect(0, 12, size, 30)
  g.fillStyle = look.glass
  g.fillRect(2, 15, size - 4, 24)
  g.fillStyle = 'rgba(255,255,255,0.28)'
  for (let y = 17; y < 38; y += 4) g.fillRect(2, y, size - 4, 1.5)
  g.fillStyle = 'rgba(15,20,30,0.8)'
  for (const x of [0, 21, 42, 62]) g.fillRect(x, 12, 2, 30)

  // concrete floor ledge
  g.fillStyle = '#d7cfc4'
  g.fillRect(0, 44, size, 3)

  const img = g.getImageData(0, 0, size, size)
  return { width: size, height: size, data: img.data }
}

/** Brick walls with window bands, coloured roofs and dark outlines. Needs the 'composite' source. */
export function addBuildings(map: MapboxMap): void {
  if (map.getLayer('3d-buildings')) return

  const h: ExpressionSpecification = ['coalesce', ['get', 'height'], 12]
  const base: ExpressionSpecification = ['coalesce', ['get', 'min_height'], 0]
  const notUnderground: ExpressionSpecification = ['!=', ['get', 'underground'], 'true']

  let prev = 0
  LOOKS.forEach((look, i) => {
    const image = `wall-${look.name}`
    if (!map.hasImage(image)) map.addImage(image, wallImage(look), { pixelRatio: 2 })
    const filter: ExpressionSpecification =
      look.maxH === Infinity ? ['all', notUnderground, ['>', h, prev]] : ['all', notUnderground, ['>', h, i === 0 ? -1 : prev], ['<=', h, look.maxH]]
    prev = look.maxH
    map.addLayer({
      id: i === 0 ? '3d-buildings' : `3d-buildings-${look.name}`,
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
  })

  // Roof slab on top of the walls, coloured by building height.
  map.addLayer({
    id: 'building-roofs',
    source: 'composite',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    filter: notUnderground,
    paint: {
      'fill-extrusion-color': ['step', h, LOOKS[0].roof, 12, LOOKS[1].roof, 25, LOOKS[2].roof],
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
