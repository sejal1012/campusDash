import { Marker } from 'react-map-gl/mapbox'
import type { LngLat } from '../types'

/** Google-Maps-style view cone lying on the ground, pointing where the player faces. */
function HeadingCone({ pos, heading }: { pos: LngLat; heading: number }) {
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="center" pitchAlignment="map" rotationAlignment="map" rotation={heading}>
      <svg width="190" height="190" viewBox="0 0 190 190" aria-hidden="true">
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

/** Billboard figure with shading so it reads as a 3D toy: blue cap, amber backpack, mint ring. */
function Figure({ pos }: { pos: LngLat }) {
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="bottom" offset={[0, 8]} pitchAlignment="viewport" rotationAlignment="viewport">
      <svg width="76" height="104" viewBox="0 0 76 104" role="img" aria-label="You are here">
        <defs>
          <linearGradient id="p-body" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#e4ecfa" />
            <stop offset="1" stopColor="#a9bde0" />
          </linearGradient>
          <linearGradient id="p-pack" x1="0" x2="1">
            <stop offset="0" stopColor="#ffd37a" />
            <stop offset="1" stopColor="#e08a00" />
          </linearGradient>
          <linearGradient id="p-legs" x1="0" x2="1">
            <stop offset="0" stopColor="#1c3566" />
            <stop offset="1" stopColor="#0b1b33" />
          </linearGradient>
          <linearGradient id="p-cap" x1="0" x2="1">
            <stop offset="0" stopColor="#3b8cf0" />
            <stop offset="1" stopColor="#003f87" />
          </linearGradient>
          <radialGradient id="p-head" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffe3c4" />
            <stop offset="1" stopColor="#d9a477" />
          </radialGradient>
        </defs>
        {/* ground shadow + mint ring */}
        <ellipse cx="38" cy="94" rx="30" ry="9" fill="#000" opacity="0.28" />
        <ellipse cx="38" cy="94" rx="27" ry="8" fill="#3ddc97" opacity="0.28" />
        <ellipse cx="38" cy="94" rx="27" ry="8" fill="none" stroke="#3ddc97" strokeWidth="3" />
        {/* backpack (behind the body) */}
        <rect x="14" y="44" width="18" height="30" rx="7" fill="url(#p-pack)" />
        <rect x="17" y="48" width="5" height="12" rx="2.5" fill="#fff" opacity="0.35" />
        {/* legs */}
        <rect x="26" y="70" width="10" height="21" rx="4.5" fill="url(#p-legs)" />
        <rect x="39" y="70" width="10" height="21" rx="4.5" fill="url(#p-legs)" />
        <ellipse cx="31" cy="91" rx="7" ry="3.2" fill="#0b1b33" />
        <ellipse cx="44" cy="91" rx="7" ry="3.2" fill="#0b1b33" />
        {/* torso */}
        <rect x="23" y="42" width="30" height="34" rx="12" fill="url(#p-body)" stroke="#003f87" strokeWidth="2" />
        <path d="M30 46q8 6 16 0" fill="none" stroke="#003f87" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {/* arm */}
        <rect x="48" y="48" width="8" height="22" rx="4" fill="url(#p-body)" stroke="#003f87" strokeWidth="1.5" />
        {/* head */}
        <circle cx="38" cy="29" r="14" fill="url(#p-head)" stroke="#8a5a34" strokeWidth="1" />
        <circle cx="33" cy="30" r="2" fill="#0b1b33" />
        <circle cx="43" cy="30" r="2" fill="#0b1b33" />
        <path d="M34 36q4 3 8 0" fill="none" stroke="#8a4a2a" strokeWidth="1.6" strokeLinecap="round" />
        {/* cap */}
        <path d="M23 27a15 15 0 0 1 30 0z" fill="url(#p-cap)" />
        <rect x="36" y="24" width="22" height="5" rx="2.5" fill="#003f87" />
        <path d="M28 18q6-6 14-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    </Marker>
  )
}

export function PlayerMarker({ pos, heading }: { pos: LngLat; heading: number | null }) {
  return (
    <>
      {heading !== null && <HeadingCone pos={pos} heading={heading} />}
      <Figure pos={pos} />
    </>
  )
}
