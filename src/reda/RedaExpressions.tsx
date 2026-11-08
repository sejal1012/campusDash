/**
 * Reda's face: LED eyes, brows and mouth drawn on the visor (SVG, viewBox 0 0 120 120).
 * Each emotion has its own shapes, so it reads without colour. Blinking and
 * glancing around are handled here with small randomised timers.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { Emotion } from './redaEvents'
import type { Interaction } from './useRedaState'

/** What the face shows: the emotion, except thinking/error/listening take over the eyes. */
export type Face = Emotion | 'listening'

export function faceFor(interaction: Interaction, emotion: Emotion): Face {
  if (interaction === 'thinking') return 'curious'
  if (interaction === 'error') return emotion === 'neutral' ? 'confused' : emotion
  if (interaction === 'listening') return 'listening'
  return emotion
}

const L = 47
const R = 73
const EY = 57
const MY = 70

const stroke = { fill: 'none', stroke: 'var(--reda-eye)', strokeWidth: 3.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const fill = { fill: 'var(--reda-eye)' }

// ---------- eye shapes ----------
const pill = (cx: number, w = 7.5, h = 12) => <rect x={cx - w / 2} y={EY - h / 2} width={w} height={h} rx={w / 2} {...fill} />
const arcUp = (cx: number) => <path d={`M${cx - 7} ${EY + 3} Q${cx} ${EY - 7} ${cx + 7} ${EY + 3}`} {...stroke} />
const arcDown = (cx: number) => <path d={`M${cx - 7} ${EY - 1} Q${cx} ${EY + 6} ${cx + 7} ${EY - 1}`} {...stroke} />
const closed = (cx: number) => <path d={`M${cx - 6.5} ${EY + 1} Q${cx} ${EY + 4.5} ${cx + 6.5} ${EY + 1}`} {...stroke} />
const sparkle = (cx: number, r = 7.5) => (
  <g>
    <circle cx={cx} cy={EY} r={r} {...fill} />
    <circle cx={cx - r * 0.35} cy={EY - r * 0.38} r={r * 0.32} fill="#fff" />
    <circle cx={cx + r * 0.38} cy={EY + r * 0.32} r={r * 0.16} fill="#fff" />
  </g>
)
const wide = (cx: number) => (
  <g>
    <circle cx={cx} cy={EY} r={8.5} fill="none" stroke="var(--reda-eye)" strokeWidth={2.6} />
    <circle cx={cx} cy={EY} r={3.6} {...fill} />
  </g>
)
const star = (cx: number, r = 8.5) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(EY + Math.sin(a) * rr).toFixed(1)}`
  })
  return <polygon points={pts.join(' ')} fill="var(--reda-star)" stroke="var(--reda-star)" strokeWidth={1} strokeLinejoin="round" />
}
const halfShut = (cx: number) => <path d={`M${cx - 6.5} ${EY + 1} Q${cx} ${EY + 7} ${cx + 6.5} ${EY + 1} Z`} {...fill} />
const dot = (cx: number, r = 3.2) => <circle cx={cx} cy={EY} r={r} {...fill} />

// ---------- mouths ----------
const mouths = {
  smile: <path d={`M53 ${MY - 1} Q60 ${MY + 5} 67 ${MY - 1}`} {...stroke} strokeWidth={3} />,
  grin: <path d={`M50 ${MY - 2} Q60 ${MY + 10} 70 ${MY - 2} Z`} {...fill} />,
  open: <ellipse cx={60} cy={MY + 1} rx={6.5} ry={5.5} {...fill} />,
  o: <ellipse cx={60} cy={MY + 1} rx={3.2} ry={3.8} fill="none" stroke="var(--reda-eye)" strokeWidth={2.6} />,
  flat: <path d={`M55 ${MY} L65 ${MY}`} {...stroke} strokeWidth={2.8} />,
  frown: <path d={`M54 ${MY + 3} Q60 ${MY - 2} 66 ${MY + 3}`} {...stroke} strokeWidth={2.8} />,
  wavy: <path d={`M51 ${MY + 1} q3 -3.5 6 0 t6 0 t6 0`} {...stroke} strokeWidth={2.6} />,
  smirk: <path d={`M52 ${MY} Q61 ${MY + 5} 68 ${MY - 3}`} {...stroke} strokeWidth={3} />,
  tilt: <path d={`M55 ${MY + 1.5} L65 ${MY - 1}`} {...stroke} strokeWidth={2.8} />,
  tiny: <ellipse cx={60} cy={MY + 1} rx={2.2} ry={1.6} {...fill} />,
}

const brow = (d: string) => <path d={d} {...stroke} strokeWidth={2.6} />

interface Parts {
  eyes: [ReactNode, ReactNode]
  mouth: ReactNode
  brows?: ReactNode
  /** Default gaze offset for this face. */
  gaze?: [number, number]
  blinks?: boolean
  blush?: boolean
}

const FACES: Record<Face, Parts> = {
  neutral: { eyes: [pill(L), pill(R)], mouth: mouths.smile, blinks: true },
  listening: { eyes: [pill(L, 8, 13), pill(R, 8, 13)], mouth: mouths.o, blinks: true, gaze: [0, -1] },
  happy: { eyes: [arcUp(L), arcUp(R)], mouth: mouths.grin, blush: true },
  excited: { eyes: [sparkle(L), sparkle(R)], mouth: mouths.open, blush: true },
  wink: { eyes: [pill(L), closed(R)], mouth: mouths.smirk, blush: true },
  curious: {
    eyes: [pill(L, 7, 10), pill(R, 8, 13)],
    mouth: mouths.tilt,
    brows: brow(`M67 46 Q73 41 80 44.5`),
    gaze: [3, -3],
    blinks: true,
  },
  surprised: { eyes: [wide(L), wide(R)], mouth: mouths.o, brows: <>{brow('M40 45 Q47 40 54 45')}{brow('M66 45 Q73 40 80 45')}</> },
  sad: {
    eyes: [arcDown(L), arcDown(R)],
    mouth: mouths.frown,
    brows: <>{brow('M40 48 L53 45')}{brow('M67 45 L80 48')}</>,
    gaze: [0, 2],
  },
  celebrating: { eyes: [star(L), star(R)], mouth: mouths.grin, blush: true },
  sleepy: { eyes: [halfShut(L), halfShut(R)], mouth: mouths.tiny, gaze: [0, 2] },
  encouraging: {
    eyes: [arcUp(L), arcUp(R)],
    mouth: mouths.smile,
    brows: <>{brow('M40 45 L53 47.5')}{brow('M67 47.5 L80 45')}</>,
  },
  confused: {
    eyes: [dot(L, 3.6), wide(R)],
    mouth: mouths.wavy,
    brows: <>{brow('M40 45.5 L53 45.5')}{brow('M66 46 Q73 39 80 43')}</>,
    gaze: [-2, 0],
  },
}

/** Eyes, brows, mouth and blush. Render inside the head <svg>. */
export function RedaFace({ face }: { face: Face }) {
  const parts = FACES[face]
  const [blink, setBlink] = useState(false)
  const [glance, setGlance] = useState<[number, number]>([0, 0])

  // Blink every 2.5–6 s (sometimes a double blink).
  useEffect(() => {
    if (!parts.blinks) return
    let t = 0
    const schedule = () => {
      t = window.setTimeout(() => {
        setBlink(true)
        t = window.setTimeout(() => {
          setBlink(false)
          if (Math.random() < 0.2) {
            t = window.setTimeout(() => {
              setBlink(true)
              t = window.setTimeout(() => {
                setBlink(false)
                schedule()
              }, 120)
            }, 160)
          } else schedule()
        }, 130)
      }, 2500 + Math.random() * 3500)
    }
    schedule()
    return () => window.clearTimeout(t)
  }, [parts.blinks])

  // Look around curiously now and then (neutral face only).
  useEffect(() => {
    if (face !== 'neutral') return
    let t = 0
    const schedule = () => {
      t = window.setTimeout(() => {
        const dirs: [number, number][] = [[-4, 0], [4, 0], [3, -3], [-3, -2], [0, 2]]
        setGlance(dirs[Math.floor(Math.random() * dirs.length)])
        t = window.setTimeout(() => {
          setGlance([0, 0])
          schedule()
        }, 900 + Math.random() * 900)
      }, 5000 + Math.random() * 7000)
    }
    schedule()
    return () => {
      window.clearTimeout(t)
      setGlance([0, 0])
    }
  }, [face])

  const [gx, gy] = face === 'neutral' ? glance : (parts.gaze ?? [0, 0])

  return (
    <g key={face} className="reda-face">
      {parts.blush && (
        <g className="reda-blush" aria-hidden="true">
          <ellipse cx={36} cy={73} rx={5} ry={2.6} />
          <ellipse cx={84} cy={73} rx={5} ry={2.6} />
        </g>
      )}
      {parts.brows}
      <g className="reda-gaze" style={{ transform: `translate(${gx}px, ${gy}px)` }}>
        <g className={`reda-eyes${blink && parts.blinks ? ' reda-blink' : ''}`}>
          {parts.eyes[0]}
          {parts.eyes[1]}
        </g>
      </g>
      {parts.mouth}
    </g>
  )
}
