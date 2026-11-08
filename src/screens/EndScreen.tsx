import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreatureArt } from '../components/CreatureArt'
import { CREATURE_FX, DEFAULT_FX } from '../layout/creatureFx'
import { formatStopwatch } from '../hud/Hud'
import { POINTS, type RunScore } from '../game/runScore'
import './end.css'

export interface EndCreature {
  id: string
  name: string
  placeName: string
  caught: boolean
}

interface Props {
  score: RunScore
  creatures: EndCreature[]
  onPlayAgain: () => void
}

const TITLES: Record<1 | 2 | 3, { title: string; line: string }> = {
  3: { title: 'Campus Legend', line: 'You know this campus like the back of your hand.' },
  2: { title: 'Trailblazer', line: 'Strong run. A few more answers and you are a legend.' },
  1: { title: 'Rookie Explorer', line: 'Every legend starts with a first lap. Go again!' },
}
const CONFETTI = ['#ffd34d', '#ff7a59', '#3ddc97', '#6cc8ff', '#ff8ad8', '#ffffff']
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Counts up from 0 to `to` after `delay` ms. */
function useCountUp(to: number, delay: number, duration = 1400): number {
  const [v, setV] = useState(() => (reducedMotion() ? to : 0))
  useEffect(() => {
    if (reducedMotion()) return
    let raf = 0
    const t0 = performance.now() + delay
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration))
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, delay, duration])
  return v
}

/** A chunky 3D star: 12 star-shaped slices stacked in depth. Gold when earned, steel grey when not. */
function Star3D({ earned, size, delay }: { earned: boolean; size: number; delay: number }) {
  const SLICES = 12
  const depth = Math.max(2, size / 46)
  const slices = Array.from({ length: SLICES }, (_, i) => {
    const t = i / (SLICES - 1) // 0 = back, 1 = front
    const front = i === SLICES - 1
    const edge = earned ? `hsl(${34 + t * 14} ${78 + t * 14}% ${28 + t * 18}%)` : `hsl(222 14% ${20 + t * 10}%)`
    const face = earned
      ? 'radial-gradient(circle at 38% 28%, #fffbe0 0%, #ffe27a 28%, #ffc21f 62%, #e89a00 100%)'
      : 'radial-gradient(circle at 38% 28%, #8a93a8 0%, #5d6679 45%, #3b4254 100%)'
    return (
      <span
        key={i}
        className="star3d-slice"
        style={{ transform: `translateZ(${(i - SLICES / 2) * depth}px)`, background: front ? face : edge }}
      />
    )
  })
  const fx = earned ? ['✨', '⭐', '✨', '💫', '✨', '⭐'] : []
  return (
    <div className="star3d-fly" style={{ animationDelay: `${delay}ms` }}>
      <div className="star3d-wrap" style={{ width: size, height: size }}>
        {earned && (
          <div className="star3d-glow" style={{ background: 'radial-gradient(circle, rgba(255,211,77,0.55), transparent 62%)', animationDelay: `${delay}ms` }} />
        )}
        <div className={`star3d ${earned ? 'is-earned' : ''}`} style={{ '--d': `${delay}ms` } as React.CSSProperties}>{slices}</div>
        {fx.map((ch, i) => (
          <span
            key={i}
            className="fx-particle"
            aria-hidden="true"
            style={{ '--dx': `${Math.cos((i / fx.length) * 6.28) * size * 0.9}px`, '--dy': `${Math.sin((i / fx.length) * 6.28) * size * 0.9 - 10}px`, fontSize: size * 0.2, animationDelay: `${delay + 700}ms` } as React.CSSProperties}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  )
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 6,
        dur: 5 + Math.random() * 5,
        sway: (Math.random() - 0.5) * 160,
        color: CONFETTI[i % CONFETTI.length],
        round: i % 3 === 0,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="end-confetti"
          style={{ left: `${p.left}%`, background: p.color, borderRadius: p.round ? 9999 : 2, animationDuration: `${p.dur}s`, animationDelay: `${1.2 + p.delay}s`, '--sway': `${p.sway}px` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, points, max, delay }: { label: string; value: string; sub: string; points: number; max: number; delay: number }) {
  return (
    <div className="end-rise rounded-2xl border border-white/15 bg-white/[0.07] p-3 text-center backdrop-blur-sm sm:p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#b9c6dc] sm:text-xs">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>{value}</div>
      <div className="text-[11px] text-white/60 sm:text-xs">{sub}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#3ddc97] to-[#ffd34d]" style={{ width: `${(points / max) * 100}%`, transition: `width 1000ms ${delay + 300}ms cubic-bezier(0.22,1,0.36,1)` }} />
      </div>
      <div className="mt-1 text-[11px] font-bold text-[#ffd34d]">+{points} <span className="font-normal text-white/50">/ {max}</span></div>
    </div>
  )
}

/** Full-page finish screen: 3D stars, score, stats and the creatures you caught. */
export function EndScreen({ score, creatures, onPlayAgain }: Props) {
  const { title, line } = TITLES[score.stars]
  const shown = useCountUp(score.points.total, 2000)
  const [shared, setShared] = useState(false)
  const sharedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(sharedTimer.current), [])

  const share = async () => {
    const text = `UB Campus Dash: ${'⭐'.repeat(score.stars)} ${title}! ${score.caught}/${score.stopCount} creatures, ${score.quizRight}/${score.quizTotal} quiz answers, ${formatStopwatch(score.elapsedMs)}.`
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setShared(true)
        clearTimeout(sharedTimer.current)
        sharedTimer.current = setTimeout(() => setShared(false), 2200)
      }
    } catch {
      /* cancelled or blocked: nothing to do */
    }
  }

  const wide = typeof window !== 'undefined' && window.innerWidth >= 640
  const overPar = score.elapsedMs - score.parMs
  const timeSub = overPar <= 0 ? `${formatStopwatch(-overPar)} under par` : `${formatStopwatch(overPar)} over par`

  return createPortal(
    <div className="end-root fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden text-white" role="dialog" aria-label="Run complete">
      <div className="end-rays" aria-hidden="true" />
      <Confetti />

      <div className="relative mx-auto flex min-h-full w-full max-w-[920px] flex-col items-center px-4 py-8 text-center sm:py-12">
        <p className="end-rise text-sm font-bold uppercase tracking-[0.3em] text-[#ffd66b]" style={{ animationDelay: '150ms' }}>Run complete</p>
        <h1 className="end-rise end-shine mt-2 text-5xl font-extrabold leading-none sm:text-7xl" style={{ animationDelay: '300ms', fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
          {title}
        </h1>

        {/* Stars: middle one is the biggest */}
        <div className="mt-10 flex items-end justify-center gap-1 sm:mt-12 sm:gap-6" role="img" aria-label={`${score.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={n === 2 ? '-translate-y-4 sm:-translate-y-8' : ''}>
              <Star3D earned={n <= score.stars} size={wide ? (n === 2 ? 210 : 160) : n === 2 ? 144 : 108} delay={700 + (n - 1) * 450} />
            </div>
          ))}
        </div>

        <div className="end-pop mt-5" style={{ animationDelay: '1900ms' }}>
          <div className="text-6xl font-extrabold tabular-nums text-white sm:text-7xl" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
            {shown}
            <span className="ml-1 text-2xl font-bold text-[#b9c6dc]">/ 100</span>
          </div>
        </div>
        <p className="end-rise mt-1 max-w-md text-base text-[#cfe0ff]" style={{ animationDelay: '2100ms' }}>{line}</p>

        {score.badges.length > 0 && (
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {score.badges.map((b, i) => (
              <li key={b} className="end-pop rounded-full border border-[#ffd34d]/50 bg-[#ffd34d]/15 px-3 py-1 text-xs font-bold text-[#ffe9a3]" style={{ animationDelay: `${2300 + i * 150}ms` }}>
                🏅 {b}
              </li>
            ))}
          </ul>
        )}

        {/* What counted */}
        <div className="mt-7 grid w-full max-w-[680px] grid-cols-3 gap-2 sm:gap-4">
          <StatCard label="Creatures" value={`${score.caught}/${score.stopCount}`} sub="caught" points={score.points.creatures} max={POINTS.creatures} delay={2500} />
          <StatCard label="Quiz" value={`${score.quizRight}/${score.quizTotal}`} sub="right answers" points={score.points.quiz} max={POINTS.quiz} delay={2650} />
          <StatCard label="Time" value={formatStopwatch(score.elapsedMs)} sub={timeSub} points={score.points.speed} max={POINTS.speed} delay={2800} />
        </div>

        {/* The creatures */}
        <h2 className="end-rise mt-9 text-xs font-semibold uppercase tracking-[0.25em] text-[#b9c6dc]" style={{ animationDelay: '3000ms' }}>Your creatures</h2>
        <ul className="mt-4 flex w-full flex-wrap justify-center gap-3 sm:gap-4">
          {creatures.map((c, i) => {
            const emoji = (CREATURE_FX[c.id] ?? DEFAULT_FX)[0]
            return (
              <li
                key={c.id}
                className={`end-pop relative flex w-[104px] flex-col items-center rounded-2xl border p-2 pb-3 sm:w-[140px] ${c.caught ? 'end-creature-glow border-[#ffd34d]/40 bg-white/10' : 'border-white/10 bg-white/[0.04]'}`}
                style={{ animationDelay: `${3200 + i * 180}ms` }}
              >
                {c.caught && <span className="absolute -right-1 -top-2 text-xl" aria-hidden="true">{emoji}</span>}
                <div className={c.caught ? 'end-bob' : ''} style={{ animationDelay: `${i * 250}ms` }}>
                  <CreatureArt id={c.id} name={c.name} look={c.caught ? 'color' : 'gray'} size={110} className="h-auto w-[84px] sm:w-[112px]" />
                </div>
                <div className="mt-1 text-sm font-bold">{c.name}</div>
                <div className="text-[11px] text-white/55">{c.caught ? c.placeName : 'ran off. Try again!'}</div>
              </li>
            )
          })}
        </ul>

        <div className="end-rise mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: `${3300 + creatures.length * 180}ms` }}>
          <button type="button" onClick={onPlayAgain} className="min-h-12 rounded-full bg-[#ffb02e] px-8 text-base font-bold text-[#0b1b33] shadow-[0_8px_24px_rgba(255,176,46,0.35)] active:bg-[#e69a1f]">
            Play again
          </button>
          <button type="button" onClick={share} className="min-h-12 rounded-full border border-white/25 bg-white/10 px-8 text-base font-bold text-white active:bg-white/20">
            {shared ? 'Copied!' : 'Share result'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
