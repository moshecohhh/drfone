// Central business details — used by the header, footer and WhatsApp button.
export const BUSINESS = {
  name: 'ד״ר פון',
  address: 'רשבי 49, מודיעין עילית',
  whatsappDisplay: '055-680-2800',
  whatsappIntl: '972556802800', // for wa.me links
  // Exact map pin "lat,lng" (the נ״צ). Drives the footer map AND the Waze /
  // Google-Maps navigation links, so they all point to the very same spot.
  mapCoords: '31.938305,35.046213',
}

// "lat,lng" → { lat, lng } (trimmed numbers) or null when not a valid pair.
export function parseCoords(str) {
  const m = String(str || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  return m ? { lat: m[1], lng: m[2] } : null
}

// Navigation links to an exact pin when coords are given, else a text search.
export function mapsLinkFor(coords, address) {
  const c = parseCoords(coords)
  const query = c ? `${c.lat},${c.lng}` : address
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
export function wazeLinkFor(coords, address) {
  const c = parseCoords(coords)
  return c
    ? `https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
}

export const WHATSAPP_BASE = `https://wa.me/${BUSINESS.whatsappIntl}`

// Direct Google Maps / Waze navigation links to the exact business pin.
export const MAPS_LINK = mapsLinkFor(BUSINESS.mapCoords, BUSINESS.address)

// Waze deep link (kept for reference / optional use).
export const WAZE_LINK = wazeLinkFor(BUSINESS.mapCoords, BUSINESS.address)

// Builds a wa.me link with an optional pre-filled message.
export function waLink(message) {
  if (!message) return WHATSAPP_BASE
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`
}
