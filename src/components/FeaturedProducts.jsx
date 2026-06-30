import { Star } from 'lucide-react'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import ProductCarousel from './ProductCarousel.jsx'

// "מוצרים נבחרים" — a single auto-advancing row of products the admin flagged as
// featured. Behaves exactly like the "מבצעים חמים" row. Hidden entirely when
// nothing is flagged (no empty box).
export default function FeaturedProducts() {
  const { store, synced } = useCatalogStore()
  const featured = store.filter((p) => p.featured === true)

  return (
    <ProductCarousel
      items={featured}
      title="מוצרים נבחרים"
      Icon={Star}
      iconClass="bg-amber-100 text-amber-500"
      synced={synced}
    />
  )
}
