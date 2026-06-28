import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'

// Street input with live autocomplete from the Israeli open-data streets API
// (data.gov.il), scoped to the chosen city. It is ALWAYS a free-text field —
// suggestions are a progressive enhancement, so a missing/blocked API or an
// unlisted street never blocks the order. Falls back silently to plain text.
const RESOURCE_ID = '1b14e41c-85b3-4c21-bdce-9fe48185ffca' // data.gov.il "רחובות בישראל"

export default function StreetSelect({ value, onChange, city, id, invalid, placeholder = 'רחוב' }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Debounced fetch of street suggestions for the current city + query.
  useEffect(() => {
    clearTimeout(timer.current)
    const q = (value || '').trim()
    if (!city || q.length < 1) { setSuggestions([]); return }
    timer.current = setTimeout(async () => {
      try {
        const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}` +
          `&limit=40&filters=${encodeURIComponent(JSON.stringify({ city_name: city }))}&q=${encodeURIComponent(q)}`
        const res = await fetch(url)
        const json = await res.json()
        const recs = json?.result?.records || []
        const names = [...new Set(recs.map((r) => String(r.street_name || '').trim()).filter(Boolean))]
          .filter((n) => n.includes(q))
          .slice(0, 8)
        setSuggestions(names)
        setOpen(names.length > 0)
      } catch {
        setSuggestions([]) // stay a plain free-text field
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [value, city])

  return (
    <div ref={boxRef} className="relative">
      <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        autoComplete="address-line1"
        className={`w-full rounded-xl border bg-white py-2.5 pr-9 pl-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-brand-500/30 ${
          invalid ? 'border-red-400 focus:border-red-500' : 'border-black/10 focus:border-brand-500'
        }`}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-card-hover">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                className="w-full px-4 py-2 text-right text-sm text-ink transition hover:bg-brand-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
