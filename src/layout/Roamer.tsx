import { useEffect, useRef, useState } from 'react'
import { CreatureArt } from '../components/CreatureArt'
import type { CreatureInfo } from '../data/roster'
import { CREATURE_FX, DEFAULT_FX } from './creatureFx'

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

interface Props {
  creature: CreatureInfo
  size?: number
  /** Background look: faint, no speech bubble, still plays tricks. Used in the bottom bar. */
  ghost?: boolean
  /** Slide down from above into its spot when it first appears (the creature has just been unlocked). */
  dropIn?: boolean
  dropDelayMs?: number
}

/**
 * A caught creature wandering slowly inside its parent box (which must be position: relative).
 * Positions are in percent of the parent, so it works at any window size.
 * Every so often it says something in a speech bubble: usually its sound, sometimes a funny line.
 */
export function Roamer({ creature, size = 84, ghost = false, dropIn = false, dropDelayMs = 0 }: Props) {
  const start = useRef({ x: rand(5, 95), y: rand(10, 95) })
  const [move, setMove] = useState({ ...start.current, ms: 0, facingLeft: false, walking: false })
  const [bubble, setBubble] = useState<string | null>(null)

  // Wander: walk to a random spot, rest, repeat.
  useEffect(() => {
    if (reducedMotion()) return
    let timer: ReturnType<typeof setTimeout>
    let at = start.current
    const wander = () => {
      const to = { x: rand(0, 100), y: rand(0, 100) }
      const ms = Math.max(3000, Math.hypot(to.x - at.x, to.y - at.y) * 120) // slow stroll
      const facingLeft = to.x < at.x
      at = to
      setMove({ ...to, ms, facingLeft, walking: true })
      timer = setTimeout(() => {
        setMove((m) => ({ ...m, walking: false }))
        timer = setTimeout(wander, rand(1500, 5000))
      }, ms)
    }
    timer = setTimeout(wander, rand(300, 3000))
    return () => clearTimeout(timer)
  }, [])

  // Effects: its own emoji burst out (water splashes, flames, sparks...).
  const [fx, setFx] = useState<{ id: number; ch: string; dx: number; dy: number }[]>([])
  const fxId = useRef(0)
  const burstRef = useRef<(count: number) => void>(() => {})
  const emojis = CREATURE_FX[creature.id] ?? DEFAULT_FX
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()
    burstRef.current = (count: number) => {
      const made = Array.from({ length: count }, () => ({ id: ++fxId.current, ch: pick(emojis), dx: rand(-70, 70), dy: rand(-90, -25) }))
      setFx((list) => [...list.slice(-14), ...made])
      const t = setTimeout(() => {
        setFx((list) => list.filter((p) => !made.some((m) => m.id === p.id)))
        timers.delete(t)
      }, 1400)
      timers.add(t)
    }
    return () => timers.forEach(clearTimeout)
  }, [emojis])

  // Tricks every few seconds: hop, spin, run off and come back, or a big burst of its effects.
  const [trick, setTrick] = useState<'hop' | 'spin' | 'dance' | 'flip' | 'runoff' | 'gone' | 'runin' | null>(null)
  useEffect(() => {
    if (reducedMotion()) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))
    let alive = true
    const play = () => {
      if (!alive) return
      const roll = Math.random()
      if (roll < 0.18) {
        burstRef.current(ghost ? 4 : 7)
        setTrick('hop')
        later(() => setTrick(null), 700)
        later(play, rand(4500, 9000))
      } else if (roll < 0.33) {
        setTrick('spin')
        burstRef.current(3)
        later(() => setTrick(null), 900)
        later(play, rand(4500, 9000))
      } else if (roll < 0.53) {
        setTrick('dance')
        burstRef.current(4)
        later(() => burstRef.current(4), 800)
        later(() => setTrick(null), 1600)
        later(play, rand(4500, 9000))
      } else if (roll < 0.65) {
        setTrick('flip')
        later(() => burstRef.current(6), 650)
        later(() => setTrick(null), 900)
        later(play, rand(4500, 9000))
      } else if (roll < 0.88) {
        // Run off the edge, wait out of sight, run back in.
        setTrick('runoff')
        later(() => setTrick('gone'), 1100)
        later(() => setTrick('runin'), 1100 + rand(1800, 3200))
        later(() => {
          setTrick(null)
          burstRef.current(5)
          later(play, rand(4500, 9000))
        }, 1100 + 3300 + 900)
      } else {
        burstRef.current(ghost ? 5 : 10)
        later(play, rand(3000, 6000))
      }
    }
    later(play, rand(1500, 5000))
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [ghost])

  // Talk now and then (not in the faint background version).
  useEffect(() => {
    if (ghost) return
    let timer: ReturnType<typeof setTimeout>
    const speak = () => {
      const funny = Math.random() < 0.3
      setBubble(pick(funny ? creature.lines : creature.sounds))
      timer = setTimeout(() => {
        setBubble(null)
        timer = setTimeout(speak, rand(8000, 18000))
      }, funny ? 4000 : 2200)
    }
    timer = setTimeout(speak, rand(2000, 10000))
    return () => clearTimeout(timer)
  }, [creature, ghost])

  const { x, y, ms, facingLeft, walking } = move
  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size, // fixed width, or the browser shrinks it near the right edge
        // shift by the same percent of its own size so it never leaves the box
        transform: `translate(-${x}%, -${y}%)`,
        transition: `left ${ms}ms linear, top ${ms}ms linear, transform ${ms}ms linear`,
        zIndex: Math.round(y), // lower on screen = in front
        opacity: ghost ? 0.32 : undefined,
      }}
    >
      {fx.map((p) => (
        <span
          key={p.id}
          className="fx-particle"
          aria-hidden="true"
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, fontSize: size * 0.34 } as React.CSSProperties}
        >
          {p.ch}
        </span>
      ))}
      {bubble && <div className="speech-bubble" key={bubble}>{bubble}</div>}
      <div className={dropIn ? 'creature-drop-in' : undefined} style={dropIn ? { animationDelay: `${dropDelayMs}ms` } : undefined}>
      <div className={trick ? `trick-${trick}` : undefined}>
      <div className={walking ? 'anim-walk' : 'anim-breathe'}>
        <div style={{ transform: facingLeft ? 'scaleX(-1)' : undefined, transition: 'transform 250ms' }}>
          <CreatureArt id={creature.id} name={creature.name} size={size} look="color" />
        </div>
      </div>
      </div>
      </div>
      <div className="mx-auto -mt-2 h-2 w-3/5 rounded-[50%] bg-black/30" aria-hidden="true" />
    </div>
  )
}
