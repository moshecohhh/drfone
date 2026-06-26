import { useNavigate } from 'react-router-dom'
import { X, Plus, Minus, Trash2, ShoppingCart, ShoppingBag, RotateCcw } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'

// Slide-out shopping cart (Store products only).
export default function CartDrawer() {
  const { items, open, setOpen, setQty, removeItem, subtotal, count, restorable, restoreCart, dismissRestore } = useCart()
  const navigate = useNavigate()

  const goCheckout = () => {
    setOpen(false)
    navigate('/checkout')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer (slides from the left in RTL) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-label="סל הקניות"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <ShoppingCart size={20} className="text-brand-500" /> סל הקניות
            {count > 0 && <span className="text-sm font-medium text-ink-light">({count})</span>}
          </h2>
          <button onClick={() => setOpen(false)} aria-label="סגירה" className="text-ink-light hover:text-ink">
            <X size={22} />
          </button>
        </div>

        {/* Restore offer — only appears after the 24h auto-clear */}
        {restorable.length > 0 && (
          <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3">
            <RotateCcw size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">הסל מהביקור הקודם רוקן אוטומטית</p>
              <p className="mt-0.5 text-xs text-ink-light">
                שמרנו לך {restorable.reduce((n, i) => n + i.qty, 0)} פריטים — אפשר לשחזר אותם.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={restoreCart}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
                >
                  שחזור הסל
                </button>
                <button
                  onClick={dismissRestore}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-light transition hover:bg-black/5 hover:text-ink"
                >
                  לא תודה
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-ink-light">
              <ShoppingBag size={40} className="text-black/20" />
              <p className="mt-3 font-semibold text-ink">הסל ריק</p>
              <p className="mt-1 text-sm">הוסיפו מוצרים מהחנות כדי להתחיל.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => {
                const lid = it.lineId || it.id
                return (
                <li key={lid} className="flex gap-3 rounded-xl border border-black/5 p-3">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-2xl">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{it.emoji}</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{it.name}</span>
                      <button
                        onClick={() => removeItem(lid)}
                        aria-label="הסרה"
                        className="text-ink-light hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {it.color && (
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-light">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: it.color }} />
                        צבע נבחר
                      </span>
                    )}
                    {/* Chosen product-page options (version / upgrades / storage…). */}
                    {Array.isArray(it.selections) && it.selections.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5">
                        {it.selections.map((s, idx) => (
                          <li key={idx} className="text-xs text-ink-light">
                            <span className="font-medium text-ink">{s.groupTitle}:</span> {s.optionLabel}
                            {s.priceDelta ? <span className="text-brand-600"> (+₪{s.priceDelta})</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-brand-600">
                      ₪{it.price}
                      {it.listPrice > it.price && (
                        <>
                          <span className="text-xs font-normal text-ink-light line-through">₪{it.listPrice}</span>
                          <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                            {Math.round((1 - it.price / it.listPrice) * 100)}% הנחה
                          </span>
                        </>
                      )}
                    </span>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <QtyBtn onClick={() => setQty(lid, it.qty - 1)} disabled={it.qty <= 1}>
                        <Minus size={14} />
                      </QtyBtn>
                      <span className="w-6 text-center text-sm font-semibold">{it.qty}</span>
                      <QtyBtn onClick={() => setQty(lid, it.qty + 1)} disabled={it.qty >= it.stock}>
                        <Plus size={14} />
                      </QtyBtn>
                      {it.qty >= it.stock && (
                        <span className="text-[11px] text-ink-light">מקסימום במלאי</span>
                      )}
                    </div>
                  </div>
                </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-black/5 px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-base">
              <span className="font-semibold text-ink-light">סה״כ ביניים</span>
              <span className="text-xl font-extrabold text-ink">₪{subtotal}</span>
            </div>
            <button
              onClick={goCheckout}
              className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
            >
              למעבר לתשלום
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

function QtyBtn({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
