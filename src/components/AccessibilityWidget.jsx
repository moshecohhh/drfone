import { useState, useEffect, useRef } from 'react'
import {
  Accessibility, Plus, Minus, Contrast, Eye, Droplet, Link2, Type,
  MousePointer2, Pause, AlignHorizontalJustifyCenter, RotateCcw, X,
} from 'lucide-react'

// Site accessibility menu (Israeli IS 5568 / WCAG-style adjustments). A small
// floating button opens a panel of toggles; choices persist across visits and
// are re-applied on load. NOTE: a widget is one part of compliance — an
// accessibility STATEMENT (included here) and a real audit are also required.

const KEY = 'drfone_a11y'
const POS_KEY = 'drfone_a11y_pos'
const BTN = 48 // floating button size (h-12 w-12)
const DEFAULT = {
  font: 0, contrast: false, invert: false, grayscale: false,
  links: false, readable: false, bigCursor: false, noMotion: false, guide: false,
}

// The floating button's resting position, stored as {x, y} = distance from the
// RIGHT and BOTTOM edges (px). Defaults to the bottom-right corner.
function loadPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY))
    if (p && typeof p.x === 'number' && typeof p.y === 'number') return p
  } catch {
    /* ignore */
  }
  return { x: 20, y: 20 }
}

function load() {
  try {
    return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return { ...DEFAULT }
  }
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [statement, setStatement] = useState(false)
  const [s, setS] = useState(load)
  const guideRef = useRef(null)

  // Draggable floating button — the user can pick it up and move it anywhere.
  const [pos, setPos] = useState(loadPos)
  const dragRef = useRef({ down: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 })

  // Persist the button position whenever it settles.
  useEffect(() => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos))
    } catch {
      /* ignore */
    }
  }, [pos])

  const onBtnPointerDown = (e) => {
    dragRef.current = { down: true, moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }
  const onBtnPointerMove = (e) => {
    const d = dragRef.current
    if (!d.down) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true
    // x/y are offsets from the right/bottom edges, so they grow as the pointer
    // moves left/up.
    const nx = Math.max(4, Math.min(window.innerWidth - BTN - 4, d.ox - dx))
    const ny = Math.max(4, Math.min(window.innerHeight - BTN - 4, d.oy - dy))
    setPos({ x: nx, y: ny })
  }
  const onBtnPointerUp = () => {
    dragRef.current.down = false
  }
  // A real drag must not also toggle the panel; a plain tap should.
  const onBtnClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false
      return
    }
    setOpen((o) => !o)
  }

  // Anchor the panel to the button: open upward when the button sits in the
  // lower half of the screen, downward when it's near the top.
  const panelStyle = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    // Panel is w-72 (288) but never wider than the viewport minus gutters. Clamp
    // its right offset so it always stays fully on-screen regardless of where the
    // button was dragged.
    const panelW = Math.min(288, vw - 40)
    const right = Math.max(8, Math.min(pos.x, vw - panelW - 8))
    // pos.y is the distance from the BOTTOM edge: a large value means the button
    // sits near the top, so the panel should open downward; otherwise upward.
    if (pos.y > vh / 2) {
      return { right, top: vh - pos.y + 12 }
    }
    return { right, bottom: pos.y + BTN + 12 }
  }

  // Apply every setting to <html>.
  useEffect(() => {
    const html = document.documentElement
    const scale = 1 + s.font * 0.1
    html.style.fontSize = s.font ? `${(16 * scale).toFixed(1)}px` : ''

    const filters = []
    if (s.grayscale) filters.push('grayscale(100%)')
    if (s.invert) filters.push('invert(100%) hue-rotate(180deg)')
    if (s.contrast) filters.push('contrast(1.45) saturate(1.3)')
    html.style.filter = filters.join(' ')

    html.classList.toggle('a11y-links', s.links)
    html.classList.toggle('a11y-readable', s.readable)
    html.classList.toggle('a11y-big-cursor', s.bigCursor)
    html.classList.toggle('a11y-no-motion', s.noMotion)

    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }, [s])

  // Reading guide follows the pointer.
  useEffect(() => {
    if (!s.guide) return
    const onMove = (e) => {
      if (guideRef.current) guideRef.current.style.top = `${e.clientY}px`
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [s.guide])

  const toggle = (k) => setS((p) => ({ ...p, [k]: !p[k] }))
  const setFont = (d) => setS((p) => ({ ...p, font: Math.max(-2, Math.min(5, p.font + d)) }))
  const reset = () => setS({ ...DEFAULT })

  const toggles = [
    { k: 'contrast', label: 'ניגודיות גבוהה', Icon: Contrast },
    { k: 'invert', label: 'היפוך צבעים', Icon: Eye },
    { k: 'grayscale', label: 'גווני אפור', Icon: Droplet },
    { k: 'links', label: 'הדגשת קישורים', Icon: Link2 },
    { k: 'readable', label: 'גופן קריא', Icon: Type },
    { k: 'bigCursor', label: 'סמן גדול', Icon: MousePointer2 },
    { k: 'noMotion', label: 'עצירת אנימציות', Icon: Pause },
    { k: 'guide', label: 'סרגל קריאה', Icon: AlignHorizontalJustifyCenter },
  ]

  const active = s.font !== 0 || toggles.some((t) => s[t.k])

  return (
    <>
      {/* Reading guide bar */}
      {s.guide && <div ref={guideRef} className="a11y-guide-bar" aria-hidden />}

      {/* Floating button — draggable; the user can move it anywhere on screen. */}
      <button
        type="button"
        onClick={onBtnClick}
        onPointerDown={onBtnPointerDown}
        onPointerMove={onBtnPointerMove}
        onPointerUp={onBtnPointerUp}
        aria-label="תפריט נגישות"
        aria-expanded={open}
        style={{ right: pos.x, bottom: pos.y, touchAction: 'none' }}
        className="fixed z-[60] flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-2 ring-white transition hover:scale-105 hover:bg-brand-700 active:cursor-grabbing"
      >
        <Accessibility size={24} />
        {active && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-orange-400 ring-2 ring-white" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="הגדרות נגישות"
          style={panelStyle()}
          className="fixed z-[60] w-72 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl bg-white shadow-card-hover ring-1 ring-black/10"
        >
          <div className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Accessibility size={18} /> נגישות
            </span>
            <button onClick={() => setOpen(false)} aria-label="סגירה" className="rounded-full p-1 hover:bg-white/20">
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {/* Font size */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-50/60 px-3 py-2">
              <span className="text-sm font-semibold text-ink">גודל טקסט</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setFont(-1)} aria-label="הקטנת טקסט" className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 bg-white text-ink hover:bg-black/5">
                  <Minus size={15} />
                </button>
                <span className="w-6 text-center text-sm font-bold text-ink">{s.font >= 0 ? `+${s.font}` : s.font}</span>
                <button onClick={() => setFont(1)} aria-label="הגדלת טקסט" className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 bg-white text-ink hover:bg-black/5">
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* Toggle grid */}
            <div className="grid grid-cols-2 gap-2">
              {toggles.map(({ k, label, Icon }) => {
                const on = s[k]
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(k)}
                    aria-pressed={on}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition ${
                      on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink-light hover:border-brand-300 hover:text-ink'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Reset + statement */}
            <button
              onClick={reset}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2 text-sm font-semibold text-ink transition hover:bg-black/5"
            >
              <RotateCcw size={15} /> איפוס הגדרות
            </button>
            <button
              onClick={() => setStatement(true)}
              className="mt-2 w-full text-center text-xs font-medium text-brand-600 underline hover:text-brand-700"
            >
              הצהרת נגישות
            </button>
          </div>
        </div>
      )}

      {/* Accessibility statement */}
      {statement && <AccessibilityStatement onClose={() => setStatement(false)} />}
    </>
  )
}

function AccessibilityStatement({ onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">הצהרת נגישות</h2>
          <button onClick={onClose} aria-label="סגירה" className="text-ink-light hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-ink-light">
          <p>אנו רואים חשיבות רבה במתן שירות שוויוני לכלל הלקוחות ופועלים להנגשת האתר בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות) ולתקן הישראלי 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA.</p>
          <p>באתר מוטמע תפריט נגישות המאפשר, בין היתר: הגדלה/הקטנה של הטקסט, ניגודיות גבוהה, היפוך צבעים וגווני אפור, הדגשת קישורים, גופן קריא, סמן גדול, עצירת אנימציות וסרגל קריאה.</p>
          <p>אנו משתדלים לשמור על רמת נגישות גבוהה ולתקן ליקויים. אם נתקלתם בקושי בנגישות האתר, נשמח שתפנו אלינו ונטפל בכך בהקדם.</p>
          <p className="text-xs text-ink-light/80">
            * הצהרה זו היא תבנית ראשונית. לקבלת התאמה מלאה לדרישות החוק מומלץ להשלים בדיקת נגישות מקצועית ולעדכן את פרטי ההתקשרות ורכז הנגישות.
          </p>
        </div>
      </div>
    </div>
  )
}
