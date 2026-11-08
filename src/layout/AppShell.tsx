import type { ReactNode } from 'react'
import { SidePanels } from './SidePanels'

/** Phone-sized frame. Fills the screen on phones, centered on desktop with side panels around it. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <SidePanels />
      <div className="app-frame">{children}</div>
    </div>
  )
}
