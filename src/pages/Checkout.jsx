import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Phone, MapPin, CreditCard, Smartphone, Headset, CheckCircle2, ArrowRight, AlertCircle,
} from 'lucide-react'
import { DOMAINS } from '../context/AppContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { sanitizePhone, isValidPhone, luhnValid } from '../utils/validation.js'
import Logo from '../components/Logo.jsx'

// Known payment ids get a matching icon; custom ones fall back to a wallet.
const PAY_ICONS = { credit: CreditCard, bit: Smartphone, representative: Headset }

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { addOrder } = useOrders()
  const { decrementStock } = useCatalogStore()
  const { user, isMasterAdminAccount } = useAuth()
  const { paymentMethods, deliveryMethods } = useSettings()
  const bypass = isMasterAdminAccount
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: '',
    address: '',
    delivery: deliveryMethods[0]?.id || 'pickup',
    payment: paymentMethods[0]?.id || 'credit',
    // mock payment fields
    cardNumber: '',
    cardExp: '',
    cardCvv: '',
    bitPhone: '',
  })
  const [placedOrder, setPlacedOrder] = useState(null)

  const set = (k, v) => {
    const val = k === 'phone' || k === 'bitPhone' ? sanitizePhone(v, bypass) : v
    setForm((f) => ({ ...f, [k]: val }))
  }

  // Empty cart (and no completed order) → nothing to check out.
  if (items.length === 0 && !placedOrder) {
    return (
      <CheckoutShell>
        <div className="rounded-2xl border border-black/5 bg-white p-10 text-center shadow-card">
          <p className="text-lg font-bold text-ink">הסל ריק</p>
          <p className="mt-1 text-sm text-ink-light">הוסיפו מוצרים מהחנות לפני המעבר לתשלום.</p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <ArrowRight size={16} /> חזרה לחנות
          </Link>
        </div>
      </CheckoutShell>
    )
  }

  // Success screen.
  if (placedOrder) {
    return (
      <CheckoutShell>
        <div className="rounded-2xl border border-black/5 bg-white p-10 text-center shadow-card">
          <CheckCircle2 size={56} className="mx-auto text-brand-500" />
          <h2 className="mt-4 text-2xl font-extrabold text-ink">ההזמנה התקבלה!</h2>
          <p className="mt-2 text-ink-light">
            מספר הזמנה <span className="font-bold text-ink">{placedOrder.number}</span>
          </p>
          <p className="mt-1 text-sm text-ink-light">
            פרטי ההזמנה נשמרו ונשלחו לצוות. ניצור איתך קשר בהקדם.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <ArrowRight size={16} /> חזרה לחנות
          </Link>
        </div>
      </CheckoutShell>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    // Validation — fully bypassed for the master admin account.
    if (!bypass) {
      if (!form.name.trim()) return setError('שם מלא הוא שדה חובה.')
      if (!isValidPhone(form.phone)) return setError('יש להזין מספר טלפון תקין (10 ספרות).')
      if (form.delivery === 'delivery' && !form.address.trim()) return setError('יש להזין כתובת למשלוח.')
      if (form.payment === 'credit' && !luhnValid(form.cardNumber)) {
        return setError('מספר כרטיס האשראי אינו תקין.')
      }
    }
    setError('')
    const order = addOrder({
      customer: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        email: user?.email || null,
      },
      delivery: form.delivery,
      payment: form.payment,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        listPrice: i.listPrice ?? i.price,
        qty: i.qty,
        color: i.color || '',
      })),
      total: subtotal,
    })

    // Inventory: reduce stock for each purchased STORE product.
    items.forEach((i) => decrementStock(DOMAINS.STORE, i.id, i.qty))

    clear()
    setPlacedOrder(order)
    window.scrollTo(0, 0)
  }

  return (
    <CheckoutShell>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Details */}
        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {/* Customer details */}
          <Section title="פרטי לקוח">
            <Field icon={User} label="שם מלא" required value={form.name} onChange={(v) => set('name', v)} />
            <Field
              icon={Phone}
              label="טלפון"
              type="tel"
              required
              value={form.phone}
              onChange={(v) => set('phone', v)}
            />
            <Field
              icon={MapPin}
              label="כתובת"
              required={form.delivery === 'delivery'}
              value={form.address}
              onChange={(v) => set('address', v)}
            />
          </Section>

          {/* Delivery */}
          <Section title="אופן קבלה">
            <div className="grid gap-3 sm:grid-cols-2">
              {deliveryMethods.map((d) => (
                <Choice
                  key={d.id}
                  active={form.delivery === d.id}
                  onClick={() => set('delivery', d.id)}
                  title={d.label}
                  hint={d.hint}
                />
              ))}
            </div>
          </Section>

          {/* Payment */}
          <Section title="אמצעי תשלום">
            <div className="grid gap-3 sm:grid-cols-3">
              {paymentMethods.map((p) => {
                const Icon = PAY_ICONS[p.id] || CreditCard
                return (
                  <Choice
                    key={p.id}
                    active={form.payment === p.id}
                    onClick={() => set('payment', p.id)}
                    title={p.label}
                    hint={p.hint}
                    Icon={Icon}
                  />
                )
              })}
            </div>

            {/* Mock payment details */}
            {form.payment === 'credit' && (
              <div className="mt-4 grid gap-3 rounded-xl bg-brand-50/60 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="מספר כרטיס" placeholder="•••• •••• •••• ••••" value={form.cardNumber} onChange={(v) => set('cardNumber', v)} />
                </div>
                <Field label="תוקף" placeholder="MM/YY" value={form.cardExp} onChange={(v) => set('cardExp', v)} />
                <Field label="CVV" placeholder="•••" value={form.cardCvv} onChange={(v) => set('cardCvv', v)} />
                <p className="sm:col-span-2 text-xs text-ink-light">* תשלום אשראי בהדמיה — לא מתבצע חיוב אמיתי.</p>
              </div>
            )}
            {form.payment === 'bit' && (
              <div className="mt-4 rounded-xl bg-brand-50/60 p-4">
                <Field label="טלפון לחיוב ב-Bit" type="tel" value={form.bitPhone} onChange={(v) => set('bitPhone', v)} />
                <p className="mt-2 text-xs text-ink-light">* תשלום Bit בהדמיה — תישלח בקשת תשלום פיקטיבית.</p>
              </div>
            )}
            {form.payment === 'representative' && (
              <p className="mt-4 rounded-xl bg-brand-50/60 p-4 text-sm text-ink-light">
                נציג שלנו יחזור אליך טלפונית לתיאום אופן ומועד התשלום.
              </p>
            )}
          </Section>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-black/5 bg-white p-5 shadow-card lg:sticky lg:top-6">
          <h3 className="text-lg font-extrabold text-ink">סיכום הזמנה</h3>
          <ul className="mt-4 space-y-2">
            {items.map((i) => (
              <li key={i.lineId || i.id} className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-light">
                  {i.color && (
                    <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: i.color }} />
                  )}
                  {i.name} × {i.qty}
                  {i.listPrice > i.price && (
                    <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      {Math.round((1 - i.price / i.listPrice) * 100)}% הנחה
                    </span>
                  )}
                </span>
                <span className="font-semibold text-ink">₪{i.price * i.qty}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-black/5 pt-4">
            <span className="font-semibold text-ink-light">סה״כ לתשלום</span>
            <span className="text-2xl font-extrabold text-ink">₪{subtotal}</span>
          </div>
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            אישור והזמנה
          </button>
          <Link to="/" className="mt-3 block text-center text-sm text-ink-light hover:text-brand-600">
            המשך קנייה
          </Link>
        </aside>
      </form>
    </CheckoutShell>
  )
}

// ---- Layout & field helpers ----------------------------------------------

function CheckoutShell({ children }) {
  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo className="h-11" />
          <Link to="/" className="flex items-center gap-1 text-sm font-semibold text-ink hover:text-brand-600">
            <ArrowRight size={16} /> חזרה לחנות
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-extrabold text-ink">תשלום</h1>
        {children}
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-lg font-extrabold text-ink">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ icon: Icon, label, type = 'text', value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-light">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-black/10 bg-white py-2.5 ${
            Icon ? 'pr-9 pl-3' : 'px-3'
          } text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30`}
          {...props}
        />
      </div>
    </label>
  )
}

function Choice({ active, onClick, title, hint, Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition ${
        active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-black/10 hover:border-brand-300'
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
        {Icon && <Icon size={16} className="text-brand-500" />} {title}
      </span>
      {hint && <span className="text-xs text-ink-light">{hint}</span>}
    </button>
  )
}
