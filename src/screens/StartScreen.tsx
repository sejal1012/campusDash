import { useEffect, useRef, type CSSProperties } from 'react'
import './start.css'

const A = '/start/'

type Dance = 'sway' | 'hop' | 'groove' | 'step' | 'wobble'

/** Arc of mascots behind the ring: x = center (% of stage width), y = feet (% from stage bottom), w = width %. */
const MASCOTS: Array<{ src: string; alt: string; x: number; y: number; w: number; z: number; dance: Dance; phase: number }> = [
  { src: 'mascot-winter.webp', alt: 'Winter UBMon', x: 12, y: 49, w: 19, z: 1, dance: 'sway', phase: 0 },
  { src: 'mascot-football.webp', alt: 'Football UBMon', x: 30, y: 42, w: 22, z: 2, dance: 'hop', phase: 0.15 },
  { src: 'mascot-guide.webp', alt: 'Guide UBMon', x: 50, y: 37, w: 27, z: 3, dance: 'groove', phase: 0 },
  { src: 'mascot-basketball.webp', alt: 'Basketball UBMon', x: 71, y: 42, w: 23, z: 2, dance: 'step', phase: 0.3 },
  { src: 'mascot-scientist.webp', alt: 'Scientist UBMon', x: 88.5, y: 49, w: 20, z: 1, dance: 'wobble', phase: 0.45 },
]

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

/** Animated, layered title screen. Tilt the phone (or move the mouse) for parallax depth. */
export function StartScreen({ onStart }: { onStart: () => void }) {
  const root = useRef<HTMLDivElement>(null)

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
    <div ref={root} className="ss">
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
        <div className="ss-par ss-stage" style={depth(9)}>
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

          {MASCOTS.map((m, i) => (
            <div
              key={m.src}
              className="ss-mascot"
              style={{ left: `${m.x - m.w / 2}%`, bottom: `${m.y}%`, width: `${m.w}%`, zIndex: m.z, animationDelay: `${0.35 + i * 0.12}s` }}
            >
              <span className={`ss-shadow ss-shadow-${m.dance}`} style={{ animationDelay: `${1.1 + i * 0.12 + m.phase}s` }} />
              <img
                src={`${A}${m.src}`}
                alt={m.alt}
                className={`ss-dance ss-dance-${m.dance}`}
                style={{ animationDelay: `${1.1 + i * 0.12 + m.phase}s` }}
                draggable={false}
              />
            </div>
          ))}

          {SPARKLES.map((s, i) => (
            <span key={i} className="ss-sparkle" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} aria-hidden="true" />
          ))}
        </div>

        <footer className="ss-footer">
          <button type="button" onClick={onStart} className="ss-start">
            <span className="ss-start-label">Start the Challenge</span>
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
    </div>
  )
}
