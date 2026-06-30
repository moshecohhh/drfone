import { MessageCircle, ShoppingCart, Pencil, Tag, Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import ProductTag from './ProductTag.jsx'

// Renders a single store product OR lab service.
// - kind === 'product' (Store): "Add to Cart", disabled when out of stock.
// - kind === 'service' (Lab):   WhatsApp CTA, untouched by the cart.
export default function ItemCard({ item, kind }) {
  const isService = kind === 'service'
  const { addItem, setOpen, items, changeQty } = useCart()
  const { waLink, productPage } = useSettings()
  const { isMaster } = useAuth()
  const navigate = useNavigate()

  // A store product gets a dedicated page unless the global toggle is off or the
  // product opts out. Products with a required selection field can't be added
  // from the card (the choice must be made on the page first).
  const hasPage = !isService && productPage.enabledGlobally && item.page?.enabled !== false
  const productHref = `/product/${item.id}`
  const requiresChoice = hasPage && Array.isArray(item.page?.optionGroups) && item.page.optionGroups.some((g) => g.required)

  // Normalize colors to { hex, name, images[] } (older data: plain hex / single image).
  const colors =
    !isService && Array.isArray(item.colors)
      ? item.colors.map((c) => {
          if (typeof c === 'string') return { hex: c, name: '', images: [] }
          const imgs = Array.isArray(c.images) ? c.images.filter(Boolean) : c.image ? [c.image] : []
          return { hex: c.hex, name: c.name || '', images: imgs }
        })
      : []

  // Image gallery (fall back to the single legacy image).
  const images = Array.isArray(item.images) && item.images.length ? item.images : item.image ? [item.image] : []

  const [selectedColor, setSelectedColor] = useState(colors[0]?.hex || '')
  const [activeImage, setActiveImage] = useState(colors[0]?.images?.[0] || images[0] || '')

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
    if (c.images?.length) setActiveImage(c.images[0])
  }

  const handleAdd = () => {
    addItem(item, selectedColor, isMaster && override != null ? override : null)
  }

  // The cart line for THIS product in the currently-selected colour, so the
  // ±-stepper reflects/controls exactly that line. qty 0 = not in the cart.
  const cartLine = !isService
    ? items.find((i) => i.id === item.id && (i.color || '') === (selectedColor || ''))
    : null
  const cartQty = cartLine?.qty || 0
  const incQty = () => cartLine && changeQty(cartLine.lineId, 1)
  const decQty = () => cartLine && changeQty(cartLine.lineId, -1) // drops the line at 0

  const availableLabel = isService ? 'זמין לתיקון' : lowStock ? `נותרו ${stock} במלאי` : 'במלאי'
  const unavailableLabel = isService ? 'בבדיקת זמינות' : 'אזל מהמלאי'
  const available = isService ? item.inStock : stock > 0

  return (
    <article className="group relative flex h-full touch-manipulation flex-col rounded-2xl border border-black/5 bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      {/* Visual product tag (deal / importer / custom round image) — pinned to
          the LEFT (with a small gap), poking out the top so ~30% sits OUTSIDE
          the card and ~70% inside. */}
      {!isService && item.tag && (
        <div className="pointer-events-none absolute left-3 top-0 z-20 -translate-y-[30%]">
          <ProductTag tag={item.tag} image={item.tagImage} text={item.tagText} shape={item.tagShape} color={item.tagColor} />
        </div>
      )}

      {/* Stretched link — makes the WHOLE card open the product page on tap
          (works reliably on touch, unlike an onClick on a div). Interactive
          controls below are raised above it with `relative z-10`. */}
      {hasPage && (
        <Link to={productHref} aria-label={item.name} className="absolute inset-0 z-[1] rounded-2xl" />
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
        {/* Legacy plain-text badge — only when no product tag is set (the tag
            system, incl. the 'text' tag, now supersedes it). */}
        {!item.tag && item.badge && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            {item.badge}
          </span>
        )}
      </div>

      {/* Thumbnail strip (multiple images) */}
      {images.length > 1 && (
        <div className="pointer-events-none relative z-10 flex gap-1.5 overflow-x-auto px-3 pt-2 no-scrollbar">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImage(src)}
              aria-label={`תמונה ${i + 1}`}
              className={`pointer-events-auto h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition ${
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
        <h3 className={`text-base font-bold leading-snug text-ink ${hasPage ? 'transition group-hover:text-brand-600' : ''}`}>
          {item.name}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-light">{item.description}</p>

        {/* Color selection — sits ABOVE the price. Always reserves its height on
            store products so prices line up across all cards. */}
        {!isService && (
          <div className="pointer-events-none relative z-10 mt-3 flex min-h-[1.5rem] select-none items-center gap-2">
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
                        className={`pointer-events-auto h-6 w-6 cursor-pointer rounded-full border transition ${
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

        {/* Price — below the colors. Wraps gracefully so the discount badge
            never pushes anything out of the card. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Effective price (master-admin override applied for this card only) */}
          <span className="text-xl font-extrabold leading-none text-ink">₪{isService ? item.price : effectivePrice}</span>
          {/* Original price struck through: explicit oldPrice, or the catalog
              price when a master admin lowered it for this transaction. */}
          {!isService && override != null && override < listPrice ? (
            <span className="text-sm text-ink-light line-through">₪{listPrice}</span>
          ) : (
            item.oldPrice && <span className="text-sm text-ink-light line-through">₪{item.oldPrice}</span>
          )}
          {/* Discount badge — only when the price was lowered. */}
          {discountPct > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
              <Tag size={11} /> {discountPct}% הנחה
            </span>
          )}
        </div>
        {/* Stock status on its OWN line — same position on every card, so it can
            never overlap the price or spill outside the frame. */}
        <span className={`mt-1.5 block text-xs font-semibold ${available ? 'text-brand-600' : 'text-red-500'}`}>
          {available ? availableLabel : unavailableLabel}
        </span>

        {/* Master-admin only: per-transaction price editor (not saved to catalog) */}
        {isMaster && !isService && (
          <div className="relative z-10 mt-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-2">
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
        ) : cartQty > 0 ? (
          // STORE, already in cart: a ±-stepper to choose how many units.
          <div className="relative z-10 mt-3 flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-1">
            <button
              type="button"
              onClick={decQty}
              aria-label="הפחתת כמות"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm transition duration-150 hover:bg-brand-100 active:scale-90"
            >
              <Minus size={16} />
            </button>
            <span className="flex items-baseline gap-1 text-sm font-bold text-ink">
              {cartQty}
              <span className="text-[11px] font-medium text-ink-light">בסל</span>
            </span>
            <button
              type="button"
              onClick={incQty}
              disabled={cartQty >= stock}
              aria-label="הוספת כמות"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm transition duration-150 hover:bg-brand-100 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : requiresChoice && !outOfStock ? (
          // STORE: required selection field(s) — must choose on the product page.
          <button
            type="button"
            onClick={() => navigate(productHref)}
            className="relative z-10 mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 active:scale-95"
          >
            <SlidersHorizontal size={16} /> בחירת אפשרויות
          </button>
        ) : (
          // STORE: Add to Cart (disabled when out of stock)
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className={`relative z-10 mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition duration-200 ${
              outOfStock
                ? 'cursor-not-allowed bg-black/10 text-ink-light'
                : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95'
            }`}
          >
            {outOfStock ? 'אזל מהמלאי' : (
              <>
                <ShoppingCart size={16} /> הוסף לסל
              </>
            )}
          </button>
        )}

        {/* Mobile only: shortcut to open the cart once the item is in it (the
            drawer no longer pops open automatically on mobile). */}
        {!isService && cartQty > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative z-10 mt-2 w-full text-center text-sm font-semibold text-brand-600 underline-offset-2 hover:underline lg:hidden"
          >
            מעבר לסל הקניות
          </button>
        )}
      </div>
    </article>
  )
}
