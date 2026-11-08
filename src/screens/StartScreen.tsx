import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CHARACTERS, carouselSlot } from '../characters'
import './start.css'

const A = '/start/'

/**
 * Carousel slots around the ring, by offset from the selected mascot (-2..2).
 * x = centre (% of stage width), y = feet (% from stage bottom), w = width %.
 */
const SLOTS: Record<number, { x: number; y: number; w: number; z: number }> = {
  [-2]: { x: 12, y: 49, w: 19, z: 1 },
  [-1]: { x: 30, y: 42, w: 22, z: 2 },
  0: { x: 50, y: 37, w: 28, z: 3 },
  1: { x: 70, y: 42, w: 22, z: 2 },
  2: { x: 88, y: 49, w: 19, z: 1 },
}
const PHASES = [0, 0.15, 0, 0.3, 0.45]

const FALLING_LEAVES = [
  { left: 4, delay: 0, dur: 9, dx: 120, color: '#e2541c' },
  { left: 14, delay: 2.5, dur: 11, dx: 160, color: '#f0a020' },
  { left: 24, delay: 5, dur: 10, dx: 90, color: '#c8321a' },
  { left: 8, delay: 7, dur: 12, dx: 200, color: '#e8bf2a' },
  { left: 32, delay: 3.5, dur: 9.5, dx: 140, color: '#e07a1e' },
  { left: 18, delay: 9, dur: 10.5, dx: 110, color: '#b8401c' },
]

const SPARKLES = [
  { left: 8, top: 52, delay: 0, size: 12 },
  { left: 90, top: 49, delay: 0.8, size: 14 },
  { left: 22, top: 68, delay: 1.6, size: 10 },
  { left: 80, top: 66, delay: 0.4, size: 12 },
  { left: 60, top: 44, delay: 1.2, size: 9 },
  { left: 40, top: 46, delay: 2, size: 8 },
  { left: 95, top: 30, delay: 2.4, size: 9 },
]

const depth = (d: number) => ({ '--d': d }) as CSSProperties

interface Props {
  characterId: string
  onSelect: (id: string) => void
  /** Called the moment Start is tapped (begin finding the player while the exit animation plays). */
  onLaunch?: () => void
  /** Called when the exit animation has finished. */
  onStart: () => void
}

/** Length of the exit animation (keep in step with the .ss-leaving keyframes in start.css). */
const EXIT_MS = 1100

/**
 * Animated, layered title screen with a character picker: the mascots rotate around the ring
 * (swipe, arrows, arrow keys, or tap one) and the one in front is the player's UBMon.
 */
export function StartScreen({ characterId, onSelect, onLaunch, onStart }: Props) {
  const root = useRef<HTMLDivElement>(null)
  // Exit: the chosen UBMon dives into the ring, the others hop away, then a flash hands over to the map.
  const [leaving, setLeaving] = useState(false)
  const start = () => {
    if (leaving) return
    setLeaving(true)
    onLaunch?.()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(onStart, reduce ? 0 : EXIT_MS)
  }
  const selected = Math.max(0, CHARACTERS.findIndex((c) => c.id === characterId))
  const current = CHARACTERS[selected]
  // Track the latest pick in a ref so several quick taps each move one step (before React re-renders).
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])
  const rotate = (step: number) => {
    if (leaving) return
    const n = CHARACTERS.length
    selectedRef.current = (selectedRef.current + step + n) % n
    onSelect(CHARACTERS[selectedRef.current].id)
  }
  const rotateRef = useRef(rotate)
  useEffect(() => {
    rotateRef.current = rotate
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') rotateRef.current(-1)
      if (e.key === 'ArrowRight') rotateRef.current(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Swipe across the stage to rotate.
  const swipeStart = useRef<number | null>(null)
  const onStagePointerDown = (e: React.PointerEvent) => {
    swipeStart.current = e.clientX
  }
  const onStagePointerUp = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return
    const dx = e.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) > 40) rotate(dx < 0 ? 1 : -1)
  }

  // Parallax: pointer on desktop, tilt where the browser allows it without a prompt (Android).
  useEffect(() => {
    const el = root.current
    if (!el) return
    const set = (x: number, y: number) => {
      el.style.setProperty('--px', Math.max(-1, Math.min(1, x)).toFixed(3))
      el.style.setProperty('--py', Math.max(-1, Math.min(1, y)).toFixed(3))
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
    }
    const onLeave = () => set(0, 0)
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      set(e.gamma / 25, (e.beta - 50) / 25)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('deviceorientation', onTilt)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('deviceorientation', onTilt)
    }
  }, [])

  return (
    <div ref={root} className={`ss${leaving ? ' ss-leaving' : ''}`} aria-busy={leaving}>
      {/* Far: campus scene, slowly drifting */}
      <div className="ss-par ss-bg" style={depth(-6)}>
        <img src={`${A}campus.webp`} alt="" className="ss-campus" />
      </div>

      {/* Glowing floor grid that scrolls toward you */}
      <div className="ss-floor" aria-hidden="true">
        <div className="ss-grid" />
      </div>

      {/* Near: branches sway, autumn leaves fall */}
      <div className="ss-par ss-branch-wrap ss-branch-wrap-l" style={depth(16)}>
        <img src={`${A}branch-fall.webp`} alt="" className="ss-branch ss-branch-l" />
      </div>
      <div className="ss-par ss-branch-wrap ss-branch-wrap-r" style={depth(16)}>
        <img src={`${A}branch-leaves.webp`} alt="" className="ss-branch ss-branch-r" />
      </div>
      <div className="ss-par ss-falling" style={depth(20)} aria-hidden="true">
        {FALLING_LEAVES.map((p, i) => (
          <span key={i} className="ss-leaf" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--dx': `${p.dx}px`, '--c': p.color } as CSSProperties} />
        ))}
      </div>

      <div className="ss-content">
        <header className="ss-header">
          <div className="ss-par" style={depth(5)}>
            <img src={`${A}logo.webp`} alt="UBMon Dash" className="ss-logo" />
          </div>
        </header>

        {/* Stage: fixed aspect so the mascots, ring and buffalo keep their arrangement on every phone */}
        <div className="ss-par ss-stage" style={depth(9)} onPointerDown={onStagePointerDown} onPointerUp={onStagePointerUp}>
          <div className="ss-ring" aria-hidden="true">
            <svg viewBox="0 0 400 130" className="ss-ring-svg">
              <defs>
                <radialGradient id="ss-ring-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#bfeaff" stopOpacity="0.9" />
                  <stop offset="0.55" stopColor="#4fb6ff" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#4fb6ff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse className="ss-ring-glow" cx="200" cy="65" rx="190" ry="60" fill="url(#ss-ring-glow)" />
              <ellipse className="ss-ring-pulse" cx="200" cy="65" rx="150" ry="44" />
              <ellipse className="ss-ring-pulse" cx="200" cy="65" rx="150" ry="44" style={{ animationDelay: '0.8s' }} />
              <ellipse className="ss-ring-pulse" cx="200" cy="65" rx="150" ry="44" style={{ animationDelay: '1.6s' }} />
              <ellipse className="ss-ring-main" cx="200" cy="65" rx="150" ry="44" />
              <ellipse className="ss-ring-dash" cx="200" cy="65" rx="176" ry="54" />
              <ellipse className="ss-ring-inner" cx="200" cy="65" rx="112" ry="32" />
            </svg>
            <img src={`${A}buffalo.webp`} alt="" className="ss-buffalo" />
          </div>

          {CHARACTERS.map((c, i) => {
            const slot = carouselSlot(i, selected)
            const s = SLOTS[slot]
            const delay = 1.1 + i * 0.12 + PHASES[i]
            return (
              <button
                type="button"
                key={c.id}
                className={`ss-mascot${slot === 0 ? ' is-selected' : ''}`}
                aria-label={slot === 0 ? `${c.name}, selected` : `Choose ${c.name}`}
                aria-pressed={slot === 0}
                onClick={() => slot !== 0 && onSelect(c.id)}
                style={{ left: `${s.x - s.w / 2}%`, bottom: `${s.y}%`, width: `${s.w}%`, zIndex: s.z, animationDelay: `${0.35 + i * 0.12}s` }}
              >
                <span className={`ss-shadow ss-shadow-${c.dance}`} style={{ animationDelay: `${delay}s` }} />
                <img src={c.still} alt="" className={`ss-dance ss-dance-${c.dance}`} style={{ animationDelay: `${delay}s` }} draggable={false} />
              </button>
            )
          })}

          <button type="button" className="ss-arrow ss-arrow-l" aria-label="Previous UBMon" onClick={() => rotate(-1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="ss-arrow ss-arrow-r" aria-label="Next UBMon" onClick={() => rotate(1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          {SPARKLES.map((s, i) => (
            <span key={i} className="ss-sparkle" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} aria-hidden="true" />
          ))}
        </div>

        <footer className="ss-footer">
          <div className="ss-pick" aria-live="polite">
            <span className="ss-pick-hint">Choose your UBMon</span>
            <span key={current.id} className="ss-pick-name">{current.name}</span>
          </div>
          <button type="button" onClick={start} className="ss-start" disabled={leaving}>
            <span className="ss-start-label">Start</span>
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
            </svg>
          </button>
          <p className="ss-desc">
            Explore the UB campus, complete missions, find all the UBMon, and build your Campus Collection!
          </p>
        </footer>
      </div>

      {/* Front: skyline silhouette along the bottom */}
      <img src={`${A}skyline.webp`} alt="" className="ss-skyline" />

      {/* Exit flash; the map fades in from the same colour */}
      {leaving && <div className="ss-flash" aria-hidden="true" />}
    </div>
  )
}
