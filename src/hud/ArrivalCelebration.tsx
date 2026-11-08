import { creatureArtUrl } from '../game/locations'

interface Props {
  placeName: string
  creatureId: string
  creatureName: string
  onContinue: () => void
}

/** Full-screen "you made it" moment: dark room, a spotlight beam, the creature revealed in colour. */
export function ArrivalCelebration({ placeName, creatureId, creatureName, onContinue }: Props) {
  return (
    <div role="dialog" aria-label={`You reached ${placeName}`} className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-[#050b18]/90 px-6 text-center" style={{ animation: 'fade-in 400ms ease both' }}>
      {/* spotlight beam from above */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[75%] w-[120%] origin-top"
        style={{
          background: 'radial-gradient(ellipse 38% 100% at 50% 0%, rgba(255,236,170,0.55), rgba(255,236,170,0.12) 60%, transparent 80%)',
          clipPath: 'polygon(38% 0, 62% 0, 100% 100%, 0 100%)',
          animation: 'beam-in 700ms ease-out both',
        }}
      />
      {/* slow rotating rays behind the creature */}
      <div
        className="pointer-events-none absolute left-1/2 top-[46%] h-[520px] w-[520px] opacity-40"
        style={{
          background: 'repeating-conic-gradient(from 0deg, rgba(255,214,102,0.7) 0deg 8deg, transparent 8deg 24deg)',
          maskImage: 'radial-gradient(circle, #000 0%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 68%)',
          animation: 'rays-spin 24s linear infinite',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <p className="relative text-sm font-semibold uppercase tracking-widest text-[#ffd66b]" style={{ animation: 'slide-up-in 500ms 300ms ease both' }}>
        You reached
      </p>
      <h2 className="relative mt-1 text-4xl font-extrabold leading-tight text-white drop-shadow-lg" style={{ animation: 'slide-up-in 500ms 450ms ease both' }}>
        {placeName}!
      </h2>
      <div className="relative mt-6" style={{ animation: 'creature-reveal 1300ms 600ms cubic-bezier(0.2, 0.8, 0.3, 1.1) both' }}>
        <div className="absolute inset-x-6 bottom-0 h-5 rounded-full bg-black/50 blur-md" />
        <img src={creatureArtUrl(creatureId)} alt={creatureName} width={230} height={230} draggable={false} className="relative select-none drop-shadow-[0_0_28px_rgba(255,214,102,0.8)]" />
      </div>
      <p className="relative mt-4 text-lg font-bold text-white" style={{ animation: 'slide-up-in 500ms 1500ms ease both' }}>
        <span className="capitalize">{creatureName}</span> unlocked!
      </p>
      <button type="button" onClick={onContinue} className="relative mt-6 min-h-12 rounded-full bg-[#ffb02e] px-10 text-base font-bold text-[#0b1b33] shadow-lg active:bg-[#e69a1f]" style={{ animation: 'slide-up-in 500ms 1700ms ease both' }}>
        Continue
      </button>
    </div>
  )
}
