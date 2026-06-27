import { useState, useEffect } from 'react'
import { ChevronDown, Trash2, Package, Phone, MapPin, CreditCard, User, Mail, MessageSquare } from 'lucide-react'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import PhoneActions from './PhoneActions.jsx'
import JournalLog from './JournalLog.jsx'
import { PanelSearch } from './ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function OrdersPanel({ focusId = null }) {
  const { orders, updateStatus, deleteOrder, addOrderLog, markOrderRead } = useOrders()
  const { orderStatuses, orderStatusMeta, paymentLabel: payLabel, deliveryLabel } = useSettings()
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(null)
  const [sortDir, setSortDir] = useState('newest')
  const [query, setQuery] = useState('')

  // Opened from the order email (/admin?order=<id>) — expand, mark read and
  // scroll to that order once it's loaded.
  useEffect(() => {
    if (!focusId) return
    const target = orders.find((o) => o.id === focusId || o.number === focusId)
    if (!target) return
    setExpanded(target.id)
    markOrderRead(target.id)
    const t = setTimeout(() => document.getElementById(`order-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
    return () => clearTimeout(t)
  }, [focusId, orders, markOrderRead])

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
        const unread = !o.read // not opened yet → highlighted red
        // Open/close; opening an unread order marks it read (and drops the badge).
        const toggle = () => {
          const opening = !isOpen
          setExpanded(isOpen ? null : o.id)
          if (opening && unread) markOrderRead(o.id)
        }
        return (
          <div
            key={o.id}
            id={`order-${o.id}`}
            className={`overflow-hidden rounded-2xl border shadow-card ${
              unread
                ? 'border-red-300 bg-red-50/60 ring-1 ring-red-200'
                : `border-black/5 ${idx % 2 ? 'bg-brand-50/40' : 'bg-white'}`
            }`}
          >
            {/* Row header — fixed two-row layout so every card is symmetric:
                top row = number/date (right) + total/customer (left);
                bottom row = status (right) + delete (left). */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={toggle} className="flex min-w-0 flex-1 items-center gap-2.5 text-right">
                  <ChevronDown size={18} className={`shrink-0 text-ink-light transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-bold text-ink">
                      {o.number}
                      {unread && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">חדש</span>}
                    </span>
                    <span className="block text-xs text-ink-light">{fmtDate(o.createdAt)}</span>
                  </span>
                </button>
                <span className="shrink-0 text-left">
                  <span className="block font-extrabold text-ink">₪{o.total}</span>
                  <span className="block max-w-[9rem] truncate text-xs text-ink-light">{o.customer?.name}</span>
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-3">
                {/* Status select */}
                <div className="relative">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className={`cursor-pointer appearance-none rounded-full px-3 py-1.5 pl-7 text-xs font-bold outline-none ${meta.color}`}
                  >
                    {orderStatuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
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
            </div>

            {/* Details */}
            {isOpen && (
              <div className="grid gap-4 border-t border-black/5 bg-brand-50/30 p-4 sm:grid-cols-2">
                {/* Customer */}
                <div className="space-y-2 rounded-xl border border-black/5 bg-white p-3 text-sm">
                  <p className="flex items-center gap-2 font-bold text-ink">
                    <User size={15} className="text-ink-light" /> {o.customer?.name || '—'}
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <Phone size={14} className="text-ink-light" /> <PhoneActions phone={o.customer?.phone} />
                  </p>
                  <p className="flex items-start gap-2 text-ink">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-ink-light" /> {o.customer?.address || '— (איסוף עצמי)'}
                  </p>
                  {o.customer?.email && (
                    <p className="flex items-center gap-2 text-ink" dir="ltr">
                      <Mail size={14} className="shrink-0 text-ink-light" /> {o.customer.email}
                    </p>
                  )}
                  <p className="flex items-center gap-2 border-t border-black/5 pt-2 text-ink">
                    <CreditCard size={14} className="text-ink-light" /> {payLabel(o.payment)} · {deliveryLabel(o.delivery)}
                    {Number(o.deliveryPrice) > 0 && <span className="text-ink-light">(₪{o.deliveryPrice})</span>}
                  </p>
                  {o.notes && (
                    <p className="flex items-start gap-2 border-t border-black/5 pt-2 text-ink">
                      <MessageSquare size={14} className="mt-0.5 shrink-0 text-ink-light" /> {o.notes}
                    </p>
                  )}
                </div>

                {/* Items — full detail: image, color, chosen options, prices */}
                <div className="rounded-xl border border-black/5 bg-white p-3">
                  <p className="mb-2 text-xs font-bold text-ink-light">פריטים ({(o.items || []).reduce((n, it) => n + it.qty, 0)})</p>
                  <ul className="space-y-2.5">
                    {(o.items || []).map((it) => (
                      <li key={it.lineId || it.id} className="flex gap-2.5 border-b border-black/5 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg">
                          {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : '📦'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-ink">{it.name}</span>
                            {/* Line total — base + add-ons, all of it */}
                            <span className="shrink-0 text-sm font-bold text-ink">₪{it.price * it.qty}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-light">
                            <span>כמות: <b className="text-ink">{it.qty}</b></span>
                            {/* Product's own (default) price, without the option add-ons */}
                            <span>מחיר מוצר: ₪{it.listPrice ?? it.price}</span>
                          </div>
                          {it.color && (
                            <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-light">
                              <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: it.color }} /> צבע נבחר
                            </span>
                          )}
                          {Array.isArray(it.selections) && it.selections.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {it.selections.map((s, idx) => (
                                <li key={idx} className="text-xs text-ink">
                                  <span className="font-semibold">{s.groupTitle}:</span> {s.optionLabel}
                                  {s.priceDelta ? <span className="text-brand-600"> (+₪{s.priceDelta})</span> : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-black/5 pt-2 text-sm">
                    <span className="font-semibold text-ink-light">סה״כ</span>
                    <span className="font-extrabold text-ink">₪{o.total}</span>
                  </div>
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
