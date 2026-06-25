import { MessageCircle, ShoppingCart, Check, Pencil, Tag } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import ProductTag from './ProductTag.jsx'

// Renders a single store product OR lab service.
// - kind === 'product' (Store): "Add to Cart", disabled when out of stock.
// - kind === 'service' (Lab):   WhatsApp CTA, untouched by the cart.
export default function ItemCard({ item, kind }) {
  const isService = kind === 'service'
  const { addItem, setOpen } = useCart()
  const { waLink } = useSettings()
  const { isMaster } = useAuth()
  const [added, setAdded] = useState(false)
  // Mobile only: after adding, show a "go to cart" link (the drawer no longer
  // auto-opens on mobile).
  const [showGoToCart, setShowGoToCart] = useState(false)

  // Normalize colors to { hex, image } (older data stored plain hex strings).
  const colors =
    !isService && Array.isArray(item.colors)
      ? item.colors.map((c) => (typeof c === 'string' ? { hex: c, image: '' } : { hex: c.hex, image: c.image || '' }))
      : []

  // Image gallery (fall back to the single legacy image).
  const images = Array.isArray(item.images) && item.images.length ? item.images : item.image ? [item.image] : []

  const [selectedColor, setSelectedColor] = useState(colors[0]?.hex || '')
  const [activeImage, setActiveImage] = useState(colors[0]?.image || images[0] || '')

  // Master-admin per-transaction price override (storefront only, NOT saved to
  // the catalog). null = use the catalog price.
  const listPrice = Number(item.price) || 0
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceDraft, setPriceDraft] = useState(String(listPrice))
  const [override, setOverride] = useState(null) // number | null
  const effectivePrice = override != null ? override : listPrice
  // Discount only when the price was LOWERED (raising the price shows nothing).
  const discountPct =
    override != null && override < listPrice && listPrice > 0
      ? Math.round((1 - override / listPrice) * 100)
      : 0

  const commitPrice = () => {
    const v = Number(priceDraft)
    setOverride(Number.isFinite(v) && priceDraft !== '' ? v : null)
    setEditingPrice(false)
  }
  const resetPrice = () => {
    setOverride(null)
    setPriceDraft(String(listPrice))
    setEditingPrice(false)
  }

  const stock = Number(item.stock) || 0
  const outOfStock = !isService && stock <= 0
  const lowStock = !isService && stock > 0 && stock <= 3

  // Picking a color selects it (for the cart) and, if it has an associated
  // image, swaps the displayed image to it.
  const pickColor = (c) => {
    setSelectedColor(c.hex)
    if (c.image) setActiveImage(c.image)
  }

  const handleAdd = () => {
    if (addItem(item, selectedColor, isMaster && override != null ? override : null)) {
      setAdded(true)
      setTimeout(() => setAdded(false), 1200)
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
        setShowGoToCart(true)
      }
    }
  }

  const availableLabel = isService ? 'זמין לתיקון' : lowStock ? `נותרו ${stock} במלאי` : 'במלאי'
  const unavailableLabel = isService ? 'בבדיקת זמינות' : 'אזל מהמלאי'
  const available = isService ? item.inStock : stock > 0

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-black/5 bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      {/* Visual product tag (deal / importer / custom round image) — pinned to
          the LEFT (with a small gap), poking out the top so ~30% sits OUTSIDE
          the card and ~70% inside. */}
      {!isService && item.tag && (
        <div className="pointer-events-none absolute left-3 top-0 z-20 -translate-y-[30%]">
          <ProductTag tag={item.tag} image={item.tagImage} />
        </div>
      )}

      {/* Visual */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-5xl">
        {activeImage ? (
          <img
            src={activeImage}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-opacity duration-200"
          />
        ) : (
          <span aria-hidden>{item.emoji}</span>
        )}
        {item.badge && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            {item.badge}
          </span>
        )}
      </div>

      {/* Thumbnail strip (multiple images) */}
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-2 no-scrollbar">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImage(src)}
              aria-label={`תמונה ${i + 1}`}
              className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border transition ${
                src === activeImage ? 'border-brand-500 ring-1 ring-brand-500' : 'border-black/10 hover:border-brand-300'
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold leading-snug text-ink">{item.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-light">{item.description}</p>

        {/* Color selection — sits ABOVE the price. Always reserves its height on
            store products so prices line up across all cards. */}
        {!isService && (
          <div className="mt-3 flex min-h-[1.5rem] items-center gap-2">
            {colors.length > 0 && (
              <>
                <span className="text-xs font-medium text-ink-light">צבע:</span>
                <div className="flex flex-wrap gap-1.5">
                  {colors.map((c) => {
                    const sel = c.hex === selectedColor
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => pickColor(c)}
                        title={c.hex}
                        aria-label={`בחירת צבע ${c.hex}`}
                        aria-pressed={sel}
                        className={`h-6 w-6 rounded-full border transition ${
                          sel ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-1' : 'border-black/15 hover:scale-110'
                        }`}
                        style={{ background: c.hex }}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Price — below the colors, just above the add-to-cart button. */}
        <div className="mt-3 flex items-end justify-between">
          <div>
            {/* Effective price (master-admin override applied for this card only) */}
            <span className="text-xl font-extrabold text-ink">₪{isService ? item.price : effectivePrice}</span>
            {/* Original price struck through: explicit oldPrice, or the catalog
                price when a master admin lowered it for this transaction. */}
            {!isService && override != null && override < listPrice ? (
              <span className="mr-2 text-sm text-ink-light line-through">₪{listPrice}</span>
            ) : (
              item.oldPrice && <span className="mr-2 text-sm text-ink-light line-through">₪{item.oldPrice}</span>
            )}
            {/* Discount badge — only when the price was lowered. */}
            {discountPct > 0 && (
              <span className="mr-2 inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                <Tag size={11} /> {discountPct}% הנחה
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold ${available ? 'text-brand-600' : 'text-red-500'}`}>
            {available ? availableLabel : unavailableLabel}
          </span>
        </div>

        {/* Master-admin only: per-transaction price editor (not saved to catalog) */}
        {isMaster && !isService && (
          <div className="mt-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-2">
            {editingPrice ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink-light">₪</span>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitPrice()
                    if (e.key === 'Escape') resetPrice()
                  }}
                  className="w-24 rounded-md border border-black/10 px-2 py-1 text-sm outline-none focus:border-brand-500"
                />
                <button type="button" onClick={commitPrice} className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600">
                  אישור
                </button>
                <button type="button" onClick={resetPrice} className="text-xs text-ink-light hover:text-ink">
                  איפוס
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setPriceDraft(String(effectivePrice)); setEditingPrice(true) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                <Pencil size={13} /> {override != null ? 'מחיר מותאם לעסקה — עריכה' : 'עריכת מחיר לעסקה זו'}
              </button>
            )}
          </div>
        )}

        {isService ? (
          // LAB: WhatsApp CTA (unchanged)
          <a
            href={waLink(`שלום, אשמח לתאם תיקון: ${item.name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 active:scale-95"
          >
            <MessageCircle size={16} /> תיאום תיקון
          </a>
        ) : (
          // STORE: Add to Cart (disabled when out of stock)
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className={`mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition duration-200 ${
              outOfStock
                ? 'cursor-not-allowed bg-black/10 text-ink-light'
                : added
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95'
            }`}
          >
            {outOfStock ? (
              'אזל מהמלאי'
            ) : added ? (
              <>
                <Check size={16} /> נוסף לסל
              </>
            ) : (
              <>
                <ShoppingCart size={16} /> הוסף לסל
              </>
            )}
          </button>
        )}

        {/* Mobile only: shortcut to open the cart after adding (the drawer no
            longer pops open automatically on mobile). */}
        {!isService && showGoToCart && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 w-full text-center text-sm font-semibold text-brand-600 underline-offset-2 hover:underline lg:hidden"
          >
            מעבר לסל הקניות
          </button>
        )}
      </div>
    </article>
  )
}
