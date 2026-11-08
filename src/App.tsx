// TEMPORARY demo page for the map module. Local state only (no store).
// Real screens and game logic live elsewhere (see CLAUDE.md section 5).
import { useEffect, useMemo, useState } from 'react'
import { ALL_LOCATIONS, toCreature, toStop, type Location } from './game/locations'
import { pickRandom, pickRun } from './game/pickLocations'
import { setRunCreatureIds } from './game/run'
import { CONFIG } from './config'
import { DebugOverlay } from './map/DebugOverlay'
import { GameMap } from './map/GameMap'
import { distanceM } from './location/geo'
import { ClockBadge, DexStrip, DistanceDial, MissionPill, MusicToggle } from './hud/Hud'
import { recordCatch, resetDex } from './game/dex'
import { ROSTER } from './data/roster'
import { questionsFor } from './data/questions'
import type { CatchResult } from './game/scoring'
import { CatchScreen } from './screens/CatchScreen'
import { EndScreen } from './screens/EndScreen'
import { LocationGate } from './screens/LocationGate'
import { CreatureYard } from './hud/CreatureYard'
import { parMsFor, scoreRun, type StopResult } from './game/runScore'
import { PlaceLearnedSheet } from './screens/PlaceLearnedSheet'
import type { LngLat } from './types'
import { AppShell } from './layout/AppShell'
import { usePlayerPosition } from './location/usePlayerPosition'
import { StartScreen } from './screens/StartScreen'
import { getCharacter, loadCharacterId, saveCharacterId } from './characters'
import { RedaAssistant } from './reda/RedaAssistant'
import { emitGameEvent, reportDistanceToTarget } from './reda/redaEvents'
import { unlockAudio } from './api'
import { startMusic } from './audio/bgMusic'

// Space kept free at the bottom of the map. The locate button sits here and the compass above it
// (two 48 px buttons, 12 px apart = 108 px). The 120 px radar on the left is centered on that pair.
// 42 puts the radar's bottom edge at 36 px, just above the Mapbox logo.
const MAP_BOTTOM_INSET = 42
const RADAR_BOTTOM = MAP_BOTTOM_INSET + 108 / 2 - 120 / 2

// Every page load is a fresh run: forget anything saved from the last one.
resetDex()

/** Longest the quiz waits for Reda's arrival line. */
const ARRIVAL_LISTEN_MAX_MS = 45_000

const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1'

const STATUS_TEXT: Record<string, string> = {
  denied: 'Location is off. Turn it on for this site in your browser settings, then reload.',
  unavailable: 'We cannot find your location right now. Check your signal and try again.',
  weak: 'GPS signal is weak. Move into the open.',
}

export default function App() {
  // This run's locations (5 of the 8): the one nearest the player first, the rest random.
  // Empty until the player's first position arrives (or GPS fails / is too slow).
  const [runLocations, setRunLocations] = useState<Location[]>([])
  const [startPos, setStartPos] = useState<LngLat | null>(null) // where the player was when the run was picked (for par time)
  const [caughtStops, setCaughtStops] = useState<string[]>([]) // stops whose creature was caught, added when the facts sheet closes
  const [results, setResults] = useState<StopResult[]>([]) // one per finished stop, in the order visited
  const stops = useMemo(() => runLocations.map(toStop), [runLocations])
  const creatures = useMemo(() => runLocations.map(toCreature), [runLocations])
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

  const gpsFailed = status === 'denied' || status === 'unavailable'
  useEffect(() => {
    if (runLocations.length > 0 || !(launching || startedAt !== null)) return
    const choose = (from: LngLat | null) => {
      const picked = pickRun(ALL_LOCATIONS, from, CONFIG.stopsPerRun)
      setRunLocations(picked)
      setStartPos(from)
      setRunCreatureIds(picked.map((l) => l.creatureId))
    }
    if (fix) return choose(fix.pos)
    if (gpsFailed) return DEBUG ? choose(null) : undefined // without GPS the game is blocked (see LocationGate)
    const t = setTimeout(() => choose(null), CONFIG.mapStartWaitMs + 2000)
    return () => clearTimeout(t)
  }, [runLocations, launching, startedAt, fix, gpsFailed])

  // The first mission is the nearest stop. After that each next stop is picked at random from the rest.
  const [targetId, setTargetId] = useState<string | null>(null)
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
  // Reda reads the distance the game already computed (closer / wrong way / building reached).
  useEffect(() => {
    if (runStartedAt && !arrivedId) reportDistanceToTarget(targetId, toTarget)
  }, [runStartedAt, arrivedId, targetId, toTarget])
  // A new target is shown (first one after the intro, then after each stop).
  useEffect(() => {
    if (runStartedAt && targetId) emitGameEvent('leg-start', targetId)
  }, [runStartedAt, targetId])

  // The stopwatch runs from the start of the run until the last creature is found. It never pauses
  // (not during quizzes or fact sheets) and never restarts.
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  useEffect(() => {
    if (finishedAt === null && stops.length > 0 && collected.length >= stops.length) setFinishedAt(Date.now())
  }, [collected, stops, finishedAt])
  const elapsedMs = runStartedAt ? Math.max(0, (finishedAt ?? now) - runStartedAt) : 0

  // Arrival flow: reach a stop -> quiz (CatchScreen) -> facts (PlaceLearnedSheet) -> next stop.
  // catchResult is null while the quiz is open, then holds the result while the facts sheet is open.
  const [catchResult, setCatchResult] = useState<CatchResult | null>(null)
  // On arrival the player listens to Reda first; the quiz opens when the line ends.
  // Never waits longer than ARRIVAL_LISTEN_MAX_MS, and carries on at once if there's no voice.
  const [listeningAt, setListeningAt] = useState<string | null>(null)
  const arrive = (stopId: string) => {
    if (arrivedId || collected.includes(stopId)) return
    setArrivedId(stopId)
    setCatchResult(null)
    setListeningAt(stopId)
    const cap = new Promise<void>((r) => window.setTimeout(r, ARRIVAL_LISTEN_MAX_MS))
    void Promise.race([emitGameEvent('destination-reached', stopId), cap]).then(() =>
      setListeningAt((id) => (id === stopId ? null : id)),
    )
  }
  // Tapping "Tap to unlock" (only shown within creatureCatchM) starts the quiz for that stop.
  const unlockCreature = (creatureId: string) => {
    const creature = creatures.find((c) => c.id === creatureId)
    if (creature) arrive(creature.stopId)
  }
  const finishCatch = (result: CatchResult, correct: number) => {
    if (arrivedStop) setResults((r) => [...r.filter((x) => x.stopId !== arrivedStop.id), { stopId: arrivedStop.id, creatureId: arrivedStop.creatureId, correct, caught: result !== 'escaped' }])
    // Wrong answers: the creature is not added to the Dex, but the stop still counts.
    if (result !== 'escaped' && arrivedStop) recordCatch(arrivedStop.creatureId, result)
    setCatchResult(result)
  }
  const leaveStop = () => {
    if (arrivedId && results.find((r) => r.stopId === arrivedId)?.caught) setCaughtStops((c) => (c.includes(arrivedId) ? c : [...c, arrivedId]))
    if (arrivedId) setCollected((c) => (c.includes(arrivedId) ? c : [...c, arrivedId]))
    setArrivedId(null)
    setCatchResult(null)
  }
  const arrivedStop = stops.find((s) => s.id === arrivedId) ?? null
  const arrivedCreature = arrivedStop ? ROSTER.find((c) => c.id === arrivedStop.creatureId) ?? null : null
  const arrivedQuestions = useMemo(() => (arrivedId ? questionsFor(arrivedId) : []), [arrivedId])

  // No location (denied, or the device cannot give one) before the first position: block the game and the map.
  // Debug mode skips this so the teleport tools still work on a laptop without GPS.
  if (!DEBUG && !fix && gpsFailed && (launching || startedAt !== null)) {
    return (
      <AppShell>
        <LocationGate status={status} />
      </AppShell>
    )
  }

  if (startedAt === null) {
    return (
      <AppShell>
        <StartScreen
          characterId={characterId}
          onSelect={(id) => {
            setCharacterId(id)
            saveCharacterId(id)
          }}
          onLaunch={() => {
            unlockAudio() // phones only allow audio unlocked by a tap
            startMusic()
            setLaunching(true)
          }}
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
            caughtIds={caughtStops}
            onCreatureTap={unlockCreature}
            onMapTap={DEBUG && teleportMode ? (pos) => injectFix(pos) : undefined}
            bottomInsetPx={MAP_BOTTOM_INSET}
            heading={heading}
            character={getCharacter(characterId)}
            freeCamera={DEBUG}
            onIntroDone={() => {
              setRunStartedAt((t) => t ?? Date.now()) // set once, never reset
              setNow(Date.now())
              emitGameEvent('run-started')
            }}
            gpsFailed={gpsFailed}
          />

          {/* Top HUD */}
          <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] ${runStartedAt ? 'hud-in-top' : 'hud-hidden'}`}>
            <DexStrip />
            <div className="flex items-start justify-between gap-3">
              <MissionPill
                stopNumber={Math.min(collected.length + 1, stops.length)}
                stopCount={stops.length}
                targetName={target?.name ?? null}
              />
              <div className="flex flex-col items-center gap-2">
                <ClockBadge elapsedMs={elapsedMs} />
                <MusicToggle />
              </div>
            </div>
            {banner && <div className="rounded-2xl bg-[#ffb02e] px-4 py-2 text-sm font-semibold text-[#0b1b33]">{banner}</div>}
          </div>

          {/* Reda companion: floats above the compass/locate buttons, under full-screen overlays. */}
          <RedaAssistant targetName={target?.name ?? null} bottomPx={MAP_BOTTOM_INSET + 108 + 20} hidden={!runStartedAt} />

          {/* Arrived: listen to Reda before the quiz opens. */}
          {arrivedStop && listeningAt === arrivedStop.id && (
            <div className="pointer-events-none absolute right-3 z-20 flex max-w-[calc(100%-1.5rem)] justify-end" style={{ bottom: MAP_BOTTOM_INSET + 108 + 20 + 84 }} role="status" aria-live="polite">
              <div className="anim-rise flex items-center gap-2 rounded-full border border-[#16c8f4]/60 bg-[rgba(8,20,40,0.9)] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16c8f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-pulse">
                  <path d="M11 5L6 9H3v6h3l5 4V5z" fill="#16c8f4" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                </svg>
                Listen to Reda about {arrivedStop.name}
              </div>
            </div>
          )}

          {arrivedStop && arrivedCreature && catchResult === null && listeningAt !== arrivedStop.id && (
            <CatchScreen key={arrivedStop.id} creature={arrivedCreature} questions={arrivedQuestions} onDone={finishCatch} />
          )}
          {arrivedStop && arrivedCreature && catchResult !== null && (
            <PlaceLearnedSheet
              creature={arrivedCreature}
              result={catchResult}
              questions={arrivedQuestions}
              onNext={leaveStop}
              nextLabel={collected.length + 1 >= stops.length ? 'Finish' : 'Next stop'}
            />
          )}

          {DEBUG && <DebugOverlay fix={fix} status={status} targetPos={target?.coords ?? null} hintLevel={hintLevel}
              teleportMode={teleportMode}
              onToggleTeleport={() => {
                if (teleportMode) resumeGps()
                setTeleportMode((t) => !t)
              }}
            />}

          {/* Caught creatures slide down here and stay, playing. Clear of the radar (left) and the buttons (right). */}
          <CreatureYard
            creatureIds={caughtStops.map((id) => stops.find((s) => s.id === id)?.creatureId).filter((id): id is string => !!id)}
            leftPx={148}
            rightPx={80}
            bottomPx={16}
          />

          {/* Radar distance dial, bottom-left corner. */}
          <DistanceDial targetName={target?.name ?? null} creatureId={target?.creatureId ?? null} distanceM={toTarget} hintLevel={hintLevel} player={fix?.pos ?? null} targetPos={target?.coords ?? null} bottomPx={RADAR_BOTTOM} />

          {finishedAt !== null && !arrivedId && results.length > 0 && (
            <EndScreen
              score={scoreRun(results, elapsedMs, parMsFor([...(startPos ? [startPos] : []), ...results.map((r) => stops.find((s) => s.id === r.stopId)?.coords).filter((c): c is LngLat => !!c)], stops.length))}
              creatures={results.map((r) => {
                const info = ROSTER.find((c) => c.id === r.creatureId)
                return { id: r.creatureId, name: info?.name ?? r.creatureId, placeName: info?.stopName ?? '', caught: r.caught }
              })}
              onPlayAgain={() => window.location.reload()}
            />
          )}

          <div className="absolute inset-x-0 bottom-[10rem] z-10 flex flex-col gap-2 p-4 pt-0">
            {DEBUG && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setHintLevel((h) => ((h % 3) + 1) as 1 | 2 | 3)} className="min-h-11 rounded-xl bg-[#005bbb] px-3 text-xs font-semibold">
                  Hint level {hintLevel}
                </button>
                <button type="button" disabled={!target} onClick={() => {
                  if (target) arrive(target.id)
                }} className="min-h-11 rounded-xl bg-[#3ddc97] px-3 text-xs font-semibold text-[#0b1b33] disabled:opacity-40">
                  Collect target
                </button>
                <button type="button" onClick={() => {
                  setCollected([])
                  resetDex()
                  setListeningAt(null)
                  setArrivedId(null)
                  setCatchResult(null)
                  setFinishedAt(null)
                  setResults([])
                  setCaughtStops([])
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
