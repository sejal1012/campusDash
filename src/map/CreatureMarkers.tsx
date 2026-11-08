import { Marker } from 'react-map-gl/mapbox'
import { CONFIG } from '../config'
import type { Creature, LngLat } from '../types'
import { distanceM } from '../location/geo'

interface Props {
  creatures: Creature[]
  player: LngLat | null
  /** Ids of stops already reached. Their creatures show in colour, the rest grey. */
  collectedIds: string[]
  onCreatureTap: (id: string) => void
  /** Show every creature on the map, even far away (placement/preview). Default: only near the player. */
  showAll?: boolean
}

function Sprite({ art, name, unlocked }: { art: string; name: string; unlocked: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <img src={art} alt={name} width={56} height={56} draggable={false} className={`select-none transition-[filter] duration-500 ${unlocked ? 'drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)]' : 'opacity-70 grayscale brightness-90'}`} />
      <div className="-mt-1 h-1.5 w-8 rounded-full bg-black/30" />
    </div>
  )
}

/** Visible within creatureVisibleM. Tappable (with chip) within creatureCatchM. */
export function CreatureMarkers({ creatures, player, collectedIds, onCreatureTap, showAll = false }: Props) {
  if (!player && !showAll) return null
  return (
    <>
      {creatures.map((c) => {
        const d = player ? distanceM(player, c.coords) : Infinity
        if (!showAll && d > CONFIG.creatureVisibleM) return null
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
              <Sprite art={c.art} name={c.name} unlocked={collectedIds.includes(c.stopId)} />
            </div>
          </Marker>
        )
      })}
    </>
  )
}
