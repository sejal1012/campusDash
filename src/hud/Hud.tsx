import { CreatureArt } from '../components/CreatureArt'
import { ROSTER } from '../data/roster'
import { useDex } from '../game/dex'
import { Roamer } from '../layout/Roamer'
import { bearingDeg } from '../location/geo'
import type { LngLat } from '../types'

const card = 'border border-white/15 bg-[rgba(8,20,40,0.88)]'
const heading = { fontFamily: "'Space Grotesk', Inter, sans-serif" }

export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Top row: all 8 creatures. Gray = still to find, color = caught.
 * Phone and tablet only; on desktop (lg) the left side panel shows this instead, so the row stays empty.
 * Leaves room on the right for the map's compass button.
 */
export function DexStrip() {
  const dex = useDex()
  const found = ROSTER.filter((c) => dex[c.id]).length
  return (
    <div className="h-12 pr-16">
      <ul
        className={`flex h-full items-center gap-1 rounded-full px-2 lg:hidden ${card}`}
        aria-label={`Campus Dex: ${found} of ${ROSTER.length} caught`}
      >
        {ROSTER.map((c) => {
          const entry = dex[c.id]
          return (
            <li key={c.id} className="flex min-w-0 flex-1 justify-center">
              <CreatureArt
                id={c.id}
                name={c.name}
                size={36}
                look={entry === 'gold' ? 'gold' : entry ? 'color' : 'gray'}
                className="h-auto max-h-9 w-full max-w-9 object-contain"
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface MissionProps {
  stopNumber: number
  stopCount: number
  /** e.g. "Davis Hall". Null when the run is done. */
  targetName: string | null
  elapsedMs: number
  hintLevel: 1 | 2 | 3
  distanceM: number | null
  player: LngLat | null
  targetPos: LngLat | null
}

/**
 * "Stop 2 of 6 / Get to Davis Hall", stopwatch and distance on the right, progress bars.
 * Hint levels (same rules as the old bottom hint card): L1 distance, L2 arrow + distance, L3 name only.
 */
export function MissionCard({ stopNumber, stopCount, targetName, elapsedMs, hintLevel, distanceM, player, targetPos }: MissionProps) {
  const showDistance = targetName !== null && hintLevel <= 2 && distanceM !== null
  const showArrow = showDistance && hintLevel === 2 && player && targetPos
  return (
    <div className={`rounded-[22px] px-4 py-3 ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-[#b9c6dc]">
            {targetName ? `Stop ${stopNumber} of ${stopCount}` : 'Run complete'}
          </div>
          <div className="mt-0.5 text-xl font-bold leading-tight text-white" style={heading}>
            {targetName ? `Get to ${targetName}` : 'All stops collected'}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="text-[26px] font-bold leading-none text-[#ffb02e]" style={heading} aria-label="Walking time">
            {formatStopwatch(elapsedMs)}
          </div>
          {showDistance && (
            <div className="flex items-center gap-1 text-sm font-semibold leading-none text-white">
              {showArrow && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="Direction to target"
                  style={{ transform: `rotate(${bearingDeg(player, targetPos)}deg)` }}
                >
                  <path d="M12 3l6 15-6-3-6 3z" fill="#ffb02e" />
                </svg>
              )}
              <span>{Math.round(distanceM)} m <span className="font-normal text-[#b9c6dc]">away</span></span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5" role="img" aria-label={`${Math.min(stopNumber - 1, stopCount)} of ${stopCount} stops collected`}>
        {Array.from({ length: stopCount }, (_, i) => {
          const done = i < stopNumber - 1
          const current = i === stopNumber - 1 && targetName !== null
          return <span key={i} className={`h-1.5 flex-1 rounded-full ${done ? 'bg-[#3ddc97]' : current ? 'bg-[#ffb02e]' : 'bg-white/20'}`} />
        })}
      </div>
    </div>
  )
}

/**
 * Bottom of the screen on phone and tablet: caught creatures wander and talk.
 * Hidden on desktop (lg), where they roam the side panels and the bottom stays empty.
 * Does not block map touches.
 */
export function CreatureYard() {
  const dex = useDex()
  const caught = ROSTER.filter((c) => dex[c.id])
  return (
    <div
      className="pointer-events-none absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] h-20 rounded-[22px] border border-white/15 bg-[#0b1b33] lg:hidden"
      aria-hidden="true"
    >
      {caught.length === 0 ? (
        <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/40">
          Creatures you catch will hang out here.
        </p>
      ) : (
        <div className="absolute inset-x-3 top-3 bottom-1.5">
          {caught.map((c) => (
            <Roamer key={c.id} creature={c} gold={dex[c.id] === 'gold'} size={48} />
          ))}
        </div>
      )}
    </div>
  )
}
