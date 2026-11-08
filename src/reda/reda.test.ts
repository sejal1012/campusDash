import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { emitGameEvent, onGameEvent, pickReaction, REACTIONS, reportDistanceToTarget, resetDistanceTracking, type GameEventType } from './redaEvents'
import { nextInteraction } from './useRedaState'

function collect() {
  const seen: GameEventType[] = []
  const off = onGameEvent((e) => seen.push(e.type))
  return { seen, off }
}

afterEach(() => resetDistanceTracking())

describe('interaction FSM', () => {
  it('follows the voice flow', () => {
    let s = nextInteraction('idle', 'listening')
    s = nextInteraction(s, 'thinking')
    s = nextInteraction(s, 'speaking')
    s = nextInteraction(s, 'idle')
    expect(s).toBe('idle')
  })
  it('ignores impossible moves', () => {
    expect(nextInteraction('idle', 'thinking')).toBe('idle')
    expect(nextInteraction('listening', 'speaking')).toBe('listening')
    expect(nextInteraction('error', 'speaking')).toBe('error')
  })
  it('lets the player interrupt Reda mid-answer', () => {
    expect(nextInteraction('speaking', 'listening')).toBe('listening')
  })
})

describe('event → emotion mapping', () => {
  it('matches the design table', () => {
    const first = (t: GameEventType) => REACTIONS[t].variants.map((v) => v[0].emotion)
    expect(first('run-started')).toContain('happy')
    expect(first('destination-reached')).toEqual(['celebrating'])
    expect(first('mission-complete')).toEqual(['celebrating'])
    expect(first('creature-unlocked').every((e) => e === 'surprised')).toBe(true)
    expect(REACTIONS['challenge-failed'].variants[0].map((s) => s.emotion)).toEqual(['sad', 'encouraging'])
    expect(REACTIONS.answered.variants[0].map((s) => s.emotion)).toEqual(['wink', 'happy'])
    expect(first('question-asked')).toEqual(['curious'])
  })
  it('does not repeat the same variant twice in a row', () => {
    const a = pickReaction('moved-closer', () => 0)
    const b = pickReaction('moved-closer', () => 0)
    expect(a).not.toBe(b)
  })
  it('delivers events to listeners and stops after unsubscribe', () => {
    const { seen, off } = collect()
    emitGameEvent('run-started')
    off()
    emitGameEvent('run-started')
    expect(seen).toEqual(['run-started'])
  })
})

describe('distance tracking', () => {
  it('reports progress, wrong way and discovery', () => {
    const { seen, off } = collect()
    reportDistanceToTarget('capen-hall', 200) // baseline
    reportDistanceToTarget('capen-hall', 190)
    reportDistanceToTarget('capen-hall', 170) // 30 m closer
    reportDistanceToTarget('capen-hall', 195) // 25 m away from best
    reportDistanceToTarget('capen-hall', 199) // already said
    reportDistanceToTarget('capen-hall', CONFIG.creatureCatchM - 1)
    off()
    expect(seen).toEqual(['moved-closer', 'wrong-direction', 'building-discovered', 'midpoint', 'moved-closer'])
  })
  it('starts fresh for a new target', () => {
    const { seen, off } = collect()
    reportDistanceToTarget('a', 100)
    reportDistanceToTarget('b', 60)
    reportDistanceToTarget('b', 50)
    off()
    expect(seen).toEqual([])
  })
  it('ignores missing distances', () => {
    const { seen, off } = collect()
    reportDistanceToTarget(null, 10)
    reportDistanceToTarget('a', null)
    off()
    expect(seen).toEqual([])
  })
})

describe('midpoint', () => {
  it('says halfway once per leg', () => {
    const { seen, off } = collect()
    reportDistanceToTarget('x', 300)
    reportDistanceToTarget('x', 160)
    reportDistanceToTarget('x', 150)
    reportDistanceToTarget('x', 140)
    off()
    expect(seen.filter((t) => t === 'midpoint')).toHaveLength(1)
  })
})

describe('waiting for Reda', () => {
  it('emitGameEvent resolves only after listener promises settle', async () => {
    let finish!: () => void
    const off = onGameEvent(() => new Promise<void>((r) => (finish = r)))
    let done = false
    const p = emitGameEvent('destination-reached', 'capen').then(() => (done = true))
    await Promise.resolve()
    expect(done).toBe(false)
    finish()
    await p
    off()
    expect(done).toBe(true)
  })
  it('resolves straight away when nobody needs to speak', async () => {
    await expect(emitGameEvent('hint-followed')).resolves.toBeUndefined()
  })
})
