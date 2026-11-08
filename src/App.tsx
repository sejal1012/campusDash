// TEMPORARY demo page for the map module. Local state only (no store).
// Real screens and game logic live elsewhere (see CLAUDE.md section 5).
import { useEffect, useMemo, useRef, useState } from 'react'
import creaturesData from './data/creatures.mock.json'
import stopsData from './data/stops.mock.json'
import { DebugOverlay } from './map/DebugOverlay'
import { GameMap } from './map/GameMap'
import { distanceM } from './map/geo'
import { BottomNav, DexChip, HintCard, MissionCard } from './map/hud/Hud'
import { usePlayerPosition } from './map/usePlayerPosition'
import type { Creature, Stop } from './types'

const stops = stopsData.stops as Stop[]
const creatures = creaturesData.creatures as Creature[]
const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1'

const STATUS_TEXT: Record<string, string> = {
  denied: 'Location is off. Turn it on for this site in your browser settings, then reload.',
  unavailable: 'We cannot find your location right now. Check your signal and try again.',
  weak: 'GPS signal is weak. Move into the open.',
}

export default function App() {
  const [collected, setCollected] = useState<string[]>([])
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1)
  const [message, setMessage] = useState<string | null>(null)
  const startedAt = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const { fix, status, offCampus, injectFix } = usePlayerPosition({ stops })

  const target = useMemo(() => stops.find((s) => !collected.includes(s.id)) ?? null, [collected])
  const banner = STATUS_TEXT[status] ?? (offCampus ? 'Walk mode works on UB North Campus.' : null)
  const toTarget = fix && target?.coords ? distanceM(fix.pos, target.coords) : null

  return (
    <div className="app-shell">
      <div className="app-frame flex flex-col">
        <div className="relative min-h-0 flex-1">
          <GameMap
            player={fix}
            stops={stops}
            creatures={creatures}
            collectedIds={collected}
            targetId={target?.id ?? null}
            hintLevel={hintLevel}
            onCreatureTap={(id) => setMessage(`Tapped creature ${id} (demo only)`)}
            onMapTap={DEBUG ? (pos) => injectFix(pos) : undefined}
            bottomInsetPx={104}
          />

          {/* Top HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto w-fit">
              <DexChip found={collected.length} total={stops.length} />
            </div>
            <MissionCard
              stopNumber={Math.min(collected.length + 1, stops.length)}
              stopCount={stops.length}
              targetName={target?.name ?? null}
              elapsedMs={now - startedAt.current}
            />
            {banner && <div className="rounded-2xl bg-[#ffb02e] px-4 py-2 text-sm font-semibold text-[#0b1b33]">{banner}</div>}
            {message && <div className="rounded-2xl bg-[#005bbb] px-4 py-2 text-sm">{message}</div>}
          </div>

          {DEBUG && <DebugOverlay fix={fix} status={status} targetPos={target?.coords ?? null} hintLevel={hintLevel} />}

          {/* Bottom hint card */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 pt-0">
            {DEBUG && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setHintLevel((h) => ((h % 3) + 1) as 1 | 2 | 3)} className="min-h-11 rounded-xl bg-[#005bbb] px-3 text-xs font-semibold">
                  Hint level {hintLevel}
                </button>
                <button type="button" disabled={!target} onClick={() => target && setCollected((c) => [...c, target.id])} className="min-h-11 rounded-xl bg-[#3ddc97] px-3 text-xs font-semibold text-[#0b1b33] disabled:opacity-40">
                  Collect target
                </button>
                <button type="button" onClick={() => setCollected([])} className="min-h-11 rounded-xl border border-white/15 bg-[#0b1b33] px-3 text-xs font-semibold">
                  Reset
                </button>
              </div>
            )}
            <HintCard hintLevel={hintLevel} targetName={target?.name ?? null} distanceM={toTarget} player={fix?.pos ?? null} targetPos={target?.coords ?? null} />
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
