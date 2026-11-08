import { useEffect, useRef, useState } from 'react'
import { CreatureArt } from '../components/CreatureArt'
import type { CreatureInfo } from '../data/roster'

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

interface Props {
  creature: CreatureInfo
  gold: boolean
  size?: number
}

/**
 * A caught creature wandering slowly inside its parent box (which must be position: relative).
 * Positions are in percent of the parent, so it works at any window size.
 * Every so often it says something in a speech bubble: usually its sound, sometimes a funny line.
 */
export function Roamer({ creature, gold, size = 84 }: Props) {
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

  // Talk now and then.
  useEffect(() => {
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
  }, [creature])

  const { x, y, ms, facingLeft, walking } = move
  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        // shift by the same percent of its own size so it never leaves the box
        transform: `translate(-${x}%, -${y}%)`,
        transition: `left ${ms}ms linear, top ${ms}ms linear, transform ${ms}ms linear`,
        zIndex: Math.round(y), // lower on screen = in front
      }}
    >
      {bubble && <div className="speech-bubble" key={bubble}>{bubble}</div>}
      <div className={walking ? 'anim-walk' : 'anim-breathe'}>
        <div style={{ transform: facingLeft ? 'scaleX(-1)' : undefined, transition: 'transform 250ms' }}>
          <CreatureArt id={creature.id} name={creature.name} size={size} look={gold ? 'gold' : 'color'} />
        </div>
      </div>
      <div className="mx-auto -mt-2 h-2 w-3/5 rounded-[50%] bg-black/30" aria-hidden="true" />
    </div>
  )
}
