// TEMPORARY demo page for the map module. Local state only (no store).
// Real screens and game logic live elsewhere (see CLAUDE.md section 5).
import { useEffect, useMemo, useState } from 'react'
import { ALL_LOCATIONS, toCreature, toStop } from './game/locations'
import { pickRandom } from './game/pickLocations'
import { DebugOverlay } from './map/DebugOverlay'
import { GameMap } from './map/GameMap'
import { distanceM } from './location/geo'
import { BottomBar, DexStrip, MissionCard } from './hud/Hud'
import { recordCatch, resetDex } from './game/dex'
import { ArrivalCelebration } from './hud/ArrivalCelebration'
import { AppShell } from './layout/AppShell'
import { usePlayerPosition } from './location/usePlayerPosition'
import { StartScreen } from './screens/StartScreen'
import { getCharacter, loadCharacterId, saveCharacterId } from './characters'

// Every page load is a fresh run: forget anything saved from the last one.
resetDex()

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
  // Null until the player taps Start. The stopwatch and GPS only run after that.
  // Start flow: tap Start (launching: GPS starts) -> exit animation -> map fly-in -> run starts (stopwatch).
  const [launching, setLaunching] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [characterId, setCharacterId] = useState(loadCharacterId)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const [teleportMode, setTeleportMode] = useState(false)
  const { fix, status, offCampus, heading, injectFix, resumeGps } = usePlayerPosition({ stops, relaxAccuracy: DEBUG, enabled: launching || startedAt !== null })

  // The first mission is the nearest stop. After that each next stop is picked at random from the rest.
  const [targetId, setTargetId] = useState<string | null>(null)
  const gpsFailed = status === 'denied' || status === 'unavailable'
  useEffect(() => {
    const left = stops.filter((s) => !collected.includes(s.id) && s.coords)
    if (left.length === 0) return setTargetId(null)
    if (targetId && left.some((s) => s.id === targetId)) return
    if (collected.length === 0) {
      if (fix) setTargetId(left.reduce((a, b) => (distanceM(fix.pos, b.coords!) < distanceM(fix.pos, a.coords!) ? b : a)).id)
      else if (gpsFailed) setTargetId(pickRandom(left, 1)[0].id)
      return
    }
    setTargetId(pickRandom(left, 1)[0].id)
  }, [fix, stops, collected, targetId, gpsFailed])
  const target = useMemo(() => stops.find((s) => s.id === targetId) ?? null, [stops, targetId])
  const banner = STATUS_TEXT[status] ?? (offCampus ? 'Walk mode works on UB North Campus.' : null)
  const toTarget = fix && target?.coords ? distanceM(fix.pos, target.coords) : null

  // Tapping "Tap to unlock" (only shown within creatureCatchM) unlocks the stop and plays the celebration.
  const unlockCreature = (creatureId: string) => {
    const creature = creatures.find((c) => c.id === creatureId)
    if (!creature || collected.includes(creature.stopId)) return
    setCollected((c) => [...c, creature.stopId])
    recordCatch(creature.id, 'caught') // lights up the Dex and sends it to the Creature park
    setArrivedId(creature.stopId)
  }
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
          onLaunch={() => setLaunching(true)}
          onStart={() => {
            setStartedAt(Date.now())
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
            onCreatureTap={unlockCreature}
            onMapTap={DEBUG && teleportMode ? (pos) => injectFix(pos) : undefined}
            bottomInsetPx={108}
            heading={heading}
            character={getCharacter(characterId)}
            freeCamera={DEBUG}
            onIntroDone={() => {
              setRunStartedAt(Date.now())
              setNow(Date.now())
            }}
            gpsFailed={gpsFailed}
          />

          {/* Top HUD */}
          <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] ${runStartedAt ? 'hud-in-top' : 'hud-hidden'}`}>
            <DexStrip />
            <MissionCard
              stopNumber={Math.min(collected.length + 1, stops.length)}
              stopCount={stops.length}
              targetName={target?.name ?? null}
              elapsedMs={runStartedAt ? Math.max(0, now - runStartedAt) : 0}
            />
            {banner && <div className="rounded-2xl bg-[#ffb02e] px-4 py-2 text-sm font-semibold text-[#0b1b33]">{banner}</div>}
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

          {/* Bottom box: meters left, centered. Unlocked creatures play faintly behind it on phones.
              Wrapped in a full-frame layer so it can stay hidden during the opening fly-in. */}
          <div className={`pointer-events-none absolute inset-0 z-10 ${runStartedAt ? 'hud-in-bottom' : 'hud-hidden'}`}>
            <BottomBar targetName={target?.name ?? null} distanceM={toTarget} hintLevel={hintLevel} player={fix?.pos ?? null} targetPos={target?.coords ?? null} />
          </div>

          <div className={`absolute inset-x-0 bottom-[6.5rem] z-10 flex flex-col gap-2 p-4 pt-0 ${runStartedAt ? 'hud-in-bottom' : 'hud-hidden'}`}>
            {DEBUG && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setHintLevel((h) => ((h % 3) + 1) as 1 | 2 | 3)} className="min-h-11 rounded-xl bg-[#005bbb] px-3 text-xs font-semibold">
                  Hint level {hintLevel}
                </button>
                <button type="button" disabled={!target} onClick={() => {
                  if (!target) return
                  setCollected((c) => [...c, target.id])
                  recordCatch(target.creatureId, 'caught')
                  setArrivedId(target.id)
                }} className="min-h-11 rounded-xl bg-[#3ddc97] px-3 text-xs font-semibold text-[#0b1b33] disabled:opacity-40">
                  Collect target
                </button>
                <button type="button" onClick={() => {
                  setCollected([])
                  resetDex()
                  setArrivedId(null)
                }} className="min-h-11 rounded-xl border border-white/15 bg-[#0b1b33] px-3 text-xs font-semibold">
                  Reset
                </button>
              </div>
            )}
          </div>
      </div>
    </AppShell>
  )
}
