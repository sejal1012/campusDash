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
 */
export function DexStrip() {
  const dex = useDex()
  const found = ROSTER.filter((c) => dex[c.id]).length
  return (
    <div className="h-12">
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
}

/** "Stop 2 of 8 / Get to Davis Hall", stopwatch on the right, progress bars. */
export function MissionCard({ stopNumber, stopCount, targetName, elapsedMs }: MissionProps) {
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
        <div className="shrink-0 text-[26px] font-bold leading-none text-[#ffb02e]" style={heading} aria-label="Walking time">
          {formatStopwatch(elapsedMs)}
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

interface BottomBarProps {
  targetName: string | null
  distanceM: number | null
  hintLevel: 1 | 2 | 3
  player: LngLat | null
  targetPos: LngLat | null
}

/**
 * Bottom box, same on phone and desktop: the meters left to the target, centered.
 * Hint levels: L1 distance, L2 arrow + distance, L3 no distance.
 * On phones (not desktop) the unlocked creatures play faintly behind the text.
 * Does not block map touches.
 */
export function BottomBar({ targetName, distanceM, hintLevel, player, targetPos }: BottomBarProps) {
  const dex = useDex()
  const caught = ROSTER.filter((c) => dex[c.id])
  const showArrow = hintLevel === 2 && player && targetPos && distanceM !== null
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] h-20 overflow-hidden rounded-[22px] border border-white/15 bg-[#0b1b33]">
      {caught.length > 0 && (
        <div className="absolute inset-x-3 inset-y-1.5 lg:hidden" aria-hidden="true">
          {caught.map((c) => (
            <Roamer key={c.id} creature={c} gold={dex[c.id] === 'gold'} size={44} ghost />
          ))}
        </div>
      )}
      <div className="relative z-[200] flex h-full flex-col items-center justify-center text-center" aria-live="polite">
        {targetName === null ? (
          <div className="text-lg font-bold text-[#3ddc97]" style={heading}>All creatures found!</div>
        ) : distanceM === null ? (
          <div className="text-sm text-white/60">{hintLevel === 3 ? 'Find it by name' : 'Finding you…'}</div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[32px] font-bold leading-none text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.6)]" style={heading}>
              {showArrow && (
                <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Direction to target" style={{ transform: `rotate(${bearingDeg(player, targetPos)}deg)` }}>
                  <path d="M12 3l6 15-6-3-6 3z" fill="#ffb02e" />
                </svg>
              )}
              {Math.round(distanceM)} m
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#b9c6dc] [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">away</div>
          </>
        )}
      </div>
    </div>
  )
}
