import { ROSTER } from '../data/roster'
import { Roamer } from '../layout/Roamer'

interface Props {
  /** Creature ids caught so far, in the order they were caught. They stay for the rest of the run. */
  creatureIds: string[]
  /** Free space on each side (px) so the radar on the left and the buttons on the right stay clear. */
  leftPx: number
  rightPx: number
  bottomPx: number
}

/**
 * Phone and tablet only (hidden on desktop, where creatures play in the right panel).
 * Bottom of the map: every creature you catch slides down in here and stays, walking around,
 * dancing, hopping, running off and back, throwing its own effects (water, fire, sparks...).
 * Does not block touches on the map.
 */
export function CreatureYard({ creatureIds, leftPx, rightPx, bottomPx }: Props) {
  const creatures = creatureIds.map((id) => ROSTER.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c)
  if (creatures.length === 0) return null
  return (
    <div className="pointer-events-none absolute isolate z-[9] h-[104px] lg:hidden" style={{ left: leftPx, right: rightPx, bottom: bottomPx }} aria-hidden="true">
      {creatures.map((c) => (
        <Roamer key={c.id} creature={c} size={64} dropIn dropDelayMs={700} />
      ))}
    </div>
  )
}
