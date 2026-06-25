// Central business details — used by the header, footer and WhatsApp button.
export const BUSINESS = {
  name: 'ד״ר פון',
  address: 'רשבי 49, מודיעין עילית',
  whatsappDisplay: '055-680-2800',
  whatsappIntl: '972556802800', // for wa.me links
}

export const WHATSAPP_BASE = `https://wa.me/${BUSINESS.whatsappIntl}`

// Direct Google Maps navigation link to the exact business address.
export const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  BUSINESS.address,
)}`

// Waze deep link (kept for reference / optional use).
export const WAZE_LINK = `https://waze.com/ul?q=${encodeURIComponent(BUSINESS.address)}&navigate=yes`

// Builds a wa.me link with an optional pre-filled message.
export function waLink(message) {
  if (!message) return WHATSAPP_BASE
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`
}
