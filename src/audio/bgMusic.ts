/**
 * Quiet looping background music.
 *
 * Volume goes through a Web Audio gain node, because iPhones ignore `audio.volume`.
 * startMusic() must be called inside a tap (the Start button) so phones allow playback.
 * The music dips further while Reda talks (duckMusic) and the player's on/off choice is remembered.
 */
import { useSyncExternalStore } from 'react'

const SRC = '/audio/bg-music.mp3'
/** "Very light": well under Reda's voice. */
const VOLUME = 0.1
/** While Reda is speaking or listening. */
const DUCKED_VOLUME = 0.03
const FADE_S = 0.6
const STORAGE_KEY = 'campusdash.music'

let audio: HTMLAudioElement | null = null
let ctx: AudioContext | null = null
let gain: GainNode | null = null
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

function targetVolume() {
  return muted ? 0 : ducked ? DUCKED_VOLUME : VOLUME
}

function applyVolume() {
  if (gain && ctx) {
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(targetVolume(), ctx.currentTime + FADE_S)
  } else if (audio) {
    audio.volume = targetVolume()
  }
}

function setup() {
  if (audio || typeof Audio === 'undefined') return
  audio = new Audio(SRC)
  audio.loop = true
  audio.preload = 'auto'
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AC) {
      ctx = new AC()
      gain = ctx.createGain()
      gain.gain.value = 0
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination)
    }
  } catch {
    ctx = null
    gain = null
  }
  if (!gain) audio.volume = 0
}

function play() {
  if (!audio) return
  void ctx?.resume().catch(() => {})
  audio.play().catch(() => {
    /* blocked until a tap: the toggle button will try again */
  })
  applyVolume()
}

/** Call inside a user tap. Starts the music (unless the player turned it off). */
export function startMusic() {
  setup()
  started = true
  if (!muted) play()
}

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const
let waitingForTap = false

/**
 * Start the music as soon as the browser allows it: right away if autoplay is permitted,
 * otherwise on the player's first tap or key press anywhere (browsers block sound before that).
 */
export function startMusicWhenAllowed() {
  startMusic()
  if (waitingForTap) return
  waitingForTap = true
  const onTap = () => {
    UNLOCK_EVENTS.forEach((t) => window.removeEventListener(t, onTap, true))
    waitingForTap = false
    if (!muted) play()
  }
  UNLOCK_EVENTS.forEach((t) => window.addEventListener(t, onTap, true))
}

/** Lower the music while Reda talks or listens. */
export function duckMusic(value: boolean) {
  if (ducked === value) return
  ducked = value
  applyVolume()
}

export function setMusicMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'off' : 'on')
  } catch {
    /* private mode: just don't remember */
  }
  if (!value && started) {
    setup()
    play() // also a tap, so it can (re)start playback
  } else {
    applyVolume()
    // Fade out, then actually stop.
    if (value) window.setTimeout(() => muted && audio?.pause(), FADE_S * 1000 + 50)
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
  import.meta.hot.dispose(() => {
    audio?.pause()
    void ctx?.close().catch(() => {})
  })
}
