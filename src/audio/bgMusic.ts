/**
 * Quiet looping background music.
 *
 * iPhone rules this works around:
 *  - Safari ignores `audio.volume`, so the file itself is quiet (bg-music.m4a is the track at 10%).
 *  - Sound only starts after a tap, so playback waits for the first tap anywhere.
 *  - Turning on the mic reconfigures iOS audio, so nothing here uses Web Audio (an AudioContext
 *    left running can clash with Reda's mic). It's one plain <audio> element, paused while Reda
 *    listens or talks (the mic would pick it up) and while the player has it switched off.
 */
import { useSyncExternalStore } from 'react'

const SRC = '/audio/bg-music.m4a'
const STORAGE_KEY = 'campusdash.music'

let audio: HTMLAudioElement | null = null
let started = false
let ducked = false
let muted = readMuted()
const listeners = new Set<() => void>()

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

function setup() {
  if (audio || typeof Audio === 'undefined') return
  audio = new Audio(SRC)
  audio.loop = true
  audio.preload = 'auto'
}

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const
let waitingForTap = false

/** If the browser blocked playback, try again on the player's next tap or key press. */
function retryOnNextTap() {
  if (waitingForTap) return
  waitingForTap = true
  const onTap = () => {
    UNLOCK_EVENTS.forEach((t) => window.removeEventListener(t, onTap, true))
    waitingForTap = false
    play()
  }
  UNLOCK_EVENTS.forEach((t) => window.addEventListener(t, onTap, true))
}

function play() {
  if (!audio || !started || muted || ducked || !audio.paused) return
  audio.play().catch(() => retryOnNextTap())
}

function pause() {
  audio?.pause()
}

/**
 * Start the music as soon as the browser allows it: right away if autoplay is permitted,
 * otherwise on the player's first tap or key press anywhere.
 */
export function startMusicWhenAllowed() {
  setup()
  started = true
  play()
}

/** Call inside a user tap (e.g. Start). */
export const startMusic = startMusicWhenAllowed

/** Pause the music while Reda listens or talks; it resumes afterwards. */
export function duckMusic(value: boolean) {
  if (ducked === value) return
  ducked = value
  if (value) pause()
  else play()
}

export function setMusicMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'off' : 'on')
  } catch {
    /* private mode: just don't remember */
  }
  if (value) pause()
  else {
    setup()
    started = true
    play() // runs inside the button tap, so phones allow it
  }
  listeners.forEach((l) => l())
}

/** True while the track is actually playing. */
export function isMusicPlaying() {
  return !!audio && !audio.paused
}

export function isMusicMuted() {
  return muted
}

/** React: current on/off state. */
export function useMusicMuted() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => muted,
  )
}

// Dev only: when this file hot-reloads, stop the old player so two copies never play at once.
if (import.meta.hot) {
  import.meta.hot.dispose(() => pause())
}
