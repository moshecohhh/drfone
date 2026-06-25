import { BadgeCheck, Flame } from 'lucide-react'

// Visual product stamp shown on a product card. One of: an "official importer"
// seal (blue, stamp-like), a "deal" tag (red), or a custom round image badge
// (admin-supplied logo/photo). Our own design — inspired by the classic
// importer rubber-stamp look.
export default function ProductTag({ tag, image = '', className = '' }) {
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
  return null
}
