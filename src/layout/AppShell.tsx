import type { ReactNode } from 'react'

/** Phone-sized frame. Fills the screen on phones, centered on desktop. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <div className="app-frame">{children}</div>
    </div>
  )
}
