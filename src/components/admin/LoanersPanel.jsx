import { useState } from 'react'
import { Plus, Trash2, Pencil, Smartphone, X, Check } from 'lucide-react'
import { useLab } from '../../context/LabContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { PanelHead, Card, Table, Field, PrimaryBtn, GhostBtn, IconBtn, EmptyState, PanelSearch, inputCls } from './ui.jsx'

const blank = { model: '', imei: '' }

// Loaner phones inventory (מכשירים חלופיים). Editing is master-only.
export default function LoanersPanel() {
  const { loaners, addLoaner, updateLoaner, deleteLoaner, repairs } = useLab()
  const { isMaster } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blank)
  const [query, setQuery] = useState('')

  const term = query.trim().toLowerCase()
  const filtered = term
    ? loaners.filter((l) => [l.model, l.imei].some((f) => (f || '').toLowerCase().includes(term)))
    : loaners

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const repairNoFor = (id) => repairs.find((r) => r.loanerId === id)?.repairNo

  const openNew = () => {
    setEditingId(null)
    setForm(blank)
    setShowForm(true)
  }
  const openEdit = (l) => {
    setEditingId(l.id)
    setForm({ model: l.model, imei: l.imei || '' })
    setShowForm(true)
  }
  const submit = (e) => {
    e.preventDefault()
    if (!form.model.trim()) return
    if (editingId) updateLoaner(editingId, form)
    else addLoaner(form)
    setForm(blank)
    setEditingId(null)
    setShowForm(false)
  }

  const available = loaners.filter((l) => l.status === 'available').length

  return (
    <div>
      <PanelHead
        title="מכשירים חלופיים"
        subtitle={`${available} זמינים מתוך ${loaners.length} מכשירים.`}
        action={
          isMaster &&
          (showForm ? (
            <GhostBtn onClick={() => setShowForm(false)}>
              <X size={16} /> סגירה
            </GhostBtn>
          ) : (
            <PrimaryBtn onClick={openNew}>
              <Plus size={16} /> מכשיר חדש
            </PrimaryBtn>
          ))
        }
      />

      {isMaster && showForm && (
        <Card className="mb-5">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="דגם המכשיר">
              <input className={inputCls} value={form.model} onChange={(e) => set('model', e.target.value)} required />
            </Field>
            <Field label="IMEI / מספר סידורי">
              <input className={inputCls} value={form.imei} onChange={(e) => set('imei', e.target.value)} />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <PrimaryBtn type="submit">
                <Check size={16} /> {editingId ? 'שמירת שינויים' : 'הוספה'}
              </PrimaryBtn>
            </div>
          </form>
        </Card>
      )}

      {loaners.length > 0 && (
        <PanelSearch value={query} onChange={setQuery} placeholder="חיפוש דגם / IMEI…" className="mb-4 sm:max-w-xs" />
      )}

      {loaners.length === 0 ? (
        <EmptyState icon={Smartphone} title="אין מכשירים חלופיים" hint="הוסיפו מכשיר למלאי ההשאלה." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Smartphone} title="לא נמצאו מכשירים" hint={`אין תוצאות עבור “${query.trim()}”.`} />
      ) : (
        <Table columns={['דגם', 'IMEI', 'סטטוס', '']}>
          {filtered.map((l) => (
            <tr key={l.id} className="hover:bg-brand-50/40">
              <td className="px-4 py-3 font-semibold text-ink">
                <span className="flex items-center gap-2">
                  <Smartphone size={15} className="text-ink-light" /> {l.model}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-light">{l.imei || '—'}</td>
              <td className="px-4 py-3">
                {l.status === 'available' ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">זמין</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                    בהשאלה{repairNoFor(l.id) ? ` · תיקון #${repairNoFor(l.id)}` : ''}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-left">
                {isMaster && (
                  <div className="flex justify-end gap-1">
                    <IconBtn aria-label="עריכה" onClick={() => openEdit(l)}>
                      <Pencil size={16} />
                    </IconBtn>
                    <IconBtn danger aria-label="מחיקה" onClick={() => deleteLoaner(l.id)}>
                      <Trash2 size={16} />
                    </IconBtn>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
