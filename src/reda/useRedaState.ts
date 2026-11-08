/**
 * Reda's two independent layers of state:
 *
 *  1. Interaction (finite state machine): idle → listening → thinking → speaking → idle, plus error.
 *  2. Emotion: what Reda feels, driven by game events, the voice flow and inactivity.
 *
 * So Reda can be SPEAKING + HAPPY, SPEAKING + EXCITED, IDLE + SAD… without a state per combination.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { onGameEvent, pickReaction, REACTIONS, type Emotion, type EmotionStep, type GameEventType } from './redaEvents'

export type Interaction = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

/** Allowed FSM transitions. Anything else is ignored. */
const ALLOWED: Record<Interaction, Interaction[]> = {
  idle: ['listening', 'speaking', 'error'],
  listening: ['idle', 'thinking', 'error'],
  thinking: ['speaking', 'listening', 'idle', 'error'],
  speaking: ['idle', 'listening', 'error'],
  error: ['idle', 'listening'],
}

/** Pure transition function: returns the next state, or `from` if the move isn't allowed. */
export function nextInteraction(from: Interaction, to: Interaction): Interaction {
  return from === to || ALLOWED[from].includes(to) ? to : from
}

export interface EmotionState {
  emotion: Emotion
  /** Bumps on every new reaction so one-shot effects (sparkles, hops) replay. */
  key: number
  /** Stable random seed for this reaction (particle layout, small variations). */
  seed: number
}

export interface RedaControls {
  interaction: Interaction
  emotion: EmotionState
  /** Live interaction value for use inside async callbacks. */
  interactionRef: { readonly current: Interaction }
  /** Attempts an FSM move. Returns true if the state changed. */
  transition: (to: Interaction) => boolean
  /** Plays a sequence of emotions; lower priority reactions can't interrupt higher ones. */
  react: (steps: EmotionStep[], priority?: number) => void
  /** Plays the mapped reaction for a game event (with cooldown + random variant). */
  trigger: (type: GameEventType) => void
  /** Drops the current reaction and returns to neutral. */
  settle: () => void
  /** Anything the player does resets the sleep timer (and wakes Reda). */
  markActivity: () => void
}

interface Options {
  /** Reda falls asleep after this long with no activity. */
  sleepAfterMs?: number
}

const MICRO_EXPRESSIONS: Emotion[] = ['happy', 'curious', 'wink', 'happy', 'curious']

export function useRedaState({ sleepAfterMs = 45_000 }: Options = {}): RedaControls {
  const [interaction, setInteraction] = useState<Interaction>('idle')
  const interactionRef = useRef<Interaction>('idle')
  const [emotion, setEmotionState] = useState<EmotionState>({ emotion: 'neutral', key: 0, seed: 0.5 })
  const emotionRef = useRef<Emotion>('neutral')

  const timers = useRef<number[]>([])
  const priority = useRef(0) // priority of the running reaction, 0 = none
  const lastFired = useRef(new Map<GameEventType, number>())
  const lastActivity = useRef(0)

  const setEmotion = useCallback((e: Emotion) => {
    emotionRef.current = e
    setEmotionState((s) => ({ emotion: e, key: s.key + 1, seed: Math.random() }))
  }, [])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  const settle = useCallback(() => {
    clearTimers()
    priority.current = 0
    if (emotionRef.current !== 'neutral') setEmotion('neutral')
  }, [setEmotion])

  const react = useCallback(
    (steps: EmotionStep[], p = 1) => {
      if (steps.length === 0) return
      if (priority.current > p) return // something more important is playing
      clearTimers()
      priority.current = p
      let at = 0
      steps.forEach((step, i) => {
        if (i === 0) setEmotion(step.emotion)
        else timers.current.push(window.setTimeout(() => setEmotion(step.emotion), at))
        at += step.ms
      })
      timers.current.push(
        window.setTimeout(() => {
          priority.current = 0
          setEmotion('neutral')
        }, at),
      )
    },
    [setEmotion],
  )

  const markActivity = useCallback(() => {
    lastActivity.current = Date.now()
    if (emotionRef.current === 'sleepy') react([{ emotion: 'surprised', ms: 500 }, { emotion: 'happy', ms: 900 }], 1)
  }, [react])

  const trigger = useCallback(
    (type: GameEventType) => {
      const rule = REACTIONS[type]
      const now = Date.now()
      const last = lastFired.current.get(type) ?? 0
      if (rule.cooldownMs && now - last < rule.cooldownMs) return
      lastFired.current.set(type, now)
      lastActivity.current = now
      react(pickReaction(type), rule.priority)
    },
    [react],
  )

  const transition = useCallback((to: Interaction) => {
    const from = interactionRef.current
    const next = nextInteraction(from, to)
    if (next === from) return false
    interactionRef.current = next
    lastActivity.current = Date.now()
    setInteraction(next)
    return true
  }, [])

  // Game events → emotions.
  useEffect(() => onGameEvent((e) => trigger(e.type)), [trigger])

  // Any tap anywhere counts as activity.
  useEffect(() => {
    lastActivity.current = Date.now()
    const onDown = () => markActivity()
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [markActivity])

  // Inactivity → sleepy. Idle and calm → occasional random micro-expressions.
  useEffect(() => {
    let nextMicroAt = Date.now() + 8_000 + Math.random() * 10_000
    const id = window.setInterval(() => {
      if (interactionRef.current !== 'idle' || priority.current > 0) return
      const now = Date.now()
      if (now - lastActivity.current > sleepAfterMs) {
        if (emotionRef.current !== 'sleepy') setEmotion('sleepy')
        return
      }
      if (emotionRef.current === 'neutral' && now >= nextMicroAt) {
        nextMicroAt = now + 9_000 + Math.random() * 12_000
        const e = MICRO_EXPRESSIONS[Math.floor(Math.random() * MICRO_EXPRESSIONS.length)]
        react([{ emotion: e, ms: 1100 + Math.random() * 700 }], 0.5)
      }
    }, 1_000)
    return () => window.clearInterval(id)
  }, [sleepAfterMs, react, setEmotion])

  useEffect(() => () => clearTimers(), [])

  return { interaction, emotion, interactionRef, transition, react, trigger, settle, markActivity }
}
