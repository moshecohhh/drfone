import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApp, DOMAINS } from '../context/AppContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'

// NOTE: This component is deliberately NOT named with ad-related words
// ("ad", "ads", "banner", "advert", "promo"). Ad blockers block network
// requests for module files whose URL matches those patterns (e.g. "AdBanner",
// "AdManager"→Google "Ad Manager"), which would fail the import and white-page
// the whole site for those users. Keep all identifiers here neutral.

const STRIP_ASPECT = 4
// Mobile shows a squarer image with more "volume" (admin can supply a separate
// mobile crop; falls back to the desktop image).
const STRIP_ASPECT_MOBILE = 1.3
// ~1cm of mouse/finger travel is enough to flip to the next image (96dpi → 1cm ≈ 38px).
const SWIPE_THRESHOLD = 38

// Is a slide live right now? Empty start/end means "no bound" on that side.
// Guards against malformed dates so a bad value can never crash the strip.
function isScheduled(s, now) {
  if (s.start) {
    const t = new Date(s.start).getTime()
    if (!Number.isNaN(t) && now < t) return false
  }
  if (s.end) {
    const t = new Date(s.end).getTime()
    if (!Number.isNaN(t) && now > t) return false
  }
  return true
}

// Rotating featured-content strip shown below the brand row. Renders nothing
// when disabled or when no slide is currently active (so it never leaves a gap).
export default function FeatureStrip() {
  const { ads } = useSettings()
  const { switchDomain, setBrand, setCategory, setSearch, resetFilters } = useApp()
  const { store } = useCatalogStore()
  const [now, setNow] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false) // only paused while actively dragging
  const drag = useRef({ down: false, startX: 0, fired: false, moved: false })

  // Switch to the squarer mobile layout/image below the lg breakpoint.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const on = () => setIsMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Re-evaluate schedules every 30s so timed slides appear/disappear on time.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const slides = useMemo(() => {
    if (!ads?.enabled || !Array.isArray(ads.slides)) return []
    return ads.slides.filter((s) => s && s.enabled !== false && s.image && isScheduled(s, now))
  }, [ads, now])

  const go = (dir) => setIndex((i) => (i + dir + slides.length) % slides.length)

  // Effective click target of a slide (back-compat: a bare `link` means a URL).
  const slideType = (s) => s.linkType || (s.link ? 'url' : 'none')

  // Apply an internal target (product / brand / category): jump to the Store,
  // set the matching filter, and scroll down to the results.
  const activate = (s) => {
    const type = slideType(s)
    switchDomain(DOMAINS.STORE)
    resetFilters()
    if (type === 'brand') setBrand(s.targetId)
    else if (type === 'category') setCategory(s.targetId)
    else if (type === 'product') {
      const p = store.find((x) => x.id === s.targetId)
      if (p) setSearch(p.name)
    }
    setTimeout(() => document.querySelector('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  // Drag / swipe to change image (≥ ~1cm of travel flips one image).
  const onPointerDown = (e) => {
    drag.current = { down: true, startX: e.clientX, fired: false, moved: false }
    setPaused(true) // hold the auto-rotate while interacting
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d.down) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 4) d.moved = true
    if (!d.fired && Math.abs(dx) >= SWIPE_THRESHOLD) {
      go(dx < 0 ? 1 : -1) // drag left → next, drag right → previous
      d.fired = true
    }
  }
  const endDrag = () => {
    drag.current.down = false
    setPaused(false)
  }
  // Swallow the click that ends a drag so it doesn't open the slide's link.
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = false
    }
  }

  // Keep the active index in range as the active set changes.
  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [slides.length, index])

  // Auto-rotate.
  useEffect(() => {
    if (paused || slides.length <= 1) return
    const ms = Math.max(2, Number(ads?.rotateSeconds) || 5) * 1000
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), ms)
    return () => clearInterval(t)
  }, [paused, slides.length, ads?.rotateSeconds])

  if (slides.length === 0) return null
  const safeIndex = index % slides.length

  return (
    // Matches the products area width exactly (same horizontal gutters).
    <div className="w-full px-4 py-4 xl:px-[3cm] 2xl:px-[7cm]">
    <section
      aria-label="מבצעים והטבות"
      className="relative mx-auto w-full cursor-grab touch-pan-y select-none overflow-hidden rounded-2xl bg-black shadow-card active:cursor-grabbing lg:mx-0"
      style={{ aspectRatio: String(isMobile ? STRIP_ASPECT_MOBILE : STRIP_ASPECT), maxWidth: isMobile ? '26rem' : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={onClickCapture}
    >
      {/* Crossfading slides */}
      {slides.map((s, i) => {
        const src = isMobile && s.mobileImage ? s.mobileImage : s.image
        const Img = <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        const type = slideType(s)
        let wrapped = Img
        if (type === 'url' && s.link) {
          wrapped = (
            <a href={s.link} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
              {Img}
            </a>
          )
        } else if ((type === 'product' || type === 'brand' || type === 'category') && s.targetId) {
          wrapped = (
            <button type="button" onClick={() => activate(s)} className="block h-full w-full cursor-pointer">
              {Img}
            </button>
          )
        }
        return (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === safeIndex ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={i !== safeIndex}
          >
            {wrapped}
          </div>
        )
      })}

      {/* Prev / next arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="הקודם"
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-md transition hover:bg-white"
          >
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="הבא"
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-md transition hover:bg-white"
          >
            <ChevronLeft size={20} />
          </button>
        </>
      )}

      {/* Navigation squares — one per image. Hover/touch (not just click)
          switches to that image. Rounded-square, modern look on a soft backdrop. */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2 py-1.5 backdrop-blur-sm">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              onMouseEnter={() => setIndex(i)}
              onPointerEnter={() => setIndex(i)}
              onFocus={() => setIndex(i)}
              aria-label={`מעבר לתמונה ${i + 1}`}
              className={`h-3 w-3 rounded-[5px] shadow-sm transition-all duration-200 ${
                i === safeIndex ? 'scale-110 bg-white' : 'bg-white/55 hover:bg-white/90'
              }`}
            />
          ))}
        </div>
      )}
    </section>
    </div>
  )
}
