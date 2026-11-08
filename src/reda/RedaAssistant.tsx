/**
 * Reda: a floating robotic-buffalo companion. Press and hold to talk.
 *
 * Layers (outer → inner), so motions compose instead of fighting:
 *   .reda-float  interaction motion (idle bob, listening swell, thinking wobble, speaking bounce)
 *   .reda-emote  emotion motion (hop, tilt, sink, celebrate…), restarted on each reaction
 *   head SVG     face from RedaExpressions
 */
import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { RedaFace, faceFor } from './RedaExpressions'
import { useRedaState } from './useRedaState'
import { useVoiceInteraction } from './useVoiceInteraction'
import { useRedaNarration } from './useRedaNarration'
import './RedaAnimations.css'

interface Props {
  /** Current target name, shared with the AI as context. */
  targetName?: string | null
  /** Distance from the bottom of the map, px. */
  bottomPx?: number
  /** Hide Reda (e.g. before the run starts). Voice state is kept. */
  hidden?: boolean
  name?: string
}

const SPARKLE_EMOTIONS = new Set(['excited', 'celebrating', 'wink', 'surprised'])

/** Deterministic pseudo-random from a seed, so particle layout is stable per reaction. */
function rng(seed: number) {
  let s = Math.floor(seed * 2 ** 31) || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function RedaAssistant({ targetName = null, bottomPx = 168, hidden = false, name = 'Reda' }: Props) {
  const reda = useRedaState()
  const levelElRef = useRef<HTMLDivElement>(null)
  const voice = useVoiceInteraction(reda, { targetName, levelElRef })
  // Listen even while hidden: 'run-started' fires in the same moment Reda appears.
  useRedaNarration(reda)

  const { interaction } = reda
  const { emotion, key, seed } = reda.emotion
  const face = faceFor(interaction, emotion)

  // Random-but-stable float speed for this Reda, so it doesn't feel mechanical.
  const [floatDur] = useState(() => `${(2.9 + Math.random() * 0.9).toFixed(2)}s`)

  const particles = useMemo(() => {
    if (!SPARKLE_EMOTIONS.has(emotion)) return []
    const r = rng(seed)
    const count = emotion === 'celebrating' ? 12 : emotion === 'excited' ? 8 : 4
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.6
      const dist = 34 + r() * 22
      return {
        dx: Math.cos(a) * dist,
        dy: Math.sin(a) * dist - 8,
        delay: Math.round(r() * 260),
        size: 7 + r() * 7,
        gold: emotion === 'celebrating' ? i % 2 === 0 : r() > 0.6,
      }
    })
  }, [emotion, seed])

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // keep the hold even if the finger drifts off Reda
    } catch {
      /* pointer already gone */
    }
    voice.pressStart()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault()
      voice.pressStart()
    }
  }
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      voice.pressEnd()
    }
  }

  const statusLabel =
    interaction === 'listening' ? 'listening' : interaction === 'thinking' ? 'thinking' : interaction === 'speaking' ? 'speaking' : emotion === 'sleepy' ? 'resting' : 'ready'

  return (
    <div
      className={`reda-root${hidden ? ' reda-hidden' : ''}`}
      data-state={interaction}
      data-emotion={emotion}
      style={{ bottom: bottomPx, '--float-dur': floatDur } as CSSProperties}
    >
      {/* No on-screen text: Reda answers out loud. This is only read by screen readers. */}
      <span className="reda-sr-only" role="status" aria-live="polite">
        {voice.bubble?.kind === 'listening' || voice.bubble?.kind === 'thinking' ? voice.bubble.text : voice.bubble?.kind === 'error' ? voice.bubble.text : ''}
      </span>

      <button
        type="button"
        className="reda-btn"
        aria-label={`${name}, your campus companion (${statusLabel}). Press and hold to talk.`}
        onPointerDown={onPointerDown}
        onPointerUp={() => voice.pressEnd()}
        onPointerCancel={() => voice.pressCancel()}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => voice.pressCancel()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="reda-float">
          <div key={key} className="reda-emote">
            <div className="reda-glow" aria-hidden="true" />
            <div ref={levelElRef} className="reda-waves" aria-hidden="true">
              <span style={{ '--i': 0 } as CSSProperties} />
              <span style={{ '--i': 1 } as CSSProperties} />
              <span style={{ '--i': 2 } as CSSProperties} />
            </div>

            <svg className="reda-head" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <radialGradient id="reda-shell" cx="40%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#dcebfb" />
                  <stop offset="100%" stopColor="#a9c8ea" />
                </radialGradient>
                <linearGradient id="reda-horn" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#FFB627" />
                </linearGradient>
              </defs>

              <g>
                {/* horns */}
                <path className="reda-horn reda-horn-l" d="M33 40 C22 38 13 30 11 16 C18 24 26 27 36 30 Z" fill="url(#reda-horn)" stroke="var(--reda-trim)" strokeWidth="2.2" strokeLinejoin="round" />
                <path className="reda-horn reda-horn-r" d="M87 40 C98 38 107 30 109 16 C102 24 94 27 84 30 Z" fill="url(#reda-horn)" stroke="var(--reda-trim)" strokeWidth="2.2" strokeLinejoin="round" />
                {/* ears */}
                <ellipse className="reda-ear reda-ear-l" cx="25" cy="60" rx="6.5" ry="4" fill="url(#reda-shell)" stroke="var(--reda-trim)" strokeWidth="2.2" />
                <ellipse className="reda-ear reda-ear-r" cx="95" cy="60" rx="6.5" ry="4" fill="url(#reda-shell)" stroke="var(--reda-trim)" strokeWidth="2.2" />
                {/* head */}
                <path d="M60 22 C86 22 98 38 98 60 C98 84 84 100 60 100 C36 100 22 84 22 60 C22 38 34 22 60 22 Z" fill="url(#reda-shell)" stroke="var(--reda-trim)" strokeWidth="2.6" />
                {/* forehead LED */}
                <circle className="reda-led" cx="60" cy="30" r="3.2" />
                {/* visor screen */}
                <rect x="29" y="38" width="62" height="42" rx="19" fill="#0b1b33" stroke="var(--reda-trim)" strokeWidth="2.2" />
                <rect className="reda-visor-glow" x="31.5" y="40.5" width="57" height="37" rx="17" />
                {/* snout */}
                <ellipse cx="60" cy="90" rx="17" ry="8.5" fill="#cfe2f6" stroke="var(--reda-trim)" strokeWidth="2" />
                <ellipse cx="54" cy="90" rx="2" ry="2.6" fill="#0b65c2" />
                <ellipse cx="66" cy="90" rx="2" ry="2.6" fill="#0b65c2" />

                <RedaFace face={face} />
              </g>
            </svg>

            {/* thinking dots / question mark */}
            {(interaction === 'thinking' || face === 'curious') && (
              <div className="reda-think" aria-hidden="true">
                {interaction === 'thinking' ? (
                  <span className="reda-dots"><i /><i /><i /></span>
                ) : (
                  <span className="reda-question">?</span>
                )}
              </div>
            )}
            {emotion === 'sleepy' && interaction === 'idle' && <span className="reda-zzz" aria-hidden="true">z</span>}

            {particles.length > 0 && (
              <div className="reda-particles" aria-hidden="true">
                {particles.map((p, i) => (
                  <svg
                    key={i}
                    className={`reda-spark${p.gold ? ' gold' : ''}`}
                    width={p.size}
                    height={p.size}
                    viewBox="0 0 24 24"
                    style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.delay}ms` } as CSSProperties}
                  >
                    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
                  </svg>
                ))}
              </div>
            )}
          </div>
        </div>

        {interaction === 'listening' && (
          <span className="reda-mic" aria-hidden="true">
            <MicIcon />
          </span>
        )}
      </button>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

export default RedaAssistant
