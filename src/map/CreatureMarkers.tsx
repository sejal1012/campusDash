import { Marker } from 'react-map-gl/mapbox'
import { CONFIG } from '../config'
import type { Creature, LngLat } from '../types'
import { distanceM } from '../location/geo'

interface Props {
  creatures: Creature[]
  player: LngLat | null
  onCreatureTap: (id: string) => void
}

function Sprite() {
  // Original placeholder creature (not final art).
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000" opacity="0.3" />
      <path d="M8 34c0-14 7-24 16-24s16 10 16 24c0 4-6 6-16 6S8 38 8 34z" fill="#8fe3ff" stroke="#003f87" strokeWidth="2" />
      <circle cx="18" cy="26" r="3.2" fill="#0b1b33" />
      <circle cx="30" cy="26" r="3.2" fill="#0b1b33" />
      <path d="M19 33q5 4 10 0" fill="none" stroke="#0b1b33" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 12l-3-6 8 4zM33 12l3-6-8 4z" fill="#ffb02e" />
    </svg>
  )
}

/** Visible within creatureVisibleM. Tappable (with chip) within creatureCatchM. */
export function CreatureMarkers({ creatures, player, onCreatureTap }: Props) {
  if (!player) return null
  return (
    <>
      {creatures.map((c) => {
        const d = distanceM(player, c.coords)
        if (d > CONFIG.creatureVisibleM) return null
        const inReach = d <= CONFIG.creatureCatchM
        return (
          <Marker key={c.id} longitude={c.coords[0]} latitude={c.coords[1]} anchor="bottom" pitchAlignment="viewport" rotationAlignment="viewport">
            <div className="flex flex-col items-center">
              {inReach && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreatureTap(c.id)
                  }}
                  className="mb-1 min-h-11 rounded-full bg-[#005bbb] px-4 text-xs font-semibold text-white shadow-lg active:bg-[#003f87]"
                >
                  Tap to catch
                </button>
              )}
              <Sprite />
            </div>
          </Marker>
        )
      })}
    </>
  )
}
