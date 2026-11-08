export type MenuTab = 'Map' | 'Dex' | 'Settings'

const ICONS: Record<MenuTab, React.ReactNode> = {
  Map: <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" />,
  Dex: (
    <>
      <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  Settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
}

interface Props {
  active: MenuTab
  onSelect: (tab: MenuTab) => void
}

/** Menu items. Shown in the desktop side panel and in the phone drawer. */
export function MenuList({ active, onSelect }: Props) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-2">
      {(Object.keys(ICONS) as MenuTab[]).map((tab) => {
        const on = tab === active
        return (
          <button
            key={tab}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => onSelect(tab)}
            className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left text-base font-semibold ${
              on ? 'border-[#ffb02e]/50 bg-[#ffb02e]/10 text-[#ffb02e]' : 'border-white/10 text-[#b9c6dc] active:bg-white/5'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[tab]}
            </svg>
            {tab}
          </button>
        )
      })}
    </nav>
  )
}
