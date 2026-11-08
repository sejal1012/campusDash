import { CreatureArt } from '../components/CreatureArt'
import { ResultBadge } from '../components/ResultBadge'
import type { Question } from '../data/questions'
import type { CreatureInfo } from '../data/roster'
import type { CatchResult } from '../game/scoring'

interface Props {
  creature: CreatureInfo
  result: CatchResult
  /** The 3 questions for this stop. Their explanations become the facts. */
  questions: Question[]
  onNext: () => void
  nextLabel?: string
}

/** Bottom sheet after a catch: creature, result, 3 facts, Next stop. */
export function PlaceLearnedSheet({ creature, result, questions, onNext, nextLabel = 'Next stop' }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="anim-fade absolute inset-0 bg-[#050d1a]/70" aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-learned-title"
        className="anim-sheet-up relative flex max-h-[88%] flex-col rounded-t-[28px] border-t border-white/15 bg-[#0f2547] shadow-[0_-12px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/25" aria-hidden="true" />

        <div className="overflow-y-auto px-5 pt-4 pb-2">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_40%,#1d4a85,#0b1b33)]">
              <CreatureArt id={creature.id} name={creature.name} size={88} look={result === 'escaped' ? 'gray' : 'color'} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#8fe3ff]">Place learned</div>
              <h2 id="place-learned-title" className="font-display text-2xl font-bold leading-tight">{creature.stopName}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#b9c6dc]">{creature.name}</span>
                <ResultBadge result={result} />
              </div>
            </div>
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#b9c6dc]">3 things you learned</h3>
          <ol className="mt-2 flex flex-col gap-2">
            {questions.slice(0, 3).map((q, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-white/5 p-3 text-[15px] leading-relaxed text-[#dbe4f3]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3ddc97] text-xs font-bold text-[#0b1b33]">{i + 1}</span>
                <span>{q.explain}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onNext}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffb02e] px-5 text-base font-bold text-[#0b1b33] transition-transform active:scale-[0.98]"
          >
            {nextLabel}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  )
}
