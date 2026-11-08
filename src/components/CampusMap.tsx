import { useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { CAMPUS_BOUNDS, CAMPUS_CENTER, CAMPUS_PLACES, INITIAL_ZOOM, MAP_STYLE } from '../mapConfig'
import type { GeoState } from '../hooks/useGeolocation'
import { createPlayerMarker } from './PlayerMarker'

type Props = { location: GeoState; recenter: number; zoomAction: { direction: 'in' | 'out'; id: number } | null }

export function CampusMap({ location, recenter, zoomAction }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markerRef = useRef<MapboxMarker | null>(null)
  const positionRef = useRef(location.position)
  positionRef.current = location.position
  const [mapError, setMapError] = useState('')
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  useEffect(() => {
    if (!container.current || !token) return
    let disposed = false
    let mapInstance: MapboxMap | null = null
    void import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (disposed || !container.current) return
      mapboxgl.accessToken = token
      const map = new mapboxgl.Map({ container: container.current, style: MAP_STYLE, center: CAMPUS_CENTER, zoom: INITIAL_ZOOM, attributionControl: false, dragRotate: false, pitchWithRotate: false })
      mapInstance = map
      mapRef.current = map
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
      map.on('load', () => {
      map.fitBounds(CAMPUS_BOUNDS, { padding: 35, duration: 0, maxZoom: INITIAL_ZOOM })
      // Match Mapbox's real building footprints to the soft, illustrated game palette.
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'fill' && /building/i.test(layer.id)) {
          map.setPaintProperty(layer.id, 'fill-color', '#c7d8e1')
          map.setPaintProperty(layer.id, 'fill-outline-color', '#8da9b8')
          map.setPaintProperty(layer.id, 'fill-opacity', 0.94)
        }
      }
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#eef3e6')
        if (layer.type === 'fill' && /park|grass|pitch|landcover/i.test(layer.id)) {
          map.setPaintProperty(layer.id, 'fill-color', '#d8e8ca')
          map.setPaintProperty(layer.id, 'fill-opacity', 0.85)
        }
        if (layer.type === 'line' && /path|pedestrian/i.test(layer.id)) {
          map.setPaintProperty(layer.id, 'line-color', '#f3e6ce')
          map.setPaintProperty(layer.id, 'line-width', 2.2)
        }
      }
      CAMPUS_PLACES.forEach((place) => {
        const el = document.createElement('div')
        el.className = `place-marker place-${place.tone}`
        el.innerHTML = `<span>${place.emoji}</span><b>${place.name}</b>`
        new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat(place.coordinates).addTo(map)
      })
        markerRef.current = new mapboxgl.Marker({ element: createPlayerMarker(), anchor: 'center' }).setLngLat(CAMPUS_CENTER).addTo(map)
        if (positionRef.current) markerRef.current.setLngLat([positionRef.current.coords.longitude, positionRef.current.coords.latitude])
      })
      map.on('error', (event) => { if (event.error?.message) setMapError(event.error.message) })
    }).catch(() => setMapError('Mapbox GL JS could not be loaded. Check your network connection.'))
    return () => { disposed = true; markerRef.current?.remove(); mapInstance?.remove(); mapRef.current = null }
  }, [token])

  useEffect(() => {
    if (!location.position || !markerRef.current) return
    const { latitude, longitude } = location.position.coords
    markerRef.current.setLngLat([longitude, latitude])
  }, [location.position])

  useEffect(() => {
    const map = mapRef.current
    const position = positionRef.current
    if (!map || !position || recenter === 0) return
    map.flyTo({ center: [position.coords.longitude, position.coords.latitude], duration: 850 })
  }, [recenter])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !zoomAction) return
    map.easeTo({ zoom: Math.max(12, Math.min(19, map.getZoom() + (zoomAction.direction === 'in' ? 1 : -1))), duration: 260 })
  }, [zoomAction?.id])

  if (!token) return <div className="map-fallback"><div className="fallback-card"><div className="fallback-icon">🗺️</div><b>Your campus map is almost ready</b><p>Add a Mapbox public token to <code>.env.local</code> as <code>VITE_MAPBOX_ACCESS_TOKEN</code>, then restart the dev server.</p><span>UB North Campus · Amherst, NY</span></div></div>
  return <><div className="map-canvas" ref={container} />{mapError && <div className="map-error">Map couldn't finish loading. Check your connection and Mapbox token.</div>}</>
}
