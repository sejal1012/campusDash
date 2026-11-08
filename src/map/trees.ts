import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'
import { circleRing, distanceM } from '../location/geo'
import type { LngLat } from '../types'

const SPACING_M = 20 // grid spacing for tree candidates
const RADIUS_M = 280 // trees are drawn around the map center only
const REGEN_M = 25 // redraw once the camera has moved this far
const KEEP = 0.7 // share of grid cells that get a tree
const TRUNK = '#8a5a34'
const LEAVES = ['#2f7d32', '#3f9a3f', '#58b556'] // dark to light, bottom to top

/** Stable pseudo-random number in [0, 1) for a grid cell, so trees never flicker. */
function hash(ix: number, iy: number, salt: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(salt, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function treeFeatures(center: LngLat, isBlocked: (p: LngLat) => boolean): GeoJSON.Feature[] {
  const dLat = SPACING_M / 111_320
  const dLng = SPACING_M / (111_320 * Math.cos((center[1] * Math.PI) / 180))
  const nx = Math.ceil(RADIUS_M / SPACING_M)
  const cx = Math.round(center[0] / dLng)
  const cy = Math.round(center[1] / dLat)
  const out: GeoJSON.Feature[] = []

  const part = (c: LngLat, r: number, base: number, top: number, color: string) =>
    out.push({
      type: 'Feature',
      properties: { base, top, color },
      geometry: { type: 'Polygon', coordinates: [circleRing(c, r, 8)] },
    })

  for (let ix = cx - nx; ix <= cx + nx; ix++) {
    for (let iy = cy - nx; iy <= cy + nx; iy++) {
      if (hash(ix, iy, 1) > KEEP) continue
      const p: LngLat = [(ix + 0.15 + 0.7 * hash(ix, iy, 2)) * dLng, (iy + 0.15 + 0.7 * hash(ix, iy, 3)) * dLat]
      if (distanceM(center, p) > RADIUS_M || isBlocked(p)) continue
      const s = 0.8 + 0.5 * hash(ix, iy, 4) // size variety
      part(p, 0.6, 0, 2.4 * s, TRUNK)
      part(p, 3.4 * s, 2.2 * s, 5.2 * s, LEAVES[0])
      part(p, 2.6 * s, 5.2 * s, 7.4 * s, LEAVES[1])
      part(p, 1.6 * s, 7.4 * s, 9 * s, LEAVES[2])
    }
  }
  return out
}

/**
 * Scatters cartoon 3D trees on open ground around the map center.
 * Trees are skipped where a road, building or water is drawn.
 * Mapbox has no tree data, so positions are generated (stable, not real tree locations).
 */
export function installTrees(map: MapboxMap): void {
  if (map.getSource('trees')) return
  map.addSource('trees', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'trees-3d',
    source: 'trees',
    type: 'fill-extrusion',
    minzoom: 15.5,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-height': ['get', 'top'],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    },
  })

  // Layers that mean "not open ground": visible roads, water, buildings.
  const blockers = (map.getStyle()?.layers ?? [])
    .filter((l) => {
      const src = (l as { 'source-layer'?: string })['source-layer']
      const visible = map.getLayoutProperty(l.id, 'visibility') !== 'none'
      return visible && (src === 'road' || l.id === 'water' || l.id.startsWith('3d-buildings'))
    })
    .map((l) => l.id)

  let last: LngLat | null = null
  const refresh = () => {
    try {
      const c = map.getCenter()
      const center: LngLat = [c.lng, c.lat]
      if (last && distanceM(last, center) < REGEN_M) return
      const { width, height } = map.getCanvas().getBoundingClientRect()
      const isBlocked = (p: LngLat) => {
        const pt = map.project(p)
        if (pt.x < 0 || pt.y < 0 || pt.x > width || pt.y > height) return false // off screen: no check possible
        return map.queryRenderedFeatures(pt, { layers: blockers }).length > 0
      }
      last = center
      ;(map.getSource('trees') as GeoJSONSource).setData({ type: 'FeatureCollection', features: treeFeatures(center, isBlocked) })
    } catch (e) {
      console.error('Trees skipped', e)
    }
  }
  map.on('idle', refresh)
}
