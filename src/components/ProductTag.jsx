import { BadgeCheck, Flame } from 'lucide-react'

// Visual product stamp shown on a product card. Either an "official importer"
// seal (blue, stamp-like) or a "deal" tag (red). Our own design — inspired by
// the classic importer rubber-stamp look.
export default function ProductTag({ tag, className = '' }) {
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
  return null
}
