import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Package, Check, Truck, ClipboardList, PackageCheck, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { ORDER_STATUSES } from '../data/orderMeta.js'
import Logo from '../components/Logo.jsx'

// Icon per status step (keyed by id from ORDER_STATUSES).
const STEP_ICONS = { new: ClipboardList, processing: Package, shipped: Truck, completed: PackageCheck }
const money = (n) => '₪' + Number(n || 0).toLocaleString('he-IL')
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export default function OrderTracking() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true, order: null })

  useEffect(() => {
    let active = true
    supabase
      .rpc('get_order_by_token', { p_token: token })
      .then(({ data }) => {
        if (active) setState({ loading: false, order: Array.isArray(data) ? data[0] || null : data || null })
      })
      .catch(() => active && setState({ loading: false, order: null }))
    return () => { active = false }
  }, [token])

  const { loading, order } = state
  const currentIdx = order ? Math.max(0, ORDER_STATUSES.findIndex((s) => s.id === order.status)) : 0
  const items = Array.isArray(order?.items) ? order.items : []
  const qtyTotal = items.reduce((n, it) => n + (Number(it.qty) || 0), 0)

  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo className="h-11" />
          <Link to="/" className="flex items-center gap-1 text-sm font-semibold text-ink hover:text-brand-600">
            <ArrowRight size={16} /> לחנות
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
          </div>
        ) : !order ? (
          <div className="rounded-2xl border border-black/5 bg-white p-10 text-center shadow-card">
            <AlertCircle size={48} className="mx-auto text-ink-light/40" />
            <p className="mt-4 text-lg font-bold text-ink">ההזמנה לא נמצאה</p>
            <p className="mt-1 text-sm text-ink-light">ייתכן שהקישור שגוי או שפג תוקפו. אפשר לבדוק את ההזמנות באזור האישי.</p>
            <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              <ArrowRight size={16} /> חזרה לחנות
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-ink">מעקב הזמנה</h1>
            <p className="mt-1 text-sm text-ink-light">
              הזמנה <span className="font-bold text-ink">{order.number}</span>
              {order.created_at ? ` · ${fmtDate(order.created_at)}` : ''}
            </p>

            {/* Status timeline */}
            <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-card">
              <div className="flex items-start justify-between">
                {ORDER_STATUSES.map((s, i) => {
                  const Icon = STEP_ICONS[s.id] || Package
                  const done = i <= currentIdx
                  const current = i === currentIdx
                  return (
                    <div key={s.id} className="relative flex flex-1 flex-col items-center text-center">
                      {/* Connector line to the previous step */}
                      {i > 0 && (
                        <span className={`absolute right-1/2 top-5 -z-0 h-0.5 w-full ${i <= currentIdx ? 'bg-brand-500' : 'bg-black/10'}`} />
                      )}
                      <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        done ? 'border-brand-500 bg-brand-500 text-white' : 'border-black/15 bg-white text-ink-light'
                      } ${current ? 'ring-4 ring-brand-500/20' : ''}`}>
                        {done && !current ? <Check size={18} /> : <Icon size={18} />}
                      </span>
                      <span className={`mt-2 text-xs font-semibold ${done ? 'text-brand-700' : 'text-ink-light'}`}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Items */}
            <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-card">
              <h2 className="mb-3 text-sm font-bold text-ink-light">פריטים ({qtyTotal})</h2>
              <ul className="space-y-3">
                {items.map((it, i) => (
                  <li key={it.lineId || it.id || i} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg">
                      {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : '📦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{it.name}</p>
                      <p className="text-xs text-ink-light">כמות: {it.qty}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-ink">{money((Number(it.price) || 0) * (Number(it.qty) || 0))}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                <span className="font-bold text-ink">סה״כ</span>
                <span className="text-xl font-extrabold text-ink">{money(order.total)}</span>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-ink-light">
              יש שאלה על ההזמנה? צרו קשר ונשמח לעזור.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
