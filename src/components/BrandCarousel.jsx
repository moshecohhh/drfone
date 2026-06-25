import { useRef, useEffect, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useBrands } from '../context/BrandsContext.jsx'
import BrandLogo from './admin/BrandLogo.jsx'

// Auto-scroll speed in px/second (gentle "slow motion" drift).
const SPEED = 30

// Circle showing a brand logo (image/SVG) or a monogram fallback.
// Thin gray frame by default; turns teal (turquoise) when its brand is active.
function BrandCircle({ brand, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-20"
    >
      <span
        className={`glass-sheen flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full bg-white transition duration-200 hover:scale-105 sm:h-[74px] sm:w-[74px] ${
          active ? 'ring-4 ring-brand-500' : 'ring-2 ring-gray-300 hover:ring-brand-300'
        }`}
      >
        {brand.logo ? (
          <img src={brand.logo} alt={brand.label} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <BrandLogo brand={brand.label} size={74} className="!rounded-full" />
        )}
      </span>
      <span className={`max-w-full truncate text-xs font-medium ${active ? 'text-brand-700' : 'text-ink-light'}`}>
        {brand.label}
      </span>
    </button>
  )
}

// The pinned "all brands" reset circle — shared by the mobile strip and the
// desktop marquee. Light by default; teal/filled when active.
function AllCircle({ active, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-20 ${className}`}
    >
      <span
        className={`flex h-[58px] w-[58px] items-center justify-center rounded-full transition-colors sm:h-[74px] sm:w-[74px] ${
          active
            ? 'bg-brand-500 text-white ring-4 ring-brand-500'
            : 'bg-brand-50 text-brand-600 ring-2 ring-gray-300 hover:ring-brand-300'
        }`}
      >
        <LayoutGrid size={28} />
      </span>
      <span className={`text-xs font-medium ${active ? 'text-brand-700' : 'text-ink-light'}`}>
        הכל
      </span>
    </button>
  )
}

export default function BrandCarousel() {
  const { filters, setBrand, setCategory } = useApp()
  const { brands } = useBrands()
  const viewport = useRef(null) // clipping window
  const track = useRef(null) // the moving row (driven by a CSS transform)
  // Current leftward shift of the track, in px. Advances forever; the loop is
  // kept seamless by wrapping it modulo one brand-set's width every frame.
  const offset = useRef(0)
  // One brand-set's width — the loop period.
  const setWidth = useRef(0)
  // Interaction state (refs, so they don't re-trigger renders).
  const drag = useRef({ down: false, lastX: 0, moved: false })
  // How many times the brand set is repeated. Grown to whatever it takes to
  // overflow the viewport, so the marquee keeps moving even with few brands —
  // seeing the same logo any number of times never stops the motion.
  const [copies, setCopies] = useState(2)
  // Below the lg breakpoint the row is a plain finger-scrollable strip (no
  // auto-drift); at lg and up it's the animated marquee.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const on = () => setIsMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // The "הכל" circle is only "active" once the user is actually browsing the
  // catalog — on the default home/featured view it stays light (un-selected).
  const allActive = filters.brand === 'all' && filters.category !== 'home'

  const select = (id) => {
    const next = filters.brand === id ? 'all' : id
    // The "ראשי" featured view ignores the brand filter, so any pick there
    // (including "הכל") would look like nothing happened. Jump to the full
    // catalog FIRST (setCategory also clears the brand) and then apply the
    // chosen brand — so brand selection from the home view still works.
    if (filters.category === 'home') setCategory('all')
    setBrand(next)
  }
  // Swallow the click that ends a drag, so dragging doesn't toggle a filter.
  const guardedSelect = (id) => {
    if (drag.current.moved) {
      drag.current.moved = false
      return
    }
    select(id)
  }

  // Duplicated list that feeds the loop.
  const loop = []
  for (let c = 0; c < copies; c++) loop.push(...brands)

  // Measure one set's width (the loop period) and make sure we render enough
  // copies to always fill the viewport — that guarantees there is content to
  // re-enter from the right no matter how few brands exist.
  useEffect(() => {
    const tr = track.current
    const vp = viewport.current
    if (!tr || !vp || brands.length === 0) return
    const measure = () => {
      const first = tr.children[0]
      const next = tr.children[brands.length]
      if (!first || !next) return
      const w = Math.abs(next.offsetLeft - first.offsetLeft)
      if (!w) return
      setWidth.current = w
      // Need to span the viewport plus one full period of headroom for the wrap.
      const needed = Math.ceil(vp.clientWidth / w) + 2
      setCopies((c) => (c < needed ? needed : c))
    }
    measure()
    const t = setTimeout(measure, 400) // re-measure once fonts/images settle
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [brands])

  // rAF loop: advance the transform (unless paused/dragging) and wrap it modulo
  // the period so a brand that exits on the left re-enters on the right, forever.
  useEffect(() => {
    if (isMobile) return // mobile: no auto-drift — the user scrolls by finger
    const tr = track.current
    const vp = viewport.current
    if (!tr || !vp || brands.length === 0) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      const w = setWidth.current
      if (w) {
        // Pause only while the cursor is genuinely over the row (the browser's
        // own :hover state — always correct, even when the DOM re-renders under
        // a stationary cursor after a brand is selected) or while dragging.
        const hovering = vp.matches(':hover')
        if (!hovering && !drag.current.down) {
          offset.current += SPEED * dt
        }
        // Periodic wrap — invisible because every set is identical. Also tames
        // any manual wheel/drag overscroll.
        offset.current = ((offset.current % w) + w) % w
        tr.style.transform = `translate3d(${-offset.current}px, 0, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [brands, isMobile])

  // Mouse wheel nudges the row horizontally (so a regular mouse can browse it
  // while hovering, where the auto-drift is paused).
  useEffect(() => {
    const vp = viewport.current
    if (!vp) return
    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (!delta) return
      e.preventDefault()
      offset.current += delta
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [brands])

  // Mouse drag-to-scroll (incremental, so it composes with the rAF wrap).
  const onPointerDown = (e) => {
    drag.current = { down: true, lastX: e.clientX, moved: false }
  }
  const onPointerMove = (e) => {
    if (!drag.current.down) return
    const dx = e.clientX - drag.current.lastX
    drag.current.lastX = e.clientX
    if (Math.abs(dx) > 1) drag.current.moved = true
    offset.current -= dx
  }
  const endDrag = () => {
    drag.current.down = false
  }

  if (brands.length === 0) return null

  // Mobile: a plain finger-scrollable strip — no auto-movement. "הכל" lives
  // INSIDE the scroller so it swipes together with the brands.
  if (isMobile) {
    return (
      <div className="border-b border-black/5 bg-white">
        <div className="px-4 py-3">
          <div className="no-scrollbar flex gap-3 overflow-x-auto py-2">
            <AllCircle active={allActive} onClick={() => select('all')} />
            {brands.map((b) => (
              <BrandCircle
                key={b.id}
                brand={b}
                active={filters.brand === b.id}
                onClick={() => select(b.id)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-black/5 bg-white">
      <div className="flex w-full items-start gap-3 px-4 py-3 sm:gap-4 xl:px-[3cm] xl:py-4">
        {/* "All" reset circle — pinned at the start (does not scroll away).
            pt-2 aligns it with the py-2 marquee track beside it. */}
        <AllCircle active={allActive} onClick={() => select('all')} className="pt-2" />

        {/* Auto-scrolling row. A transform-driven marquee (forced LTR) that
            loops forever — a logo that exits on the left re-enters on the
            right — and pauses while the mouse is over it. The viewport is
            LTR so the wide track anchors on the LEFT and overflows to the
            right; sliding it left then keeps the right edge backfilled by the
            next copy (in an RTL viewport the track would anchor right and a
            blank strip would open up on the right as it drifts). */}
        <div className="relative flex-1 overflow-hidden" dir="ltr" ref={viewport}>
          <div
            ref={track}
            dir="ltr"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            className="no-scrollbar flex w-max cursor-grab gap-4 py-2 will-change-transform active:cursor-grabbing"
          >
            {loop.map((b, i) => (
              <BrandCircle
                key={`${b.id}-${i}`}
                brand={b}
                active={filters.brand === b.id}
                onClick={() => guardedSelect(b.id)}
              />
            ))}
          </div>
          {/* Soft fade at both edges so circles melt in/out instead of hard-cutting. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent dark:from-[#181f23]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent dark:from-[#181f23]" />
        </div>
      </div>
    </div>
  )
}
