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

  // The "stop walking" timer lives outside the per-target effect: a reading where the player
  // hasn't moved must not cancel it (fixes arrive about as often as the timer would fire).
  const stopTimer = useRef(0)
  const scheduleStop = () => {
    if (stopTimer.current) return
    stopTimer.current = window.setTimeout(() => {
      stopTimer.current = 0
      setWalking(false)
    }, STOP_HOLD_MS)
  }
  const cancelStop = () => {
    clearTimeout(stopTimer.current)
    stopTimer.current = 0
  }
  useEffect(() => () => clearTimeout(stopTimer.current), [])

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
      scheduleStop() // standing still
      return
    }
    cancelStop()
    if (!from || dist > MAX_GLIDE_M) {
      setWalking(false)
      draw(target)
      return
    }

    setWalking(true)
    let raf = 0
    let done = false
    const start = performance.now()
    const finish = () => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      draw(target)
      scheduleStop()
    }
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      if (t >= 1) return finish()
      draw([from[0] + (target[0] - from[0]) * t, from[1] + (target[1] - from[1]) * t])
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Animation frames pause in background tabs; make sure the glide still lands.
    const fallback = window.setTimeout(finish, durationMs + 100)
    // A new target cancels this glide; the next one starts from where it should be by now
    // (computed from elapsed time, so it still progresses if animation frames were paused).
    return () => {
      if (!done) {
        const t = Math.min(1, (performance.now() - start) / durationMs)
        shownRef.current = [from[0] + (target[0] - from[0]) * t, from[1] + (target[1] - from[1]) * t]
      }
      done = true
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
    // scheduleStop/cancelStop only touch a ref and a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return { pos: shown, walking }
}
