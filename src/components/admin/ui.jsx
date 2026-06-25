// Shared, lightweight admin UI primitives — keeps every panel clean & consistent.
import { Search, X } from 'lucide-react'

export const inputCls =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-light/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

// Scoped search box for a single panel (each category has its own).
export function PanelSearch({ value, onChange, placeholder = 'חיפוש…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-white py-2 pr-9 pl-8 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="ניקוי חיפוש"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

// Modern on/off toggle switch. Forced LTR internally so the knob travel is
// predictable regardless of the page's RTL direction.
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-brand-500' : 'bg-black/20'
      }`}
      aria-label={label}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[1.375rem]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-5 shadow-card ${className}`}>
      {children}
    </div>
  )
}

// Section heading with optional action on the side.
export function PanelHead({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-light">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Field({ label, children, hint, req }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-light">
        {label} {req && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-light/80">{hint}</span>}
    </label>
  )
}

export function PrimaryBtn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostBtn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-black/5 ${className}`}
    >
      {children}
    </button>
  )
}

// Subtle icon-only action button (edit/delete rows etc.).
export function IconBtn({ children, danger, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`rounded-lg p-2 text-ink-light transition ${
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-brand-50 hover:text-brand-600'
      } ${className}`}
    >
      {children}
    </button>
  )
}

// Empty-state block.
export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white py-16 text-center">
      {Icon && <Icon size={40} className="text-black/20" />}
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-light">{hint}</p>}
    </div>
  )
}

// Clean table shell — header cells passed as array of strings.
export function Table({ columns, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-brand-50/70 text-xs uppercase tracking-wide text-ink-light">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-bold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">{children}</tbody>
        </table>
      </div>
    </div>
  )
}
