import { SearchX, ArrowUpDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useCatalog } from '../hooks/useCatalog.js'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import ItemCard from './ItemCard.jsx'

export default function ItemGrid() {
  const { isStore, filters, setSort, resetFilters } = useApp()
  const { results, kind, total } = useCatalog()
  const { ready } = useCatalogStore()

  const heading = isStore ? 'מוצרים בחנות' : 'שירותי המעבדה'

  // Still fetching the catalog — show placeholder cards so the grid never flashes
  // an empty "no results" message before the data arrives.
  if (!ready) {
    return (
      <section>
        <div className="mb-4 h-7 w-40 animate-pulse rounded bg-black/10" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GridSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-extrabold text-black">{heading}</h2>
          <span className="text-sm text-black/50">
            {results.length} מתוך {total}
          </span>
        </div>
        {/* Sort control */}
        <label className="flex items-center gap-2 text-sm text-ink-light">
          <ArrowUpDown size={16} />
          <select
            value={filters.sort}
            onChange={(e) => setSort(e.target.value)}
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-500"
          >
            <option value="recommended">מיון: מומלץ</option>
            <option value="price-asc">מחיר: מהזול ליקר</option>
            <option value="price-desc">מחיר: מהיקר לזול</option>
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 py-16 text-center">
          <SearchX size={40} className="text-black/30" />
          <p className="mt-3 font-semibold text-black">לא נמצאו תוצאות</p>
          <p className="mt-1 text-sm text-black/50">נסו לשנות את החיפוש או הסינון.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            איפוס סינון
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 pt-5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {results.map((item) => (
              <ItemCard key={item.id} item={item} kind={kind} />
            ))}
          </div>
          {/* End-of-list divider */}
          <div className="mt-6 flex items-center gap-3 text-xs font-medium text-ink-light">
            <span className="h-px flex-1 bg-black/10" />
            הגעת לסוף הרשימה
            <span className="h-px flex-1 bg-black/10" />
          </div>
        </>
      )}
    </section>
  )
}

// Pulsing placeholder card shown while the catalog loads.
function GridSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="h-36 bg-black/10" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-black/10" />
        <div className="h-3 w-full rounded bg-black/5" />
        <div className="mt-3 h-9 rounded-xl bg-black/10" />
      </div>
    </div>
  )
}
