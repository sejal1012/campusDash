import { useEffect, useState } from 'react'
import { MAP_CONFIG } from '../config'
import type { GpsStatus, LngLat, PlayerFix } from '../types'
import { averageFixes, distanceM, formatLngLat, pushRecent } from './geo'

interface Props {
  fix: PlayerFix | null
  status: GpsStatus
  targetPos: LngLat | null
  hintLevel: 1 | 2 | 3
}

/** Testing only (?debug=1). Not shown to players. */
export function DebugOverlay({ fix, status, targetPos, hintLevel }: Props) {
  const [capture, setCapture] = useState(false)
  const [recent, setRecent] = useState<PlayerFix[]>([])
  const [copied, setCopied] = useState(false)
  const [count, setCount] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (fix) setCount((c) => c + 1)
  }, [fix])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (capture && fix) setRecent((r) => pushRecent(r, fix, MAP_CONFIG.captureFixes))
  }, [fix, capture])

  const avg = averageFixes(recent)
  const text = avg ? formatLngLat(avg) : null

  const copy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  return (
    <div className="absolute left-2 top-[190px] z-20 w-[220px] rounded-xl border border-white/15 bg-[rgba(8,20,40,0.92)] p-3 text-[11px] leading-5 text-[#b9c6dc]">
      <div className="font-semibold text-[#ffb02e]">DEBUG (tap map to teleport)</div>
      <div>{fix ? `lng, lat: ${fix.pos[0].toFixed(6)}, ${fix.pos[1].toFixed(6)}` : 'lng, lat: none yet'}</div>
      <div>accuracy: {fix ? `${Math.round(fix.accuracy)} m` : 'n/a'}</div>
      <div>status: {status}</div>
      <div>fixes: {count}{fix ? `, last ${Math.max(0, Math.round((now - fix.timestamp) / 1000))} s ago` : ''}</div>
      <div>hint level: {hintLevel}</div>
      <div>to target: {fix && targetPos ? `${Math.round(distanceM(fix.pos, targetPos))} m` : 'n/a'}</div>
      <button
        type="button"
        onClick={() => {
          setCapture((c) => !c)
          setRecent([])
        }}
        className="mt-2 min-h-11 w-full rounded-lg bg-[#005bbb] px-3 font-semibold text-white active:bg-[#003f87]"
      >
        {capture ? 'Stop capture' : 'Capture mode'}
      </button>
      {capture && (
        <div className="mt-2">
          <div>
            averaging {recent.length} / {MAP_CONFIG.captureFixes} fixes
          </div>
          <div className="font-mono text-white">{text ?? 'waiting for fixes'}</div>
          <button
            type="button"
            onClick={copy}
            disabled={!text}
            className="mt-1 min-h-11 w-full rounded-lg border border-white/15 px-3 font-semibold text-white disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
