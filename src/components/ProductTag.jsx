import { BadgeCheck, Flame } from 'lucide-react'

// Visual product stamp shown on a product card / gallery. One of:
//   • 'importer' — an "official importer" seal (blue, stamp-like)
//   • 'deal'     — a red "deal" tag
//   • 'custom'   — a round image badge (admin-supplied logo/photo)
//   • 'text'     — a free-text badge in a chosen SHAPE (pill / circle / star)
//                  and COLOR (replaces the old plain "badge" text field).

// Five-point star outline for the 'star' shape.
const STAR_CLIP =
  'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'

// Recommended max characters per shape so the badge still reads well on both
// desktop and mobile. Exposed so the editor can warn when the text is too long.
export const TAG_TEXT_LIMITS = { pill: 18, circle: 8, star: 6 }

const hexToRgb = (hex) => {
  let s = String(hex || '').replace('#', '').trim()
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return { r: 14, g: 165, b: 233 }
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
}
// Pick black or white text for readable contrast on the chosen background.
const readableText = (hex) => {
  const { r, g, b } = hexToRgb(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1F2937' : '#FFFFFF'
}

export default function ProductTag({ tag, image = '', text = '', shape = 'pill', color = '#0EA5E9', className = '' }) {
  if (tag === 'custom' && image) {
    return (
      <span
        className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md ring-1 ring-black/10 ${className}`}
      >
        <img src={image} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
    )
  }
  if (tag === 'importer') {
    return (
      <span
        className={`inline-flex -rotate-6 items-center gap-1 rounded-md border-2 border-dashed border-blue-500/80 bg-white/85 px-2 py-1 text-[10px] font-extrabold uppercase leading-none tracking-wide text-blue-700 shadow-sm backdrop-blur-sm ${className}`}
      >
        <BadgeCheck size={12} /> יבואן רשמי
      </span>
    )
  }
  if (tag === 'deal') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-red-500 to-orange-500 px-2.5 py-1 text-[10px] font-extrabold leading-none text-white shadow-sm ${className}`}
      >
        <Flame size={12} /> מבצע
      </span>
    )
  }
  if (tag === 'text' && String(text).trim()) {
    const fg = readableText(color)
    if (shape === 'circle') {
      return (
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-center text-[10px] font-extrabold leading-tight shadow-md ring-1 ring-black/10 ${className}`}
          style={{ background: color, color: fg }}
        >
          <span className="px-1">{text}</span>
        </span>
      )
    }
    if (shape === 'star') {
      return (
        <span className={`relative flex h-16 w-16 items-center justify-center ${className}`}>
          <span className="absolute inset-0 drop-shadow" style={{ background: color, clipPath: STAR_CLIP }} />
          <span className="relative z-10 max-w-[58%] text-center text-[9px] font-extrabold leading-none" style={{ color: fg }}>
            {text}
          </span>
        </span>
      )
    }
    // 'pill' (default) — rounded rectangle.
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold leading-none shadow-sm ${className}`}
        style={{ background: color, color: fg }}
      >
        {text}
      </span>
    )
  }
  return null
}
