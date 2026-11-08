import { useCallback, useEffect, useRef, useState } from 'react'
import type { GpsStatus, LngLat, PlayerFix, Stop } from '../types'
import { isGoodAccuracy, isOffCampus, smooth } from './geo'

interface Options {
  onFix?: (fix: PlayerFix) => void
  /** Used only for the off-campus check. Skipped if no stop has coords. */
  stops?: Stop[]
  /** Set false to stop watching (default true). */
  enabled?: boolean
  /** Debug only: accept fixes of any accuracy so desktop Wi-Fi location can be tested. */
  relaxAccuracy?: boolean
}

export interface PlayerPosition {
  fix: PlayerFix | null
  status: GpsStatus
  offCampus: boolean
  /** Feed a position through the same pipeline as GPS (debug teleport). Skips smoothing. */
  injectFix: (pos: LngLat, accuracy?: number) => void
}

/** The only place raw browser GPS fields are read. Converts once to [lng, lat]. */
export function usePlayerPosition({ onFix, stops, enabled = true, relaxAccuracy = false }: Options = {}): PlayerPosition {
  const [fix, setFix] = useState<PlayerFix | null>(null)
  const [status, setStatus] = useState<GpsStatus>('idle')
  const [offCampus, setOffCampus] = useState(false)

  const onFixRef = useRef(onFix)
  const stopsRef = useRef(stops)
  const lastPos = useRef<LngLat | null>(null)
  const teleported = useRef(false) // once teleported, real GPS is ignored (debug)
  useEffect(() => {
    onFixRef.current = onFix
    stopsRef.current = stops
  })

  const publish = useCallback((next: PlayerFix) => {
    setFix(next)
    setStatus('ok')
    setOffCampus(
      isOffCampus(
        next.pos,
        (stopsRef.current ?? []).map((s) => s.coords),
      ),
    )
    onFixRef.current?.(next)
  }, [])

  const injectFix = useCallback(
    (pos: LngLat, accuracy = 5) => {
      teleported.current = true
      lastPos.current = pos
      publish({ pos, accuracy, timestamp: Date.now() })
    },
    [publish],
  )

  // GPS watch. Cleanup clears the watch, so StrictMode double-mount is safe.
  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        if (teleported.current) return
        if (!relaxAccuracy && !isGoodAccuracy(coords.accuracy)) {
          setStatus('weak')
          return
        }
        const raw: LngLat = [coords.longitude, coords.latitude]
        const pos = smooth(lastPos.current, raw)
        lastPos.current = pos
        publish({ pos, accuracy: coords.accuracy, timestamp })
      },
      (err) => {
        console.error('Geolocation error', err.code, err.message)
        // 1 = permission denied, 2 = position unavailable, 3 = timeout
        setStatus(err.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, publish, relaxAccuracy])

  // Keep the screen on while watching. Re-acquire after the tab becomes visible.
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let cancelled = false
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) void l.release().catch(() => {})
        else lock = l
      } catch (e) {
        console.error('Wake lock unavailable', e)
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
      lock = null
    }
  }, [enabled])

  return { fix, status, offCampus, injectFix }
}

