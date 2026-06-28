import { useState } from 'react'
import { Mail, Phone, Trash2, MailOpen, Inbox, ShoppingBag } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { PanelHead, EmptyState } from './ui.jsx'

const fmt = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

// Inquiries land in two buckets: general site contact (home-page form) and
// post-purchase service requests (raised from an order in the customer area).
const CATS = [
  { id: 'site', label: 'פניות מהאתר' },
  { id: 'post-purchase', label: 'פניות לאחר רכישה' },
]
// Legacy inquiries (saved before categories existed) count as site contact.
const catOf = (q) => (q.category === 'post-purchase' ? 'post-purchase' : 'site')

export default function InquiriesPanel() {
  const { inquiries, markInquiryRead, deleteInquiry } = useSettings()
  const [cat, setCat] = useState('site')
  const list = inquiries.filter((q) => catOf(q) === cat)
  const unreadIn = (c) => inquiries.filter((q) => catOf(q) === c && !q.read).length

  return (
    <div>
      <PanelHead
        title="פניות לקוחות"
        subtitle={`${inquiries.length} פניות בסך הכול. פניות מטופס "צרו קשר" ופניות שירות מהאזור האישי.`}
      />

      {/* Category tabs */}
      <div className="mb-4 flex gap-1 border-b border-black/5">
        {CATS.map((c) => {
          const u = unreadIn(c.id)
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                cat === c.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-light hover:text-ink'
              }`}
            >
              {c.label}
              {u > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">{u}</span>}
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="אין פניות בקטגוריה זו" hint="פניות חדשות יופיעו כאן." />
      ) : (
        <ul className="space-y-3">
          {list.map((q) => (
            <li
              key={q.id}
              className={`rounded-2xl border p-4 shadow-card transition ${
                q.read ? 'border-black/5 bg-white' : 'border-brand-300 bg-brand-50/40'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-bold text-ink">
                    {!q.read && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                    {q.name || '—'}
                    {q.orderNumber && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                        <ShoppingBag size={11} /> {q.orderNumber}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-light">
                    {q.phone && (
                      <a href={`tel:${String(q.phone).replace(/[^\d+]/g, '')}`} dir="ltr" className="flex items-center gap-1 hover:text-brand-600">
                        <Phone size={12} /> {q.phone}
                      </a>
                    )}
                    {q.email && (
                      <a href={`mailto:${q.email}`} dir="ltr" className="flex items-center gap-1 hover:text-brand-600">
                        <Mail size={12} /> {q.email}
                      </a>
                    )}
                    <span>{fmt(q.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => markInquiryRead(q.id, !q.read)}
                    title={q.read ? 'סימון כלא נקרא' : 'סימון כנקרא'}
                    className="rounded-lg p-2 text-ink-light transition hover:bg-brand-50 hover:text-brand-600"
                  >
                    {q.read ? <Mail size={16} /> : <MailOpen size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm('למחוק את הפנייה?') && deleteInquiry(q.id)}
                    title="מחיקה"
                    className="rounded-lg p-2 text-ink-light transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-sm text-ink">{q.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
