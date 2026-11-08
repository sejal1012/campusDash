import { Marker } from 'react-map-gl/mapbox'
import type { Stop } from '../types'

interface Props {
  stops: Stop[]
  collectedIds: string[]
  targetId: string | null
  hintLevel: 1 | 2 | 3
}

const FLAG = 'M5 21V4m0 0h11l-2 4 2 4H5'
const CHECK = 'M5 12.5l4.5 4.5L19 7.5'

function Pill({ label, kind }: { label: string; kind: 'unvisited' | 'target' | 'collected' }) {
  const style =
    kind === 'target'
      ? 'bg-[#ffb02e] text-[#0b1b33]'
      : kind === 'collected'
        ? 'bg-[#3ddc97] text-[#0b1b33]'
        : 'bg-white text-[#0b1b33]'
  return (
    <div className="flex flex-col items-center">
      <div className={`flex max-w-[160px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg ${style}`}>
        {kind !== 'unvisited' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={kind === 'target' ? FLAG : CHECK} />
          </svg>
        )}
        <span className="truncate">{label}</span>
      </div>
      <div className={`h-2 w-0.5 ${kind === 'target' ? 'bg-[#ffb02e]' : kind === 'collected' ? 'bg-[#3ddc97]' : 'bg-white'}`} />
    </div>
  )
}

/**
 * Collected stops always show. Level 1 also shows the target.
 * Levels 2 and 3 hide every unvisited pin (including the target).
 */
export function StopPins({ stops, collectedIds, targetId, hintLevel }: Props) {
  return (
    <>
      {stops.map((s) => {
        if (!s.coords) return null
        const collected = collectedIds.includes(s.id)
        const isTarget = s.id === targetId && !collected
        if (!collected && !(isTarget && hintLevel === 1)) return null
        return (
          <Marker key={s.id} longitude={s.coords[0]} latitude={s.coords[1]} anchor="bottom" pitchAlignment="viewport" rotationAlignment="viewport">
            <Pill label={s.name} kind={collected ? 'collected' : 'target'} />
          </Marker>
        )
      })}
    </>
  )
}
