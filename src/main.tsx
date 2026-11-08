import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import App from './App'
import { ScreenPreview } from './screens/ScreenPreview'

// ?screen=catch opens the screen preview instead of the map (for building UI).
const preview = new URLSearchParams(window.location.search).has('screen')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {preview ? <ScreenPreview /> : <App />}
  </StrictMode>,
)
