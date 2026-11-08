import { useState } from 'react'
import { useGeolocation } from './hooks/useGeolocation'
import { CampusMap } from './components/CampusMap'
import { MapControls } from './components/MapControls'
import { BottomNavigation, type Tab } from './components/BottomNavigation'
import './App.css'

function App() {
  const location = useGeolocation()
  const [tab, setTab] = useState<Tab>('Map')
  const [recenter, setRecenter] = useState(0)
  const [zoomAction, setZoomAction] = useState<{ direction: 'in' | 'out'; id: number } | null>(null)
  const accuracy = location.accuracy
  const mapAvailable = Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✳</span><div><strong>campus<span>dex</span></strong><small>UB NORTH CAMPUS</small></div></div>
        <div className={`gps-pill gps-${location.status}`}><span className="gps-dot" />{location.statusLabel}</div>
        <div className="top-actions"><button className="icon-button" aria-label="Help">?</button><div className="avatar-mini">🙂</div></div>
      </header>

      {tab === 'Map' ? <>
        <section className="map-heading"><div><p className="eyebrow">YOUR CAMPUS, YOUR ADVENTURE</p><h1>Explore UB <span>North</span></h1></div><div className="heading-note"><span className="sun">☀</span><span>Amherst, NY<br/><b>Campus is looking lovely</b></span></div></section>
        <section className="map-frame" aria-label="Interactive map of UB North Campus">
          <CampusMap location={location} recenter={recenter} zoomAction={zoomAction} />
          <div className="map-top-left"><span className="live-tag"><i /> CAMPUS MAP</span><span className="map-scale">NORTH CAMPUS · BUFFALO, NY</span></div>
          <div className="map-legend"><span><i className="legend-building"/> Campus buildings</span><span><i className="legend-park"/> Green spaces</span></div>
          {accuracy !== null && <div className="accuracy-card"><span className="accuracy-icon">⌖</span><div><b>GPS ACCURACY</b><strong>±{Math.round(accuracy)} <small>m</small></strong></div></div>}
          <MapControls onLocate={() => setRecenter((n) => n + 1)} onZoom={(direction) => setZoomAction((previous) => ({ direction, id: (previous?.id ?? 0) + 1 }))} locationAvailable={Boolean(location.position) && mapAvailable} mapAvailable={mapAvailable} />
          {location.status === 'idle' && <div className="location-prompt"><div className="prompt-icon">📍</div><div><b>Ready to explore?</b><p>Turn on location to see your avatar on campus.</p></div><button onClick={location.start}>Start tracking <span>→</span></button></div>}
          {location.message && location.status !== 'idle' && <div className={`location-message ${location.status === 'error' ? 'is-error' : ''}`}><span>{location.status === 'error' ? '!' : '⌖'}</span><div><b>{location.status === 'error' ? 'Location unavailable' : 'Waiting for a clear GPS fix'}</b><p>{location.message}</p></div>{location.status === 'error' && <button onClick={location.start}>Try again</button>}</div>}
        </section>
        <div className="below-map"><div className="welcome-card"><span className="welcome-icon">🌿</span><div><b>Every step is a discovery</b><p>Walk around campus and watch your character explore with you.</p></div><span className="sparkle">✦</span></div><div className="map-tip"><span>✦</span> Your map stays put while you explore. Tap <b>Locate Me</b> whenever you want to find yourself.</div></div>
      </> : <section className="placeholder-screen"><div className="placeholder-art">{tab === 'Dex' ? '📖' : tab === 'Missions' ? '🧭' : '🧑‍🎓'}</div><p className="eyebrow">COMING SOON</p><h1>{tab === 'Dex' ? 'Your Campus Dex' : tab === 'Missions' ? 'Campus Missions' : 'Your Profile'}</h1><p>{tab === 'Dex' ? 'Places you discover will be collected here.' : tab === 'Missions' ? 'New adventures around campus are on their way.' : 'Your campus journey starts with a few steps.'}</p><button onClick={() => setTab('Map')}>Back to the map</button></section>}

      <BottomNavigation active={tab} onChange={setTab} />
    </main>
  )
}

export default App
