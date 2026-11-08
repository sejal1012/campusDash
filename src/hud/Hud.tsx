import { useEffect, useRef, useState } from 'react'
import { CreatureArt } from '../components/CreatureArt'
import { useRunRoster } from '../game/run'
import { useDex } from '../game/dex'
import { bearingDeg } from '../location/geo'
import type { LngLat } from '../types'

const card = 'border border-[#ffb02e]/60 bg-[#fff6e5]' // cream with an amber edge
const navyCard = 'border border-white/15 bg-[rgba(8,20,40,0.88)]' // creature strip and radar stay navy so they stand out from the beige roads
const ink = 'text-[#633806]' // dark amber text on cream
const subtle = 'text-[#8a5a1a]'
const heading = { fontFamily: "'Space Grotesk', Inter, sans-serif" }

export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Top row: the creatures in this run. Gray = still to find, color = caught.
 * Phone and tablet only; on desktop (lg) the left side panel shows this instead, so the row stays empty.
 */
export function DexStrip() {
  const dex = useDex()
  const roster = useRunRoster()
  const found = roster.filter((c) => dex[c.id]).length
  return (
    <div className="h-12">
      <ul
        className={`flex h-full items-center gap-1 rounded-full px-2 lg:hidden ${navyCard}`}
        aria-label={`Campus Dex: ${found} of ${roster.length} caught`}
      >
        {roster.map((c) => {
          const entry = dex[c.id]
          return (
            <li key={c.id} className="flex min-w-0 flex-1 justify-center">
              <CreatureArt
                id={c.id}
                name={c.name}
                size={36}
                look={entry ? 'color' : 'gray'}
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
}

function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 21V4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 4h11l-2 4 2 4H5" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Top-left mission pill. Collapsed: flag + "2 / 8". Tap to expand for the objective and progress bars.
 */
export function MissionPill({ stopNumber, stopCount, targetName }: MissionProps) {
  const [open, setOpen] = useState(false)
  const done = targetName === null
  const collectedCount = Math.min(stopNumber - 1, stopCount)
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-label={done ? 'Run complete' : `Mission ${stopNumber} of ${stopCount}: get to ${targetName}`}
      className={`pointer-events-auto flex max-w-[calc(100%-4.5rem)] flex-col overflow-hidden text-left shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-[width,border-radius,padding] motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${card} ${open ? 'w-[17rem] rounded-[22px] p-2.5 pr-4' : 'w-[7.25rem] rounded-full p-1.5 pr-4'}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-[var(--mint)] text-[var(--navy)]' : 'bg-[var(--amber)] text-[#412402]'}`}>
          <FlagIcon />
        </span>
        <span className={`text-base font-bold tabular-nums ${ink}`} style={heading}>
          {done ? 'Done!' : `${stopNumber} / ${stopCount}`}
        </span>
      </div>
      {/* Always rendered so it can slide open: the row grows from 0 to its full height while it fades in. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] motion-reduce:transition-none duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-2 min-w-0 px-1">
            <div className={`text-[11px] font-medium uppercase tracking-wider ${subtle}`}>
              {done ? 'Run complete' : 'Next Stop'}
            </div>
            <div className={`mt-0.5 text-lg font-bold leading-tight ${ink}`} style={heading}>
              {done ? 'All stops collected' : `Get to ${targetName}`}
            </div>
            <div className="mt-2 flex gap-1" role="img" aria-label={`${collectedCount} of ${stopCount} stops collected`}>
              {Array.from({ length: stopCount }, (_, i) => {
                const isDone = i < stopNumber - 1
                const current = i === stopNumber - 1 && !done
                return <span key={i} className={`h-1.5 w-5 rounded-full ${isDone ? 'bg-[var(--mint)]' : current ? 'bg-[var(--amber)]' : 'bg-[#633806]/15'}`} />
              })}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

/**
 * Top-right round stopwatch. Counts up with no end: a dot circles the rim once per minute
 * (like a second hand) and the center shows m:ss. No filling ring, so it never reads as a countdown.
 */
export function ClockBadge({ elapsedMs }: { elapsedMs: number }) {
  const deg = ((Math.max(0, elapsedMs) % 60000) / 60000) * 360
  return (
    <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.35)] ${card}`} role="timer" aria-label={`Walking time ${formatStopwatch(elapsedMs)}`}>
      <svg className="absolute inset-0" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="25" fill="none" stroke="#ffb02e" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="32" y1="9" x2="32" y2={i % 3 === 0 ? 12 : 10.5} stroke="rgba(99,56,6,0.35)" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${i * 30} 32 32)`} />
        ))}
        <g transform={`rotate(${deg} 32 32)`}>
          <circle cx="32" cy="7" r="3.5" fill="var(--coral)" />
        </g>
      </svg>
      <span className={`relative text-sm font-bold tabular-nums ${ink}`} style={heading}>{formatStopwatch(elapsedMs)}</span>
    </div>
  )
}

interface DistanceDialProps {
  targetName: string | null
  /** The creature hiding at the target. Its silhouette shows on the radar. */
  creatureId: string | null
  distanceM: number | null
  hintLevel: 1 | 2 | 3
  player: LngLat | null
  targetPos: LngLat | null
  /** Distance from the bottom of the map, in px. */
  bottomPx: number
}

/** Getting at least this much closer since the last pulse plays another pulse (ignores GPS jitter). */
const PULSE_STEP_M = 2
/** Inside this distance the radar sweeps faster and the dial pulses slowly. */
const NEAR_M = 50

const R_PROGRESS = 55
const CIRC = 2 * Math.PI * R_PROGRESS

/**
 * Bottom-left radar, lined up with the compass and locate buttons on the right: a sweep spins over rings while the hidden creature's silhouette
 * gets clearer as you close in. The outer amber ring fills from where you started to the target.
 * A small arrow rides the rim (it turns toward the target on hint level 2).
 * Pops on each step closer; sweeps faster and pulses when near. Does not block map touches.
 */
export function DistanceDial({ targetName, creatureId, distanceM, hintLevel, player, targetPos, bottomPx }: DistanceDialProps) {
  // Pulse each time the player gets closer.
  const lastRef = useRef<number | null>(null)
  const [pulse, setPulse] = useState(0)
  // Distance when this target was first seen, so the outer ring can show progress.
  const startRef = useRef<{ target: string; start: number } | null>(null)
  useEffect(() => {
    if (distanceM === null || targetName === null) {
      lastRef.current = null
      return
    }
    if (!startRef.current || startRef.current.target !== targetName || distanceM > startRef.current.start) {
      startRef.current = { target: targetName, start: distanceM }
    }
    const last = lastRef.current
    if (last === null || distanceM > last) lastRef.current = distanceM // start, or walked away: new baseline
    else if (last - distanceM >= PULSE_STEP_M) {
      lastRef.current = distanceM
      setPulse((p) => p + 1)
    }
  }, [distanceM, targetName])

  const done = targetName === null
  const showDistance = !done && distanceM !== null
  const start = startRef.current?.target === targetName ? startRef.current.start : null
  const progress = done ? 1 : showDistance && start ? Math.min(1, Math.max(0, 1 - distanceM / start)) : 0
  const pointAtTarget = hintLevel === 2 && showDistance && player && targetPos
  const arrowDeg = pointAtTarget ? bearingDeg(player, targetPos) : 0
  const near = showDistance && distanceM <= NEAR_M
  return (
    <div className="pointer-events-none absolute left-4 z-10" style={{ bottom: bottomPx }} aria-live="polite">
      {pulse > 0 && <span key={`ring-${pulse}`} className="anim-dial-ring absolute inset-0 rounded-full border-2 border-[var(--amber)]" aria-hidden="true" />}
      <div key={pulse} className={pulse > 0 ? 'anim-dial-pulse' : undefined}>
        <div className={`relative h-[120px] w-[120px] overflow-hidden rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.35)] ${navyCard} ${near ? 'anim-dial-near' : ''}`}>
          {/* Radar sweep */}
          {!done && (
            <div
              className={`absolute inset-[9px] rounded-full ${near ? 'anim-radar-fast' : 'anim-radar'}`}
              style={{ background: 'conic-gradient(from 0deg, rgba(255,176,46,0.6), rgba(255,176,46,0) 28%, transparent)' }}
              aria-hidden="true"
            />
          )}

          <svg className="absolute inset-0" viewBox="0 0 120 120" aria-hidden="true">
            {/* Radar rings and crosshair */}
            <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(143,227,255,0.28)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="60" cy="60" r="24" fill="none" stroke="rgba(143,227,255,0.2)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="60" y1="14" x2="60" y2="106" stroke="rgba(143,227,255,0.12)" strokeWidth="1" />
            <line x1="14" y1="60" x2="106" y2="60" stroke="rgba(143,227,255,0.12)" strokeWidth="1" />
            {/* Progress ring: fills as you close in */}
            <circle cx="60" cy="60" r={R_PROGRESS} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
            <circle
              cx="60" cy="60" r={R_PROGRESS} fill="none"
              stroke={done ? 'var(--mint)' : 'var(--amber)'} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
              transform="rotate(-90 60 60)"
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
            {/* Arrow riding the rim */}
            {showDistance && (
              <g transform={`rotate(${arrowDeg} 60 60)`} className="transition-transform duration-300">
                <path d="M60 1.5l6 10h-12z" fill="var(--coral)" stroke="var(--navy)" strokeWidth="1.5" strokeLinejoin="round" />
              </g>
            )}
          </svg>

          {/* Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {done ? (
              <div className="px-3 text-base font-bold leading-tight text-[var(--mint)]" style={heading}>All found!</div>
            ) : distanceM === null ? (
              <div className="px-2 text-[11px] font-semibold leading-snug text-[var(--muted)]">{hintLevel === 3 ? 'Find it by name' : 'Scanning…'}</div>
            ) : (
              <div>
                {/* Hidden creature: clearer the closer you get */}
                {creatureId && (
                  <div className="mx-auto mb-0.5 h-7 w-7 transition-opacity duration-700" style={{ opacity: 0.35 + 0.65 * progress, filter: 'brightness(0) invert(1)' }} aria-hidden="true">
                    <CreatureArt id={creatureId} name={targetName ?? ''} size={28} look="silhouette" className="h-7 w-7 object-contain" />
                  </div>
                )}
                <div className={`text-[24px] font-bold leading-none tabular-nums text-white`} style={heading}>
                  {Math.round(distanceM)}<span className="ml-0.5 text-sm">m</span>
                </div>
                <div className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]`}>away</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
