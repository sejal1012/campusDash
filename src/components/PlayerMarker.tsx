export function createPlayerMarker(): HTMLDivElement {
  const marker = document.createElement('div')
  marker.className = 'player-marker'
  marker.setAttribute('aria-label', 'Your live location')
  marker.innerHTML = '<span class="player-pulse"></span><span class="player-ring"><span class="player-avatar">🙂</span></span>'
  return marker
}
