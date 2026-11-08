// TEMPORARY demo page for the map module. Local state only (no store).
// Real screens and game logic live elsewhere (see CLAUDE.md section 5).
import { useEffect, useMemo, useState } from 'react'
import { ALL_LOCATIONS, toCreature, toStop } from './game/locations'
import { CONFIG } from './config'
import { DebugOverlay } from './map/DebugOverlay'
import { GameMap } from './map/GameMap'
import { distanceM } from './location/geo'
import { DexChip, HintCard, MissionCard } from './hud/Hud'
import { ArrivalCelebration } from './hud/ArrivalCelebration'
import { AppShell } from './layout/AppShell'
import { usePlayerPosition } from './location/usePlayerPosition'
import { StartScreen } from './screens/StartScreen'
import { getCharacter, loadCharacterId, saveCharacterId } from './characters'

const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1'

const STATUS_TEXT: Record<string, string> = {
  denied: 'Location is off. Turn it on for this site in your browser settings, then reload.',
  unavailable: 'We cannot find your location right now. Check your signal and try again.',
  weak: 'GPS signal is weak. Move into the open.',
}

export default function App() {
  // The player must find every location to finish.
  const [{ stops, creatures }] = useState(() => ({ stops: ALL_LOCATIONS.map(toStop), creatures: ALL_LOCATIONS.map(toCreature) }))
  const [arrivedId, setArrivedId] = useState<string | null>(null)
  const [collected, setCollected] = useState<string[]>([])
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1)
  const [message, setMessage] = useState<string | null>(null)
  // Null until the player taps Start. The stopwatch and GPS only run after that.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [characterId, setCharacterId] = useState(loadCharacterId)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const [teleportMode, setTeleportMode] = useState(false)
  const { fix, status, offCampus, heading, injectFix, resumeGps } = usePlayerPosition({ stops, relaxAccuracy: DEBUG, enabled: startedAt !== null })

  // The mission points at the nearest stop you have not found yet. It only switches when another
  // stop is clearly closer (30 m), so the text does not flicker while you walk.
  const [targetId, setTargetId] = useState<string | null>(null)
  useEffect(() => {
    const left = stops.filter((s) => !collected.includes(s.id) && s.coords)
    if (left.length === 0) return setTargetId(null)
    if (!fix) return setTargetId((cur) => (cur && left.some((s) => s.id === cur) ? cur : left[0].id))
    const dist = (s: (typeof left)[number]) => distanceM(fix.pos, s.coords!)
    const nearest = left.reduce((a, b) => (dist(b) < dist(a) ? b : a))
    setTargetId((cur) => {
      const current = left.find((s) => s.id === cur)
      return current && dist(current) - dist(nearest) <= 30 ? current.id : nearest.id
    })
  }, [fix, stops, collected])
  const target = useMemo(() => stops.find((s) => s.id === targetId) ?? null, [stops, targetId])
  const banner = STATUS_TEXT[status] ?? (offCampus ? 'Walk mode works on UB North Campus.' : null)
  const toTarget = fix && target?.coords ? distanceM(fix.pos, target.coords) : null

  // Reaching any not-yet-found stop (within arrivalRadiusM) unlocks it and plays the celebration.
  useEffect(() => {
    if (!fix || arrivedId) return
    const hit = stops.find((st) => !collected.includes(st.id) && st.coords && distanceM(fix.pos, st.coords) <= CONFIG.arrivalRadiusM)
    if (hit) {
      setCollected((c) => [...c, hit.id])
      setArrivedId(hit.id)
    }
  }, [fix, stops, collected, arrivedId])
  const arrivedStop = stops.find((s) => s.id === arrivedId) ?? null

  if (startedAt === null) {
    return (
      <AppShell>
        <StartScreen
          characterId={characterId}
          onSelect={(id) => {
            setCharacterId(id)
            saveCharacterId(id)
          }}
          onStart={() => {
            setStartedAt(Date.now())
            setNow(Date.now())
          }}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="relative h-full">
          <GameMap
            player={fix}
            creatures={creatures}
            collectedIds={collected}
            onCreatureTap={(id) => setMessage(`Tapped creature ${id} (demo only)`)}
            onMapTap={DEBUG && teleportMode ? (pos) => injectFix(pos) : undefined}
            bottomInsetPx={112}
            heading={heading}
            character={getCharacter(characterId)}
            freeCamera={DEBUG}
            gpsFailed={status === 'denied' || status === 'unavailable'}
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
              elapsedMs={Math.max(0, now - startedAt)}
            />
            {banner && <div className="rounded-2xl bg-[#ffb02e] px-4 py-2 text-sm font-semibold text-[#0b1b33]">{banner}</div>}
            {message && <div className="rounded-2xl bg-[#005bbb] px-4 py-2 text-sm">{message}</div>}
          </div>

          {arrivedStop && (
            <ArrivalCelebration
              placeName={arrivedStop.name}
              creatureId={arrivedStop.creatureId}
              creatureName={creatures.find((c) => c.stopId === arrivedStop.id)?.name ?? arrivedStop.creatureId}
              onContinue={() => setArrivedId(null)}
            />
          )}

          {DEBUG && <DebugOverlay fix={fix} status={status} targetPos={target?.coords ?? null} hintLevel={hintLevel}
              teleportMode={teleportMode}
              onToggleTeleport={() => {
                if (teleportMode) resumeGps()
                setTeleportMode((t) => !t)
              }}
            />}

          {/* Bottom hint card */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 pt-0">
            {DEBUG && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setHintLevel((h) => ((h % 3) + 1) as 1 | 2 | 3)} className="min-h-11 rounded-xl bg-[#005bbb] px-3 text-xs font-semibold">
                  Hint level {hintLevel}
                </button>
                <button type="button" disabled={!target} onClick={() => {
                  if (!target) return
                  setCollected((c) => [...c, target.id])
                  setArrivedId(target.id)
                }} className="min-h-11 rounded-xl bg-[#3ddc97] px-3 text-xs font-semibold text-[#0b1b33] disabled:opacity-40">
                  Collect target
                </button>
                <button type="button" onClick={() => {
                  setCollected([])
                  setArrivedId(null)
                }} className="min-h-11 rounded-xl border border-white/15 bg-[#0b1b33] px-3 text-xs font-semibold">
                  Reset
                </button>
              </div>
            )}
            <HintCard hintLevel={hintLevel} targetName={target?.name ?? null} distanceM={toTarget} player={fix?.pos ?? null} targetPos={target?.coords ?? null} />
          </div>
      </div>
    </AppShell>
  )
}
