import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import {
  ArrowRight, LogOut, ShoppingBag, UserCog, CreditCard, Mail, Package,
  Plus, Trash2, Check, AlertCircle, BellRing, BellOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { sanitizePhone, isValidPhone, luhnValid } from '../utils/validation.js'
import Logo from '../components/Logo.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

const NEWSLETTER_KEY = 'drfone_newsletter'
const inputCls =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

const TABS = [
  { id: 'orders', label: 'ההזמנות שלי', Icon: ShoppingBag },
  { id: 'details', label: 'פרטים אישיים', Icon: UserCog },
  { id: 'payments', label: 'אמצעי תשלום', Icon: CreditCard },
  { id: 'newsletter', label: 'ניוזלטר', Icon: Mail },
]

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState('orders')

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
          {tab === 'details' && <DetailsTab />}
          {tab === 'payments' && <PaymentsTab />}
          {tab === 'newsletter' && <NewsletterTab />}
        </div>
      </main>
    </div>
  )
}

// ---- Orders ----
function OrdersTab({ email }) {
  const { orders } = useOrders()
  const { orderStatusMeta } = useSettings()
  const mine = orders.filter((o) => o.customer?.email?.toLowerCase() === String(email).toLowerCase())

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
      {mine.map((o) => {
        const meta = orderStatusMeta(o.status)
        return (
          <div key={o.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-ink">{o.number}</span>
                <span className="mr-2 text-xs text-ink-light">{fmtDate(o.createdAt)}</span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.color}`}>{meta.label}</span>
            </div>
            <ul className="mt-3 space-y-1 border-t border-black/5 pt-3 text-sm">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span className="text-ink-light">{it.name} × {it.qty}</span>
                  <span className="font-semibold text-ink">₪{it.price * it.qty}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-black/5 pt-3">
              <span className="text-sm font-semibold text-ink-light">סה״כ</span>
              <span className="text-lg font-extrabold text-ink">₪{o.total}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Personal details ----
function DetailsTab() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', address: user.address || '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: k === 'phone' ? sanitizePhone(v) : v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('יש להזין שם.')
    if (form.phone && !isValidPhone(form.phone)) return setError('מספר טלפון חייב להכיל 10 ספרות.')
    setError('')
    updateProfile({ name: form.name.trim(), phone: form.phone, address: form.address })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card>
      {error && <Banner>{error}</Banner>}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="שם מלא">
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="אימייל (לא ניתן לשינוי)">
          <input className={`${inputCls} bg-black/5`} dir="ltr" value={user.email} disabled />
        </Field>
        <Field label="טלפון">
          <input className={inputCls} dir="ltr" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0500000000" />
        </Field>
        <Field label="כתובת">
          <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            <Check size={16} /> {saved ? 'נשמר' : 'שמירת פרטים'}
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
