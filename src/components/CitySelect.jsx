import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Search, X } from 'lucide-react'
import BUNDLED_CITIES from '../data/israelCities.js'
import { supabase } from '../lib/supabase.js'

// The full national localities list (cities + moshavim + kibbutzim…) is fetched
// ONCE from the CBS dataset (via the `localities` edge function) and cached, so
// the picker shows everything with no latency. The bundled list is the instant
// fallback while it loads / if it's unavailable.
const LS_KEY = 'drfone_localities'
const LS_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days
let memCities = null

function loadCachedCities() {
  if (memCities) return memCities
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (raw && Array.isArray(raw.cities) && raw.cities.length && Date.now() - (raw.at || 0) < LS_TTL) {
      memCities = raw.cities
      return memCities
    }
  } catch { /* ignore */ }
  return null
}

// Searchable city picker. A "city not listed" escape switches to a free-text
// field so a truly rare settlement never blocks an order.
export default function CitySelect({ value, onChange, invalid, id }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [other, setOther] = useState(false)
  const [cities, setCities] = useState(() => loadCachedCities() || BUNDLED_CITIES)
  const boxRef = useRef(null)

  // Fetch the complete localities list once (cached across the session + 30d).
  useEffect(() => {
    if (loadCachedCities()) { setCities(memCities); return }
    let active = true
    supabase.functions
      .invoke('localities', { body: {} })
      .then(({ data }) => {
        const list = Array.isArray(data?.localities) ? data.localities : []
        if (list.length) {
          memCities = list
          try { localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), cities: list })) } catch { /* ignore */ }
          if (active) setCities(list)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Close the dropdown on an outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = query.trim()
  const matches = (q ? cities.filter((c) => c.includes(q)) : cities).slice(0, 60)

  const baseCls = `w-full rounded-xl border bg-white py-2.5 pr-9 pl-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-brand-500/30 ${
    invalid ? 'border-red-400 focus:border-red-500' : 'border-black/10 focus:border-brand-500'
  }`

  // Free-text mode for a settlement that isn't in the list.
  if (other) {
    return (
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
        <input
          id={id}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="שם היישוב"
          autoComplete="address-level2"
          className={baseCls}
        />
        <button
          type="button"
          onClick={() => { setOther(false); onChange('') }}
          className="mt-1 text-xs font-medium text-brand-600 hover:underline"
        >
          ← חזרה לבחירה מהרשימה
        </button>
      </div>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between ${baseCls} ${value ? '' : 'text-ink-light'}`}
      >
        <span className="truncate">{value || 'בחר עיר מהרשימה'}</span>
        <ChevronDown size={16} className={`shrink-0 text-ink-light transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-card-hover">
          <div className="relative border-b border-black/5 p-2">
            <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-light" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש עיר…"
              className="w-full rounded-lg border border-black/10 bg-white py-2 pr-9 pl-2 text-sm outline-none focus:border-brand-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
                aria-label="ניקוי"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {matches.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery('') }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-right text-sm transition hover:bg-brand-50 ${
                    c === value ? 'font-bold text-brand-700' : 'text-ink'
                  }`}
                >
                  <span>{c}</span>
                  {c === value && <Check size={15} className="text-brand-600" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-ink-light">לא נמצאה עיר תואמת</li>
            )}
            <li className="border-t border-black/5">
              <button
                type="button"
                onClick={() => { setOther(true); setOpen(false); setQuery(''); onChange('') }}
                className="w-full px-4 py-2.5 text-right text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                + היישוב שלי לא ברשימה (הזנה ידנית)
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
