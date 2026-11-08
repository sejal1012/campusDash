type Props = { onLocate: () => void; onZoom: (direction: 'in' | 'out') => void; locationAvailable: boolean; mapAvailable: boolean }
export function MapControls({ onLocate, onZoom, locationAvailable, mapAvailable }: Props) {
  return <div className="map-controls"><button className="locate-button" onClick={onLocate} disabled={!locationAvailable} aria-label="Locate me"><span>⌖</span><b>Locate Me</b></button><div className="zoom-controls"><button onClick={() => onZoom('in')} disabled={!mapAvailable} aria-label="Zoom in">+</button><span/><button onClick={() => onZoom('out')} disabled={!mapAvailable} aria-label="Zoom out">−</button></div></div>
}
