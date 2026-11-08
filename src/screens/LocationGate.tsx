import { useEffect } from 'react'
import type { GpsStatus } from '../types'

interface Props {
  status: GpsStatus
}

/**
 * Shown instead of the game when we cannot get the player's location. The map is never rendered behind it.
 * If the player switches location on in their browser settings, the page reloads by itself.
 */
export function LocationGate({ status }: Props) {
  const denied = status === 'denied'

  // Reload automatically as soon as permission is granted (no need to find the Try again button).
  useEffect(() => {
    let permission: PermissionStatus | null = null
    let cancelled = false
    const onChange = () => {
      if (permission?.state === 'granted') window.location.reload()
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (cancelled) return
        permission = p
        p.addEventListener('change', onChange)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      permission?.removeEventListener('change', onChange)
    }
  }, [])

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,#1a3f8f_0%,#0b1b3d_55%,#050b18_100%)] px-7 py-10 text-center text-white" role="alert">
      {/* Pulsing pin with a slash through it */}
      <div className="relative flex h-32 w-32 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#ffb02e]/20 [animation-duration:2.4s]" />
        <span className="absolute inset-3 rounded-full border border-[#ffb02e]/40 bg-[#0b1b33]" />
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ffb02e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="relative">
          <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
          <circle cx="12" cy="10.5" r="2.3" />
          <path d="M4 4l16 16" stroke="#ff5a4d" strokeWidth="2" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-extrabold leading-tight" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
        {denied ? 'Location access needed' : 'We cannot find you'}
      </h1>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#cfe0ff]">
        {denied
          ? 'UB Campus Dash is a walking game, so it needs your location to show where you are and to unlock creatures at each stop. Please allow location access to play.'
          : 'We could not get a location from your device. Check that location services are on and that you have a signal, then try again.'}
      </p>

      <ol className="mt-6 w-full max-w-xs space-y-2 rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-left text-sm text-[#e5eeff]">
        <li className="flex gap-3"><span className="font-bold text-[#ffb02e]">1</span><span>Tap the lock or settings icon next to the web address and set <b>Location</b> to <b>Allow</b>.</span></li>
        <li className="flex gap-3"><span className="font-bold text-[#ffb02e]">2</span><span>On iPhone, also check Settings, Privacy, Location Services is on for your browser.</span></li>
        <li className="flex gap-3"><span className="font-bold text-[#ffb02e]">3</span><span>Come back here and tap <b>Try again</b>.</span></li>
      </ol>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-7 min-h-12 rounded-full bg-[#ffb02e] px-10 text-base font-bold text-[#0b1b33] shadow-[0_8px_24px_rgba(255,176,46,0.35)] active:bg-[#e69a1f]"
      >
        Try again
      </button>
      <p className="mt-4 text-xs text-white/45">We only use your location while you play. It is not saved or shared.</p>
    </div>
  )
}
