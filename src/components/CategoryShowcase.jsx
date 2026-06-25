import { LayoutGrid, ArrowLeft } from 'lucide-react'
import { useApp, DOMAINS } from '../context/AppContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

// Home-page category showcase: large image tiles (admin-editable images shown
// behind a dark gradient, in our own style), with a small zoom-in on hover.
// Clicking a tile opens that category. Categories the admin hid are excluded.
export default function CategoryShowcase() {
  const { setCategory } = useApp()
  const { getCategories } = useCatalogStore()
  const { home } = useSettings()
  const hidden = home?.hiddenCats || []
  const categories = getCategories(DOMAINS.STORE).filter((c) => !hidden.includes(c.id))

  if (!categories.length) return null

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <LayoutGrid size={18} />
        </span>
        קנו לפי קטגוריה
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-100 text-right shadow-card transition hover:shadow-card-hover"
          >
            {/* Image (or a branded fallback gradient) — zooms slightly on hover */}
            {cat.image ? (
              <img
                src={cat.image}
                alt=""
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand-300 to-brand-600 transition-transform duration-500 ease-out group-hover:scale-110" />
            )}

            {/* Dark gradient so the white label is always readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent transition-colors duration-300 group-hover:from-black/85" />

            {/* Label + affordance */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
              <span className="text-base font-extrabold leading-tight text-white drop-shadow sm:text-lg">
                {cat.label}
              </span>
              <span className="flex h-7 w-7 shrink-0 translate-x-2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                <ArrowLeft size={15} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
