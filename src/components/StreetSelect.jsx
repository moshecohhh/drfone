import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Search, X } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'
import { supabase } from '../lib/supabase.js'

// Street picker — mirrors CitySelect. Streets come from the national CBS dataset
// (via the `streets` edge function, scoped to the chosen city), plus any
// admin-defined streets (Settings → "רשימת רחובות למשלוח"). A "street not listed"
// escape switches to free text so nothing is ever blocked.
export default function StreetSelect({ value, onChange, city, id, invalid }) {
  const { settings } = useSettings()
  const baseList = Array.isArray(settings?.streets) ? settings.streets : []
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [other, setOther] = useState(false)
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Load the chosen city's streets from the national dataset (server-side proxy
  // → no browser CORS issues). Reloads as the city changes or the search refines.
  useEffect(() => {
    clearTimeout(timer.current)
    if (!city) { setRemote([]); return }
    let active = true
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('streets', { body: { city, q: query.trim() } })
        if (active) setRemote(Array.isArray(data?.streets) ? data.streets : [])
      } catch {
        if (active) setRemote([])
      } finally {
        if (active) setLoading(false)
      }
    }, 250)
    return () => { active = false; clearTimeout(timer.current) }
  }, [query, city])

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
