import { useState, useEffect } from 'react'
import { ChevronDown, Trash2, Package, Phone, MapPin, CreditCard, User, Mail, MessageSquare, Pencil, Plus, X, Check, CheckCircle2, FileText, AlertTriangle } from 'lucide-react'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import PhoneActions from './PhoneActions.jsx'
import JournalLog from './JournalLog.jsx'
import { PanelSearch } from './ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function OrdersPanel({ focusId = null }) {
  const { orders, updateStatus, updateOrderItems, issueInvoice, deleteOrder, addOrderLog, markOrderRead } = useOrders()
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
                  <OrderEditor order={o} updateOrderItems={updateOrderItems} updateStatus={updateStatus} issueInvoice={issueInvoice} />
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
function OrderEditor({ order, updateOrderItems, updateStatus, issueInvoice }) {
  const { store } = useCatalogStore()
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState(order.items || [])
  const [custom, setCustom] = useState({ name: '', price: '', qty: 1 })
  const [search, setSearch] = useState('')
  const [invBusy, setInvBusy] = useState(false)
  const [invErr, setInvErr] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [draftCache, setDraftCache] = useState(null) // { sig, invoice } — last draft for the unchanged order

  // Open the document PDF (preferred), falling back to SUMIT's document page.
  const openInvoicePreview = (inv) => {
    if (inv?.pdfBase64) {
      try {
        const bytes = Uint8Array.from(atob(inv.pdfBase64), (c) => c.charCodeAt(0))
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        window.open(url, '_blank')
        return
      } catch { /* fall through to the URL */ }
    }
    if (inv?.url) window.open(inv.url, '_blank')
  }

  // Signature of the order's billable content — a saved change to the order
  // invalidates the cached draft, so a fresh one is generated next time.
  const orderSig = JSON.stringify({ id: order.id, items: order.items, total: order.total })
  const draftValid = draftCache && draftCache.sig === orderSig

  const createDocument = async (draft) => {
    setInvErr('')
    setInvBusy(true)
    const res = await issueInvoice(order, { draft })
    setInvBusy(false)
    if (!res.ok) { setInvErr(res.error || 'יצירת החשבונית נכשלה'); return null }
    return res.invoice
  }

  // Draft: re-open the existing draft if the order is unchanged, else create one.
  const onDraft = async () => {
    if (draftValid) { openInvoicePreview(draftCache.invoice); return }
    const inv = await createDocument(true)
    if (inv) { setDraftCache({ sig: orderSig, invoice: inv }); openInvoicePreview(inv) }
  }
  const onReal = () => createDocument(false)

  // Re-sync if the order changes underneath us (e.g. another save).
  useEffect(() => { setItems(order.items || []) }, [order.items])

  const subtotal = items.reduce((n, it) => n + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
  const total = subtotal + (Number(order.deliveryPrice) || 0)

  const setQty = (i, q) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, qty: Math.max(1, Number(q) || 1) } : it)))
  const setPrice = (i, p) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, price: Math.max(0, Number(p) || 0) } : it)))
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i))
  const addCustom = () => {
    const price = Number(custom.price)
    if (!custom.name.trim() || !(price >= 0)) return
    const id = `custom-${Date.now()}`
    setItems((arr) => [...arr, { id, lineId: id, name: custom.name.trim(), price, listPrice: price, qty: Math.max(1, Number(custom.qty) || 1), image: '', custom: true }])
    setCustom({ name: '', price: '', qty: 1 })
  }
  const addProduct = (p) => {
    const price = Number(p.price) || 0
    setItems((arr) => [...arr, { id: p.id, lineId: `${p.id}-${Date.now()}`, name: p.name, price, listPrice: price, qty: 1, image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '' }])
    setSearch('')
  }
  const save = () => { updateOrderItems(order.id, items); setEditing(false) }
  const cancel = () => { setItems(order.items || []); setEditing(false) }

  const term = search.trim().toLowerCase()
  const matches = term && Array.isArray(store)
    ? store.filter((p) => (p.name || '').toLowerCase().includes(term)).slice(0, 8)
    : []

  const isPending = order.status === 'pending' || order.status === 'new'
  const inputCls = 'rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:border-brand-500'

  return (
    <div className="rounded-xl border border-black/5 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-light">עריכת הזמנה</span>
        <div className="flex flex-wrap items-center gap-2">
          {isPending && (
            <button type="button" onClick={() => updateStatus(order.id, 'processing')} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600">
              <CheckCircle2 size={14} /> אישור הזמנה
            </button>
          )}
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-ink hover:bg-black/5">
              <Pencil size={14} /> עריכת פריטים
            </button>
          )}
          {/* Draft: create a preview, or re-open the existing one if unchanged. */}
          <button type="button" onClick={onDraft} disabled={invBusy} className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-ink hover:bg-black/5 disabled:opacity-60">
            <FileText size={14} /> {invBusy ? '…' : draftValid ? 'צפייה בטיוטה' : 'טיוטה'}
          </button>
          {/* Real invoice — open the issued one, or open the confirm dialog. */}
          {order.invoice?.url ? (
            <a href={order.invoice.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100">
              <FileText size={14} /> חשבונית{order.invoice.number ? ` ${order.invoice.number}` : ''}
            </a>
          ) : (
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={invBusy} className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-dark disabled:opacity-60">
              <FileText size={14} /> {invBusy ? 'מפיק…' : 'הפקת חשבונית'}
            </button>
          )}
        </div>
      </div>
      {invErr && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{invErr}</p>}

      {editing && (
        <div className="mt-3 space-y-3 border-t border-black/5 pt-3">
          {/* Item rows — name on top, then price / qty / total / remove (wraps on mobile) */}
          {items.map((it, i) => (
            <div key={it.lineId || it.id || i} className="rounded-lg border border-black/10 p-2">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 break-words text-sm font-semibold text-ink">
                  {it.name}
                  {it.custom && <span className="ms-1 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">כללי</span>}
                </span>
                <button type="button" onClick={() => removeItem(i)} aria-label="הסרה" className="shrink-0 rounded-lg p-1 text-ink-light hover:bg-red-50 hover:text-red-600">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-light">
                <label className="flex items-center gap-1">מחיר ₪
                  <input type="number" min="0" value={it.price} onChange={(e) => setPrice(i, e.target.value)} className={`w-20 text-center ${inputCls} py-1`} />
                </label>
                <label className="flex items-center gap-1">כמות
                  <input type="number" min="1" value={it.qty} onChange={(e) => setQty(i, e.target.value)} className={`w-16 text-center ${inputCls} py-1`} />
                </label>
                <span className="ms-auto text-sm font-bold text-ink">₪{(Number(it.price) || 0) * (Number(it.qty) || 0)}</span>
              </div>
            </div>
          ))}

          {/* Add from inventory */}
          <div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש מוצר מהמלאי להוספה…" className={`w-full ${inputCls}`} />
            {term && (
              <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-black/10">
                {matches.length ? matches.map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm hover:bg-brand-50">
                    <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                    <span className="shrink-0 text-xs text-ink-light">₪{p.price} · מלאי {p.stock ?? 0}</span>
                  </button>
                )) : <p className="px-3 py-2 text-xs text-ink-light">לא נמצא מוצר</p>}
              </div>
            )}
          </div>

          {/* Add a custom (general) line item with an admin-set price */}
          <div className="rounded-lg bg-brand-50/60 p-2">
            <p className="mb-2 text-xs font-bold text-ink-light">הוספת פריט כללי (מחיר חופשי)</p>
            <div className="flex flex-wrap gap-2">
              <input value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} placeholder="שם הפריט" className={`min-w-[8rem] flex-1 ${inputCls}`} />
              <input type="number" min="0" value={custom.price} onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} placeholder="מחיר ₪" className={`w-24 ${inputCls}`} />
              <input type="number" min="1" value={custom.qty} onChange={(e) => setCustom((c) => ({ ...c, qty: e.target.value }))} placeholder="כמות" className={`w-20 ${inputCls}`} />
              <button type="button" onClick={addCustom} className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-600"><Plus size={16} /> הוסף</button>
            </div>
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

      {/* Confirm dialog before issuing a REAL (irreversible) tax invoice. */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertTriangle size={24} /></span>
              <h3 className="mt-3 text-base font-extrabold text-ink">הפקת חשבונית מס</h3>
              <p className="mt-1 text-sm text-ink-light">האם אתה בטוח שברצונך להפיק את המסמך? פעולה זו אינה ניתנת לביטול.</p>
            </div>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => { setConfirmOpen(false); onReal() }} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-sm font-bold text-white hover:bg-ink-dark">
                <Check size={16} /> כן, הפק את החשבונית
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setConfirmOpen(false); onDraft() }} className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-bold text-ink hover:bg-black/5">
                  <FileText size={15} /> {draftValid ? 'צפייה בטיוטה' : 'טיוטה'}
                </button>
                <button type="button" onClick={() => { setConfirmOpen(false); setEditing(true) }} className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-bold text-ink hover:bg-black/5">
                  <Pencil size={15} /> עריכת הזמנה
                </button>
              </div>
              <button type="button" onClick={() => setConfirmOpen(false)} className="w-full rounded-xl py-2 text-sm font-semibold text-ink-light hover:text-ink">
                לא, ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
