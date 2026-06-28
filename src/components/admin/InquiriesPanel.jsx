import { useState } from 'react'
import { Mail, Phone, Trash2, MailOpen, Inbox, ShoppingBag, Send, Headset, Heart } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { PanelHead, EmptyState } from './ui.jsx'

const fmt = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const CATS = [
  { id: 'site', label: 'פניות מהאתר' },
  { id: 'post-purchase', label: 'פניות לאחר רכישה' },
]
const catOf = (q) => (q.category === 'post-purchase' ? 'post-purchase' : 'site')

export default function InquiriesPanel({ onOpenOrder }) {
  const { inquiries, markInquiryRead, deleteInquiry, replyToInquiry, toggleMessageReaction } = useSettings()
  const { user } = useAuth()
  const [cat, setCat] = useState('site')
  const list = inquiries.filter((q) => catOf(q) === cat)
  const unreadIn = (c) => inquiries.filter((q) => catOf(q) === c && !q.read).length

  return (
    <div>
      <PanelHead
        title="פניות לקוחות"
        subtitle={`${inquiries.length} פניות בסך הכול. פניות מטופס "צרו קשר" ופניות שירות מהאזור האישי.`}
      />

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
            <InquiryCard
              key={q.id}
              q={q}
              author={user?.name}
              onReply={replyToInquiry}
              onReact={toggleMessageReaction}
              onToggleRead={() => markInquiryRead(q.id, !q.read)}
              onDelete={() => window.confirm('למחוק את הפנייה?') && deleteInquiry(q.id)}
              onOpenOrder={onOpenOrder}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function InquiryCard({ q, author, onReply, onReact, onToggleRead, onDelete, onOpenOrder }) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const messages = Array.isArray(q.messages) ? q.messages : []
  const answered = q.status === 'answered'

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true)
    await onReply(q.id, reply, author)
    setBusy(false)
    setReply('')
  }

  return (
    <li className={`rounded-2xl border p-4 shadow-card transition ${q.read ? 'border-black/5 bg-white' : 'border-brand-300 bg-brand-50/40'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
            {!q.read && <span className="h-2 w-2 rounded-full bg-brand-500" />}
            {q.name || '—'}
            {q.orderNumber && (
              <button
                type="button"
                onClick={() => (q.orderId || q.orderNumber) && onOpenOrder?.(q.orderId || q.orderNumber)}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-100"
                title="מעבר להזמנה"
              >
                <ShoppingBag size={11} /> {q.orderNumber}
              </button>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${answered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {answered ? 'נענתה' : 'ממתינה לתשובה'}
            </span>
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
          <button type="button" onClick={onToggleRead} title={q.read ? 'סימון כלא נקרא' : 'סימון כנקרא'} className="rounded-lg p-2 text-ink-light transition hover:bg-brand-50 hover:text-brand-600">
            {q.read ? <Mail size={16} /> : <MailOpen size={16} />}
          </button>
          <button type="button" onClick={onDelete} title="מחיקה" className="rounded-lg p-2 text-ink-light transition hover:bg-red-50 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Product snapshot from the order (post-purchase tickets) */}
      {q.product?.name && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-black/[0.03] p-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg">
            {q.product.image ? <img src={q.product.image} alt="" className="h-full w-full object-cover" /> : '📦'}
          </div>
          <span className="min-w-0 text-sm font-semibold text-ink">{q.product.name}</span>
        </div>
      )}

      {/* Conversation thread */}
      <div className="mt-3 space-y-2">
        {messages.map((m) => {
          const shop = m.from === 'shop'
          return (
            <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${shop ? 'mr-auto bg-brand-500 text-white' : 'ml-auto bg-black/[0.04] text-ink'}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className={`text-[10px] ${shop ? 'text-white/70' : 'text-ink-light'}`}>
                  {shop ? 'החנות' : q.name || 'לקוח'} · {fmt(m.at)}
                </span>
                <button type="button" onClick={() => onReact(q.id, m.id)} aria-label="לב על ההודעה" className="shrink-0">
                  <Heart size={13} className={m.reaction ? 'fill-red-500 text-red-500' : shop ? 'text-white/60 hover:text-white' : 'text-ink-light hover:text-red-500'} />
                </button>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && q.message && (
          <p className="whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-sm text-ink">{q.message}</p>
        )}
      </div>

      {/* Reply box */}
      <div className="mt-3 flex items-end gap-2 border-t border-black/5 pt-3">
        <textarea
          rows={2}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="כתבו תשובה ללקוח…"
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !reply.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          <Send size={15} /> {busy ? '…' : 'שליחה'}
        </button>
      </div>
      {q.email ? (
        <p className="mt-1.5 text-[11px] text-ink-light">התשובה תישלח גם למייל הלקוח.</p>
      ) : (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600"><Headset size={11} /> ללקוח אין מייל — אפשר לחזור אליו טלפונית.</p>
      )}
    </li>
  )
}
