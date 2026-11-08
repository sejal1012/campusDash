// TEMPORARY demo page for the map module. Local state only (no store).
// Real screens and game logic live elsewhere (see CLAUDE.md section 5).
import { useMemo, useState } from 'react'
import creaturesData from './data/creatures.mock.json'
import stopsData from './data/stops.mock.json'
import { DebugOverlay } from './map/DebugOverlay'
import { GameMap } from './map/GameMap'
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

  const { fix, status, offCampus, injectFix } = usePlayerPosition({ stops })

  const target = useMemo(() => stops.find((s) => !collected.includes(s.id)) ?? null, [collected])
  const banner = STATUS_TEXT[status] ?? (offCampus ? 'Walk mode works on UB North Campus.' : null)

  return (
    <div className="app-shell">
      <div className="app-frame">
        <GameMap
          player={fix}
          stops={stops}
          creatures={creatures}
          collectedIds={collected}
          targetId={target?.id ?? null}
          hintLevel={hintLevel}
          onCreatureTap={(id) => setMessage(`Tapped creature ${id} (demo only)`)}
          onMapTap={DEBUG ? (pos) => injectFix(pos) : undefined}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          {DEBUG ? <div className="h-[270px]" /> : null}
          <div className="rounded-[20px] border border-white/15 bg-[rgba(8,20,40,0.88)] p-4">
            <div className="text-xs text-[#b9c6dc]">MOCK data - map demo</div>
            <div className="font-[Space_Grotesk,Inter,sans-serif] text-lg font-bold">
              {target ? `Go to ${target.name}` : 'All mock stops collected'}
            </div>
          </div>
          {banner && (
            <div className="mt-2 rounded-2xl bg-[#ffb02e] px-4 py-2 text-sm font-semibold text-[#0b1b33]">{banner}</div>
          )}
          {message && <div className="mt-2 rounded-2xl bg-[#005bbb] px-4 py-2 text-sm">{message}</div>}
        </div>

        {DEBUG && <DebugOverlay fix={fix} status={status} targetPos={target?.coords ?? null} hintLevel={hintLevel} />}

        <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setHintLevel((h) => ((h % 3) + 1) as 1 | 2 | 3)}
            className="min-h-11 flex-1 rounded-2xl bg-[#005bbb] px-3 text-sm font-semibold active:bg-[#003f87]"
          >
            Hint level {hintLevel}
          </button>
          <button
            type="button"
            disabled={!target}
            onClick={() => target && setCollected((c) => [...c, target.id])}
            className="min-h-11 flex-1 rounded-2xl bg-[#3ddc97] px-3 text-sm font-semibold text-[#0b1b33] disabled:opacity-40"
          >
            Collect target
          </button>
          <button
            type="button"
            onClick={() => setCollected([])}
            className="min-h-11 rounded-2xl border border-white/15 px-3 text-sm font-semibold"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
