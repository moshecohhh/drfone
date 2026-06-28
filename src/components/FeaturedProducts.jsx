import { Star } from 'lucide-react'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import ItemCard from './ItemCard.jsx'

// "מוצרים נבחרים" — a curated showcase of products the admin flagged as
// featured. Hidden entirely when nothing is flagged (so it never shows an empty
// box). A simple responsive grid that scrolls horizontally on small screens.
export default function FeaturedProducts() {
  const { store } = useCatalogStore()
  const featured = store.filter((p) => p.featured === true)
  if (featured.length === 0) return null

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-500">
          <Star size={18} className="fill-current" />
        </span>
        <h2 className="text-xl font-extrabold text-ink">מוצרים נבחרים</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {featured.map((item) => (
          <div key={item.id} className="flex flex-col [&>article]:flex-1">
            <ItemCard item={item} kind="product" />
          </div>
        ))}
      </div>
    </section>
  )
}
