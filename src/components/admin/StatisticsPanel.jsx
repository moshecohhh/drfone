import { useState, useMemo } from 'react'
import {
  ArrowRight, TrendingUp, TrendingDown, Banknote, ShoppingBag, Users, Package,
  CreditCard, BarChart3, Boxes, Trophy, LayoutGrid, CalendarDays,
} from 'lucide-react'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useLab } from '../../context/LabContext.jsx'
import { DOMAINS } from '../../context/AppContext.jsx'

const DAY = 86400000
const PALETTE = ['#108c8b', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#6366f1', '#ec4899']
const STATUS_COLORS = { new: '#3b82f6', processing: '#f59e0b', shipped: '#a855f7', completed: '#108c8b' }
const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const RANGES = [
  { id: 7, label: '7 ימים' },
  { id: 30, label: '30 יום' },
  { id: 90, label: '90 יום' },
  { id: 'all', label: 'הכל' },
]
const ils = (n) => `₪${Math.round(n).toLocaleString()}`
const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }

// Israeli VAT (18%); on VAT-inclusive prices the VAT owed on a sale is the
// margin times this fraction (the input VAT on the purchase is reclaimed).
const VAT_RATE = 0.18
const VAT_FRACTION = VAT_RATE / (1 + VAT_RATE)
// Clearing (סליקה) fee as a % of the transaction, per number of payments.
const CLEARING_RATES = { 1: 0.65, 2: 0.576, 3: 0.864, 4: 1.151 }

// A comprehensive statistics dashboard built entirely from the live data
// (orders, catalog, customers) — no external charting dependency.
export default function StatisticsPanel({ onBack }) {
  const { orders } = useOrders()
  const { store, getCategories, getCost } = useCatalogStore()
  const { orderStatuses, paymentLabel } = useSettings()
  const { customers } = useLab()
  const [range, setRange] = useState(30)
  const [payments, setPayments] = useState(1) // assumed payment count for clearing fee
  const [customFrom, setCustomFrom] = useState('') // custom date-range (overrides range)
  const [customTo, setCustomTo] = useState('')
  const clearingPct = (CLEARING_RATES[payments] || CLEARING_RATES[1]) / 100

  const stats = useMemo(() => {
    const now = Date.now()
    const custom = !!(customFrom && customTo)
    const days = custom ? null : range === 'all' ? null : range
    const ts = (o) => new Date(o.createdAt).getTime()
    const fromTs = custom ? new Date(customFrom).getTime() : days == null ? 0 : now - days * DAY
    const toTs = custom ? new Date(customTo).getTime() + DAY : Infinity
    const prevStart = !custom && days != null ? now - 2 * days * DAY : null

    const cur = orders.filter((o) => ts(o) >= fromTs && ts(o) <= toTs)
    const prev = prevStart == null ? [] : orders.filter((o) => ts(o) >= prevStart && ts(o) < fromTs)

    const sumTotal = (arr) => arr.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const sumItems = (arr) => arr.reduce((s, o) => s + (o.items || []).reduce((q, it) => q + (Number(it.qty) || 0), 0), 0)
    const uniq = (arr) => new Set(arr.map((o) => o.customer?.phone || o.customer?.email || o.customer?.name)).size

    const revenue = sumTotal(cur)
    const prevRevenue = sumTotal(prev)
    const ordersN = cur.length
    const itemsSold = sumItems(cur)
    const aov = ordersN ? revenue / ordersN : 0
    const prevAov = prev.length ? prevRevenue / prev.length : 0
    const buyers = uniq(cur)

    const trend = (c, p) => (p > 0 ? Math.round(((c - p) / p) * 100) : c > 0 ? 100 : null)

    // ---- Revenue over time (daily buckets; monthly when "all") ----
    let buckets = []
    const dailyDays = custom ? Math.min(120, Math.max(1, Math.round((toTs - fromTs) / DAY))) : days
    const anchorTs = custom ? toTs - 1 : now
    if (dailyDays != null) {
      for (let i = dailyDays - 1; i >= 0; i--) {
        const d0 = startOfDay(anchorTs - i * DAY)
        const dOrders = cur.filter((o) => { const t = ts(o); return t >= d0 && t < d0 + DAY })
        buckets.push({ label: new Date(d0).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }), revenue: sumTotal(dOrders), orders: dOrders.length })
      }
    } else {
      const byMonth = {}
      cur.forEach((o) => {
        const d = new Date(o.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!byMonth[key]) byMonth[key] = { label: d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }), revenue: 0, orders: 0 }
        byMonth[key].revenue += Number(o.total) || 0
        byMonth[key].orders += 1
      })
      buckets = Object.keys(byMonth).sort().map((k) => byMonth[k])
    }

    // ---- Top products + revenue by category (from order items) ----
    const storeById = Object.fromEntries(store.map((p) => [p.id, p]))
    const catLabels = Object.fromEntries(getCategories(DOMAINS.STORE).map((c) => [c.id, c.label]))
    const prodMap = {}
    const catMap = {}
    let totalCost = 0 // sum of product costs for the items sold (admin-only)
    cur.forEach((o) => (o.items || []).forEach((it) => {
      const key = it.id || it.name
      const qty = Number(it.qty) || 0
      const lineRev = (Number(it.price) || 0) * qty
      if (!prodMap[key]) prodMap[key] = { name: it.name, qty: 0, revenue: 0 }
      prodMap[key].qty += qty
      prodMap[key].revenue += lineRev
      totalCost += (Number(getCost(it.id)) || 0) * qty
      const cat = storeById[it.id]?.category
      const catLabel = catLabels[cat] || 'אחר'
      catMap[catLabel] = (catMap[catLabel] || 0) + lineRev
    }))
    const profit = revenue - totalCost // gross profit (after product cost)
    const vat = Math.max(0, profit) * VAT_FRACTION // VAT owed on the margin
    const clearing = revenue * clearingPct // card-clearing fee
    const netProfit = profit - vat - clearing // final profit after VAT + clearing
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
    const byCategory = Object.entries(catMap).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

    // ---- Status / payment / weekday breakdowns ----
    const byStatus = orderStatuses
      .map((s, i) => ({ label: s.label, value: cur.filter((o) => o.status === s.id).length, color: STATUS_COLORS[s.id] || PALETTE[i % PALETTE.length] }))
      .filter((s) => s.value > 0)
    const payMap = {}
    cur.forEach((o) => { const l = paymentLabel(o.payment); payMap[l] = (payMap[l] || 0) + (Number(o.total) || 0) })
    const byPayment = Object.entries(payMap).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] })).sort((a, b) => b.value - a.value)
    const weekday = WEEKDAYS.map((label, d) => ({ label, value: cur.filter((o) => new Date(o.createdAt).getDay() === d).reduce((s, o) => s + (Number(o.total) || 0), 0) }))

    // ---- Inventory ----
    const inventoryValue = store.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0)
    const outOfStock = store.filter((p) => (Number(p.stock) || 0) === 0).length
    const lowStock = store.filter((p) => { const k = Number(p.stock) || 0; return k > 0 && k <= 3 }).length

    return {
      revenue, ordersN, itemsSold, aov, buyers,
      profit, totalCost, vat, clearing, netProfit,
      margin: revenue > 0 ? Math.round((profit / revenue) * 100) : null,
      netMargin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : null,
      trendRevenue: trend(revenue, prevRevenue), trendOrders: trend(ordersN, prev.length), trendAov: trend(aov, prevAov),
      buckets, topProducts, byCategory, byStatus, byPayment, weekday,
      inventoryValue, outOfStock, lowStock, productCount: store.length,
      hasData: cur.length > 0,
    }
  }, [orders, store, range, customFrom, customTo, clearingPct, orderStatuses, paymentLabel, getCategories, getCost])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5">
              <ArrowRight size={16} /> חזרה
            </button>
          )}
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            <BarChart3 size={22} className="text-brand-500" /> מערכת סטטיסטיקה
          </h2>
        </div>
        <div className="inline-flex rounded-full bg-white p-1 shadow-card">
          {RANGES.map((r) => {
            const active = !customFrom && !customTo && range === r.id
            return (
              <button
                key={r.id}
                onClick={() => { setRange(r.id); setCustomFrom(''); setCustomTo('') }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${active ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-light hover:text-ink'}`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom date range + clearing-fee assumption */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-card">
        <label className="text-xs font-semibold text-ink-light">
          מתאריך
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="mt-1 block rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-500" />
        </label>
        <label className="text-xs font-semibold text-ink-light">
          עד תאריך
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="mt-1 block rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-500" />
        </label>
        {(customFrom || customTo) && (
          <button onClick={() => { setCustomFrom(''); setCustomTo('') }} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink-light hover:bg-black/5">
            ניקוי טווח
          </button>
        )}
        <label className="ms-auto text-xs font-semibold text-ink-light">
          עלות סליקה לפי
          <select value={payments} onChange={(e) => setPayments(Number(e.target.value))} className="mt-1 block rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-500">
            <option value={1}>תשלום אחד ({CLEARING_RATES[1]}%)</option>
            <option value={2}>2 תשלומים ({CLEARING_RATES[2]}%)</option>
            <option value={3}>3 תשלומים ({CLEARING_RATES[3]}%)</option>
            <option value={4}>4 תשלומים ({CLEARING_RATES[4]}%)</option>
          </select>
        </label>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi Icon={Banknote} label="הכנסות" value={ils(stats.revenue)} trend={stats.trendRevenue} tint="bg-brand-50 text-brand-600" />
        <Kpi Icon={TrendingUp} label={`רווח נקי סופי${stats.netMargin != null ? ` · ${stats.netMargin}%` : ''}`} value={ils(stats.netProfit)} tint="bg-emerald-50 text-emerald-600" />
        <Kpi Icon={ShoppingBag} label="הזמנות" value={stats.ordersN} trend={stats.trendOrders} tint="bg-blue-50 text-blue-600" />
        <Kpi Icon={BarChart3} label="ממוצע להזמנה" value={ils(stats.aov)} trend={stats.trendAov} tint="bg-violet-50 text-violet-600" />
        <Kpi Icon={Boxes} label="פריטים שנמכרו" value={stats.itemsSold} tint="bg-amber-50 text-amber-600" />
        <Kpi Icon={Users} label="לקוחות בתקופה" value={stats.buyers} tint="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Profitability breakdown */}
      <Card title="פירוט רווחיות" Icon={Banknote}>
        <div className="space-y-1.5">
          <ProfitRow label="הכנסות (כולל מע״מ)" value={ils(stats.revenue)} />
          <ProfitRow label="עלות המוצרים" value={`−${ils(stats.totalCost)}`} muted />
          <ProfitRow label="רווח גולמי" value={ils(stats.profit)} bold />
          <div className="my-2 border-t border-black/5" />
          <ProfitRow label={`מע״מ לתשלום (${Math.round(VAT_RATE * 100)}% על הרווח)`} value={`−${ils(stats.vat)}`} muted />
          <ProfitRow label={`עלות סליקה (${CLEARING_RATES[payments]}%)`} value={`−${ils(stats.clearing)}`} muted />
          <div className="my-2 border-t border-black/5" />
          <ProfitRow label="רווח נקי סופי" value={ils(stats.netProfit)} bold tone="emerald" />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-light">
          המע״מ מחושב על פער הרווח (יש לך זיכוי על המע״מ בחשבונית הרכישה). עלות הסליקה לפי מספר התשלומים שבחרת למעלה.
        </p>
      </Card>

      {/* Revenue trend */}
      <Card title="מגמת הכנסות" Icon={TrendingUp}>
        {stats.hasData ? <AreaChart buckets={stats.buckets} /> : <Empty />}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Orders by status */}
        <Card title="הזמנות לפי סטטוס" Icon={LayoutGrid}>
          {stats.byStatus.length ? (
            <div className="flex items-center gap-5">
              <Donut slices={stats.byStatus} total={stats.byStatus.reduce((s, x) => s + x.value, 0)} />
              <ul className="space-y-1.5">
                {stats.byStatus.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-ink-light">{s.label}</span>
                    <span className="font-bold text-ink">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <Empty />}
        </Card>

        {/* Revenue by weekday */}
        <Card title="הכנסות לפי יום בשבוע" Icon={CalendarDays}>
          {stats.hasData ? <WeekdayBars data={stats.weekday} /> : <Empty />}
        </Card>

        {/* Top products */}
        <Card title="מוצרים מובילים (לפי הכנסה)" Icon={Trophy}>
          {stats.topProducts.length ? (
            <BarList items={stats.topProducts.map((p) => ({ label: p.name, value: p.revenue, sub: `${p.qty} יח׳` }))} format={ils} />
          ) : <Empty />}
        </Card>

        {/* Revenue by category */}
        <Card title="הכנסות לפי קטגוריה" Icon={LayoutGrid}>
          {stats.byCategory.length ? <BarList items={stats.byCategory} format={ils} /> : <Empty />}
        </Card>

        {/* Payment methods */}
        <Card title="הכנסות לפי אמצעי תשלום" Icon={CreditCard}>
          {stats.byPayment.length ? <BarList items={stats.byPayment} format={ils} /> : <Empty />}
        </Card>

        {/* Inventory */}
        <Card title="מלאי" Icon={Package}>
          <div className="grid grid-cols-2 gap-3">
            <Mini label="שווי מלאי" value={ils(stats.inventoryValue)} />
            <Mini label="מוצרים" value={stats.productCount} />
            <Mini label="מלאי נמוך" value={stats.lowStock} tone="amber" />
            <Mini label="אזלו מהמלאי" value={stats.outOfStock} tone="red" />
          </div>
        </Card>
      </div>
    </div>
  )
}

// ---- KPI card with trend chip ----
function Kpi({ Icon, label, value, trend, tint }) {
  const up = trend != null && trend >= 0
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}><Icon size={20} /></span>
        {trend != null && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-sm text-ink-light">{label}</p>
    </div>
  )
}

// ---- SVG area chart ----
function AreaChart({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.revenue))
  const n = buckets.length
  const x = (i) => (n <= 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v) => 38 - (v / max) * 34
  const line = buckets.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(b.revenue).toFixed(2)}`).join(' ')
  const area = `${line} L100 40 L0 40 Z`
  const labels = [buckets[0], buckets[Math.floor(n / 2)], buckets[n - 1]].filter(Boolean)
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-44 w-full">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#108c8b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#108c8b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#revGrad)" />
        <path d={line} fill="none" stroke="#108c8b" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-ink-light">
        {labels.map((b, i) => <span key={i}>{b.label}</span>)}
      </div>
    </div>
  )
}

// ---- Vertical weekday bars ----
function WeekdayBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-brand-500/80 transition-all" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 4 : 0 }} title={ils(d.value)} />
          </div>
          <span className="text-[11px] text-ink-light">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ---- Horizontal bar list ----
function BarList({ items, format = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-ink">{it.label}</span>
            <span className="shrink-0 font-bold text-ink">{format(it.value)}{it.sub ? <span className="mr-1 text-xs font-normal text-ink-light"> · {it.sub}</span> : null}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: it.color || '#108c8b' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---- SVG donut ----
function Donut({ slices, total, size = 128, thickness = 22 }) {
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-black/5" />
          {slices.map((s, i) => {
            const len = (s.value / total) * C
            const seg = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />
            acc += len
            return seg
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-ink">{total}</span>
        <span className="text-[11px] text-ink-light">הזמנות</span>
      </div>
    </div>
  )
}

function Card({ title, Icon, children }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
      <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold text-ink">
        {Icon && <Icon size={18} className="text-brand-500" />} {title}
      </h3>
      {children}
    </div>
  )
}
function Mini({ label, value, tone }) {
  const tint = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-ink'
  return (
    <div className="rounded-xl bg-brand-50/50 p-3 text-center">
      <p className={`text-lg font-extrabold ${tint}`}>{value}</p>
      <p className="text-[11px] text-ink-light">{label}</p>
    </div>
  )
}
function ProfitRow({ label, value, bold, muted, tone }) {
  const valueCls = tone === 'emerald' ? 'text-emerald-600' : muted ? 'text-ink-light' : 'text-ink'
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className={bold ? 'font-bold text-ink' : 'text-ink-light'}>{label}</span>
      <span className={`${bold ? 'text-base font-extrabold' : 'font-semibold'} ${valueCls}`}>{value}</span>
    </div>
  )
}
function Empty() {
  return <p className="py-6 text-center text-sm text-ink-light">אין נתונים בתקופה שנבחרה.</p>
}
