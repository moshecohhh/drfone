import { useRef, useEffect, useState } from 'react'
import { Flame, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import ItemCard from './ItemCard.jsx'

// "ראשי" view: a horizontal row of HOT-DEAL products that auto-advances one
// product every 3s (revealing the next from the side), with manual wheel / drag
// / arrow scrolling. Below it, a button to the full deals collection.
export default function HotDeals() {
  const { setCategory } = useApp()
  const { store, synced } = useCatalogStore()
  const deals = store.filter((p) => p.deal === true)

  const scroller = useRef(null)
  const drag = useRef({ down: false, lastX: 0, moved: false })
  const tween = useRef(null)
  // Center the items when they don't fill the row (few deals); left-align +
  // scroll when they overflow (so the start is never clipped).
  const [centered, setCentered] = useState(false)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const check = () => setCentered(el.scrollWidth <= el.clientWidth + 1)
    check()
    const t = setTimeout(check, 150)
    window.addEventListener('resize', check)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', check)
    }
  }, [deals.length])

  const stepWidth = () => {
    const el = scroller.current
    const card = el?.querySelector('[data-deal-card]')
    return card ? card.getBoundingClientRect().width + 16 : 288
  }

  // Smoothly scroll by `delta` over `duration` (manual tween — not reliant on
  // CSS `behavior:'smooth'`, which some environments ignore). Eased in/out.
  const animateScroll = (delta, duration = 550) => {
    const el = scroller.current
    if (!el || !delta) return
    clearInterval(tween.current)
    const start = el.scrollLeft
    const t0 = performance.now()
    tween.current = setInterval(() => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      el.scrollLeft = start + delta * ease
      if (t >= 1) {
        clearInterval(tween.current)
        tween.current = null
      }
    }, 16)
  }

  // Auto-advance every 3s (pauses while hovered, like the brand row). Drifts the
  // row by one card; wraps back to the start when it reaches the end.
  useEffect(() => {
    if (deals.length <= 1) return
    const id = setInterval(() => {
      const el = scroller.current
      if (!el || el.matches(':hover')) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      if (el.scrollLeft >= max - 4) animateScroll(-el.scrollLeft) // wrap to start
      else animateScroll(stepWidth())
    }, 3000)
    return () => {
      clearInterval(id)
      clearInterval(tween.current)
    }
  }, [deals.length])

  // NOTE: intentionally NO vertical-wheel hijacking here — scrolling the mouse
  // wheel up/down lets the PAGE scroll normally. Only a horizontal mouse drag
  // (or the arrows / trackpad horizontal scroll) browses more products.

  const nudge = (dir) => animateScroll(dir * stepWidth())

  // Mouse drag-to-scroll. On touch we do NOTHING here so the browser's native
  // horizontal scroll handles the finger swipe (manual scrollLeft would fight
  // it and the row wouldn't move).
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    drag.current = { down: true, lastX: e.clientX, moved: false }
  }
  const onPointerMove = (e) => {
    if (!drag.current.down) return
    const dx = e.clientX - drag.current.lastX
    drag.current.lastX = e.clientX
    if (Math.abs(dx) > 1) drag.current.moved = true
    scroller.current.scrollLeft -= dx
  }
  const endDrag = () => (drag.current.down = false)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500">
            <Flame size={18} />
          </span>
          מבצעים חמים
        </h2>
        {deals.length > 1 && (
          <div className="hidden gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="הבא"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-ink transition hover:bg-brand-50"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="הקודם"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-ink transition hover:bg-brand-50"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {deals.length === 0 && !synced ? (
        // Deals are admin-set and aren't in the bundled seed, so until the server
        // sync finishes show placeholders instead of flashing "no deals".
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <DealSkeleton key={i} />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 py-14 text-center">
          <Flame size={36} className="text-orange-300" />
          <p className="mt-3 font-semibold text-ink">אין מבצעים חמים כרגע</p>
          <p className="mt-1 text-sm text-ink-light">מנהל החנות יכול לסמן מוצרים כמבצע מלוח הניהול.</p>
        </div>
      ) : (
        <>
          <div
            ref={scroller}
            dir="ltr"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            className={`no-scrollbar flex items-stretch gap-4 overflow-x-auto pb-2 pt-8 ${centered ? 'cursor-default justify-center' : 'cursor-grab active:cursor-grabbing'}`}
          >
            {deals.map((item) => (
              // flex column wrapper → the ItemCard stretches to the full (equal)
              // height of the tallest card, so every tile is the same size.
              <div key={item.id} data-deal-card className="animate-fade-in flex w-[10.5rem] shrink-0 flex-col sm:w-72 [&>article]:flex-1">
                <ItemCard item={item} kind="product" />
              </div>
            ))}
          </div>

          {/* More deals → the deals collection */}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setCategory('deals')}
              className="flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              למבצעים נוספים <ArrowLeft size={16} />
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// Pulsing placeholder card shown while the catalog loads.
function DealSkeleton() {
  return (
    <div className="w-[10.5rem] shrink-0 animate-pulse overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card sm:w-72">
      <div className="h-36 bg-black/10" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-black/10" />
        <div className="h-3 w-full rounded bg-black/5" />
        <div className="h-3 w-1/2 rounded bg-black/5" />
        <div className="mt-3 h-9 rounded-xl bg-black/10" />
      </div>
    </div>
  )
}
