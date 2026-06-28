import { useState, useEffect } from 'react'
import { ChevronDown, Trash2, Package, Phone, MapPin, CreditCard, User, Mail, MessageSquare, Pencil, Plus, X, Check, CheckCircle2 } from 'lucide-react'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import PhoneActions from './PhoneActions.jsx'
import JournalLog from './JournalLog.jsx'
import { PanelSearch } from './ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function OrdersPanel({ focusId = null }) {
  const { orders, updateStatus, updateOrderItems, deleteOrder, addOrderLog, markOrderRead } = useOrders()
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

                {/* Edit items / add custom item + approve */}
                <div className="sm:col-span-2">
                  <OrderEditor order={o} updateOrderItems={updateOrderItems} updateStatus={updateStatus} />
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

// Admin order editor — change quantities, remove lines, add a custom line item
// (name + price), then save. Also approves a pending order. Lets the shop fix
// stock issues with the customer before finalising, instead of refunding.
function OrderEditor({ order, updateOrderItems, updateStatus }) {
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState(order.items || [])
  const [custom, setCustom] = useState({ name: '', price: '', qty: 1 })

  // Re-sync if the order changes underneath us (e.g. another save).
  useEffect(() => { setItems(order.items || []) }, [order.items])

  const subtotal = items.reduce((n, it) => n + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
  const total = subtotal + (Number(order.deliveryPrice) || 0)

  const setQty = (i, q) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, qty: Math.max(1, Number(q) || 1) } : it)))
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i))
  const addCustom = () => {
    const price = Number(custom.price)
    if (!custom.name.trim() || !(price >= 0)) return
    const id = `custom-${Date.now()}`
    setItems((arr) => [...arr, { id, lineId: id, name: custom.name.trim(), price, listPrice: price, qty: Math.max(1, Number(custom.qty) || 1), image: '', custom: true }])
    setCustom({ name: '', price: '', qty: 1 })
  }
  const save = () => { updateOrderItems(order.id, items); setEditing(false) }
  const cancel = () => { setItems(order.items || []); setEditing(false) }

  const isPending = order.status === 'pending' || order.status === 'new'

  return (
    <div className="rounded-xl border border-black/5 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-light">עריכת הזמנה</span>
        <div className="flex items-center gap-2">
          {isPending && (
            <button
              type="button"
              onClick={() => updateStatus(order.id, 'processing')}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
            >
              <CheckCircle2 size={14} /> אישור הזמנה
            </button>
          )}
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-ink hover:bg-black/5"
            >
              <Pencil size={14} /> עריכת פריטים
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
          {items.map((it, i) => (
            <div key={it.lineId || it.id || i} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{it.name}{it.custom && <span className="mr-1 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">כללי</span>}</span>
              <input
                type="number"
                min="1"
                value={it.qty}
                onChange={(e) => setQty(i, e.target.value)}
                className="w-14 rounded-lg border border-black/10 px-2 py-1 text-center text-sm outline-none focus:border-brand-500"
              />
              <span className="w-16 shrink-0 text-left font-bold text-ink">₪{(Number(it.price) || 0) * (Number(it.qty) || 0)}</span>
              <button type="button" onClick={() => removeItem(i)} aria-label="הסרה" className="shrink-0 rounded-lg p-1.5 text-ink-light hover:bg-red-50 hover:text-red-600">
                <X size={15} />
              </button>
            </div>
          ))}

          {/* Add a custom (general) line item with an admin-set price. */}
          <div className="mt-2 grid grid-cols-[1fr_5rem_4rem_auto] items-center gap-2 rounded-lg bg-brand-50/60 p-2">
            <input value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} placeholder="שם פריט כללי" className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
            <input type="number" min="0" value={custom.price} onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} placeholder="מחיר ₪" className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
            <input type="number" min="1" value={custom.qty} onChange={(e) => setCustom((c) => ({ ...c, qty: e.target.value }))} placeholder="כמות" className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
            <button type="button" onClick={addCustom} className="flex items-center justify-center rounded-lg bg-brand-500 p-2 text-white hover:bg-brand-600"><Plus size={16} /></button>
          </div>

          <div className="flex items-center justify-between border-t border-black/5 pt-2 text-sm">
            <span className="font-semibold text-ink-light">סה״כ חדש (כולל משלוח)</span>
            <span className="text-lg font-extrabold text-ink">₪{total}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-ink hover:bg-black/5">ביטול</button>
            <button type="button" onClick={save} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600">
              <Check size={14} /> שמירת שינויים
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
