/**
 * Playable UBMon. Every character has a start-screen pose (`still`).
 * Characters with `sprites` get a full 4-direction walk (6-frame strips, 128px frames, feet at y=122).
 * Characters without sprites walk on the map with a waddle of their `still` pose.
 */
export type Dance = 'sway' | 'hop' | 'groove' | 'step' | 'wobble'

export interface Character {
  id: string
  name: string
  /** Start-screen and fallback map image (transparent). */
  still: string
  dance: Dance
  /** Folder with player-idle/front/back/left/right.webp, when the character has walk frames. */
  sprites?: string
}

export const CHARACTERS: Character[] = [
  { id: 'winter', name: 'Winter UBMon', still: '/start/mascot-winter.webp', dance: 'sway', sprites: '/player/winter/' },
  { id: 'football', name: 'Football UBMon', still: '/start/mascot-football.webp', dance: 'hop', sprites: '/player/football/' },
  { id: 'classic', name: 'Classic UBMon', still: '/start/mascot-guide.webp', dance: 'groove', sprites: '/player/' },
  { id: 'hoops', name: 'Hoops UBMon', still: '/start/mascot-basketball.webp', dance: 'step', sprites: '/player/hoops/' },
  { id: 'scientist', name: 'Scientist UBMon', still: '/start/mascot-scientist.webp', dance: 'wobble', sprites: '/player/scientist/' },
]

export const DEFAULT_CHARACTER = 'classic'

export function getCharacter(id: string | null | undefined): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER)!
}

const STORAGE_KEY = 'ubmon.character'

/** Last chosen character; falls back to the default when storage is empty or blocked. */
export function loadCharacterId(): string {
  try {
    return getCharacter(localStorage.getItem(STORAGE_KEY)).id
  } catch {
    return DEFAULT_CHARACTER
  }
}

export function saveCharacterId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private mode / blocked storage: the choice just isn't remembered.
  }
}

/** Offset of item `index` from the selected one, wrapped to -2..2 for a 5-item ring. */
export function carouselSlot(index: number, selected: number, count = CHARACTERS.length): number {
  const half = Math.floor(count / 2)
  return ((((index - selected + half) % count) + count) % count) - half
}
