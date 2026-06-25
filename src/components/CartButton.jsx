import { ShoppingCart } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'

// Header cart trigger with a live item-count badge. Opens the cart drawer.
export default function CartButton() {
  const { count, setOpen } = useCart()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="פתיחת סל הקניות"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-black/5"
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  )
}
