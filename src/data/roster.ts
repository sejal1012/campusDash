// The 8 creatures, which stop each one lives at, and what they "say".
// Stop assignments match src/data/locations.json (the game's source of truth).

export interface CreatureInfo {
  id: string
  name: string
  stopId: string
  stopName: string
  /** Short sounds for the speech bubble (shown most of the time). */
  sounds: string[]
  /** Funny lines (shown now and then). */
  lines: string[]
}

export const creatureArt = (id: string) => `/assets/creatures/${id}.webp`

export const ROSTER: CreatureInfo[] = [
  {
    id: 'barkive',
    name: 'Barkive',
    stopId: 'lockwood',
    stopName: 'Lockwood Library',
    sounds: ['Woof!', 'Shhh!', 'Arf!'],
    lines: ['Your book is due. I can smell it.', 'Quiet floor means quiet tail.', 'I read the whole dictionary. Twice.'],
  },
  {
    id: 'emberbun',
    name: 'Emberbun',
    stopId: 'capen',
    stopName: 'Capen Hall',
    sounds: ['Fwoosh!', 'Squeak!', 'Eep!'],
    lines: ['Do not pet the tail.', 'Is it warm in here, or is it me?', 'I am hot stuff. Really.'],
  },
  {
    id: 'voltiger',
    name: 'Voltiger',
    stopId: 'davis',
    stopName: 'Davis Hall',
    sounds: ['Zzzap!', 'Grrr!', 'Bzzt!'],
    lines: ['Do not charge your phone on me.', 'My code worked the first time. Just kidding.', 'I run on 100 percent battery.'],
  },
  {
    id: 'snoutfin',
    name: 'Snoutfin',
    stopId: 'clemens',
    stopName: 'Clemens Hall',
    sounds: ['Oink!', 'Chomp!', 'Snrk!'],
    lines: ['I am a snack shark.', 'Sharks do not oink. I am special.', 'Is the food court open yet?'],
  },
  {
    id: 'pengogh',
    name: 'Pengogh',
    stopId: 'cfa',
    stopName: 'Center for the Arts',
    sounds: ['Squawk!', 'Honk!', 'Ta-da!'],
    lines: ['This is my blue period.', 'Hold still. You are my muse.', 'Art is just fancy fish.'],
  },
  {
    id: 'seraphyn',
    name: 'Seraphyn',
    stopId: 'alumni-arena',
    stopName: 'Alumni Arena',
    sounds: ['Rawr!', 'Whoosh!', 'Ting!'],
    lines: ['One wing for good, one wing for chaos.', 'My halo is crooked. Do not tell anyone.', 'Angel on the left, menace on the right.'],
  },
  {
    id: 'meowxolotl',
    name: 'Meowxolotl',
    stopId: 'student-union',
    stopName: 'Student Union',
    sounds: ['Meow!', 'Blub!', 'Mrrp?'],
    lines: ['Half cat, half fish, all nap.', 'Is this lab coat in my size?', 'I am 90 percent water and 10 percent attitude.'],
  },
  {
    id: 'splashdrake',
    name: 'Splashdrake',
    stopId: 'nsc',
    stopName: 'Natural Sciences Complex',
    sounds: ['Splash!', 'Rawr!', 'Blorp!'],
    lines: ['I sneeze rain.', 'Bring a towel. Trust me.', 'Small dragon. Big puddle.'],
  },
]

export const creatureForStop = (stopId: string) => ROSTER.find((c) => c.stopId === stopId) ?? null
