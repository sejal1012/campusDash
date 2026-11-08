import { useState } from 'react'
import { CatchMeter } from '../components/CatchMeter'
import { CreatureArt } from '../components/CreatureArt'
import type { Question } from '../data/questions'
import type { CreatureInfo } from '../data/roster'
import { catchResultFor, type CatchResult } from '../game/scoring'

interface Props {
  creature: CreatureInfo
  questions: Question[]
  onDone: (result: CatchResult, correct: number) => void
}

/** Shuffle the options so the right answer is not always in the same spot. */
function shuffleOptions(q: Question): Question {
  const order = q.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

// Fixed burst directions for the gold sparkles (no randomness, so it looks the same every time).
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const r = i % 2 ? 120 : 85
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, delay: (i % 3) * 80, size: i % 2 ? 16 : 22 }
})

const heading = 'font-display font-bold'
const primaryBtn = 'min-h-12 w-full rounded-2xl bg-[#ffb02e] px-5 text-base font-bold text-[#0b1b33] active:scale-[0.98] transition-transform'

/** Full-screen catch: creature on a stage, 3 questions about the place, no timer. */
export function CatchScreen({ creature, questions, onDone }: Props) {
  const [qs] = useState(() => questions.slice(0, 3).map(shuffleOptions))
  const [step, setStep] = useState<'intro' | 'quiz' | 'end'>('intro')
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  // Bumps on every answer so the creature replays its happy hop or shake.
  const [reaction, setReaction] = useState<{ ok: boolean; n: number } | null>(null)

  const q = qs[qi]
  const answered = picked !== null
  const result = catchResultFor(correct)

  const pick = (i: number) => {
    if (answered) return
    const ok = i === q.answer
    setPicked(i)
    if (ok) setCorrect((c) => c + 1)
    setReaction((r) => ({ ok, n: (r?.n ?? 0) + 1 }))
  }

  const next = () => {
    if (qi < qs.length - 1) {
      setQi(qi + 1)
      setPicked(null)
    } else {
      setStep('end')
    }
  }

  const ending = step === 'end'
  const reactionClass = ending
    ? result === 'escaped'
      ? 'anim-run-off'
      : 'anim-happy'
    : reaction
      ? reaction.ok
        ? 'anim-happy'
        : 'anim-shake'
      : ''

  return (
    <div className="anim-fade absolute inset-0 z-30 flex flex-col bg-[#071226]">
      {/* ---------- Stage ---------- */}
      <div className="relative flex min-h-[260px] flex-[0_0_44%] flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#163a6e_0%,#0b1b33_55%,#071226_100%)]">
        <div className="stage-floor" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#8fe3ff]">{creature.stopName}</div>
            <div className={`${heading} truncate text-lg`}>{creature.name}</div>
          </div>
          <CatchMeter filled={correct} />
        </div>

        <div className="relative flex flex-1 items-end justify-center pb-6">
          {/* glow on the floor under the creature */}
          <div className="absolute bottom-4 h-8 w-44 rounded-[50%] bg-[#8fe3ff]/25 blur-md" aria-hidden="true" />
          {/* pop-in plays once; the keyed wrapper remounts to replay hop/shake on each answer */}
          <div className="anim-pop">
            <div key={ending ? 'end' : (reaction?.n ?? 0)} className={reactionClass}>
              <div className={ending ? '' : 'anim-bob'}>
                <CreatureArt id={creature.id} name={creature.name} size={176} look={ending && result === 'gold' ? 'gold' : 'color'} />
              </div>
            </div>
          </div>

          {ending && result === 'gold' && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 h-0 w-0" aria-hidden="true">
              {SPARKS.map((s, i) => (
                <svg
                  key={i}
                  className="spark"
                  width={s.size}
                  height={s.size}
                  viewBox="0 0 24 24"
                  style={{ ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px`, animationDelay: `${s.delay}ms` }}
                >
                  <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#ffd34d" />
                </svg>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Card area ---------- */}
      <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {step === 'intro' && (
          <div className="anim-rise flex flex-col gap-4">
            <div>
              <h2 className={`${heading} text-2xl`}>{creature.name} is here!</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#b9c6dc]">
                Answer 3 questions about {creature.stopName} to catch it. There is no timer, so take your time and look around.
              </p>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm text-[#b9c6dc]">
              <li><span className="font-semibold text-[#ffb02e]">3 right:</span> Gold catch</li>
              <li><span className="font-semibold text-[#3ddc97]">2 right:</span> Caught</li>
              <li><span className="font-semibold text-[#ff7a6b]">0 or 1 right:</span> It gets away (try again on a later run)</li>
            </ul>
            <button type="button" className={primaryBtn} onClick={() => setStep('quiz')}>Start</button>
          </div>
        )}

        {step === 'quiz' && (
          <div key={qi} className="anim-rise flex flex-col gap-3">
            <div className="text-xs font-medium uppercase tracking-wider text-[#b9c6dc]">Question {qi + 1} of {qs.length}</div>
            <h2 className={`${heading} text-xl leading-snug`}>{q.text}</h2>
            <div className="mt-1 flex flex-col gap-2">
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answer
                const isPicked = i === picked
                let cls = 'border-white/15 bg-white/5 text-white active:bg-white/10'
                if (answered) {
                  if (isAnswer) cls = 'border-[#3ddc97] bg-[#3ddc97] text-[#0b1b33]'
                  else if (isPicked) cls = 'border-[#ff7a6b] bg-[#ff7a6b] text-[#0b1b33]'
                  else cls = 'border-white/10 bg-white/5 text-white/40'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={answered}
                    onClick={() => pick(i)}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2 text-left text-[15px] font-semibold transition-colors ${cls}`}
                  >
                    <span>{opt}</span>
                    {answered && (isAnswer || isPicked) && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true" className="shrink-0">
                        <path d={isAnswer ? 'M5 12.5l4.5 4.5L19 7.5' : 'M6 6l12 12M18 6L6 18'} />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className="anim-rise flex flex-col gap-3">
                <div className="rounded-2xl bg-white/5 p-3 text-sm leading-relaxed">
                  <span className={`font-bold ${picked === q.answer ? 'text-[#3ddc97]' : 'text-[#ff7a6b]'}`}>
                    {picked === q.answer ? 'Correct! ' : 'Not quite. '}
                  </span>
                  <span className="text-[#dbe4f3]">{q.explain}</span>
                </div>
                <button type="button" className={primaryBtn} onClick={next}>
                  {qi < qs.length - 1 ? 'Next question' : 'See result'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'end' && (
          <div className="anim-rise flex flex-col gap-4 text-center">
            {result === 'gold' && (
              <>
                <h2 className={`${heading} text-3xl text-[#ffb02e]`}>Gold catch!</h2>
                <p className="text-[15px] text-[#b9c6dc]">3 of 3 right. You found the shiny gold {creature.name}.</p>
              </>
            )}
            {result === 'caught' && (
              <>
                <h2 className={`${heading} text-3xl text-[#3ddc97]`}>Caught!</h2>
                <p className="text-[15px] text-[#b9c6dc]">2 of 3 right. {creature.name} joined your Dex. Get all 3 next time for gold.</p>
              </>
            )}
            {result === 'escaped' && (
              <>
                <h2 className={`${heading} text-3xl text-[#ff7a6b]`}>It got away</h2>
                <p className="text-[15px] text-[#b9c6dc]">{correct} of 3 right. {creature.name} ran off, but you can find it again on a later run.</p>
              </>
            )}
            <button type="button" className={primaryBtn} onClick={() => onDone(result, correct)}>Continue</button>
          </div>
        )}
      </div>
    </div>
  )
}
