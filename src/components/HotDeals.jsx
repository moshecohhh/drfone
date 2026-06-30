import { Flame } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import ProductCarousel from './ProductCarousel.jsx'

// "ראשי" view: a single auto-advancing row of HOT-DEAL products, with a button
// to the full deals collection below it.
export default function HotDeals() {
  const { setCategory } = useApp()
  const { store, synced } = useCatalogStore()
  const deals = store.filter((p) => p.deal === true)

  return (
    <ProductCarousel
      items={deals}
      title="מבצעים חמים"
      Icon={Flame}
      iconClass="bg-orange-100 text-orange-500"
      synced={synced}
      more={{ label: 'למבצעים נוספים', onClick: () => setCategory('deals') }}
      empty={{ Icon: Flame, title: 'אין מבצעים חמים כרגע', hint: 'מנהל החנות יכול לסמן מוצרים כמבצע מלוח הניהול.' }}
    />
  )
}
