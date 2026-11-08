import { useEffect, useState, type ReactNode } from 'react'
import { MenuList, type MenuTab } from './MenuList'

interface Props {
  active: MenuTab
  onSelect: (tab: MenuTab) => void
  /** Receives a function that opens the phone drawer (wire it to the hamburger button). */
  children: (openMenu: () => void) => ReactNode
}

function Brand() {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium uppercase tracking-wider text-[#ffb02e]">Campus Dash</div>
      <div className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>Menu</div>
    </div>
  )
}

/**
 * Centers the phone-sized frame on desktop.
 * Desktop (lg and up): menu is a panel on the left side of the frame.
 * Phone: menu opens as a drawer from the hamburger button.
 */
export function AppShell({ active, onSelect, children }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const select = (tab: MenuTab) => {
    onSelect(tab)
    setOpen(false)
  }

  return (
    <div className="app-shell gap-8">
      {/* Desktop side panel */}
      <div className="hidden flex-1 items-center justify-end lg:flex">
        <aside className="w-64 rounded-3xl border border-white/10 bg-[rgba(8,20,40,0.6)] p-5">
          <Brand />
          <MenuList active={active} onSelect={onSelect} />
        </aside>
      </div>

      <div className="app-frame">
        {children(() => setOpen(true))}

        {/* Phone drawer */}
        {open && (
          <div className="absolute inset-0 z-40 lg:hidden">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55" />
            <div role="dialog" aria-label="Menu" className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-white/10 bg-[#0b1b33] p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div className="flex items-start justify-between">
                <Brand />
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <MenuList active={active} onSelect={select} />
            </div>
          </div>
        )}
      </div>

      {/* Mirrors the side panel so the phone frame stays centered on desktop */}
      <div className="hidden flex-1 lg:block" aria-hidden="true" />
    </div>
  )
}
