import { useState, useEffect } from 'react'
import { ShoppingCart, Phone, Mail, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { CART_TTL_MS } from '../../context/CartContext.jsx'
import { PanelHead, EmptyState } from './ui.jsx'

const money = (n) => '₪' + Number(n || 0).toLocaleString('he-IL')

// "X ago" in Hebrew, coarse-grained.
const ago = (iso) => {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'הרגע'
  if (min < 60) return `לפני ${min} דק׳`
  const h = Math.floor(min / 60)
  if (h < 24) return `לפני ${h} שע׳`
  return `לפני ${Math.floor(h / 24)} ימים`
}

// Live carts of signed-in customers (mirrored from the storefront). Active =
// touched within the cart's 3h window; older ones are flagged as abandoned.
export default function CartsPanel() {
  const [carts, setCarts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    supabase
      .from('carts')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setCarts((data || []).filter((c) => (c.data?.items || []).length > 0))
        setLoading(false)
      })
  }
  useEffect(load, [])

  const active = carts.filter((c) => Date.now() - new Date(c.updated_at).getTime() <= CART_TTL_MS)
  const abandoned = carts.filter((c) => Date.now() - new Date(c.updated_at).getTime() > CART_TTL_MS)

  return (
    <div>
      <PanelHead
        title="עגלות קנייה"
        subtitle="לקוחות רשומים שיש להם פריטים בסל. ניתן לפנות אליהם ולעזור להשלים את הרכישה."
        action={
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> רענון
          </button>
        }
      />

      {carts.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={loading ? 'טוען…' : 'אין עגלות פעילות'} hint="עגלות של לקוחות רשומים יופיעו כאן." />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && <CartGroup title={`פעילות (${active.length})`} carts={active} />}
          {abandoned.length > 0 && <CartGroup title={`ננטשו (${abandoned.length})`} carts={abandoned} dim />}
        </div>
      )}
    </div>
  )
}

function CartGroup({ title, carts, dim }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-ink-light">{title}</p>
      <ul className="space-y-3">
        {carts.map((c) => {
          const d = c.data || {}
          const cust = d.customer || {}
          const items = d.items || []
          return (
            <li key={c.id} className={`rounded-2xl border border-black/5 bg-white p-4 shadow-card ${dim ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{cust.name || 'לקוח'}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-light">
                    {cust.phone && (
                      <a href={`tel:${String(cust.phone).replace(/[^\d+]/g, '')}`} dir="ltr" className="flex items-center gap-1 hover:text-brand-600">
                        <Phone size={12} /> {cust.phone}
                      </a>
                    )}
                    {cust.email && (
                      <a href={`mailto:${cust.email}`} dir="ltr" className="flex items-center gap-1 hover:text-brand-600">
                        <Mail size={12} /> {cust.email}
                      </a>
                    )}
                    <span>{ago(c.updated_at)}</span>
                  </div>
                </div>
                <span className="shrink-0 font-extrabold text-ink">{money(d.subtotal)}</span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-brand-50/50 p-1.5 pr-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-base">
                      {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : '📦'}
                    </div>
                    <span className="text-xs font-semibold text-ink">{it.name}</span>
                    <span className="text-xs text-ink-light">×{it.qty}</span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
