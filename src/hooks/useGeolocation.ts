import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_ACCURACY_METERS = Number(import.meta.env.VITE_GPS_MAX_ACCURACY_METERS || 25)
const SIMULATION = import.meta.env.DEV && import.meta.env.VITE_GPS_SIMULATION === 'true'
const SIM_START = { lat: Number(import.meta.env.VITE_SIM_LATITUDE || 43.0008), lng: Number(import.meta.env.VITE_SIM_LONGITUDE || -78.789) }

export type GeoStatus = 'idle' | 'requesting' | 'active' | 'stale' | 'error'
export type GeoState = { position: GeolocationPosition | null; accuracy: number | null; status: GeoStatus; message: string; start: () => void; statusLabel: string }

export function useGeolocation(): GeoState {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [message, setMessage] = useState('')
  const watchId = useRef<number | null>(null)
  const simulationTimer = useRef<number | null>(null)
  const lastAccepted = useRef<GeolocationPosition | null>(null)

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current)
    if (simulationTimer.current !== null) window.clearInterval(simulationTimer.current)
    watchId.current = null
    simulationTimer.current = null
  }, [])

  const start = useCallback(() => {
    if (watchId.current !== null || simulationTimer.current !== null) return
    setStatus('requesting')
    setMessage('Allow location access in your browser to place your avatar on the map.')
    if (SIMULATION) {
      setMessage('Development simulation is active. Coordinates drift slightly every few seconds.')
      let step = 0
      const mock = () => ({ coords: { latitude: SIM_START.lat + Math.sin(step / 4) * 0.00008, longitude: SIM_START.lng + step * 0.00004, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: 0.7 }, timestamp: Date.now() }) as GeolocationPosition
      const accept = mock()
      setPosition(accept); setAccuracy(accept.coords.accuracy); lastAccepted.current = accept; setStatus('active')
      simulationTimer.current = window.setInterval(() => { step += 1; const next = mock(); setPosition(next); setAccuracy(next.coords.accuracy); lastAccepted.current = next }, 3000)
      return
    }
    if (!navigator.geolocation) { setStatus('error'); setMessage('This browser does not support location. Try Safari or Chrome with location services enabled.'); return }
    watchId.current = navigator.geolocation.watchPosition((next) => {
      setAccuracy(next.coords.accuracy)
      if (next.coords.accuracy > MAX_ACCURACY_METERS) {
        setStatus('stale'); setMessage(`Signal is ±${Math.round(next.coords.accuracy)} m. Move outdoors for a clearer reading; keeping your last good location.`)
        return
      }
      lastAccepted.current = next
      setPosition((previous) => {
        if (!previous) return next
        // Light coordinate interpolation smooths small GPS jumps without delaying real movement.
        const smooth = (a: number, b: number) => a + (b - a) * 0.58
        return { ...next, coords: { ...next.coords, latitude: smooth(previous.coords.latitude, next.coords.latitude), longitude: smooth(previous.coords.longitude, next.coords.longitude) } }
      })
      setStatus('active'); setMessage('')
    }, (error) => {
      setStatus(error.code === error.PERMISSION_DENIED ? 'error' : 'stale')
      setMessage(error.code === error.PERMISSION_DENIED ? 'Location access was denied. Enable it in your browser or device settings, then try again.' : error.code === error.TIMEOUT ? 'GPS took too long to respond. Keep the app open near a window or outdoors.' : 'GPS signal is temporarily unavailable. Your last good location remains on the map.')
      if (error.code === error.PERMISSION_DENIED) stop()
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 })
  }, [stop])

  useEffect(() => () => stop(), [stop])
  const statusLabel = status === 'active' ? 'GPS connected' : status === 'requesting' ? 'Finding you…' : status === 'stale' ? 'Signal weak' : status === 'error' ? 'Location off' : 'Location off'
  return { position, accuracy, status, message, start, statusLabel }
}
