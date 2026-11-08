import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox'
import { CONFIG, MAP_CONFIG } from '../config'
import type { Creature, LngLat, PlayerFix, Stop } from '../types'
import { CreatureMarkers } from './CreatureMarkers'
import { circleRing } from '../location/geo'
import { PlayerMarker } from './PlayerMarker'
import { StopPins } from './StopPins'

export interface GameMapProps {
  player: PlayerFix | null
  stops: Stop[]
  creatures: Creature[]
  collectedIds: string[]
  targetId: string | null
  hintLevel: 1 | 2 | 3
  onCreatureTap: (id: string) => void
  onMapTap?: (pos: LngLat) => void
  /** Px kept free at the bottom for the HUD (moves the recenter button up). */
  bottomInsetPx?: number
  /** Debug only: remove the campus bounds so you can test real GPS anywhere. */
  freeCamera?: boolean
}

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/** Presentational map: no store, no game logic. */
export function GameMap({ player, stops, creatures, collectedIds, targetId, hintLevel, onCreatureTap, onMapTap, bottomInsetPx = 96, freeCamera = false }: GameMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [following, setFollowing] = useState(true)
  const playerPos = player?.pos ?? null

  // Camera follows the player until the user drags the map away.
  useEffect(() => {
    if (following && playerPos) {
      mapRef.current?.easeTo({ center: playerPos, duration: 800 })
    }
  }, [playerPos, following])

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    try {
      // Hide all basemap text (place, POI and road names) so players must find places themselves.
      for (const layer of map.getStyle()?.layers ?? []) {
        if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', 'none')
      }
      if (!map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', ['get', 'extrude'], 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': MAP_CONFIG.buildingColor,
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.8,
          },
        })
      }
      if (MAP_CONFIG.enableTerrain) {
        map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 })
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 })
      }
    } catch (e) {
      console.error('Map layer setup failed', e)
    }
  }, [])

  const handleClick = useCallback(
    (e: MapMouseEvent) => onMapTap?.([e.lngLat.lng, e.lngLat.lat]),
    [onMapTap],
  )

  const catchRing = useMemo(
    () =>
      playerPos
        ? ({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: circleRing(playerPos, CONFIG.creatureCatchM) },
          } as const)
        : null,
    [playerPos],
  )

  const recenter = () => {
    setFollowing(true)
    if (playerPos) mapRef.current?.easeTo({ center: playerPos, duration: 600 })
  }

  if (!TOKEN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0b1b33] p-8 text-center text-[#b9c6dc]">
        <p>The map needs a Mapbox token. Add VITE_MAPBOX_TOKEN to your .env file and restart.</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_CONFIG.style}
        initialViewState={{ longitude: MAP_CONFIG.center[0], latitude: MAP_CONFIG.center[1], zoom: MAP_CONFIG.zoom, pitch: MAP_CONFIG.pitch, bearing: 0 }}
        minZoom={freeCamera ? 3 : MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        maxPitch={70}
        maxBounds={freeCamera ? undefined : MAP_CONFIG.maxBounds}
        attributionControl={false}
        onLoad={onLoad}
        onClick={handleClick}
        onDragStart={() => setFollowing(false)}
        onError={(e) => console.error('Map error', e.error)}
        style={{ width: '100%', height: '100%' }}
      >
        {catchRing && (
          <Source id="catch-ring" type="geojson" data={catchRing}>
            <Layer id="catch-ring-line" type="line" paint={{ 'line-color': '#0b1b33', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }} />
          </Source>
        )}
        <StopPins stops={stops} collectedIds={collectedIds} targetId={targetId} hintLevel={hintLevel} />
        <CreatureMarkers creatures={creatures} player={playerPos} onCreatureTap={onCreatureTap} />
        {playerPos && <PlayerMarker pos={playerPos} />}
      </Map>

      {/* Navy haze over the horizon. No backdrop-filter. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: MAP_CONFIG.hazePx, background: `linear-gradient(to bottom, rgb(${MAP_CONFIG.hazeColor}) 0%, rgba(${MAP_CONFIG.hazeColor},0.85) 35%, rgba(${MAP_CONFIG.hazeColor},0) 100%)` }}
      />

      <button
        type="button"
        aria-label="Face north"
        onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 500 })}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[rgba(8,20,40,0.92)] text-white active:bg-[#003f87]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb02e" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Recenter on my location"
        onClick={recenter}
        style={{ bottom: bottomInsetPx }}
        className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[rgba(8,20,40,0.92)] text-white shadow-lg active:bg-[#003f87]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={following ? '#ffb02e' : 'currentColor'} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  )
}
