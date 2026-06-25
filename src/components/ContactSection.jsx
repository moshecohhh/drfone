import { useState } from 'react'
import { Phone, Mail, MapPin, Send, CheckCircle2, MessageSquare } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'
import { sanitizePhone, isValidContactPhone, emailIssue } from '../utils/validation.js'

const PHONE = '0527-10-14-10'
const EMAIL = 'drfone4949@gmail.com'
const ADDRESS = 'רשבי 49, מודיעין עילית'

// Home-page "contact us": business details + a form whose submissions land in
// the admin "פניות" (inquiries) inbox.
export default function ContactSection() {
  const { addInquiry } = useSettings()
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // Phone keeps digits/`+` only; everything else passes through.
  const set = (k, v) =>
    setForm((f) => ({ ...f, [k]: k === 'phone' ? v.replace(/[^\d+]/g, '').slice(0, 15) : v }))

  // Live per-field problems (shown in red once the field has any content).
  const emailErr = form.email.trim() ? emailIssue(form.email) : null
  const phoneErr = form.phone.trim() && !isValidContactPhone(form.phone) ? 'מספר הטלפון אינו תקין.' : null
  const showGmailHint = form.email.trim() && !form.email.includes('@')

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('יש למלא שם.')
    if (!isValidContactPhone(form.phone)) return setError('יש להזין מספר טלפון תקין.')
    if (!form.message.trim()) return setError('יש למלא את תוכן הפנייה.')
    if (form.email.trim() && emailIssue(form.email)) return setError(emailIssue(form.email))
    setError('')
    addInquiry({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    })
    setSent(true)
    setForm({ name: '', phone: '', email: '', message: '' })
  }

  return (
    <section className="mt-12">
      <h2 className="mb-2 text-center text-xl font-extrabold text-ink sm:text-2xl">לכל שאלה צרו איתנו קשר</h2>
      <p className="mb-6 text-center text-sm text-ink-light">נשמח לעמוד לרשותכם בכל שאלה או בקשה.</p>

      <div className="grid gap-5 rounded-2xl border border-black/5 bg-white p-5 shadow-card lg:grid-cols-2 lg:p-7">
        {/* Details */}
        <div className="space-y-3">
          <a href={`tel:${PHONE.replace(/-/g, '')}`} className="flex items-center gap-3 rounded-xl bg-brand-50/60 px-4 py-3 transition hover:bg-brand-50">
            <Phone size={18} className="text-brand-600" />
            <span dir="ltr" className="font-semibold text-ink">{PHONE}</span>
          </a>
          <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 rounded-xl bg-brand-50/60 px-4 py-3 transition hover:bg-brand-50">
            <Mail size={18} className="text-brand-600" />
            <span dir="ltr" className="font-semibold text-ink">{EMAIL}</span>
          </a>
          <div className="flex items-center gap-3 rounded-xl bg-brand-50/60 px-4 py-3">
            <MapPin size={18} className="text-brand-600" />
            <span className="font-semibold text-ink">{ADDRESS}</span>
          </div>
        </div>

        {/* Form */}
        {sent ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-brand-200 bg-brand-50/50 p-6 text-center">
            <CheckCircle2 size={40} className="text-brand-500" />
            <p className="mt-3 font-bold text-ink">הפנייה נשלחה!</p>
            <p className="mt-1 text-sm text-ink-light">תודה, ניצור איתך קשר בהקדם.</p>
            <button onClick={() => setSent(false)} className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
              שליחת פנייה נוספת
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="שם מלא *"
              className={fieldCls}
            />
            <div>
              <input
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="טלפון *"
                className={`${fieldCls} text-right ${phoneErr ? errorFieldCls : ''}`}
              />
              {phoneErr && <p className="mt-1 text-xs font-medium text-red-600">{phoneErr}</p>}
            </div>
            <div>
              <input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="כתובת מייל"
                className={`${fieldCls} text-right ${emailErr ? errorFieldCls : ''}`}
              />
              {showGmailHint && (
                <button
                  type="button"
                  onClick={() => set('email', `${form.email}@gmail.com`)}
                  className="mt-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  הוספת ‎@gmail.com‎
                </button>
              )}
              {emailErr && <p className="mt-1 text-xs font-medium text-red-600">{emailErr}</p>}
            </div>
            <div>
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-light">
                <MessageSquare size={13} /> איך נוכל לעזור? *
              </span>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="כתבו לנו את פנייתכם..."
                className={fieldCls}
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <Send size={16} /> שליחת פנייה
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

const fieldCls =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-light/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

// Red outline for an invalid field (overrides the neutral border/focus ring).
const errorFieldCls = '!border-red-400 focus:!border-red-500 focus:!ring-red-500/20'
