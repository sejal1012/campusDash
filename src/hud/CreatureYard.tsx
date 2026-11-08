import { useEffect, useRef, useState } from 'react'
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

const HEIGHT = 104
const MAX_SIZE = 60
const MIN_SIZE = 40
const COLUMNS = 3

/**
 * Phone and tablet only (hidden on desktop, where creatures play in the right panel).
 * Bottom of the map: every creature you catch slides down in here and stays, walking around,
 * dancing, hopping, running off and back, throwing its own effects (water, fire, sparks...).
 * Each creature has its own spot in a grid (3 per row) and wanders only inside it, so they never pile up.
 * Does not block touches on the map.
 */
export function CreatureYard({ creatureIds, leftPx, rightPx, bottomPx }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(200)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth || 200)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const creatures = creatureIds.map((id) => ROSTER.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c)
  const cols = Math.min(Math.max(creatures.length, 1), COLUMNS)
  const rows = Math.max(1, Math.ceil(creatures.length / COLUMNS))
  const slotW = width / cols
  const slotH = HEIGHT / rows
  const size = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, slotW - 2)))

  // Percent of the free space (parent size minus creature size) that keeps the creature inside its own slot.
  const toPct = (px: number, free: number) => (free <= 0 ? 0 : Math.min(100, Math.max(0, (px / free) * 100)))

  return (
    <div ref={ref} className="pointer-events-none absolute isolate z-[9] lg:hidden" style={{ left: leftPx, right: rightPx, bottom: bottomPx, height: HEIGHT }} aria-hidden="true">
      {creatures.map((c, i) => {
        const col = i % COLUMNS
        const row = Math.floor(i / COLUMNS)
        const left = col * slotW
        const top = row * slotH
        const xRange: [number, number] = [toPct(left, width - size), toPct(left + Math.max(0, slotW - size), width - size)]
        const yRange: [number, number] = [toPct(top, HEIGHT - size), toPct(top + Math.max(0, slotH - size), HEIGHT - size)]
        return <Roamer key={c.id} creature={c} size={size} dropIn dropDelayMs={700} xRange={xRange} yRange={yRange} />
      })}
    </div>
  )
}
