import { useState } from 'react'
import { Ticket, Trash2, Plus, Check, X, Percent, Search } from 'lucide-react'
import { DOMAINS } from '../../context/AppContext.jsx'
import { useCoupons } from '../../context/CouponsContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { PanelHead, EmptyState } from './ui.jsx'

const inputCls = 'rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500'

const SCOPES = [
  { id: 'all', label: 'כל המוצרים' },
  { id: 'categories', label: 'קטגוריות נבחרות' },
  { id: 'products', label: 'מוצרים נבחרים' },
]

export default function CouponsPanel() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons()
  const { getCategories, getItems } = useCatalogStore()
  const categories = getCategories(DOMAINS.STORE) || []
  const products = getItems(DOMAINS.STORE) || []
  const catLabel = (id) => categories.find((c) => c.id === id)?.label || id
  const prodName = (id) => products.find((p) => p.id === id)?.name || id

  const [form, setForm] = useState({ code: '', percent: 10, scope: 'all', categoryIds: [], productIds: [], singleUse: false, active: true })
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleIn = (key, id) => setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }))

  const create = () => {
    const code = form.code.trim()
    if (!code) return setError('יש להזין קוד קופון.')
    if (coupons.some((c) => c.code.toUpperCase() === code.toUpperCase())) return setError('קוד קופון זה כבר קיים.')
    const percent = Number(form.percent)
    if (!(percent > 0 && percent <= 100)) return setError('אחוז ההנחה חייב להיות בין 1 ל-100.')
    if (form.scope === 'categories' && form.categoryIds.length === 0) return setError('יש לבחור לפחות קטגוריה אחת.')
    if (form.scope === 'products' && form.productIds.length === 0) return setError('יש לבחור לפחות מוצר אחד.')
    setError('')
    addCoupon(form)
    setForm({ code: '', percent: 10, scope: 'all', categoryIds: [], productIds: [], singleUse: false, active: true })
    setSearch('')
  }

  const term = search.trim().toLowerCase()
  const matches = term ? products.filter((p) => (p.name || '').toLowerCase().includes(term)).slice(0, 8) : []

  return (
    <div>
      <PanelHead title="קופונים" subtitle="קודי הנחה באחוזים — לכלל המוצרים, לקטגוריות או למוצרים נבחרים." />

      {/* Create coupon */}
      <div className="mb-6 rounded-2xl border border-black/5 bg-white p-4 shadow-card">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Plus size={15} /> יצירת קופון</p>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-light">קוד קופון</span>
            <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="WELCOME10" className={`w-full font-mono ${inputCls}`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-light">אחוז הנחה</span>
            <div className="relative">
              <Percent size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
              <input type="number" min="1" max="100" value={form.percent} onChange={(e) => set('percent', e.target.value)} className={`w-full pr-8 ${inputCls}`} />
            </div>
          </label>
        </div>

        {/* Scope */}
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-ink-light">תחולת הקופון</span>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set('scope', s.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  form.scope === s.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink hover:border-brand-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {form.scope === 'categories' && (
          <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-brand-50/50 p-3">
            {categories.length === 0 && <span className="text-xs text-ink-light">אין קטגוריות.</span>}
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleIn('categoryIds', c.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  form.categoryIds.includes(c.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-black/10 bg-white text-ink hover:border-brand-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {form.scope === 'products' && (
          <div className="mt-3 rounded-xl bg-brand-50/50 p-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש מוצר להוספה…" className={`w-full pr-8 ${inputCls}`} />
            </div>
            {term && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-black/10 bg-white">
                {matches.length ? matches.map((p) => (
                  <button key={p.id} type="button" onClick={() => { toggleIn('productIds', p.id); setSearch('') }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm hover:bg-brand-50">
                    <span className="truncate text-ink">{p.name}</span>
                    {form.productIds.includes(p.id) && <Check size={14} className="shrink-0 text-brand-600" />}
                  </button>
                )) : <p className="px-3 py-2 text-xs text-ink-light">לא נמצא מוצר</p>}
              </div>
            )}
            {form.productIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.productIds.map((id) => (
                  <span key={id} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
                    {prodName(id)}
                    <button type="button" onClick={() => toggleIn('productIds', id)} className="text-ink-light hover:text-red-600"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.singleUse} onChange={(e) => set('singleUse', e.target.checked)} className="h-4 w-4 rounded border-black/20 text-brand-500 focus:ring-brand-500" />
            לרכישה אחת בלבד (חד-פעמי כללי)
          </label>
          <button type="button" onClick={create} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
            <Plus size={15} /> יצירת קופון
          </button>
        </div>
      </div>

      {/* List */}
      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="אין קופונים עדיין" hint="קופונים שתיצרו יופיעו כאן." />
      ) : (
        <ul className="space-y-2">
          {coupons.map((c) => (
            <li key={c.id} className={`rounded-2xl border p-4 shadow-card ${c.active === false ? 'border-black/5 bg-black/[0.02] opacity-70' : 'border-black/5 bg-white'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold text-ink">
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 font-mono text-brand-700">{c.code}</span>
                    <span className="text-brand-600">{c.percent}%</span>
                    {c.customerEmail && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">ללקוח: {c.customerEmail}</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-light">
                    <span>
                      {c.scope === 'products'
                        ? `מוצרים: ${(c.productIds || []).map(prodName).join(', ') || '—'}`
                        : c.scope === 'categories'
                          ? `קטגוריות: ${(c.categoryIds || []).map(catLabel).join(', ') || '—'}`
                          : 'כל המוצרים'}
                    </span>
                    {(c.singleUse || c.oneTime) && <span className="font-semibold text-amber-600">חד-פעמי</span>}
                    <span>נוצל: {c.usedCount || 0}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateCoupon(c.id, { active: c.active === false })}
                    title={c.active === false ? 'הפעלה' : 'השבתה'}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${c.active === false ? 'bg-black/5 text-ink-light hover:bg-brand-50 hover:text-brand-600' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                  >
                    {c.active === false ? 'מושבת' : 'פעיל'}
                  </button>
                  <button type="button" onClick={() => window.confirm('למחוק את הקופון?') && deleteCoupon(c.id)} title="מחיקה" className="rounded-lg p-2 text-ink-light hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
