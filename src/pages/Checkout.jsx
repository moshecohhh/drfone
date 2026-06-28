import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Phone, Mail, MapPin, Home, Hash, CreditCard, Smartphone, Headset,
  CheckCircle2, ArrowRight, AlertCircle, Truck, ShoppingBag, MessageSquare,
} from 'lucide-react'
import { DOMAINS } from '../context/AppContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { sanitizePhone, isValidMobileIL, luhnValid, emailIssue } from '../utils/validation.js'
import Logo from '../components/Logo.jsx'
import CitySelect from '../components/CitySelect.jsx'

// Known payment ids get a matching icon; custom ones fall back to a wallet.
const PAY_ICONS = { credit: CreditCard, bit: Smartphone, representative: Headset }
const money = (n) => '₪' + Number(n || 0).toLocaleString('he-IL')

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { addOrder, orders } = useOrders()
  const { decrementStock } = useCatalogStore()
  const { user, isMasterAdminAccount } = useAuth()
  const { paymentMethods, deliveryMethods } = useSettings()
  const bypass = isMasterAdminAccount
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    city: '',
    street: '',
    house: '',
    apartment: '',
    notes: '',
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
    // Phone fields behave like the registration page: digits only, capped at 10.
    const val = k === 'phone' || k === 'bitPhone' ? sanitizePhone(v) : v
    setForm((f) => ({ ...f, [k]: val }))
  }

  // Saved delivery addresses (the customer can pick one at checkout).
  const savedAddresses = Array.isArray(user?.addresses) ? user.addresses : []
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const applyAddress = (a) =>
    setForm((f) => ({ ...f, city: a.city || '', street: a.street || '', house: a.house || '', apartment: a.apartment || '' }))

  // Pre-fill a signed-in customer's details. Address priority: the chosen/default
  // saved address → legacy single default → most recent order. Runs once and only
  // fills fields the customer hasn't already typed, so it never overwrites input.
  const lastOrder = user
    ? orders.find((o) => o.customer?.email?.toLowerCase() === String(user.email || '').toLowerCase())
    : null
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !user) return
    const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null
    const addr = def || user.addressParts || {}
    const c = lastOrder?.customer || {}
    const src = {
      name: user.name || c.name || '',
      phone: user.phone || c.phone || '',
      city: addr.city || c.city || '',
      street: addr.street || c.street || '',
      house: addr.house || c.house || '',
      apartment: addr.apartment || c.apartment || '',
    }
    if (!src.name && !src.phone && !src.city && !src.street) return // data not ready yet
    prefilled.current = true
    if (def) setSelectedAddressId(def.id)
    const savedDelivery = lastOrder && deliveryMethods.some((d) => d.id === lastOrder.delivery) ? lastOrder.delivery : null
    setForm((f) => ({
      ...f,
      name: f.name || src.name,
      phone: f.phone || src.phone,
      city: f.city || src.city,
      street: f.street || src.street,
      house: f.house || src.house,
      apartment: f.apartment || src.apartment,
      ...(savedDelivery ? { delivery: savedDelivery } : {}),
    }))
  }, [user, lastOrder, deliveryMethods])

  // The selected delivery method drives the price and whether an address is
  // needed (self-collect options don't ship anywhere).
  const selectedDelivery = deliveryMethods.find((d) => d.id === form.delivery) || deliveryMethods[0]
  const isPickup = !!selectedDelivery?.pickup || selectedDelivery?.id === 'pickup'
  const deliveryPrice = Number(selectedDelivery?.price) || 0
  const total = subtotal + deliveryPrice

  // Live phone validation (same rule/message as the registration page).
  const phoneErr =
    form.phone.trim() && !isValidMobileIL(form.phone)
      ? 'מספר נייד חייב להתחיל ב-05 ולהכיל 10 ספרות.'
      : null

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
            מייל אישור נשלח אליך, ופרטי ההזמנה הועברו לצוות. ניצור איתך קשר בהקדם.
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
      // Guests must supply a valid email — it's where the invoice and the
      // order-tracking link are sent.
      if (!user) {
        const eErr = emailIssue(form.email)
        if (eErr) return setError(eErr)
      }
      if (!isValidMobileIL(form.phone)) return setError('יש להזין מספר נייד תקין (מתחיל ב-05, 10 ספרות).')
      if (!isPickup) {
        if (!form.city.trim()) return setError('יש לבחור עיר מהרשימה.')
        if (!form.street.trim()) return setError('יש להזין שם רחוב.')
        if (!form.house.trim()) return setError('יש להזין מספר בית.')
      }
      if (form.payment === 'credit' && !luhnValid(form.cardNumber)) {
        return setError('מספר כרטיס האשראי אינו תקין.')
      }
    }
    setError('')

    // Compose a single readable address string (empty for self-collect).
    const address = isPickup
      ? ''
      : `${form.street.trim()} ${form.house.trim()}${form.apartment.trim() ? `, ${form.apartment.trim()}` : ''}, ${form.city.trim()}`

    const order = addOrder({
      customer: {
        name: form.name,
        phone: form.phone,
        address,
        city: isPickup ? '' : form.city.trim(),
        street: isPickup ? '' : form.street.trim(),
        house: isPickup ? '' : form.house.trim(),
        apartment: isPickup ? '' : form.apartment.trim(),
        email: user?.email || form.email.trim() || null,
      },
      delivery: form.delivery,
      deliveryPrice,
      payment: form.payment,
      notes: form.notes.trim(),
      items: items.map((i) => ({
        id: i.id,
        lineId: i.lineId,
        name: i.name,
        image: i.image || '',
        price: i.price,
        listPrice: i.listPrice ?? i.price,
        qty: i.qty,
        color: i.color || '',
        // Chosen product-page option fields (version / storage / upgrades…) so
        // the admin sees exactly what the customer ordered.
        selections: Array.isArray(i.selections) ? i.selections : [],
      })),
      total,
    })

    // Inventory: reduce stock for each purchased STORE product.
    items.forEach((i) => decrementStock(DOMAINS.STORE, i.id, i.qty))

    clear()
    setPlacedOrder(order)
    window.scrollTo(0, 0)
  }

  return (
    <CheckoutShell>
      <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Details */}
        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Customer details */}
          <Section icon={User} title="פרטים אישיים">
            <Field
              icon={User}
              id="co-name"
              name="name"
              autoComplete="name"
              label="שם מלא"
              required
              value={form.name}
              onChange={(v) => set('name', v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field
                  icon={Phone}
                  id="co-phone"
                  name="tel"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="tel"
                  label="טלפון נייד"
                  placeholder="05XXXXXXXX"
                  required
                  value={form.phone}
                  onChange={(v) => set('phone', v)}
                  invalid={!!phoneErr}
                />
                {phoneErr && <p className="mt-1 text-xs font-medium text-red-600">{phoneErr}</p>}
              </div>
              {/* Logged-in users already have an email on file. */}
              {!user ? (
                <div>
                  <Field
                    icon={Mail}
                    id="co-email"
                    name="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    label="אימייל (לאישור ההזמנה)"
                    placeholder="name@email.com"
                    required
                    value={form.email}
                    onChange={(v) => set('email', v)}
                  />
                  {form.email.trim() && !form.email.includes('@') && (
                    <button
                      type="button"
                      onClick={() => set('email', `${form.email}@gmail.com`)}
                      className="mt-1 text-xs font-medium text-brand-600 hover:underline"
                    >
                      הוספת ‎@gmail.com‎
                    </button>
                  )}
                  {form.email.trim() && emailIssue(form.email) && (
                    <p className="mt-1 text-xs font-medium text-red-600">{emailIssue(form.email)}</p>
                  )}
                </div>
              ) : (
                <Field icon={Mail} id="co-email" label="אימייל" dir="ltr" value={user.email || ''} onChange={() => {}} readOnly disabled />
              )}
            </div>
          </Section>

          {/* Delivery */}
          <Section icon={Truck} title="אופן קבלה">
            <div className="grid gap-3 sm:grid-cols-2">
              {deliveryMethods.map((d) => (
                <Choice
                  key={d.id}
                  active={form.delivery === d.id}
                  onClick={() => set('delivery', d.id)}
                  title={d.label}
                  hint={d.hint}
                  price={Number(d.price) || 0}
                />
              ))}
            </div>

            {/* Shipping address — only for non-pickup methods. */}
            {!isPickup && (
              <div className="mt-4 grid gap-4 rounded-xl bg-brand-50/50 p-4 sm:grid-cols-2">
                {/* Saved-address picker (when the customer has any saved). */}
                {savedAddresses.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-ink-light">בחירת כתובת שמורה</span>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { setSelectedAddressId(a.id); applyAddress(a) }}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            selectedAddressId === a.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 bg-white text-ink hover:border-brand-300'
                          }`}
                        >
                          {a.street} {a.house}, {a.city}{a.isDefault ? ' ⭐' : ''}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setSelectedAddressId('new'); setForm((f) => ({ ...f, city: '', street: '', house: '', apartment: '' })) }}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          selectedAddressId === 'new' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 bg-white text-ink hover:border-brand-300'
                        }`}
                      >
                        + כתובת אחרת
                      </button>
                    </div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-ink-light">עיר <Req /></span>
                  <CitySelect id="co-city" value={form.city} onChange={(v) => set('city', v)} />
                </div>
                <Field icon={MapPin} id="co-street" name="address-line1" autoComplete="address-line1" label="רחוב" required value={form.street} onChange={(v) => set('street', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={Hash} id="co-house" label="מס׳ בית" required value={form.house} onChange={(v) => set('house', v)} />
                  <Field icon={Home} id="co-apt" label="דירה / כניסה" value={form.apartment} onChange={(v) => set('apartment', v)} />
                </div>
              </div>
            )}

            {/* Pickup details */}
            {isPickup && selectedDelivery?.hint && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50/60 px-4 py-3 text-sm text-ink-light">
                <MapPin size={15} className="shrink-0 text-brand-500" /> {selectedDelivery.hint}
              </p>
            )}

            <label className="mt-4 block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-light">
                <MessageSquare size={13} /> הערות להזמנה (אופציונלי)
              </span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="לדוגמה: קומה 3, להתקשר לפני הגעה…"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
          </Section>

          {/* Payment */}
          <Section icon={CreditCard} title="אמצעי תשלום">
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
                  <Field label="מספר כרטיס" name="cc-number" autoComplete="cc-number" inputMode="numeric" placeholder="•••• •••• •••• ••••" value={form.cardNumber} onChange={(v) => set('cardNumber', v)} />
                </div>
                <Field label="תוקף" name="cc-exp" autoComplete="cc-exp" placeholder="MM/YY" value={form.cardExp} onChange={(v) => set('cardExp', v)} />
                <Field label="CVV" name="cc-csc" autoComplete="cc-csc" inputMode="numeric" placeholder="•••" value={form.cardCvv} onChange={(v) => set('cardCvv', v)} />
                <p className="text-xs text-ink-light sm:col-span-2">* תשלום אשראי בהדמיה — לא מתבצע חיוב אמיתי.</p>
              </div>
            )}
            {form.payment === 'bit' && (
              <div className="mt-4 rounded-xl bg-brand-50/60 p-4">
                <Field label="טלפון לחיוב ב-Bit" type="tel" dir="ltr" inputMode="numeric" value={form.bitPhone} onChange={(v) => set('bitPhone', v)} />
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
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <ShoppingBag size={18} className="text-brand-500" /> סיכום הזמנה
          </h3>
          <ul className="mt-4 space-y-2">
            {items.map((i) => (
              <li key={i.lineId || i.id} className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-ink-light">
                  {i.color && (
                    <span className="h-3 w-3 shrink-0 rounded-full border border-black/15" style={{ background: i.color }} />
                  )}
                  <span>{i.name} × {i.qty}</span>
                  {i.listPrice > i.price && (
                    <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      {Math.round((1 - i.price / i.listPrice) * 100)}% הנחה
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-ink">{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-black/5 pt-4 text-sm">
            <div className="flex justify-between text-ink-light">
              <span>סכום ביניים</span>
              <span className="font-semibold text-ink">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-light">
              <span>{selectedDelivery?.label || 'משלוח'}</span>
              <span className="font-semibold text-ink">{deliveryPrice > 0 ? money(deliveryPrice) : 'חינם'}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
            <span className="font-bold text-ink">סה״כ לתשלום</span>
            <span className="text-2xl font-extrabold text-ink">{money(total)}</span>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 active:scale-[.99]"
          >
            אישור ושליחת הזמנה
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
        <h1 className="mb-6 text-2xl font-extrabold text-ink">השלמת הזמנה</h1>
        {children}
      </main>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-ink">
        {Icon && <Icon size={18} className="text-brand-500" />} {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

const Req = () => <span className="font-bold text-red-500">*</span>

function Field({ icon: Icon, id, label, type = 'text', value, onChange, invalid = false, required = false, disabled = false, ...props }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-xs font-semibold text-ink-light">
        {label} {required && <Req />}
      </span>
      <div className="relative">
        {Icon && (
          <Icon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border bg-white py-2.5 ${
            Icon ? 'pr-9 pl-3' : 'px-3'
          } text-sm text-ink outline-none transition focus:ring-2 focus:ring-brand-500/30 disabled:bg-black/5 disabled:text-ink-light ${
            invalid ? 'border-red-400 focus:border-red-500' : 'border-black/10 focus:border-brand-500'
          }`}
          {...props}
        />
      </div>
    </label>
  )
}

function Choice({ active, onClick, title, hint, Icon, price }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition ${
        active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-black/10 hover:border-brand-300'
      }`}
    >
      <span className="flex w-full items-center justify-between gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
          {Icon && <Icon size={16} className="text-brand-500" />} {title}
        </span>
        {price != null && (
          <span className={`shrink-0 text-xs font-bold ${price > 0 ? 'text-ink' : 'text-brand-600'}`}>
            {price > 0 ? money(price) : 'חינם'}
          </span>
        )}
      </span>
      {hint && <span className="text-xs text-ink-light">{hint}</span>}
    </button>
  )
}
