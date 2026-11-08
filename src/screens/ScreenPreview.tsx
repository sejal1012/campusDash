// Preview page for building screens without walking around. Open with ?screen=catch
//   ?screen=catch&stop=davis   start at a given stop
//   ?screen=card&result=gold   jump straight to the Place learned card (gold | caught | escaped)
//   &dex=demo                  pre-fill 5 catches to see the desktop side panels
// Not part of the real game flow.
import { useState } from 'react'
import { questionsFor } from '../data/questions'
import { ROSTER } from '../data/roster'
import { recordCatch, resetDex } from '../game/dex'
import type { CatchResult } from '../game/scoring'
import { AppShell } from '../layout/AppShell'
import { CatchScreen } from './CatchScreen'
import { PlaceLearnedSheet } from './PlaceLearnedSheet'

const params = new URLSearchParams(window.location.search)
const RESULTS: CatchResult[] = ['gold', 'caught', 'escaped']

// ?dex=demo pre-fills some catches so the desktop side panels have creatures roaming.
if (params.get('dex') === 'demo') {
  ROSTER.slice(0, 5).forEach((c, i) => recordCatch(c.id, i % 2 ? 'caught' : 'gold'))
}

export function ScreenPreview() {
  const [index, setIndex] = useState(() => Math.max(0, ROSTER.findIndex((c) => c.stopId === params.get('stop'))))
  const [view, setView] = useState<'catch' | 'card'>(params.get('screen') === 'card' ? 'card' : 'catch')
  const [result, setResult] = useState<CatchResult>(() => RESULTS.find((r) => r === params.get('result')) ?? 'gold')
  const [round, setRound] = useState(0) // remounts the catch screen for a fresh try

  const creature = ROSTER[index]
  const questions = questionsFor(creature.stopId)

  return (
    <AppShell>
      {/* stand-in for the map */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#0b1b33] text-sm text-white/30">Map goes here</div>

      {view === 'catch' && (
        <CatchScreen
          key={`${index}-${round}`}
          creature={creature}
          questions={questions}
          onDone={(r) => {
            recordCatch(creature.id, r)
            setResult(r)
            setView('card')
          }}
        />
      )}
      {view === 'card' && (
        <PlaceLearnedSheet
          creature={creature}
          result={result}
          questions={questions}
          onNext={() => {
            setIndex((i) => (i + 1) % ROSTER.length)
            setRound((n) => n + 1)
            setView('catch')
          }}
        />
      )}

      <button
        type="button"
        onClick={resetDex}
        className="fixed bottom-3 left-3 z-50 min-h-11 rounded-xl border border-white/15 bg-[#0b1b33]/90 px-3 text-xs font-semibold text-[#b9c6dc]"
      >
        Preview: reset Dex
      </button>
    </AppShell>
  )
}
