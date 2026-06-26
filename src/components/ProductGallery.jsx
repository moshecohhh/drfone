import { useState, useRef } from 'react'
import { ZoomIn, Search, ChevronRight, ChevronLeft } from 'lucide-react'

// Product image gallery with a main image + thumbnail strip and a cursor-following
// zoom. The zoom is MOUSE-ONLY (hover on desktop) — it never activates on touch
// devices, so a normal touch just scrolls the page.
//
// Controlled active image: `active` / `onSelect` let the parent sync the shown
// image with a chosen color (a color can be linked to a specific gallery image).
export default function ProductGallery({ images = [], active, onSelect, emoji = '📦', name = '', badge = '' }) {
  const list = images.filter(Boolean)
  const current = list.includes(active) ? active : list[0] || ''
  const currentIndex = Math.max(0, list.indexOf(current))
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 })
  const frameRef = useRef(null)

  // Step the main image (wraps around) — drives the on-image prev/next arrows.
  const step = (dir) => {
    if (list.length < 2) return
    const next = (currentIndex + dir + list.length) % list.length
    onSelect?.(list[next])
  }

  // Map a pointer/touch event to a 0–100% position inside the image frame.
  const moveZoom = (clientX, clientY) => {
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100))
    setZoom((z) => ({ ...z, x, y }))
  }

  const hasImage = !!current

  return (
    <div className="w-full">
      {/* Main image — hover/drag to zoom into the touched area. */}
      <div
        ref={frameRef}
        className="group relative aspect-square w-full overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-br from-brand-50 to-brand-100"
        // MOUSE ONLY — ignore touch pointers so a finger never zooms (it scrolls).
        onPointerEnter={(e) => e.pointerType === 'mouse' && hasImage && setZoom((z) => ({ ...z, on: true }))}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setZoom((z) => ({ ...z, on: false }))}
        onPointerMove={(e) => e.pointerType === 'mouse' && hasImage && moveZoom(e.clientX, e.clientY)}
      >
        {hasImage ? (
          <img
            src={current}
            alt={name}
            draggable={false}
            className="h-full w-full select-none object-contain transition-transform duration-150 ease-out"
            style={{
              transform: zoom.on ? 'scale(2.2)' : 'scale(1)',
              transformOrigin: `${zoom.x}% ${zoom.y}%`,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[6rem]">{emoji}</div>
        )}

        {badge && (
          <span className="absolute right-4 top-4 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {badge}
          </span>
        )}

        {/* Desktop-only magnifier affordance (zoom is mouse-hover only). */}
        {hasImage && (
          <span className="pointer-events-none absolute left-4 top-4 hidden text-ink-light/70 lg:block">
            <Search size={20} />
          </span>
        )}

        {/* Prev / next arrows — circular, on the side edges (image carousel) */}
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="התמונה הקודמת"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition hover:bg-ink/65"
            >
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="התמונה הבאה"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition hover:bg-ink/65"
            >
              <ChevronLeft size={20} />
            </button>
          </>
        )}

        {hasImage && (
          <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink-light opacity-100 shadow-sm transition group-hover:opacity-0 lg:flex">
            <ZoomIn size={13} /> מעבר עכבר להגדלה
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect?.(src)}
              aria-label={`תמונה ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                src === current ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-black/10 hover:border-brand-300'
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
