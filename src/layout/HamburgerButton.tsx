/** Opens the menu drawer on phones. Hidden on desktop, where the menu is a side panel. */
export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={onClick}
      className="pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[rgba(8,20,40,0.88)] text-white active:bg-[#003f87] lg:hidden"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  )
}
