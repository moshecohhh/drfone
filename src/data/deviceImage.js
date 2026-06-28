// ---------------------------------------------------------------------------
// Copyright-free, consistently-styled device illustrations, generated on the
// fly as inline SVG data-URIs. Each device COLOUR produces its own tinted
// picture (front + back), so selecting a colour on the product page swaps the
// gallery to that colour's images. They share one clean "catalog" look so the
// transition between colours stays visually consistent. Replace with real
// photos any time from the admin — these are just neutral placeholders, with
// no third-party imagery or copyright attached.
// ---------------------------------------------------------------------------

const enc = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`

// Mix a hex toward black (pct<0) or white (pct>0) — used for outlines, camera
// bumps and shadows so each colour keeps a coherent palette.
function shade(hex, pct) {
  const h = String(hex || '#888888').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  const t = pct < 0 ? 0 : 255
  const p = Math.abs(pct) / 100
  r = Math.round((t - r) * p) + r
  g = Math.round((t - g) * p) + g
  b = Math.round((t - b) * p) + b
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// Relative luminance (0..1) — light bodies (white/silver) get a visible outline.
function lum(hex) {
  const h = String(hex || '#888888').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

const BG = '#eef1f5'
const SCREEN = '#0f172a'

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="${BG}"/>${inner}</svg>`
}

// A phone, slightly different front (screen) vs back (cameras) per `variant`.
function phoneSvg(hex, variant) {
  const edge = lum(hex) > 0.75 ? shade(hex, -22) : shade(hex, -28)
  const x = 205
  const y = 70
  const w = 190
  const h = 460
  const body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="36" fill="${hex}" stroke="${edge}" stroke-width="3"/>`
  if (variant % 2 === 1) {
    // Back — camera module + subtle centred logo plate.
    const camBump = shade(hex, -14)
    return frame(
      `${body}` +
        `<rect x="${x + 18}" y="${y + 22}" width="78" height="100" rx="22" fill="${camBump}" stroke="${edge}" stroke-width="2"/>` +
        `<circle cx="${x + 40}" cy="${y + 48}" r="15" fill="${SCREEN}"/><circle cx="${x + 40}" cy="${y + 48}" r="7" fill="#334155"/>` +
        `<circle cx="${x + 74}" cy="${y + 48}" r="15" fill="${SCREEN}"/><circle cx="${x + 74}" cy="${y + 48}" r="7" fill="#334155"/>` +
        `<circle cx="${x + 40}" cy="${y + 90}" r="15" fill="${SCREEN}"/><circle cx="${x + 40}" cy="${y + 90}" r="7" fill="#334155"/>` +
        `<circle cx="${x + 78}" cy="${y + 92}" r="6" fill="#fde68a"/>` +
        `<circle cx="${x + w / 2}" cy="${y + h / 2 + 30}" r="26" fill="${shade(hex, -10)}" opacity="0.6"/>`,
    )
  }
  // Front — dark screen with a soft reflection and a centred camera dot.
  return frame(
    `${body}` +
      `<rect x="${x + 12}" y="${y + 14}" width="${w - 24}" height="${h - 28}" rx="26" fill="${SCREEN}"/>` +
      `<rect x="${x + 12}" y="${y + 14}" width="${(w - 24) / 2}" height="${h - 28}" rx="26" fill="#1e293b" opacity="0.5"/>` +
      `<circle cx="${x + w / 2}" cy="${y + 32}" r="6" fill="#1e293b"/>` +
      `<rect x="${x + w / 2 - 34}" y="${y + h - 40}" width="68" height="6" rx="3" fill="#334155"/>`,
  )
}

// A tablet — wider body, same visual language.
function tabletSvg(hex, variant) {
  const edge = lum(hex) > 0.75 ? shade(hex, -22) : shade(hex, -28)
  const x = 150
  const y = 95
  const w = 300
  const h = 410
  const body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${hex}" stroke="${edge}" stroke-width="3"/>`
  if (variant % 2 === 1) {
    const camBump = shade(hex, -14)
    return frame(
      `${body}` +
        `<rect x="${x + w / 2 - 26}" y="${y + 22}" width="52" height="52" rx="16" fill="${camBump}" stroke="${edge}" stroke-width="2"/>` +
        `<circle cx="${x + w / 2}" cy="${y + 48}" r="14" fill="${SCREEN}"/><circle cx="${x + w / 2}" cy="${y + 48}" r="6" fill="#334155"/>` +
        `<rect x="${x + 24}" y="${y + h - 70}" width="${w - 48}" height="2" fill="${edge}" opacity="0.5"/>`,
    )
  }
  return frame(
    `${body}` +
      `<rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="20" fill="${SCREEN}"/>` +
      `<rect x="${x + 16}" y="${y + 16}" width="${(w - 32) / 2}" height="${h - 32}" rx="20" fill="#1e293b" opacity="0.5"/>` +
      `<circle cx="${x + w / 2}" cy="${y + 30}" r="5" fill="#1e293b"/>`,
  )
}

// A foldable — open book layout with a centre crease.
function foldSvg(hex, variant) {
  const edge = lum(hex) > 0.75 ? shade(hex, -22) : shade(hex, -28)
  const x = 130
  const y = 130
  const w = 340
  const h = 340
  const body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${hex}" stroke="${edge}" stroke-width="3"/>`
  if (variant % 2 === 1) {
    const camBump = shade(hex, -14)
    return frame(
      `${body}` +
        `<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${edge}" stroke-width="3" opacity="0.6"/>` +
        `<rect x="${x + 18}" y="${y + 18}" width="48" height="74" rx="16" fill="${camBump}" stroke="${edge}" stroke-width="2"/>` +
        `<circle cx="${x + 42}" cy="${y + 40}" r="11" fill="${SCREEN}"/>` +
        `<circle cx="${x + 42}" cy="${y + 70}" r="11" fill="${SCREEN}"/>`,
    )
  }
  return frame(
    `${body}` +
      `<rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="12" fill="${SCREEN}"/>` +
      `<line x1="${x + w / 2}" y1="${y + 14}" x2="${x + w / 2}" y2="${y + h - 14}" stroke="#1e293b" stroke-width="3"/>` +
      `<rect x="${x + 14}" y="${y + 14}" width="${(w - 28) / 2}" height="${h - 28}" rx="12" fill="#1e293b" opacity="0.4"/>`,
  )
}

// Public: one image for a colour, by device kind ('phone' | 'tablet' | 'fold')
// and variant (0 = front, 1 = back).
export function deviceImage(hex, kind = 'phone', variant = 0) {
  const svg = kind === 'tablet' ? tabletSvg(hex, variant) : kind === 'fold' ? foldSvg(hex, variant) : phoneSvg(hex, variant)
  return enc(svg)
}

// Public: the full image set for a colour (front + back) — used as a colour's
// `images` array so the gallery can browse within that colour.
export function deviceImages(hex, kind = 'phone') {
  return [deviceImage(hex, kind, 0), deviceImage(hex, kind, 1)]
}
