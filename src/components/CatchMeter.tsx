/** 3 rings. Each correct answer fills one ring with mint. */
export function CatchMeter({ filled, total = 3 }: { filled: number; total?: number }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Catch meter: ${filled} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled
        return (
          <svg key={i} width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className={on ? 'anim-ring' : undefined}>
            <circle cx="15" cy="15" r="11" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
            {on && (
              <>
                <circle cx="15" cy="15" r="11" fill="none" stroke="#3ddc97" strokeWidth="8" opacity="0.25" />
                <circle cx="15" cy="15" r="11" fill="none" stroke="#3ddc97" strokeWidth="4" />
                <circle cx="15" cy="15" r="4" fill="#3ddc97" />
              </>
            )}
          </svg>
        )
      })}
    </div>
  )
}
