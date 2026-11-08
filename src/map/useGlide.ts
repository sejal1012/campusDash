import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { distanceM } from '../location/geo'
import type { LngLat } from '../types'

/** Below this the player is treated as standing still (GPS jitter). */
const MIN_STEP_M = 0.5
/** Above this the move is a jump (first fix, teleport), not a walk: snap instead of gliding. */
const MAX_GLIDE_M = 60
/** Keep the walk cycle going briefly after a glide ends, so it doesn't stutter between fixes. */
const STOP_HOLD_MS = 400

/**
 * Animates a position from where it is drawn now to each new target over one GPS poll,
 * at a steady speed, so the avatar walks instead of jumping. `onFrame` gets every drawn position.
 */
export function useGlide(target: LngLat | null, onFrame?: (pos: LngLat) => void, durationMs = CONFIG.gpsPollMs) {
  const [shown, setShown] = useState<LngLat | null>(target)
  const [walking, setWalking] = useState(false)
  const shownRef = useRef<LngLat | null>(target)
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
  })

  useEffect(() => {
    if (!target) return
    const from = shownRef.current
    const draw = (p: LngLat) => {
      shownRef.current = p
      setShown(p)
      onFrameRef.current?.(p)
    }
    const dist = from ? distanceM(from, target) : Infinity
    if (dist < MIN_STEP_M) {
      // Standing still. The previous glide's cleanup cancelled its stop timer, so stop here.
      const stopTimer = window.setTimeout(() => setWalking(false), STOP_HOLD_MS)
      return () => clearTimeout(stopTimer)
    }
    if (!from || dist > MAX_GLIDE_M) {
      setWalking(false)
      draw(target)
      return
    }

    setWalking(true)
    let raf = 0
    let stopTimer = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      draw([from[0] + (target[0] - from[0]) * t, from[1] + (target[1] - from[1]) * t])
      if (t < 1) raf = requestAnimationFrame(tick)
      else stopTimer = window.setTimeout(() => setWalking(false), STOP_HOLD_MS)
    }
    raf = requestAnimationFrame(tick)
    // A new target cancels this glide; the next one starts from wherever the avatar is now.
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(stopTimer)
    }
  }, [target, durationMs])

  return { pos: shown, walking }
}
