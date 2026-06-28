import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Search, X } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'
import { supabase } from '../lib/supabase.js'

// Street picker — mirrors CitySelect. A city's full street list is fetched ONCE
// (national CBS dataset, via the `streets` edge function) and cached in memory +
// localStorage, then filtered locally — so typing is instant and revisits need
// no network. Admin-defined streets (Settings) are merged in. A "street not
// listed" escape switches to free text so nothing is ever blocked.
const memCache = new Map() // city -> string[]  (lives for the page session)
const LS_PREFIX = 'drfone_streets:'
const LS_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days

function readCache(city) {
  if (memCache.has(city)) return memCache.get(city)
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PREFIX + city) || 'null')
    if (raw && Array.isArray(raw.streets) && Date.now() - (raw.at || 0) < LS_TTL) {
      memCache.set(city, raw.streets)
      return raw.streets
    }
  } catch { /* ignore */ }
  return null
}
function writeCache(city, streets) {
  memCache.set(city, streets)
  try { localStorage.setItem(LS_PREFIX + city, JSON.stringify({ at: Date.now(), streets })) } catch { /* ignore */ }
}

export default function StreetSelect({ value, onChange, city, id, invalid }) {
  const { settings } = useSettings()
  const baseList = Array.isArray(settings?.streets) ? settings.streets : []
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [other, setOther] = useState(false)
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Load the city's full street list ONCE (cached). No per-keystroke network.
  useEffect(() => {
    if (!city) { setRemote([]); return }
    const cached = readCache(city)
    if (cached) { setRemote(cached); return }
    let active = true
    setLoading(true)
    supabase.functions
      .invoke('streets', { body: { city } })
      .then(({ data }) => {
        const streets = Array.isArray(data?.streets) ? data.streets : []
        if (streets.length) writeCache(city, streets)
        if (active) setRemote(streets)
      })
      .catch(() => active && setRemote([]))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [city])

  const q = query.trim()
  const merged = [...new Set([...baseList, ...remote])]
  const matches = (q ? merged.filter((s) => s.includes(q)) : merged).slice(0, 60)

  const baseCls = `w-full rounded-xl border bg-white py-2.5 pr-9 pl-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-brand-500/30 ${
    invalid ? 'border-red-400 focus:border-red-500' : 'border-black/10 focus:border-brand-500'
  }`

  // Free-text mode for a street not in the list.
  if (other) {
    return (
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
        <input id={id} autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder="שם הרחוב" autoComplete="address-line1" className={baseCls} />
        <button type="button" onClick={() => { setOther(false); onChange('') }} className="mt-1 text-xs font-medium text-brand-600 hover:underline">
          ← חזרה לבחירה מהרשימה
        </button>
      </div>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
      <button type="button" id={id} onClick={() => setOpen((o) => !o)} className={`flex items-center justify-between ${baseCls} ${value ? '' : 'text-ink-light'}`}>
        <span className="truncate">{value || 'בחר רחוב'}</span>
        <ChevronDown size={16} className={`shrink-0 text-ink-light transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-card-hover">
          <div className="relative border-b border-black/5 p-2">
            <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-light" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש רחוב…" className="w-full rounded-lg border border-black/10 bg-white py-2 pr-9 pl-2 text-sm outline-none focus:border-brand-500" />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink" aria-label="ניקוי">
                <X size={15} />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {matches.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => { onChange(s); setOpen(false); setQuery('') }} className={`flex w-full items-center justify-between px-4 py-2 text-right text-sm transition hover:bg-brand-50 ${s === value ? 'font-bold text-brand-700' : 'text-ink'}`}>
                  <span>{s}</span>
                  {s === value && <Check size={15} className="text-brand-600" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-ink-light">
                {!city ? 'בחרו עיר תחילה' : loading ? 'טוען רחובות…' : 'לא נמצא רחוב — אפשר להזין ידנית'}
              </li>
            )}
            <li className="border-t border-black/5">
              <button type="button" onClick={() => { setOther(true); setOpen(false); setQuery(''); onChange('') }} className="w-full px-4 py-2.5 text-right text-sm font-semibold text-brand-600 transition hover:bg-brand-50">
                + הרחוב שלי לא ברשימה (הזנה ידנית)
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
