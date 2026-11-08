import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox'
import { CONFIG, MAP_CONFIG } from '../config'
import type { Creature, LngLat, PlayerFix } from '../types'
import type { Character } from '../characters'
import { CreatureMarkers } from './CreatureMarkers'
import { applyCartoonStyle } from './cartoonStyle'
import { circleRing } from '../location/geo'
import { PlayerMarker } from './PlayerMarker'

export interface GameMapProps {
  player: PlayerFix | null
  creatures: Creature[]
  collectedIds: string[]
  onCreatureTap: (id: string) => void
  onMapTap?: (pos: LngLat) => void
  /** Px kept free at the bottom for the HUD (moves the recenter button up). */
  bottomInsetPx?: number
  /** Facing direction in degrees (0 = north). Null hides the view cone. */
  heading?: number | null
  /** Debug only: remove the campus bounds so you can test real GPS anywhere. */
  freeCamera?: boolean
  /** True once GPS has failed (denied/unavailable): stop waiting and open on campus. */
  gpsFailed?: boolean
  /** The UBMon chosen on the start screen. */
  character?: Character
}

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/** Presentational map: no store, no game logic. */
export function GameMap({ player, creatures, collectedIds, onCreatureTap, onMapTap, bottomInsetPx = 96, heading = null, freeCamera = false, gpsFailed = false, character }: GameMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [following, setFollowing] = useState(true)
  const [bearing, setBearing] = useState(0)
  const playerPos = player?.pos ?? null

  // Camera follows the avatar frame by frame (as it glides) until the user drags the map away.
  const followingRef = useRef(following)
  useEffect(() => {
    followingRef.current = following
  }, [following])
  const followAvatar = useCallback((pos: LngLat) => {
    if (followingRef.current) mapRef.current?.jumpTo({ center: pos })
  }, [])

  // Open the map on the player's first fix. Wait up to mapStartWaitMs; then (or if GPS fails) open on campus.
  const [startPos, setStartPos] = useState<LngLat | null>(null)
  const [waitedOut, setWaitedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setWaitedOut(true), CONFIG.mapStartWaitMs)
    return () => clearTimeout(t)
  }, [])
  if (!startPos && playerPos) setStartPos(playerPos)
  const ready = startPos !== null || waitedOut || gpsFailed
  const initialCenter = startPos ?? MAP_CONFIG.center

  // If the map opened on campus before the first fix, move to the player once it arrives.
  const hasFix = playerPos !== null
  useEffect(() => {
    if (hasFix && followingRef.current && playerPos) mapRef.current?.jumpTo({ center: playerPos })
    // Only on the first fix; after that the glide drives the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFix])

  const styled = useRef(false)
  // Runs once, as soon as the style is ready (not after every tile), so the plain map never shows.
  const setupStyle = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || styled.current || !map.getSource('composite')) return
    styled.current = true
    try {
      applyCartoonStyle(map)
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

  if (!ready) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b1b33] text-[#b9c6dc]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#3ddc97]" aria-hidden="true" />
        <p className="text-sm font-medium">Finding you…</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_CONFIG.style}
        initialViewState={{ longitude: initialCenter[0], latitude: initialCenter[1], zoom: MAP_CONFIG.zoom, pitch: MAP_CONFIG.pitch, bearing: 0 }}
        minZoom={freeCamera ? 3 : MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        maxPitch={70}
        maxBounds={freeCamera ? undefined : MAP_CONFIG.maxBounds}
        attributionControl={false}
        onStyleData={setupStyle}
        onLoad={setupStyle}
        onClick={handleClick}
        onDragStart={() => setFollowing(false)}
        onRotate={(e) => setBearing(e.viewState.bearing)}
        onError={(e) => console.error('Map error', e.error)}
        style={{ width: '100%', height: '100%' }}
      >
        {catchRing && (
          <Source id="catch-ring" type="geojson" data={catchRing}>
            <Layer id="catch-ring-line" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 2.5, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }} />
          </Source>
        )}
        <CreatureMarkers creatures={creatures} player={playerPos} collectedIds={collectedIds} onCreatureTap={onCreatureTap} showAll />
        {playerPos && <PlayerMarker pos={playerPos} heading={heading} character={character} onFrame={followAvatar} />}
      </Map>

      {/* Navy haze over the horizon. No backdrop-filter. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: MAP_CONFIG.hazePx, background: `linear-gradient(to bottom, rgb(${MAP_CONFIG.hazeColor}) 0%, rgba(${MAP_CONFIG.hazeColor},0.85) 35%, rgba(${MAP_CONFIG.hazeColor},0) 100%)` }}
      />

      {/* Compass: the needle shows where north is. Tap to turn the map back to north. */}
      <button
        type="button"
        aria-label="Face north"
        onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 500 })}
        style={{ bottom: bottomInsetPx + 60 }}
        className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[rgba(8,20,40,0.92)] text-white shadow-lg active:bg-[#003f87]"
      >
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 120ms linear' }}>
          <path d="M15 3l5 12H10z" fill="#ff5a4d" />
          <path d="M15 27l-5-12h10z" fill="#e7edf7" />
          <circle cx="15" cy="15" r="1.6" fill="#0b1b33" />
        </svg>
        <span className="pointer-events-none absolute -top-1 text-[10px] font-extrabold text-white">N</span>
      </button>

      <button
        type="button"
        aria-label="Recenter on my location"
        onClick={recenter}
        style={{ bottom: bottomInsetPx }}
        className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[rgba(8,20,40,0.92)] text-white shadow-lg active:bg-[#003f87]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 3.5L3.8 10.6l6.5 2.3 2.3 6.5z" fill={following ? '#ffb02e' : 'none'} stroke={following ? '#ffb02e' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
