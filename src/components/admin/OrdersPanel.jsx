import { useState } from 'react'
import { ChevronDown, Trash2, Package, Phone, MapPin, CreditCard } from 'lucide-react'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import PhoneActions from './PhoneActions.jsx'
import JournalLog from './JournalLog.jsx'
import { PanelSearch } from './ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function OrdersPanel() {
  const { orders, updateStatus, deleteOrder, addOrderLog } = useOrders()
  const { orderStatuses, orderStatusMeta, paymentLabel: payLabel, deliveryLabel } = useSettings()
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(null)
  const [sortDir, setSortDir] = useState('newest')
  const [query, setQuery] = useState('')

  const term = query.trim().toLowerCase()
  const matches = (o) =>
    !term ||
    [o.number, o.customer?.name, o.customer?.phone, o.customer?.address, ...(o.items || []).map((i) => i.name)].some(
      (f) => (f || '').toString().toLowerCase().includes(term),
    )

  const sorted = [...orders]
    .filter(matches)
    .sort((a, b) =>
      sortDir === 'newest'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt),
    )

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white py-16 text-center text-ink-light">
        <Package size={40} className="mx-auto text-black/20" />
        <p className="mt-3 font-semibold text-ink">אין הזמנות עדיין</p>
        <p className="mt-1 text-sm">הזמנות מהחנות יופיעו כאן באופן אוטומטי.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PanelSearch value={query} onChange={setQuery} placeholder="חיפוש הזמנה / לקוח / מוצר…" className="w-full sm:max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-ink-light">
          מיון לפי תאריך:
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand-500"
          >
            <option value="newest">מהחדש לישן</option>
            <option value="oldest">מהישן לחדש</option>
          </select>
        </label>
      </div>
      {sorted.length === 0 && (
        <p className="rounded-2xl border border-dashed border-black/10 bg-white py-10 text-center text-sm text-ink-light">
          לא נמצאו הזמנות עבור “{query.trim()}”.
        </p>
      )}
      <div className="space-y-3">
      {sorted.map((o, idx) => {
        const meta = orderStatusMeta(o.status)
        const isOpen = expanded === o.id
        return (
          <div
            key={o.id}
            className={`overflow-hidden rounded-2xl border border-black/5 shadow-card ${
              idx % 2 ? 'bg-brand-50/40' : 'bg-white'
            }`}
          >
            {/* Row header */}
            <div className="flex flex-wrap items-center gap-3 p-4">
              <button
                onClick={() => setExpanded(isOpen ? null : o.id)}
                className="flex flex-1 items-center gap-3 text-right"
              >
                <ChevronDown
                  size={18}
                  className={`text-ink-light transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
                <div>
                  <div className="font-bold text-ink">{o.number}</div>
                  <div className="text-xs text-ink-light">{fmtDate(o.createdAt)}</div>
                </div>
              </button>

              <div className="text-sm text-ink-light">{o.customer?.name}</div>
              <div className="font-extrabold text-ink">₪{o.total}</div>

              {/* Status select */}
              <div className="relative">
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className={`cursor-pointer appearance-none rounded-full px-3 py-1.5 pl-7 text-xs font-bold outline-none ${meta.color}`}
                >
                  {orderStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
              </div>

              <button
                onClick={() => deleteOrder(o.id)}
                aria-label="מחיקת הזמנה"
                className="rounded-lg p-2 text-ink-light hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Details */}
            {isOpen && (
              <div className="grid gap-4 border-t border-black/5 bg-brand-50/30 p-4 sm:grid-cols-2">
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 text-ink">
                    <Phone size={14} className="text-ink-light" /> <PhoneActions phone={o.customer?.phone} />
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <MapPin size={14} className="text-ink-light" /> {o.customer?.address || '—'}
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <CreditCard size={14} className="text-ink-light" /> {payLabel(o.payment)} · {deliveryLabel(o.delivery)}
                  </p>
                  {o.customer?.email && <p className="text-xs text-ink-light">{o.customer.email}</p>}
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink-light">פריטים</p>
                  <ul className="space-y-1 text-sm">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between">
                        <span className="text-ink">
                          {it.name} × {it.qty}
                        </span>
                        <span className="font-semibold text-ink">₪{it.price * it.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="sm:col-span-2 border-t border-black/5 pt-3">
                  <JournalLog entries={o.log} onAdd={(text) => addOrderLog(o.id, text, user?.name)} />
                </div>
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}
