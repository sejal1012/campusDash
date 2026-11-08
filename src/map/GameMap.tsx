import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, Source, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox'
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
  /** Called once the opening fly-in has landed on the player (HUD and timer start then). */
  onIntroDone?: () => void
}

/** Opening shot: high, flat and turned, then a swoop down to the player. */
const INTRO = { zoom: MAP_CONFIG.minZoom, pitch: 0, bearing: -70, durationMs: 3000 }

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/** Presentational map: no store, no game logic. */
export function GameMap({ player, creatures, collectedIds, onCreatureTap, onMapTap, bottomInsetPx = 96, heading = null, freeCamera = false, gpsFailed = false, character, onIntroDone }: GameMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [following, setFollowing] = useState(true)
  const playerPos = player?.pos ?? null

  // Opening fly-in is running: nothing else moves the camera until it lands.
  const introRef = useRef(true)
  // Camera follows the avatar frame by frame (as it glides) until the user drags the map away.
  const followingRef = useRef(following)
  useEffect(() => {
    followingRef.current = following
  }, [following])
  const followAvatar = useCallback((pos: LngLat) => {
    if (followingRef.current && !introRef.current) mapRef.current?.jumpTo({ center: pos })
  }, [])

  // Opening fly-in (see startIntro below).
  const [introDone, setIntroDone] = useState(false)
  const playerPosRef = useRef(playerPos)
  useEffect(() => {
    playerPosRef.current = playerPos
  })
  const onIntroDoneRef = useRef(onIntroDone)
  useEffect(() => {
    onIntroDoneRef.current = onIntroDone
  })
  const finishIntro = useCallback(() => {
    if (!introRef.current) return
    introRef.current = false
    setIntroDone(true)
    onIntroDoneRef.current?.()
    // The player may have moved during the flight.
    const p = playerPosRef.current
    if (p && followingRef.current) mapRef.current?.easeTo({ center: p, duration: 400 })
  }, [])
  const startIntro = useCallback(() => {
    const map = mapRef.current
    if (!map || !introRef.current) return
    const final = { center: playerPosRef.current ?? MAP_CONFIG.center, zoom: MAP_CONFIG.zoom, pitch: MAP_CONFIG.pitch, bearing: 0 }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      map.jumpTo(final)
      return finishIntro()
    }
    map.once('moveend', finishIntro)
    map.flyTo({ ...final, duration: INTRO.durationMs, curve: 1.3, essential: true })
  }, [finishIntro])
  // Safety net: never leave the HUD hidden if the map fails to load.
  useEffect(() => {
    const t = setTimeout(finishIntro, CONFIG.mapStartWaitMs + INTRO.durationMs + 2000)
    return () => clearTimeout(t)
  }, [finishIntro])

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
    if (hasFix && followingRef.current && !introRef.current && playerPos) mapRef.current?.jumpTo({ center: playerPos })
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
      // Same colour as the start screen's exit flash, so the hand-off is seamless.
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#0a3a8c]" style={{ background: 'radial-gradient(circle at 50% 66%, #ffffff 0%, #d9f1ff 35%, #9fd6ff 100%)' }}>
        <div className="intro-beacon" aria-hidden="true" style={{ width: 96, height: 96 }}>
          <span />
          <span />
          <span />
        </div>
        <p className="text-sm font-semibold">Finding you…</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_CONFIG.style}
        initialViewState={{ longitude: initialCenter[0], latitude: initialCenter[1], zoom: INTRO.zoom, pitch: INTRO.pitch, bearing: INTRO.bearing }}
        minZoom={freeCamera ? 3 : MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        maxPitch={70}
        maxBounds={freeCamera ? undefined : MAP_CONFIG.maxBounds}
        attributionControl={false}
        onStyleData={setupStyle}
        onLoad={() => {
          setupStyle()
          startIntro()
        }}
        onClick={handleClick}
        onDragStart={() => setFollowing(false)}
        onError={(e) => console.error('Map error', e.error)}
        style={{ width: '100%', height: '100%' }}
      >
        {catchRing && (
          <Source id="catch-ring" type="geojson" data={catchRing}>
            <Layer id="catch-ring-line" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 2.5, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }} />
          </Source>
        )}
        <CreatureMarkers creatures={creatures} player={playerPos} collectedIds={collectedIds} onCreatureTap={onCreatureTap} showAll />
        {/* Beacon on the player's spot while the camera flies in; the UBMon drops in once it lands */}
        {!introDone && startPos && (
          <Marker longitude={startPos[0]} latitude={startPos[1]} anchor="center" pitchAlignment="map" rotationAlignment="map">
            <div className="intro-beacon" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </Marker>
        )}
        {playerPos && introDone && <PlayerMarker pos={playerPos} heading={heading} character={character} onFrame={followAvatar} />}
      </Map>

      {/* Continues the start screen's flash, then fades to reveal the map */}
      <div className="map-flash pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Navy haze over the horizon. No backdrop-filter. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: MAP_CONFIG.hazePx, background: `linear-gradient(to bottom, rgb(${MAP_CONFIG.hazeColor}) 0%, rgba(${MAP_CONFIG.hazeColor},0.85) 35%, rgba(${MAP_CONFIG.hazeColor},0) 100%)` }}
      />

      <button
        type="button"
        aria-label="Face north"
        data-intro={introDone ? 'done' : 'running'}
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
        data-intro={introDone ? 'done' : 'running'}
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
