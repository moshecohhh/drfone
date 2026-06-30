import { useRef, useEffect, useState } from 'react'
import { ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react'
import ItemCard from './ItemCard.jsx'

// A single horizontal row of product cards that auto-advances one card every 3s
// (revealing the next from the side), with manual wheel / drag / arrow scrolling
// and a seamless infinite loop when the set overflows. Shared by the "מבצעים
// חמים" and "מוצרים נבחרים" rows so they behave identically.
//
// Props:
//   items       – products to show
//   title       – heading text
//   Icon        – lucide icon for the heading badge
//   iconClass   – tailwind classes for the badge (bg + text color)
//   synced      – catalog sync flag (controls skeleton vs. empty state)
//   more        – { label, onClick } for the footer button, or null
//   empty       – { Icon, title, hint } empty-state, or null to hide when empty
export default function ProductCarousel({ items, title, Icon, iconClass, synced, more = null, empty = null }) {
  const scroller = useRef(null)
  const drag = useRef({ down: false, lastX: 0, moved: false })
  const tween = useRef(null)
  // While the customer is actively scrolling/dragging, auto-advance pauses; it
  // resumes only 5s after they let go (so it never fights their own scrolling).
  const interacting = useRef(false)
  const lastInteract = useRef(0)
  const lastAdvance = useRef(0)
  const markInteract = () => {
    interacting.current = true
    lastInteract.current = performance.now()
  }
  const touchInteract = () => {
    lastInteract.current = performance.now()
  }
  const releaseInteract = () => {
    interacting.current = false
    lastInteract.current = performance.now()
  }
  // `centered`: few items that fit the row → center them, no auto-scroll.
  // `looping`: a full set overflows → render the items TWICE so the auto-scroll
  // can wrap seamlessly (snake/infinite loop) instead of rewinding to the start.
  const [centered, setCentered] = useState(false)
  const [looping, setLooping] = useState(false)
  const setWidth = useRef(0) // exact width of ONE set of items (the loop period)

  // Exact width of one set = the horizontal offset of the second copy's first
  // card from the first card (avoids the half-gap error of scrollWidth/2).
  const measureSet = () => {
    const el = scroller.current
    const cards = el?.children
    if (!el || !cards || cards.length <= items.length) return el ? el.scrollWidth : 0
    return cards[items.length].offsetLeft - cards[0].offsetLeft
  }

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const check = () => {
      const oneSet = measureSet()
      const overflow = oneSet > el.clientWidth + 1
      if (looping) setWidth.current = oneSet
      setLooping(overflow)
      setCentered(!overflow)
    }
    check()
    const t = setTimeout(check, 200) // re-measure once images/layout settle
    window.addEventListener('resize', check)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', check)
    }
  }, [items.length, looping])

  const stepWidth = () => {
    const el = scroller.current
    const card = el?.querySelector('[data-carousel-card]')
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

  // Auto-advance one card every 3s. The fast (400ms) tick decouples the check
  // from the cadence so it can resume promptly once the 5s post-interaction
  // pause elapses. It never advances while the customer is interacting, within
  // 5s of their last interaction, or while hovered (desktop).
  useEffect(() => {
    if (items.length <= 1) return
    lastAdvance.current = performance.now()
    const id = setInterval(() => {
      const el = scroller.current
      if (!el) return
      const now = performance.now()
      if (interacting.current) return // actively scrolling/dragging
      if (now - lastInteract.current < 5000) return // wait 5s after release
      if (el.matches(':hover')) return // desktop: paused while hovered
      if (now - lastAdvance.current < 3000) return // one step every 3s
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      lastAdvance.current = now
      // Seamless infinite loop: once a full set has scrolled past, jump back by
      // exactly one set BEFORE the next step. The second copy is identical, so
      // the jump is invisible and the motion never rewinds — it just keeps going.
      if (looping) {
        const setW = setWidth.current || measureSet()
        if (setW > 0 && el.scrollLeft >= setW) el.scrollLeft -= setW
      }
      animateScroll(stepWidth())
    }, 400)
    return () => {
      clearInterval(id)
      clearInterval(tween.current)
    }
  }, [items.length, looping])

  const nudge = (dir) => {
    lastInteract.current = performance.now() // arrow tap also defers auto-advance 5s
    animateScroll(dir * stepWidth())
  }

  // Mouse drag-to-scroll. On touch we do NOTHING here so the browser's native
  // horizontal scroll handles the finger swipe.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    drag.current = { down: true, lastX: e.clientX, moved: false }
    markInteract()
  }
  const onPointerMove = (e) => {
    if (!drag.current.down) return
    const dx = e.clientX - drag.current.lastX
    drag.current.lastX = e.clientX
    if (Math.abs(dx) > 1) drag.current.moved = true
    lastInteract.current = performance.now()
    scroller.current.scrollLeft -= dx
  }
  const endDrag = () => {
    if (drag.current.down) releaseInteract()
    drag.current.down = false
  }
  const onTouchStart = () => markInteract()
  const onTouchMove = () => touchInteract()
  const onTouchEnd = () => releaseInteract()
  const onWheel = () => touchInteract()

  // Nothing flagged yet and no empty-state requested → render nothing.
  if (items.length === 0 && synced && !empty) return null

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClass}`}>
            <Icon size={18} />
          </span>
          {title}
        </h2>
        {items.length > 1 && (
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

      {items.length === 0 && !synced ? (
        // Admin-set flags aren't in the bundled seed, so until the server sync
        // finishes show placeholders instead of flashing an empty state.
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        empty && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 py-14 text-center">
            <empty.Icon size={36} className="text-black/20" />
            <p className="mt-3 font-semibold text-ink">{empty.title}</p>
            {empty.hint && <p className="mt-1 text-sm text-ink-light">{empty.hint}</p>}
          </div>
        )
      ) : (
        <>
          <div
            ref={scroller}
            dir="ltr"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            onWheel={onWheel}
            className={`no-scrollbar flex items-stretch gap-4 overflow-x-auto pb-2 pt-8 ${centered ? 'cursor-default justify-center' : 'cursor-grab active:cursor-grabbing'}`}
          >
            {(looping ? [...items, ...items] : items).map((item, i) => (
              <div key={`${item.id}-${i}`} data-carousel-card className="animate-fade-in flex w-[10.5rem] shrink-0 flex-col sm:w-72 [&>article]:flex-1">
                <ItemCard item={item} kind="product" />
              </div>
            ))}
          </div>

          {more && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={more.onClick}
                className="flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-brand-600 hover:shadow-md active:scale-95"
              >
                {more.label} <ArrowLeft size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// Pulsing placeholder card shown while the catalog loads.
function CardSkeleton() {
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
