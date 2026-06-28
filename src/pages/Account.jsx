import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight, LogOut, ShoppingBag, UserCog, CreditCard, Mail, Package,
  Plus, Trash2, Check, AlertCircle, BellRing, BellOff, ChevronDown, RotateCcw, Headset, MapPin, Star, FileText, Heart,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import { sanitizePhone, isValidPhone, luhnValid, passwordIssue } from '../utils/validation.js'
import CitySelect from '../components/CitySelect.jsx'
import StreetSelect from '../components/StreetSelect.jsx'
import OrderStatusTimeline from '../components/OrderStatusTimeline.jsx'
import Logo from '../components/Logo.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

const NEWSLETTER_KEY = 'drfone_newsletter'
const inputCls =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

const TABS = [
  { id: 'orders', label: 'ההזמנות שלי', Icon: ShoppingBag },
  { id: 'tickets', label: 'פניות שירות', Icon: Headset },
  { id: 'details', label: 'פרטים אישיים', Icon: UserCog },
  { id: 'billing', label: 'פרטי חיוב ומשלוח', Icon: MapPin },
  { id: 'payments', label: 'אמצעי תשלום', Icon: CreditCard },
  { id: 'newsletter', label: 'ניוזלטר', Icon: Mail },
]

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  // Allow deep-linking to a tab (e.g. the service-reply email → ?tab=tickets).
  const initialTab = TABS.some((t) => t.id === new URLSearchParams(location.search).get('tab'))
    ? new URLSearchParams(location.search).get('tab')
    : 'orders'
  const [tab, setTab] = useState(initialTab)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo className="h-11" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/" className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5">
              <ArrowRight size={16} /> לחנות
            </Link>
            <button onClick={logout} className="flex items-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-ink-dark">
              <LogOut size={16} /> התנתקות
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-extrabold text-ink">האזור האישי</h1>
        <p className="mt-0.5 text-sm text-ink-light">שלום, {user.name}</p>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-black/5 no-scrollbar">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-light hover:text-ink'
              }`}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'orders' && <OrdersTab email={user.email} />}
          {tab === 'tickets' && <ServiceTicketsTab />}
          {tab === 'details' && <DetailsTab />}
          {tab === 'billing' && <BillingTab />}
          {tab === 'payments' && <PaymentsTab />}
          {tab === 'newsletter' && <NewsletterTab />}
        </div>
      </main>
    </div>
  )
}

// ---- Orders (click an order to expand: status timeline, items, actions) ----
function OrdersTab({ email }) {
  const { orders } = useOrders()
  const { orderStatusMeta } = useSettings()
  const { store } = useCatalogStore()
  const { addItem, setOpen } = useCart()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  const [serviceOrder, setServiceOrder] = useState(null) // order whose service-request modal is open
  const [reorderOrder, setReorderOrder] = useState(null) // multi-item order whose re-order picker is open
  const [invoiceNoticeId, setInvoiceNoticeId] = useState(null) // order showing the "no invoice yet" note
  const mine = orders.filter((o) => o.customer?.email?.toLowerCase() === String(email).toLowerCase())

  const prodById = (id) => (Array.isArray(store) ? store.find((p) => p.id === id) : null)
  const lineInStock = (it) => {
    const p = prodById(it.id)
    return !!(p && (Number(p.stock) || 0) > 0)
  }
  // The button is active as long as at least one line can still be re-ordered.
  const canReorder = (o) => (o.items || []).some(lineInStock)

  // Re-add a previously ordered line to the cart, preserving its chosen options
  // (so required-field products don't end up in the cart without a selection).
  const addLineToCart = (it) => {
    const p = prodById(it.id)
    if (!p) return
    const selections = Array.isArray(it.selections) ? it.selections : []
    const options = {
      unitPrice: Number(it.price) || 0,
      selections,
      optionsKey: selections.map((s) => `${s.groupTitle}:${s.optionLabel}`).join('|'),
    }
    for (let k = 0; k < (Number(it.qty) || 1); k++) addItem(p, it.color || '', null, options)
  }

  // Single-line order → go to the product page (with the previous selections
  // pre-applied). Multi-line → open a picker so the customer chooses what to
  // re-order; out-of-stock lines are shown but can't be selected.
  const startReorder = (o) => {
    const items = o.items || []
    if (items.length === 1) {
      const it = items[0]
      if (!lineInStock(it)) return
      navigate(`/product/${it.id}`, { state: { reorder: { selections: it.selections || [], color: it.color || '' } } })
      return
    }
    setReorderOrder(o)
  }

  if (mine.length === 0) {
    return (
      <Empty icon={Package} title="אין הזמנות עדיין" hint="הזמנות שתבצעו בחנות יופיעו כאן עם הסטטוס שלהן.">
        <Link to="/" className="mt-4 inline-flex rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          למעבר לחנות
        </Link>
      </Empty>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-light">לחצו על הזמנה כדי לראות את הסטטוס והפרטים.</p>
      {mine.map((o) => {
        const meta = orderStatusMeta(o.status)
        const open = openId === o.id
        const items = o.items || []
        const reorderable = canReorder(o)
        return (
          <div key={o.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : o.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-right transition hover:bg-black/[.02]"
            >
              <span className="flex items-center gap-2.5">
                <ChevronDown size={16} className={`shrink-0 text-ink-light transition ${open ? 'rotate-180' : ''}`} />
                <span className="font-bold text-ink">{o.number}</span>
                <span className="text-sm font-extrabold text-ink">₪{o.total}</span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.color}`}>{meta.label}</span>
            </button>

            {open && (
              <div className="border-t border-black/5 p-4 pt-5">
                <OrderStatusTimeline status={o.status} />

                {/* Order meta */}
                <div className="mt-5 grid gap-1.5 border-t border-black/5 pt-4 text-sm sm:grid-cols-2">
                  <div className="text-ink-light">מספר הזמנה: <span className="font-semibold text-ink">{o.number}</span></div>
                  <div className="text-ink-light">מועד ביצוע: <span className="font-semibold text-ink">{fmtDate(o.createdAt)}</span></div>
                  <div className="text-ink-light sm:col-span-2">סה״כ שולם: <span className="font-extrabold text-ink">₪{o.total}</span></div>
                </div>

                {/* Items — image, qty, internal SKU/barcode */}
                <ul className="mt-4 space-y-3 border-t border-black/5 pt-4">
                  {items.map((it) => {
                    const sku = prodById(it.id)?.barcode || ''
                    return (
                      <li key={it.lineId || it.id} className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg">
                          {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : '📦'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug text-ink break-words">{it.name}</p>
                          <p className="text-xs text-ink-light">כמות: {it.qty}{sku ? ` · מק״ט: ${sku}` : ''}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-ink">₪{it.price * it.qty}</span>
                      </li>
                    )
                  })}
                </ul>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4">
                  <button
                    type="button"
                    onClick={() => reorderable && startReorder(o)}
                    disabled={!reorderable}
                    title={reorderable ? '' : 'המוצרים אינם זמינים במלאי'}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      reorderable ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-black/10 text-ink-light'
                    }`}
                  >
                    <RotateCcw size={15} /> קנייה חוזרת
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceOrder(o)}
                    className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-black/5"
                  >
                    <Headset size={15} /> פנייה לשירות
                  </button>
                  {o.invoice?.url ? (
                    <a
                      href={o.invoice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                    >
                      <FileText size={15} /> צפייה בחשבונית
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInvoiceNoticeId((id) => (id === o.id ? null : o.id))}
                      className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-black/5"
                    >
                      <FileText size={15} /> צפייה בחשבונית
                    </button>
                  )}
                </div>
                {invoiceNoticeId === o.id && !o.invoice?.url && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
                    ההזמנה עדיין לא אושרה ולכן טרם הופקה חשבונית. נעדכן אותך ברגע שהיא תהיה זמינה.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
      {serviceOrder && <ServiceRequestModal order={serviceOrder} onClose={() => setServiceOrder(null)} />}
      {reorderOrder && (
        <ReorderModal
          order={reorderOrder}
          lineInStock={lineInStock}
          onConfirm={(lines) => {
            lines.forEach(addLineToCart)
            setReorderOrder(null)
            setOpen(true)
          }}
          onClose={() => setReorderOrder(null)}
        />
      )}
    </div>
  )
}

// ---- Re-order picker (multi-item orders): choose which lines to buy again ----
function ReorderModal({ order, lineInStock, onConfirm, onClose }) {
  const lines = order.items || []
  // Pre-select every in-stock line; out-of-stock lines can't be chosen.
  const [chosen, setChosen] = useState(() => {
    const init = {}
    lines.forEach((it, i) => { init[it.lineId || i] = lineInStock(it) })
    return init
  })
  const keyOf = (it, i) => it.lineId || i
  const toggle = (k) => setChosen((c) => ({ ...c, [k]: !c[k] }))
  const selected = lines.filter((it, i) => lineInStock(it) && chosen[keyOf(it, i)])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-card-hover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-black/5 p-4">
          <RotateCcw size={18} className="text-brand-500" />
          <h3 className="text-base font-extrabold text-ink">בחירת מוצרים לקנייה חוזרת</h3>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {lines.map((it, i) => {
            const ok = lineInStock(it)
            const k = keyOf(it, i)
            return (
              <li
                key={k}
                className={`flex items-center gap-3 rounded-xl border p-3 ${ok ? 'border-black/10' : 'border-black/5 bg-black/[0.03] opacity-70'}`}
              >
                <input
                  type="checkbox"
                  disabled={!ok}
                  checked={!!chosen[k] && ok}
                  onChange={() => toggle(k)}
                  className="h-5 w-5 shrink-0 rounded border-black/20 text-brand-500 focus:ring-brand-500 disabled:opacity-40"
                />
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg">
                  {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : '📦'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-ink">{it.name}</p>
                  <p className="text-xs text-ink-light">כמות: {it.qty}</p>
                </div>
                {!ok && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">אזל מהמלאי</span>}
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end gap-2 border-t border-black/5 p-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5">
            ביטול
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            <RotateCcw size={15} /> הוספה לסל ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Service request from an order (opens a ticket → admin inquiries + email) ----
function ServiceRequestModal({ order, onClose }) {
  const { user } = useAuth()
  const { addInquiry } = useSettings()
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    const first = (order.items || [])[0]
    addInquiry({
      category: 'post-purchase', // a service request tied to an order
      userId: user?.id || null, // lets the customer track it from their account
      orderId: order.id,
      orderNumber: order.number,
      product: first ? { name: first.name, image: first.image || '' } : null,
      name: user?.name || order.customer?.name || '',
      phone: user?.phone || order.customer?.phone || '',
      email: user?.email || order.customer?.email || '',
      message: message.trim(),
    })
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="flex flex-col items-center py-4 text-center">
            <Check size={40} className="text-brand-500" />
            <p className="mt-3 font-bold text-ink">הפנייה נשלחה!</p>
            <p className="mt-1 text-sm text-ink-light">צוות השירות יחזור אליך בהקדם בנוגע להזמנה {order.number}.</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              סגירה
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="mb-3 flex items-center gap-2">
              <Headset size={18} className="text-brand-500" />
              <h3 className="text-base font-extrabold text-ink">פנייה לשירות</h3>
            </div>
            <p className="mb-3 text-sm text-ink-light">בנוגע להזמנה <span className="font-bold text-ink">{order.number}</span>. נחזור אליך בהקדם.</p>
            <textarea
              rows={4}
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="כתבו לנו במה נוכל לעזור…"
              className={inputCls}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5">
                ביטול
              </button>
              <button type="submit" disabled={!message.trim()} className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                <Headset size={15} /> שליחה
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ---- Service tickets: the customer's requests + the shop's replies ----
function ServiceTicketsTab() {
  const { myInquiries, addTicketMessage, toggleMessageReaction } = useSettings()
  const tickets = Array.isArray(myInquiries) ? myInquiries : []

  if (tickets.length === 0) {
    return (
      <Empty icon={Headset} title="אין פניות שירות" hint="פניות שתפתחו (למשל מתוך הזמנה) יופיעו כאן יחד עם תשובות החנות." />
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-light">כאן תוכלו לעקוב אחר הפניות שלכם ולראות את תשובות החנות.</p>
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} onSend={addTicketMessage} onReact={toggleMessageReaction} />
      ))}
    </div>
  )
}

function TicketCard({ ticket, onSend, onReact }) {
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const messages = Array.isArray(ticket.messages) ? ticket.messages : []
  const answered = ticket.status === 'answered'

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true)
    await onSend(ticket.id, reply)
    setBusy(false)
    setReply('')
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-right transition hover:bg-black/[.02]">
        <span className="flex items-center gap-2.5">
          <ChevronDown size={16} className={`shrink-0 text-ink-light transition ${open ? 'rotate-180' : ''}`} />
          <span className="font-bold text-ink">{ticket.orderNumber ? `פנייה · הזמנה ${ticket.orderNumber}` : 'פנייה כללית'}</span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${answered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {answered ? 'התקבלה תשובה' : 'ממתינה לתשובה'}
        </span>
      </button>

      {open && (
        <div className="border-t border-black/5 p-4">
          {ticket.product?.name && (
            <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-brand-50/50 p-2.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-lg">
                {ticket.product.image ? <img src={ticket.product.image} alt="" className="h-full w-full object-cover" /> : '📦'}
              </div>
              <span className="min-w-0 text-sm font-semibold text-ink">{ticket.product.name}</span>
            </div>
          )}

          <div className="space-y-2">
            {messages.map((m) => {
              const shop = m.from === 'shop'
              return (
                <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${shop ? 'ml-auto bg-brand-500 text-white' : 'mr-auto bg-black/[0.04] text-ink'}`}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className={`text-[10px] ${shop ? 'text-white/70' : 'text-ink-light'}`}>
                      {shop ? 'החנות' : 'אני'} · {fmtDate(m.at)}
                    </span>
                    <button type="button" onClick={() => onReact(ticket.id, m.id)} aria-label="לב על ההודעה" className="shrink-0">
                      <Heart size={13} className={m.reaction ? 'fill-red-500 text-red-500' : shop ? 'text-white/60 hover:text-white' : 'text-ink-light hover:text-red-500'} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-end gap-2 border-t border-black/5 pt-3">
            <textarea
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="הוספת הודעה לפנייה…"
              className={inputCls}
            />
            <button type="button" onClick={send} disabled={busy || !reply.trim()} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
              {busy ? '…' : 'שליחה'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Personal details (name / email / phone) + password ----
function DetailsTab() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: k === 'phone' ? sanitizePhone(v) : v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('יש להזין שם.')
    if (form.phone && !isValidPhone(form.phone)) return setError('מספר טלפון חייב להכיל 10 ספרות.')
    setError('')
    updateProfile({ name: form.name.trim(), phone: form.phone })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="mb-4 text-base font-extrabold text-ink">פרטים אישיים</h3>
        {error && <Banner>{error}</Banner>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא">
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
          </Field>
          <Field label="אימייל (לא ניתן לשינוי)">
            <input className={`${inputCls} bg-black/5`} dir="ltr" value={user.email} disabled />
          </Field>
          <Field label="טלפון">
            <input className={inputCls} dir="ltr" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0500000000" autoComplete="tel" />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              <Check size={16} /> {saved ? 'נשמר ✓' : 'שמירת פרטים'}
            </button>
          </div>
        </form>
      </Card>

      <PasswordCard />
    </div>
  )
}

// ---- Billing & shipping: invoice details + multiple saved addresses ----
function BillingTab() {
  const { user, updateProfile } = useAuth()
  const b = user.billing || {}
  const [bill, setBill] = useState({
    firstName: b.firstName || '',
    lastName: b.lastName || '',
    phone: b.phone || user.phone || '',
    useInvoiceName: !!b.useInvoiceName,
    invoiceName: b.invoiceName || '',
    taxId: b.taxId || '',
  })
  const [billSaved, setBillSaved] = useState(false)
  const setB = (k, v) => setBill((f) => ({ ...f, [k]: k === 'phone' ? sanitizePhone(v) : v }))

  const saveBilling = (e) => {
    e.preventDefault()
    updateProfile({ billing: { ...bill, phone: bill.phone, taxId: bill.taxId.trim(), invoiceName: bill.invoiceName.trim() } })
    setBillSaved(true)
    setTimeout(() => setBillSaved(false), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Billing details */}
      <Card>
        <h3 className="mb-4 text-base font-extrabold text-ink">פרטי חיוב</h3>
        <form onSubmit={saveBilling} className="grid gap-4 sm:grid-cols-2">
          <Field label="שם פרטי">
            <input className={inputCls} value={bill.firstName} onChange={(e) => setB('firstName', e.target.value)} autoComplete="given-name" />
          </Field>
          <Field label="שם משפחה">
            <input className={inputCls} value={bill.lastName} onChange={(e) => setB('lastName', e.target.value)} autoComplete="family-name" />
          </Field>
          <Field label="טלפון">
            <input className={inputCls} dir="ltr" inputMode="numeric" value={bill.phone} onChange={(e) => setB('phone', e.target.value)} autoComplete="tel" />
          </Field>
          <Field label="ת.ז / ע.מ / ח.פ">
            <input className={inputCls} dir="ltr" inputMode="numeric" value={bill.taxId} onChange={(e) => setB('taxId', e.target.value)} placeholder="לחשבונית" />
          </Field>

          <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={bill.useInvoiceName} onChange={(e) => setB('useInvoiceName', e.target.checked)} className="h-4 w-4 rounded border-black/20 text-brand-500 focus:ring-brand-500" />
            ברצוני שם שונה לחשבונית
          </label>
          {bill.useInvoiceName && (
            <div className="sm:col-span-2">
              <Field label="שם לחשבונית">
                <input className={inputCls} value={bill.invoiceName} onChange={(e) => setB('invoiceName', e.target.value)} placeholder="שם החברה / שם מלא לחשבונית" />
              </Field>
            </div>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              <Check size={16} /> {billSaved ? 'נשמר ✓' : 'שמירה כברירת מחדל'}
            </button>
          </div>
        </form>
      </Card>

      {/* Saved addresses */}
      <AddressesCard />
    </div>
  )
}

// ---- Multiple saved delivery addresses (one marked default) ----
function AddressesCard() {
  const { user, updateProfile } = useAuth()
  const addresses = Array.isArray(user.addresses) ? user.addresses : []
  const [form, setForm] = useState({ city: '', street: '', house: '', apartment: '', notes: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const persist = (next) => updateProfile({ addresses: next })

  const add = (e) => {
    e.preventDefault()
    if (!form.city.trim()) return setError('יש לבחור עיר.')
    if (!form.street.trim()) return setError('יש להזין רחוב.')
    setError('')
    const entry = {
      id: `addr-${Date.now()}`,
      city: form.city.trim(),
      street: form.street.trim(),
      house: form.house.trim(),
      apartment: form.apartment.trim(),
      notes: form.notes.trim(), // delivery instructions for the courier
      isDefault: addresses.length === 0, // first one is the default
    }
    persist([...addresses, entry])
    setForm({ city: '', street: '', house: '', apartment: '', notes: '' })
  }
  const remove = (id) => {
    const next = addresses.filter((a) => a.id !== id)
    // If we removed the default, promote the first remaining one.
    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true
    persist(next)
  }
  const makeDefault = (id) => persist(addresses.map((a) => ({ ...a, isDefault: a.id === id })))

  const fmt = (a) => `${a.street} ${a.house}${a.apartment ? ', ' + a.apartment : ''}, ${a.city}`

  return (
    <Card>
      <h3 className="mb-1 text-base font-extrabold text-ink">כתובות למשלוח</h3>
      <p className="mb-4 text-sm text-ink-light">אפשר לשמור כמה כתובות ולבחור ביניהן בקופה. הכתובת המסומנת ⭐ היא ברירת המחדל.</p>

      {addresses.length > 0 && (
        <div className="mb-5 space-y-2">
          {addresses.map((a) => (
            <div key={a.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${a.isDefault ? 'border-brand-300 bg-brand-50/50' : 'border-black/10'}`}>
              <span className="min-w-0 text-sm text-ink">
                <span className="flex items-center gap-2">
                  <MapPin size={15} className="shrink-0 text-brand-500" /> {fmt(a)}
                </span>
                {a.notes && <span className="mt-1 block pr-6 text-xs text-ink-light">📝 {a.notes}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {/* Star = default toggle. Filled amber when this is the default. */}
                <button
                  type="button"
                  onClick={() => makeDefault(a.id)}
                  title={a.isDefault ? 'כתובת ברירת המחדל' : 'קביעה כברירת מחדל'}
                  aria-pressed={a.isDefault}
                  className="rounded-lg p-1.5 transition hover:bg-black/5"
                >
                  <Star size={20} className={a.isDefault ? 'text-amber-400' : 'text-ink-light hover:text-amber-400'} fill={a.isDefault ? 'currentColor' : 'none'} />
                </button>
                <button type="button" onClick={() => remove(a.id)} aria-label="מחיקה" className="rounded-lg p-2 text-ink-light hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="border-t border-black/5 pt-4">
        <p className="mb-3 text-sm font-bold text-ink">הוספת כתובת</p>
        {error && <Banner>{error}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-ink-light">עיר</span>
            <CitySelect value={form.city} onChange={(v) => set('city', v)} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-ink-light">רחוב</span>
            <StreetSelect value={form.street} onChange={(v) => set('street', v)} city={form.city} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="מס׳ בית">
              <input className={inputCls} value={form.house} onChange={(e) => set('house', e.target.value)} />
            </Field>
            <Field label="דירה / כניסה">
              <input className={inputCls} value={form.apartment} onChange={(e) => set('apartment', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="הערות לשליח (אופציונלי)">
              <input className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="לדוגמה: קומה 3, קוד בניין 1234, להשאיר ליד הדלת" />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> הוספת כתובת
          </button>
        </div>
      </form>
    </Card>
  )
}

// ---- Change password ----
function PasswordCard() {
  const { updatePassword } = useAuth()
  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaved(false)
    const issue = passwordIssue(pw.password)
    if (issue) return setError(issue)
    if (pw.password !== pw.confirm) return setError('הסיסמאות אינן תואמות.')
    setError('')
    setBusy(true)
    const res = await updatePassword(pw.password)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setPw({ password: '', confirm: '' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card>
      <h3 className="mb-4 text-base font-extrabold text-ink">החלפת סיסמה</h3>
      {error && <Banner>{error}</Banner>}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <Check size={16} /> הסיסמה עודכנה בהצלחה.
        </div>
      )}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="סיסמה חדשה (לפחות 6 תווים)">
          <input type="password" className={inputCls} value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
        </Field>
        <Field label="אימות סיסמה">
          <input type="password" className={inputCls} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            <Check size={16} /> {busy ? 'שומר…' : 'עדכון סיסמה'}
          </button>
        </div>
      </form>
    </Card>
  )
}

// ---- Saved payment methods (mock) ----
function PaymentsTab() {
  const { user, updateProfile } = useAuth()
  const cards = user.savedPayments || []
  const [form, setForm] = useState({ number: '', exp: '', holder: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const add = (e) => {
    e.preventDefault()
    const digits = form.number.replace(/\D/g, '')
    if (!luhnValid(digits)) return setError('מספר כרטיס האשראי אינו תקין.')
    setError('')
    const card = { id: `card-${Date.now()}`, last4: digits.slice(-4), exp: form.exp, holder: form.holder }
    updateProfile({ savedPayments: [...cards, card] })
    setForm({ number: '', exp: '', holder: '' })
  }
  const remove = (id) => updateProfile({ savedPayments: cards.filter((c) => c.id !== id) })

  return (
    <div className="space-y-5">
      {cards.length > 0 && (
        <div className="space-y-2">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-card">
              <span className="flex items-center gap-3">
                <CreditCard size={22} className="text-brand-500" />
                <span className="font-semibold text-ink" dir="ltr">•••• •••• •••• {c.last4}</span>
                {c.exp && <span className="text-xs text-ink-light" dir="ltr">{c.exp}</span>}
              </span>
              <button onClick={() => remove(c.id)} aria-label="מחיקה" className="rounded-lg p-2 text-ink-light hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Card>
        <h3 className="mb-4 text-base font-extrabold text-ink">הוספת אמצעי תשלום</h3>
        {error && <Banner>{error}</Banner>}
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="מספר כרטיס">
              <input className={inputCls} dir="ltr" inputMode="numeric" value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="•••• •••• •••• ••••" />
            </Field>
          </div>
          <Field label="תוקף">
            <input className={inputCls} dir="ltr" value={form.exp} onChange={(e) => set('exp', e.target.value)} placeholder="MM/YY" />
          </Field>
          <Field label="שם בעל הכרטיס">
            <input className={inputCls} value={form.holder} onChange={(e) => set('holder', e.target.value)} />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> שמירת כרטיס
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-ink-light">* הנתונים נשמרים מקומית להדמיה בלבד — לא מתבצע חיוב ולא נשמר מספר הכרטיס המלא.</p>
      </Card>
    </div>
  )
}

// ---- Newsletter ----
function NewsletterTab() {
  const { user, updateProfile } = useAuth()
  const subscribed = !!user.newsletter

  const toggle = () => {
    const next = !subscribed
    updateProfile({ newsletter: next })
    try {
      const list = JSON.parse(localStorage.getItem(NEWSLETTER_KEY)) || []
      const set = new Set(list)
      if (next) set.add(user.email)
      else set.delete(user.email)
      localStorage.setItem(NEWSLETTER_KEY, JSON.stringify([...set]))
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${subscribed ? 'bg-brand-50 text-brand-600' : 'bg-black/5 text-ink-light'}`}>
          {subscribed ? <BellRing size={26} /> : <BellOff size={26} />}
        </div>
        <h3 className="text-lg font-extrabold text-ink">
          {subscribed ? 'אתם רשומים לניוזלטר' : 'הרשמה לניוזלטר'}
        </h3>
        <p className="max-w-md text-sm text-ink-light">
          {subscribed
            ? 'תקבלו עדכונים על מבצעים, מוצרים חדשים והטבות ישירות למייל.'
            : 'הישארו מעודכנים — מבצעים, מוצרים חדשים והטבות בלעדיות ישירות למייל שלכם.'}
        </p>
        <button
          onClick={toggle}
          className={`mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition ${
            subscribed
              ? 'border border-black/10 text-ink hover:bg-black/5'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
        >
          {subscribed ? 'ביטול הרשמה' : 'הרשמה לניוזלטר'}
        </button>
      </div>
    </Card>
  )
}

// ---- small helpers ----
function Card({ children }) {
  return <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">{children}</div>
}
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-light">{label}</span>
      {children}
    </label>
  )
}
function Banner({ children }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      <AlertCircle size={16} /> {children}
    </div>
  )
}
function Empty({ icon: Icon, title, hint, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white py-16 text-center">
      <Icon size={40} className="text-black/20" />
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-light">{hint}</p>}
      {children}
    </div>
  )
}
