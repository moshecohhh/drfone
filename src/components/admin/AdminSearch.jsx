import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, Package, Wrench, Users, ShoppingBag, Smartphone, HardDrive } from 'lucide-react'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useLab } from '../../context/LabContext.jsx'
import { useOrders } from '../../context/OrdersContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { DOMAINS } from '../../context/AppContext.jsx'
import { imeiOf } from '../../utils/imei.js'

// Global admin search — one box that finds products, services, customers,
// repairs, orders, loaners and registered devices across every panel, and
// jumps to the relevant section on click.
export default function AdminSearch({ onNavigate }) {
  const { store, lab } = useCatalogStore()
  const { customers, repairs, loaners, models, brands: deviceBrands } = useLab()
  const { orders } = useOrders()
  const { brandLabel } = useBrands()

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  // Close the results dropdown when clicking outside.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const deviceBrandLabel = (id) => deviceBrands.find((b) => b.id === id)?.label || ''

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return []
    const has = (...parts) => parts.filter(Boolean).join(' ').toLowerCase().includes(term)
    const out = []

    store.forEach((p) => {
      const imeis = [p.imei1, p.imei2, ...((p.imeis || []).map(imeiOf))]
      if (has(p.name, brandLabel(p.brand), p.badge, p.category, p.barcode, ...imeis))
        out.push({ key: 'p' + p.id, type: 'מוצר', Icon: Package, label: p.name, sub: `${brandLabel(p.brand)} · ₪${p.price}`, section: 'catalog', editId: p.id, domain: DOMAINS.STORE })
    })
    lab.forEach((s) => {
      if (has(s.name, s.badge, s.barcode)) out.push({ key: 's' + s.id, type: 'שירות', Icon: Wrench, label: s.name, sub: 'מעבדה', section: 'catalog', editId: s.id, domain: DOMAINS.LAB })
    })
    customers.forEach((c) => {
      if (has(c.name, c.phone1, c.phone2, c.address))
        out.push({ key: 'c' + c.id, type: 'לקוח', Icon: Users, label: c.name, sub: c.phone1 || c.address || '', section: 'customers' })
    })
    repairs.forEach((r) => {
      if (has(String(r.repairNo), r.customerName, r.phone1, r.phone2, r.device, r.imei, r.brandLabel))
        out.push({ key: 'r' + r.id, type: 'תיקון', Icon: Wrench, label: `#${r.repairNo} · ${r.customerName || '—'}`, sub: r.device || '', section: 'repairs' })
    })
    orders.forEach((o) => {
      if (has(o.number, o.customer?.name, o.customer?.phone, ...(o.items || []).map((i) => i.name)))
        out.push({ key: 'o' + o.id, type: 'הזמנה', Icon: ShoppingBag, label: `${o.number} · ${o.customer?.name || '—'}`, sub: `₪${o.total}`, section: 'orders' })
    })
    loaners.forEach((l) => {
      if (has(l.model, l.imei)) out.push({ key: 'l' + l.id, type: 'מכשיר חלופי', Icon: Smartphone, label: l.model, sub: l.imei || '', section: 'loaners' })
    })
    models.forEach((m) => {
      if (has(m.label, deviceBrandLabel(m.brandId)))
        out.push({ key: 'm' + m.id, type: 'מכשיר', Icon: HardDrive, label: m.label, sub: deviceBrandLabel(m.brandId), section: 'devices' })
    })
    return out.slice(0, 24)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, store, lab, customers, repairs, orders, loaners, models, deviceBrands])

  const pick = (r) => {
    setOpen(false)
    setQ('')
    onNavigate(r)
  }

  const showDropdown = open && q.trim().length >= 2

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="חיפוש מוצר, ברקוד, לקוח, תיקון, הזמנה…"
          className="w-full rounded-xl border border-black/10 bg-brand-50/40 py-2 pr-9 pl-8 text-sm text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setOpen(false) }}
            aria-label="ניקוי"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-light">לא נמצאו תוצאות עבור “{q.trim()}”.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-center gap-3 px-3 py-2 text-right transition hover:bg-brand-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <r.Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.label}</span>
                  {r.sub && <span className="block truncate text-xs text-ink-light">{r.sub}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-ink-light">{r.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
