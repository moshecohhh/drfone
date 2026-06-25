import { Mail, Phone, Trash2, MailOpen, Inbox } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { PanelHead, EmptyState } from './ui.jsx'

const fmt = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

// Inbox for contact-form submissions sent from the home page.
export default function InquiriesPanel() {
  const { inquiries, markInquiryRead, deleteInquiry } = useSettings()
  const unread = inquiries.filter((i) => !i.read).length

  return (
    <div>
      <PanelHead
        title="פניות לקוחות"
        subtitle={`${inquiries.length} פניות${unread ? ` · ${unread} שלא נקראו` : ''}. נשלחות מטופס "צרו קשר" בדף הראשי.`}
      />

      {inquiries.length === 0 ? (
        <EmptyState icon={Inbox} title="אין פניות עדיין" hint="פניות מטופס יצירת הקשר באתר יופיעו כאן." />
      ) : (
        <ul className="space-y-3">
          {inquiries.map((q) => (
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
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-light">
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
