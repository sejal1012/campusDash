import type { CatchResult } from '../game/scoring'

const STYLE: Record<CatchResult, { label: string; cls: string }> = {
  gold: { label: 'Gold catch', cls: 'bg-[#ffb02e] text-[#0b1b33]' },
  caught: { label: 'Caught', cls: 'bg-[#3ddc97] text-[#0b1b33]' },
  escaped: { label: 'Escaped', cls: 'border border-[#ff7a6b] text-[#ff7a6b]' },
}

export function ResultBadge({ result }: { result: CatchResult }) {
  const s = STYLE[result]
  return <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold uppercase tracking-wider ${s.cls}`}>{s.label}</span>
}
