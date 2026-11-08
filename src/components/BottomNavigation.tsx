export type Tab = 'Map' | 'Dex' | 'Missions' | 'Me'
const items: { label: Tab; icon: string }[] = [{ label: 'Map', icon: '⌖' }, { label: 'Dex', icon: '▤' }, { label: 'Missions', icon: '✧' }, { label: 'Me', icon: '☺' }]
export function BottomNavigation({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="Main navigation">{items.map((item) => <button key={item.label} className={active === item.label ? 'nav-item active' : 'nav-item'} onClick={() => onChange(item.label)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
}
