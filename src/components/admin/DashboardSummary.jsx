import { useState } from 'react'
import { ShoppingBag, Banknote, AlertTriangle, Package, Users, PieChart, BarChart3, ArrowLeft } from 'lucide-react'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useLab } from '../../context/LabContext.jsx'
import StatisticsPanel from './StatisticsPanel.jsx'

const LOW_STOCK_THRESHOLD = 3
// Colors for the order-status donut (falls back to a palette for custom statuses).
const STATUS_COLORS = { new: '#3b82f6', processing: '#f59e0b', shipped: '#a855f7', completed: '#108c8b' }
const PALETTE = ['#3b82f6', '#f59e0b', '#a855f7', '#108c8b', '#ef4444', '#14b8a6', '#6366f1']
const fmtDate = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

// Overview: the 3 summary cards act as tabs. Clicking one keeps the cards
// visible and shows its details right below — so you can flip between them.
export default function DashboardSummary() {
  const { orders } = useOrders()
  const { store } = useCatalogStore()
  const { orderStatusMeta, orderStatuses } = useSettings()
  const { customers, repairs } = useLab()
  const [view, setView] = useState('orders')
  const [showStats, setShowStats] = useState(false)

  // The full statistics system opens over the overview.
  if (showStats) return <StatisticsPanel onBack={() => setShowStats(false)} />

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const lowStock = store.filter((p) => (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD)
  const avgOrder = totalOrders ? Math.round(totalRevenue / totalOrders) : 0

  // ---- Analytics (percentages) ----
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)

  // Orders grouped by status → donut slices with percentages.
  const statusSlices = orderStatuses
    .map((s, i) => ({
      id: s.id,
      label: s.label,
      value: orders.filter((o) => o.status === s.id).length,
      color: STATUS_COLORS[s.id] || PALETTE[i % PALETTE.length],
    }))
    .filter((s) => s.value > 0)

  const completedPct = pct(orders.filter((o) => o.status === 'completed').length, totalOrders)
  const healthyStockPct = pct(store.filter((p) => (Number(p.stock) || 0) > LOW_STOCK_THRESHOLD).length, store.length)
  const activeCustomersPct = pct(
    customers.filter((c) => repairs.some((r) => r.customerId === c.id)).length,
    customers.length,
  )

  const cards = [
    { id: 'orders', label: 'סך הזמנות', value: totalOrders, Icon: ShoppingBag, tint: 'bg-blue-50 text-blue-600' },
    { id: 'revenue', label: 'הכנסות (הדמיה)', value: `₪${totalRevenue.toLocaleString()}`, Icon: Banknote, tint: 'bg-brand-50 text-brand-600' },
    { id: 'lowstock', label: 'מוצרים במלאי נמוך', value: lowStock.length, Icon: AlertTriangle, tint: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Statistics system entry */}
      <button
        type="button"
        onClick={() => setShowStats(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 p-5 text-right text-white shadow-card transition hover:shadow-card-hover"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <BarChart3 size={26} />
          </span>
          <span>
            <span className="block text-lg font-extrabold">מערכת סטטיסטיקה</span>
            <span className="block text-sm text-white/80">ניתוח מתקדם של הכנסות, מוצרים מובילים, מגמות ומלאי</span>
          </span>
        </span>
        <ArrowLeft size={22} className="transition-transform group-hover:-translate-x-1" />
      </button>

      {/* Cards (stay visible — act as tabs) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const active = view === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setView(c.id)}
              className={`flex items-center gap-4 rounded-2xl border bg-white p-5 text-right shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
                active ? 'border-brand-500 ring-1 ring-brand-500' : 'border-black/5'
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.tint}`}>
                <c.Icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-ink">{c.value}</p>
                <p className="text-sm text-ink-light">{c.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Visual analytics */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold text-ink">
          <PieChart size={18} className="text-brand-500" /> ניתוח גרפי
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Donut: orders by status */}
          <div className="flex items-center gap-5">
            {totalOrders === 0 ? (
              <p className="text-sm text-ink-light">אין נתוני הזמנות להצגה עדיין.</p>
            ) : (
              <>
                <Donut slices={statusSlices} total={totalOrders} />
                <ul className="space-y-1.5">
                  {statusSlices.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                      <span className="text-ink-light">{s.label}</span>
                      <span className="font-bold text-ink">{pct(s.value, totalOrders)}%</span>
                      <span className="text-xs text-ink-light">({s.value})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Percentage bars: key KPIs */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat Icon={ShoppingBag} label="עסקאות" value={totalOrders} />
              <MiniStat Icon={Users} label="לקוחות" value={customers.length} />
              <MiniStat Icon={Banknote} label="מכירות" value={`₪${totalRevenue.toLocaleString()}`} />
            </div>
            <PctBar label="הזמנות שהושלמו" value={completedPct} color="#108c8b" />
            <PctBar label="מוצרים במלאי תקין" value={healthyStockPct} color="#3b82f6" />
            <PctBar label="לקוחות עם תיקון פעיל" value={activeCustomersPct} color="#a855f7" />
          </div>
        </div>
      </div>

      {/* Selected view */}
      {view === 'orders' && (
        <Card title="כל ההזמנות">
          {totalOrders === 0 ? (
            <Empty>עדיין אין הזמנות.</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {orders.map((o) => {
                const meta = orderStatusMeta(o.status)
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{o.number}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div className="truncate text-xs text-ink-light">{o.customer?.name} · {fmtDate(o.createdAt)}</div>
                    </div>
                    <span className="shrink-0 font-bold text-ink">₪{o.total}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      {view === 'revenue' && (
        <Card title="הכנסות (הדמיה)">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="סה״כ" value={`₪${totalRevenue.toLocaleString()}`} />
            <Stat label="מס׳ הזמנות" value={totalOrders} />
            <Stat label="ממוצע להזמנה" value={`₪${avgOrder.toLocaleString()}`} />
          </div>
          {totalOrders === 0 ? (
            <Empty>אין הכנסות עדיין.</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-semibold text-ink">{o.number}</span>
                  <span className="text-xs text-ink-light">{fmtDate(o.createdAt)}</span>
                  <span className="font-bold text-brand-600">₪{o.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {view === 'lowstock' && (
        <Card title="מוצרים במלאי נמוך">
          {lowStock.length === 0 ? (
            <Empty>כל המוצרים במלאי תקין. 👍</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Package size={16} className="text-ink-light" /> {p.name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      (Number(p.stock) || 0) === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {(Number(p.stock) || 0) === 0 ? 'אזל' : `נותרו ${p.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}

// SVG donut chart. `slices` = [{ value, color }]; segments sized by share.
function Donut({ slices, total, size = 132, thickness = 22 }) {
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-black/5" />
          {slices.map((s) => {
            const len = (s.value / total) * C
            const seg = (
              <circle
                key={s.id}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
              />
            )
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

// Horizontal percentage bar.
function PctBar({ label, value, color }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-light">{label}</span>
        <span className="font-bold text-ink">{value}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function MiniStat({ Icon, label, value }) {
  return (
    <div className="rounded-xl bg-brand-50/60 p-3 text-center">
      <Icon size={16} className="mx-auto mb-1 text-brand-500" />
      <p className="text-base font-extrabold leading-tight text-ink">{value}</p>
      <p className="text-[11px] text-ink-light">{label}</p>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
      <h3 className="mb-3 text-base font-extrabold text-ink">{title}</h3>
      {children}
    </div>
  )
}
function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-brand-50/60 p-3 text-center">
      <p className="text-lg font-extrabold text-ink">{value}</p>
      <p className="text-xs text-ink-light">{label}</p>
    </div>
  )
}
function Empty({ children }) {
  return <p className="text-sm text-ink-light">{children}</p>
}
