import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Check, Home, Flame, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useCatalog } from '../hooks/useCatalog.js'

// Icon for the special virtual tabs.
const CAT_ICON = { home: Home, deals: Flame }

// A single category chip — shared by the visible row and the hidden measurer so
// their widths match exactly.
function Chip({ cat, active, onClick }) {
  const Icon = CAT_ICON[cat.id]
  const isDeals = cat.id === 'deals'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`glass-tab flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition hover:z-10 hover:scale-105 ${
        active
          ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
          : isDeals
            ? 'border-orange-300 bg-orange-50 text-orange-600 hover:border-orange-400'
            : 'border-black/10 bg-white text-ink-light hover:border-brand-400 hover:text-ink'
      }`}
    >
      {Icon && <Icon size={15} className={isDeals && !active ? 'text-orange-500' : ''} />}
      {cat.label}
    </button>
  )
}

// Category filter. Desktop: a single line of chips that fills the available
// width; whatever doesn't fit collapses into an "עוד" button that opens the
// full list. Mobile: a hamburger that opens the same list.
export default function CategoryBar() {
  const { filters, setCategory } = useApp()
  const { categories } = useCatalog()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Picking a category from any page (e.g. a product page) returns to the
  // storefront so the filtered results are actually shown.
  const pick = (id) => {
    setCategory(id)
    if (pathname !== '/') navigate('/')
  }
  const [open, setOpen] = useState(false) // mobile dropdown (logical)
  const [moreOpen, setMoreOpen] = useState(false) // desktop "עוד" dropdown
  const [visible, setVisible] = useState(categories.length) // chips shown on one line

  // Smooth open/close for the mobile dropdown: keep it mounted through the exit
  // so it can fade + slide out instead of vanishing.
  const [ddRender, setDdRender] = useState(false)
  const [ddShown, setDdShown] = useState(false)
  useEffect(() => {
    if (open) {
      setDdRender(true)
      const t = setTimeout(() => setDdShown(true), 10)
      return () => clearTimeout(t)
    }
    setDdShown(false)
    const t = setTimeout(() => setDdRender(false), 200)
    return () => clearTimeout(t)
  }, [open])

  const ref = useRef(null) // mobile wrapper (outside-click)
  const deskRef = useRef(null) // desktop block — measures the available width
  const measureRef = useRef(null) // hidden row of ALL chips, for width measuring

  // Close both dropdowns on an outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
      if (deskRef.current && !deskRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Also close on page scroll — if the customer scrolls the site instead of the
  // category list, the open list shouldn't linger. (Scrolling inside the list
  // itself fires on the list element, not the window, so it stays open.)
  useEffect(() => {
    if (!open && !moreOpen) return
    const onScroll = () => {
      setOpen(false)
      setMoreOpen(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open, moreOpen])

  // Priority+ : fit as many chips as the row allows; the rest go under "עוד".
  useLayoutEffect(() => {
    const wrap = deskRef.current
    const measurer = measureRef.current
    if (!wrap || !measurer) return
    const GAP = 8 // matches gap-2
    const MORE_W = 96 // room reserved for the "עוד" button (incl. its gap)
    const compute = () => {
      const avail = wrap.clientWidth
      if (!avail) return // desktop block hidden (mobile) — nothing to do
      const widths = [...measurer.children].map((el) => el.offsetWidth)
      const totalAll = widths.reduce((s, w) => s + w, 0) + GAP * Math.max(0, widths.length - 1)
      if (totalAll <= avail) {
        setVisible(categories.length) // everything fits — no "עוד"
        return
      }
      let used = 0
      let n = 0
      for (let i = 0; i < widths.length; i++) {
        const add = widths[i] + (n > 0 ? GAP : 0)
        if (used + add + GAP + MORE_W <= avail) {
          used += add
          n++
        } else break
      }
      setVisible(Math.max(1, n))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [categories])

  const shown = categories.slice(0, visible)
  const hidden = categories.slice(visible)
  // When the selected category is collapsed under "עוד", highlight that button
  // so the active choice is still visible in the bar.
  const activeHidden = hidden.some((c) => c.id === filters.category)

  // The full list (used by both the "עוד" menu and the mobile dropdown).
  // `big` renders larger, clearer rows for the mobile dropdown.
  const List = ({ onPick, big }) =>
    categories.map((cat) => {
      const active = filters.category === cat.id
      const Icon = CAT_ICON[cat.id]
      return (
        <button
          key={cat.id}
          type="button"
          onClick={() => {
            pick(cat.id)
            onPick()
          }}
          className={`flex w-full items-center justify-between px-4 text-right transition ${
            big ? 'py-3 text-base' : 'py-2.5 text-sm'
          } ${active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink hover:bg-black/5'}`}
        >
          <span className="flex items-center gap-2.5">
            {Icon && <Icon size={big ? 19 : 15} className={cat.id === 'deals' ? 'text-orange-500' : ''} />}
            {cat.label}
          </span>
          {active && <Check size={big ? 18 : 16} />}
        </button>
      )
    })

  return (
    <div>
      {/* Desktop: one line of chips + an "עוד" overflow menu. */}
      <div className="relative hidden min-w-0 lg:block" ref={deskRef}>
        <div className="flex items-center gap-2">
          {shown.map((cat) => (
            <Chip
              key={cat.id}
              cat={cat}
              active={filters.category === cat.id}
              onClick={() => pick(cat.id)}
            />
          ))}

          {hidden.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className={`glass-tab flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition hover:z-10 hover:scale-105 ${
                activeHidden
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                  : 'border-black/10 bg-white text-ink-light hover:border-brand-400 hover:text-ink'
              }`}
            >
              עוד
              <ChevronDown size={15} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Hidden measurer: every chip at its natural width. Zero-sized + clipped
            so it never affects layout or causes page overflow, but offsetWidth
            still reports the true chip widths. */}
        <div className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden" aria-hidden>
          <div ref={measureRef} className="flex gap-2">
            {categories.map((cat) => (
              <Chip key={cat.id} cat={cat} active={false} onClick={() => {}} />
            ))}
          </div>
        </div>

        {/* "עוד" dropdown — the full category list. */}
        {moreOpen && (
          <div className="absolute left-0 z-30 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-card-hover">
            <List onPick={() => setMoreOpen(false)} />
          </div>
        )}
      </div>

      {/* Mobile: hamburger that opens a category list */}
      <div className="relative lg:hidden" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition duration-200 hover:border-brand-300 active:scale-[0.98]"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            <Menu size={18} /> קטגוריות
          </span>
          <ChevronDown size={18} className={`text-ink-light transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {ddRender && (
          <div
            className={`absolute right-0 z-30 mt-2 max-h-[60vh] w-64 max-w-[calc(100vw-2rem)] origin-top overflow-y-auto rounded-2xl border border-black/10 bg-white py-1.5 shadow-card-hover transition duration-200 ease-out ${
              ddShown ? 'scale-100 opacity-100 translate-y-0' : '-translate-y-1 scale-95 opacity-0'
            }`}
          >
            <List onPick={() => setOpen(false)} big />
          </div>
        )}
      </div>
    </div>
  )
}
