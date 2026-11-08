import { Marker } from 'react-map-gl/mapbox'
import type { LngLat } from '../types'
import { useGlide } from './useGlide'

/** Google-Maps-style view cone lying on the ground, pointing where the player faces. */
function HeadingCone({ pos, heading }: { pos: LngLat; heading: number }) {
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="center" pitchAlignment="map" rotationAlignment="map" rotation={heading}>
      <svg width="120" height="120" viewBox="0 0 190 190" aria-hidden="true">
        <defs>
          <radialGradient id="cone-fade" cx="95" cy="95" r="95" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f8cff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#2f8cff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M95 95 L38 8 A100 100 0 0 1 152 8 Z" fill="url(#cone-fade)" />
      </svg>
    </Marker>
  )
}

/** Compact billboard avatar with soft shading: blue cap, amber backpack, mint ring. */
function Figure({ pos, walking }: { pos: LngLat; walking: boolean }) {
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="bottom" offset={[0, 5]} pitchAlignment="viewport" rotationAlignment="viewport">
      <svg width="40" height="54" viewBox="0 0 40 54" role="img" aria-label="You are here" className={walking ? 'player-walking' : undefined}>
        <defs>
          <linearGradient id="p-body" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#b7c8e8" />
          </linearGradient>
          <linearGradient id="p-cap" x1="0" x2="1">
            <stop offset="0" stopColor="#3b8cf0" />
            <stop offset="1" stopColor="#003f87" />
          </linearGradient>
        </defs>
        {/* ground shadow + mint ring */}
        <ellipse className="p-shadow" cx="20" cy="49" rx="15" ry="4.5" fill="#000" opacity="0.25" />
        <ellipse cx="20" cy="49" rx="14" ry="4" fill="none" stroke="#3ddc97" strokeWidth="2" />
        {/* legs (swing from the hip while walking) */}
        <rect className="p-leg-a" x="14" y="38" width="5" height="10" rx="2.5" fill="#0b1b33" />
        <rect className="p-leg-b" x="21" y="38" width="5" height="10" rx="2.5" fill="#0b1b33" />
        {/* upper body bobs once per step while walking */}
        <g className="p-upper">
        {/* backpack */}
        <rect className="p-pack" x="6" y="24" width="10" height="16" rx="4" fill="#ffb02e" />
        {/* body */}
        <rect x="12" y="22" width="17" height="19" rx="7" fill="url(#p-body)" stroke="#003f87" strokeWidth="1.2" />
        {/* head */}
        <circle cx="20.5" cy="14" r="8" fill="#f4c9a0" stroke="#8a5a34" strokeWidth="0.6" />
        <circle cx="17.5" cy="15" r="1.1" fill="#0b1b33" />
        <circle cx="23.5" cy="15" r="1.1" fill="#0b1b33" />
        {/* cap */}
        <path d="M12.5 13a8 8 0 0 1 16 0z" fill="url(#p-cap)" />
        <rect x="21" y="11.5" width="12" height="3" rx="1.5" fill="#003f87" />
        </g>
      </svg>
    </Marker>
  )
}

/**
 * `pos` is the latest GPS fix. The avatar glides to it at walking pace and plays a walk cycle
 * while moving. `onFrame` receives each drawn position (used to keep the camera on the avatar).
 */
export function PlayerMarker({ pos, heading, onFrame }: { pos: LngLat; heading: number | null; onFrame?: (pos: LngLat) => void }) {
  const glide = useGlide(pos, onFrame)
  const shown = glide.pos ?? pos
  return (
    <>
      {heading !== null && <HeadingCone pos={shown} heading={heading} />}
      <Figure pos={shown} walking={glide.walking} />
    </>
  )
}
