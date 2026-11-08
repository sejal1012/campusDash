import { Marker } from 'react-map-gl/mapbox'
import type { LngLat } from '../types'

/** Billboard figure: blue cap, amber backpack, mint ring underneath. */
export function PlayerMarker({ pos }: { pos: LngLat }) {
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="bottom" pitchAlignment="viewport" rotationAlignment="viewport">
      <svg width="64" height="86" viewBox="0 0 64 86" role="img" aria-label="You are here">
        <ellipse cx="32" cy="76" rx="26" ry="8" fill="none" stroke="#3ddc97" strokeWidth="3" />
        <ellipse cx="32" cy="76" rx="26" ry="8" fill="#3ddc97" opacity="0.2" />
        {/* backpack */}
        <rect x="14" y="36" width="14" height="24" rx="5" fill="#ffb02e" />
        {/* legs */}
        <rect x="24" y="58" width="7" height="16" rx="3" fill="#0b1b33" />
        <rect x="33" y="58" width="7" height="16" rx="3" fill="#0b1b33" />
        {/* body */}
        <rect x="22" y="32" width="22" height="30" rx="9" fill="#ffffff" />
        <rect x="22" y="32" width="22" height="30" rx="9" fill="none" stroke="#003f87" strokeWidth="2" />
        {/* head */}
        <circle cx="33" cy="22" r="10" fill="#f2c9a0" />
        {/* cap */}
        <path d="M22 21a11 11 0 0 1 22 0z" fill="#005bbb" />
        <rect x="30" y="19" width="19" height="4" rx="2" fill="#003f87" />
      </svg>
    </Marker>
  )
}
