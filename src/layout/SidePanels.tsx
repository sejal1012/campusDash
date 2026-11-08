import { CreatureArt } from '../components/CreatureArt'
import { useRunPicked, useRunRoster } from '../game/run'
import { useDex } from '../game/dex'
import { Roamer } from './Roamer'

/** Faint contour-map rings + soft color glows. Pure CSS, decorative. */
function Backdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: [
            'repeating-radial-gradient(circle at 12% 78%, transparent 0 26px, rgba(143,227,255,0.07) 26px 27px)',
            'repeating-radial-gradient(circle at 90% 22%, transparent 0 30px, rgba(143,227,255,0.06) 30px 31px)',
            'radial-gradient(circle at 8% 15%, rgba(255,176,46,0.16), transparent 32%)',
            'radial-gradient(circle at 95% 85%, rgba(61,220,151,0.14), transparent 35%)',
            'radial-gradient(circle at 50% 50%, rgba(0,91,187,0.25), transparent 60%)',
          ].join(','),
        }}
      />
    </div>
  )
}

/**
 * Desktop only (1024px and up): fills the empty space on both sides of the phone frame.
 * Left: the Dex card, shown once the game starts: this run's creatures (gray until unlocked, then color). Right: the Creature park, also shown once the game starts, where unlocked creatures play.
 */
export function SidePanels() {
  const dex = useDex()
  const roster = useRunRoster()
  const picked = useRunPicked() // the 5 are only known once the game starts
  const caught = roster.filter((c) => dex[c.id])

  const column = 'absolute inset-y-0 flex w-[calc(50%-239px)] flex-col p-8'

  return (
    <div className="absolute inset-0 hidden lg:block">
      <Backdrop />

      {/* ---------- Left ---------- */}
      <aside className={`${column} left-0`} aria-label="Campus Dex">
        <div className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb02e" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <div>
            <div className="font-display text-xl font-bold leading-tight">UB Campus Dash</div>
            <div className="text-xs text-[#b9c6dc]">Walk. Find. Learn.</div>
          </div>
        </div>

        {/* The whole card appears (glides in from the left, then the creatures pop in one by one) once the game starts. */}
        {picked && (
          <div className="anim-dex-card mt-6 rounded-3xl border border-white/10 bg-[rgba(8,20,40,0.6)] p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#b9c6dc]">Campus Dex</h2>
              <div className="font-display text-lg font-bold">
                {caught.length} <span className="text-sm text-[#b9c6dc]">/ {roster.length}</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#3ddc97] transition-[width] duration-700" style={{ width: `${(caught.length / roster.length) * 100}%` }} />
            </div>

            <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#b9c6dc]">
              {caught.length === roster.length ? 'You found them all!' : 'Your creatures'}
            </h3>
            <ul className="mt-2 grid grid-cols-4 gap-2">
              {roster.map((c, i) => {
                const entry = dex[c.id]
                return (
                  <li
                    key={c.id}
                    className="anim-dex-tile flex flex-col items-center rounded-2xl bg-white/5 p-1.5"
                    style={{ animationDelay: `${450 + i * 110}ms` }}
                    title={entry ? c.name : 'Not found yet'}
                  >
                    <CreatureArt id={c.id} name={c.name} size={52} look={entry ? 'color' : 'gray'} className="h-auto w-full transition-[filter,opacity] duration-700" />
                    <span className={`text-[10px] font-semibold ${entry ? 'text-white' : 'text-white/40'}`}>{entry ? c.name : '???'}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

      </aside>

      {/* ---------- Right ---------- */}
      <aside className={`${column} right-0`} aria-label="Creature park">
        {/* Blank until the game starts, then glides in from the right. */}
        {picked && (
          <div className="anim-park-in flex flex-1 flex-col">
          <h2 className="font-display text-xl font-bold">Creature park</h2>
          <p className="mt-1 text-sm text-[#b9c6dc]">Creatures you catch hang out here.</p>
          <div className="relative mt-6 flex-1" aria-hidden="true">
            {caught.map((c) => <Roamer key={c.id} creature={c} />)}
            {caught.length === 0 && (
              <div className="absolute inset-x-0 top-1/3 rounded-3xl border-2 border-dashed border-white/10 p-6 text-center text-sm text-white/40">
                Nobody here yet. Catch your first creature!
              </div>
            )}
          </div>
          </div>
        )}
      </aside>
    </div>
  )
}
