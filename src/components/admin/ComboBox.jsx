import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { inputCls } from './ui.jsx'

// Typeable combobox with a styled floating dropdown card.
// - `options`: [{ value, label, icon? }]
// - `value`/`onChange`: the current text (free-text allowed for new entries)
// - `renderIcon(option)`: optional leading visual
// The list is filtered by what's typed and is height-capped (max-h-60, scroll).
export default function ComboBox({
  value,
  onChange,
  options,
  placeholder,
  renderIcon,
  allowCustom = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => setQuery(value || ''), [value])

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options
  const exact = options.some((o) => o.label.toLowerCase() === q)

  const choose = (label) => {
    onChange(label)
    setQuery(label)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          className={`${inputCls} pl-9`}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            if (allowCustom) onChange(e.target.value)
            setOpen(true)
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => !disabled && setOpen((v) => !v)}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-light"
          aria-label="פתח רשימה"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-card-hover">
          {filtered.length === 0 && !allowCustom && (
            <div className="px-3 py-2 text-sm text-ink-light">אין תוצאות</div>
          )}
          {filtered.map((o) => {
            const active = o.label.toLowerCase() === q
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.label)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-right text-sm transition hover:bg-brand-50 ${
                  active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink'
                }`}
              >
                {renderIcon && renderIcon(o)}
                <span className="truncate">{o.label}</span>
              </button>
            )
          })}
          {/* Offer the typed value as a new entry when it isn't in the list. */}
          {allowCustom && q && !exact && (
            <button
              type="button"
              onClick={() => choose(query.trim())}
              className="flex w-full items-center gap-2 border-t border-black/5 px-3 py-2 text-right text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              + הוספה: "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
