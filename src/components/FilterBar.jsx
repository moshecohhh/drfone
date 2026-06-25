import { useApp } from '../context/AppContext.jsx'
import { useCatalog } from '../hooks/useCatalog.js'
import { useBrands } from '../context/BrandsContext.jsx'

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
          : 'border-black/10 bg-white text-black/70 hover:border-brand-400 hover:text-black'
      }`}
    >
      {children}
    </button>
  )
}

// Sidebar on desktop, horizontal scrollers on mobile. Categories come from the
// active domain (via useCatalog); brands are filtered against that domain only.
export default function FilterBar() {
  const { filters, setCategory, setBrand } = useApp()
  const { categories } = useCatalog()
  const { brandsWithAll } = useBrands()

  return (
    <aside className="shrink-0 lg:w-60 lg:self-start lg:max-h-full lg:overflow-y-auto">
      <div className="space-y-4 lg:space-y-6">
        {/* Categories */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-bold text-black">קטגוריות</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:flex-col lg:overflow-visible">
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                active={filters.category === cat.id}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Brands */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-bold text-black">מותגים</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:flex-wrap lg:overflow-visible">
            {brandsWithAll.map((b) => (
              <Chip
                key={b.id}
                active={filters.brand === b.id}
                onClick={() => setBrand(b.id)}
              >
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
