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

/** Dex chip, top left. */
export function DexChip({ found, total }: { found: number; total: number }) {
  return (
    <div className={`flex h-12 items-center gap-3 rounded-full px-4 ${card}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb02e" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <div className="leading-tight">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#b9c6dc]">Campus Dex</div>
        <div className="text-[15px] font-bold" style={heading}>{found} / {total} found</div>
      </div>
    </div>
  )
}

interface MissionProps {
  stopNumber: number
  stopCount: number
  /** e.g. "Davis Hall". Null when the run is done. */
  targetName: string | null
  elapsedMs: number
}

/** "Stop 2 of 6 / Get to Davis Hall", stopwatch on the right, progress dots. */
export function MissionCard({ stopNumber, stopCount, targetName, elapsedMs }: MissionProps) {
  return (
    <div className={`rounded-[22px] p-4 ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-[#b9c6dc]">
            {targetName ? `Stop ${stopNumber} of ${stopCount}` : 'Run complete'}
          </div>
          <div className="mt-1 text-[22px] font-bold leading-tight text-white" style={heading}>
            {targetName ? `Get to ${targetName}` : 'All stops collected'}
          </div>
        </div>
        <div className="shrink-0 text-[28px] font-bold leading-none text-[#ffb02e]" style={heading} aria-label="Elapsed time">
          {formatStopwatch(elapsedMs)}
        </div>
      </div>
      <div className="mt-3 flex gap-1.5" role="img" aria-label={`${Math.min(stopNumber - 1, stopCount)} of ${stopCount} stops collected`}>
        {Array.from({ length: stopCount }, (_, i) => {
          const done = i < stopNumber - 1
          const current = i === stopNumber - 1 && targetName !== null
          return <span key={i} className={`h-1.5 flex-1 rounded-full ${done ? 'bg-[#3ddc97]' : current ? 'bg-[#ffb02e]' : 'bg-white/20'}`} />
        })}
      </div>
    </div>
  )
}

interface HintProps {
  hintLevel: 1 | 2 | 3
  targetName: string | null
  distanceM: number | null
  player: LngLat | null
  targetPos: LngLat | null
}

/** Bottom hint card. L1: distance. L2: arrow + distance. L3: name only. */
export function HintCard({ hintLevel, targetName, distanceM, player, targetPos }: HintProps) {
  if (!targetName) return null
  const showDistance = hintLevel <= 2 && distanceM !== null
  const showArrow = hintLevel === 2 && player && targetPos
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[22px] p-4 ${card}`}>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wider text-[#ffb02e]">Heading to</div>
        <div className="truncate text-lg font-bold" style={heading}>{targetName}</div>
      </div>
      {showDistance && (
        <div className="flex shrink-0 items-center gap-3">
          {showArrow && (
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Direction to target"
              style={{ transform: `rotate(${bearingDeg(player, targetPos)}deg)` }}
            >
              <path d="M12 3l6 15-6-3-6 3z" fill="#ffb02e" />
            </svg>
          )}
          <div className="text-right">
            <div className="text-2xl font-bold leading-none" style={heading}>{Math.round(distanceM)} m</div>
            <div className="text-xs text-[#b9c6dc]">away</div>
          </div>
        </div>
      )}
    </div>
  )
}
