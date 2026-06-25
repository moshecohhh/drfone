import { useState } from 'react'
import { Plus, Trash2, Pencil, MapPin, X, Users, Check, Eye, EyeOff, Mail, AlertCircle, Download } from 'lucide-react'
import { useLab } from '../../context/LabContext.jsx'
import { useAuth, ROLES, ROLE_OPTIONS } from '../../context/AuthContext.jsx'
import { PanelHead, Table, Card, Field, PrimaryBtn, GhostBtn, IconBtn, EmptyState, PanelSearch, inputCls } from './ui.jsx'
import PhoneActions from './PhoneActions.jsx'
import { sanitizePhone, isValidPhone, isValidEmail } from '../../utils/validation.js'
import { exportCsv } from '../../utils/exportCsv.js'

const blank = { name: '', phone1: '', phone2: '', address: '', email: '', password: '', role: ROLES.CUSTOMER }

// Customers (client base) — view, create & edit, with credentials.
export default function CustomersPanel() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, repairs } = useLab()
  const { isMasterAdminAccount } = useAuth()
  const bypass = isMasterAdminAccount
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blank)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const term = query.trim().toLowerCase()
  const filtered = term
    ? customers.filter((c) =>
        [c.name, c.phone1, c.phone2, c.email, c.address].some((f) => (f || '').toLowerCase().includes(term)),
      )
    : customers

  const set = (k, v) => {
    const val = k === 'phone1' || k === 'phone2' ? sanitizePhone(v, bypass) : v
    setForm((f) => ({ ...f, [k]: val }))
  }
  const repairCount = (id) => repairs.filter((r) => r.customerId === id).length

  const exportList = () => {
    const today = new Date().toISOString().slice(0, 10)
    exportCsv(
      `customers-${today}.csv`,
      ['שם', 'טלפון 1', 'טלפון 2', 'כתובת', 'אימייל'],
      customers.map((c) => [c.name, c.phone1 || '', c.phone2 || '', c.address || '', c.email || '']),
    )
  }

  const openNew = () => {
    setEditingId(null)
    setForm(blank)
    setError('')
    setShowForm(true)
  }
  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({ name: c.name, phone1: c.phone1 || '', phone2: c.phone2 || '', address: c.address || '', email: c.email || '', password: c.password || '', role: c.role || ROLES.CUSTOMER })
    setError('')
    setShowForm(true)
  }
  const submit = (e) => {
    e.preventDefault()
    if (!bypass) {
      if (!form.name.trim()) return setError('שם הוא שדה חובה.')
      if (!isValidPhone(form.phone1)) return setError('טלפון 1 חייב להכיל בדיוק 10 ספרות.')
      if (form.phone2 && !isValidPhone(form.phone2)) return setError('טלפון 2 חייב להכיל בדיוק 10 ספרות.')
      if (form.email && !isValidEmail(form.email)) return setError('כתובת אימייל לא תקינה.')
    }
    setError('')
    if (editingId) updateCustomer(editingId, form)
    else addCustomer(form)
    setForm(blank)
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div>
      <PanelHead
        title="לקוחות"
        subtitle="ניהול מאגר הלקוחות, פרטי התקשרות ופרטי כניסה."
        action={
          showForm ? (
            <GhostBtn onClick={() => setShowForm(false)}>
              <X size={16} /> סגירה
            </GhostBtn>
          ) : (
            <div className="flex gap-2">
              {customers.length > 0 && (
                <GhostBtn onClick={exportList}>
                  <Download size={16} /> ייצוא לאקסל
                </GhostBtn>
              )}
              <PrimaryBtn onClick={openNew}>
                <Plus size={16} /> לקוח חדש
              </PrimaryBtn>
            </div>
          )
        }
      />

      {showForm && (
        <Card className="mb-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Field label="שם מלא" req>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="כתובת">
              <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="סוג המשתמש / הלקוח" req>
              <select className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)}>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="טלפון 1" req>
              <input className={inputCls} dir="ltr" inputMode="numeric" value={form.phone1} onChange={(e) => set('phone1', e.target.value)} placeholder="0500000000" />
            </Field>
            <Field label="טלפון 2">
              <input className={inputCls} dir="ltr" inputMode="numeric" value={form.phone2} onChange={(e) => set('phone2', e.target.value)} placeholder="0500000000" />
            </Field>
            <Field label="אימייל">
              <input className={inputCls} dir="ltr" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@email.com" />
            </Field>
            <Field label="סיסמה" hint="גלויה לעריכה ע״י המנהל">
              <div className="relative">
                <input
                  className={`${inputCls} pl-10`}
                  dir="ltr"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
                  aria-label={showPw ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <PrimaryBtn type="submit">
                <Check size={16} /> {editingId ? 'שמירת שינויים' : 'שמירת לקוח'}
              </PrimaryBtn>
            </div>
          </form>
        </Card>
      )}

      {customers.length > 0 && (
        <PanelSearch value={query} onChange={setQuery} placeholder="חיפוש לקוח / טלפון / אימייל…" className="mb-4 sm:max-w-xs" />
      )}

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="אין לקוחות עדיין" hint="הוסיפו לקוח חדש כדי להתחיל." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="לא נמצאו לקוחות" hint={`אין תוצאות עבור “${query.trim()}”.`} />
      ) : (
        <Table columns={['שם', 'טלפונים', 'אימייל', 'כתובת', 'תיקונים', '']}>
          {filtered.map((c) => (
            <tr key={c.id} className="hover:bg-brand-50/40">
              <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
              <td className="px-4 py-3 text-ink-light">
                <PhoneActions phone={c.phone1} />
                {c.phone2 && <div className="mt-1"><PhoneActions phone={c.phone2} /></div>}
              </td>
              <td className="px-4 py-3 text-ink-light">
                {c.email ? (
                  <span className="flex items-center gap-1.5" dir="ltr">
                    <Mail size={14} /> {c.email}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3 text-ink-light">
                {c.address ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} /> {c.address}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {repairCount(c.id)}
                </span>
              </td>
              <td className="px-4 py-3 text-left">
                <div className="flex justify-end gap-1">
                  <IconBtn aria-label="עריכה" onClick={() => openEdit(c)}>
                    <Pencil size={16} />
                  </IconBtn>
                  <IconBtn danger aria-label="מחיקה" onClick={() => window.confirm(`למחוק את ${c.name}?`) && deleteCustomer(c.id)}>
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
