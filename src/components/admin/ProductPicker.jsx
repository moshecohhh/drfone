import { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { DOMAINS } from '../../context/AppContext.jsx'

// Searchable store-product selector. Filter by free text (name), and/or by
// category and brand. `value` is the selected product id; onChange(id) fires.
export default function ProductPicker({ value, onChange }) {
  const { store, getCategories } = useCatalogStore()
  const { brands, brandLabel } = useBrands()
  const categories = getCategories(DOMAINS.STORE)

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [brand, setBrand] = useState('all')

  const selected = store.find((p) => p.id === value)

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    return store
      .filter((p) => {
        if (cat !== 'all' && p.category !== cat) return false
        if (brand !== 'all' && p.brand !== brand) return false
        if (term && !(p.name || '').toLowerCase().includes(term)) return false
        return true
      })
      .slice(0, 50)
  }, [store, q, cat, brand])

  return (
    <div className="rounded-lg border border-black/10 bg-white p-2.5">
      {/* Filters */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={miniSelect} aria-label="סינון לפי קטגוריה">
          <option value="all">כל הקטגוריות</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} className={miniSelect} aria-label="סינון לפי מותג">
          <option value="all">כל המותגים</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-light" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש מוצר לפי שם…"
          className="w-full rounded-lg border border-black/10 py-1.5 pr-8 pl-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {/* Results */}
      <ul className="max-h-44 space-y-1 overflow-y-auto">
        {results.length === 0 && <li className="px-2 py-3 text-center text-xs text-ink-light">לא נמצאו מוצרים.</li>}
        {results.map((p) => {
          const sel = p.id === value
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onChange(p.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right text-sm transition ${
                  sel ? 'bg-brand-50 text-brand-700' : 'hover:bg-black/5 text-ink'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-brand-50 text-base">
                  {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <span>{p.emoji}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-[11px] text-ink-light">{brandLabel(p.brand)} · ₪{p.price}</span>
                </span>
                {sel && <Check size={15} className="shrink-0 text-brand-600" />}
              </button>
            </li>
          )
        })}
      </ul>

      {selected && (
        <p className="mt-2 rounded-lg bg-brand-50/60 px-2 py-1.5 text-xs text-ink">
          נבחר: <span className="font-semibold">{selected.name}</span>
        </p>
      )}
    </div>
  )
}

const miniSelect =
  'w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-brand-500'
