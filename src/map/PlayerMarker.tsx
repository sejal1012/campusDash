import { useEffect, useState } from 'react'
import { Marker, useMap } from 'react-map-gl/mapbox'
import { facingOnScreen, type Facing } from '../location/geo'
import { getCharacter, type Character } from '../characters'
import type { LngLat } from '../types'
import { useGlide } from './useGlide'

/** Google-Maps-style view cone lying on the ground, pointing where the player faces. */
function HeadingCone({ pos, heading }: { pos: LngLat; heading: number }) {
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="center" pitchAlignment="map" rotationAlignment="map" rotation={heading}>
      <svg width="120" height="120" viewBox="0 0 190 190" aria-hidden="true">
        <defs>
          <radialGradient id="cone-fade" cx="95" cy="95" r="95" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f8cff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#2f8cff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M95 95 L38 8 A100 100 0 0 1 152 8 Z" fill="url(#cone-fade)" />
      </svg>
    </Marker>
  )
}

const FRAMES = 6

/** Load a character's images up front so switching direction never flashes an empty frame. */
function usePreload(character: Character) {
  useEffect(() => {
    const urls = character.sprites
      ? ['idle', 'front', 'back', 'left', 'right'].map((n) => `${character.sprites}player-${n}.webp`)
      : [character.still]
    for (const u of urls) new Image().src = u
  }, [character])
}

/**
 * The chosen UBMon. With walk sprites: idle pose when still, a 6-frame strip for the facing
 * direction while moving. Without: its start-screen pose, waddling while moving (not mirrored,
 * so the UB lettering stays readable; the view cone shows the direction).
 */
function Figure({ pos, walking, facing, character }: { pos: LngLat; walking: boolean; facing: Facing; character: Character }) {
  usePreload(character)
  let art
  if (character.sprites) {
    art = walking ? (
      <img key={facing} src={`${character.sprites}player-${facing}.webp`} alt="" className="player-strip" style={{ width: `${FRAMES * 100}%` }} draggable={false} />
    ) : (
      <img src={`${character.sprites}player-idle.webp`} alt="" className="player-idle" draggable={false} />
    )
  } else {
    art = <img src={character.still} alt="" className={`player-still${walking ? ' is-walking' : ''}`} draggable={false} />
  }
  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="bottom" offset={[0, 4]} pitchAlignment="viewport" rotationAlignment="viewport">
      <div className="player-sprite" role="img" aria-label={`You are here (${character.name})`}>
        <span className="player-ring" aria-hidden="true" />
        <div className="player-frame">{art}</div>
      </div>
    </Marker>
  )
}

/** Map rotation in degrees, kept current while the user rotates the map. */
function useMapBearing() {
  const { current: map } = useMap()
  const [bearing, setBearing] = useState(0)
  useEffect(() => {
    if (!map) return
    const update = () => setBearing(map.getBearing())
    update()
    map.on('rotate', update)
    return () => {
      map.off('rotate', update)
    }
  }, [map])
  return bearing
}

/**
 * `pos` is the latest GPS fix. The avatar glides to it at walking pace and plays a walk cycle
 * while moving. `onFrame` receives each drawn position (used to keep the camera on the avatar).
 */
export function PlayerMarker({ pos, heading, character = getCharacter(null), onFrame }: { pos: LngLat; heading: number | null; character?: Character; onFrame?: (pos: LngLat) => void }) {
  const glide = useGlide(pos, onFrame)
  const shown = glide.pos ?? pos
  const facing = facingOnScreen(heading, useMapBearing())
  return (
    <>
      {heading !== null && <HeadingCone pos={shown} heading={heading} />}
      <Figure pos={shown} walking={glide.walking} facing={facing} character={character} />
    </>
  )
}
