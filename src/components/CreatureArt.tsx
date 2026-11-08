import { creatureArt } from '../data/roster'

/** color = normal, gold = shiny variant, gray = not caught yet (side panel), silhouette = locked Dex slot. */
export type ArtLook = 'color' | 'gold' | 'gray' | 'silhouette'

const LOOK: Record<ArtLook, { filter?: string; opacity?: number }> = {
  color: {},
  gold: { filter: 'sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.1) drop-shadow(0 0 10px #ffd34d)' },
  gray: { filter: 'grayscale(1) brightness(0.9)', opacity: 0.55 },
  silhouette: { filter: 'brightness(0)', opacity: 0.35 },
}

interface Props {
  id: string
  name: string
  look?: ArtLook
  size: number
  className?: string
}

export function CreatureArt({ id, name, look = 'color', size, className }: Props) {
  const hidden = look === 'gray' || look === 'silhouette'
  return (
    <img
      src={creatureArt(id)}
      alt={hidden ? 'Creature not caught yet' : name}
      width={size}
      height={size}
      draggable={false}
      className={`select-none ${className ?? ''}`}
      style={{ ...LOOK[look], transition: 'filter 600ms, opacity 600ms' }}
    />
  )
}
