import { Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

// Context-aware search. It writes to the shared filter state, but because that
// state is consumed by useCatalog (which is scoped to the active domain), the
// same input searches ONLY the Store or ONLY the Lab depending on context.
export default function SearchBar() {
  const { filters, setSearch, isStore } = useApp()

  const placeholder = isStore
    ? 'חיפוש מוצרים בחנות...'
    : 'חיפוש שירותי תיקון במעבדה...'

  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/40"
      />
      <input
        type="search"
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-black/10 bg-white py-2.5 pr-10 pl-10 text-sm text-black outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      {filters.search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          aria-label="נקה חיפוש"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
