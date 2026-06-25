import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Asterisk } from 'lucide-react'
import { inputCls, IconBtn } from './ui.jsx'

// Generic add / rename / delete list of { id, label } items.
// `readOnly` hides all editing controls.
// `onToggleRequired(id)` — when provided, each row gets a "required (*)" toggle.
export default function EditableList({ items, onAdd, onUpdate, onDelete, onToggleRequired, placeholder = 'הוספה', readOnly, scroll }) {
  const [value, setValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (!value.trim()) return
    onAdd(value)
    setValue('')
  }
  const startEdit = (it) => {
    setEditingId(it.id)
    setEditValue(it.label)
  }
  const saveEdit = () => {
    if (editValue.trim()) onUpdate(editingId, editValue)
    setEditingId(null)
  }

  return (
    <div>
      {!readOnly && (
        <form onSubmit={add} className="mb-3 flex gap-2">
          <input className={inputCls} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
          <button
            type="submit"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600"
          >
            <Plus size={18} />
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-light">אין פריטים.</p>
      ) : (
        <ul className={`space-y-1 ${scroll ? 'max-h-72 overflow-y-auto overscroll-contain pe-1' : ''}`}>
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-black/5">
              {editingId === it.id ? (
                <input
                  autoFocus
                  className="flex-1 rounded-lg border border-brand-400 px-2 py-1 text-sm outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-ink">
                  {it.label}
                  {it.required && <span className="mr-1 font-bold text-red-500">*</span>}
                </span>
              )}

              {!readOnly && (
                <div className="flex items-center gap-1">
                  {onToggleRequired && editingId !== it.id && (
                    <button
                      type="button"
                      onClick={() => onToggleRequired(it.id)}
                      title={it.required ? 'שדה חובה — בטל' : 'סמן כשדה חובה'}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                        it.required ? 'bg-red-50 text-red-600' : 'text-ink-light hover:bg-black/5'
                      }`}
                    >
                      <Asterisk size={13} /> חובה
                    </button>
                  )}
                  {editingId === it.id ? (
                    <>
                      <IconBtn aria-label="שמירה" onClick={saveEdit}>
                        <Check size={15} />
                      </IconBtn>
                      <IconBtn aria-label="ביטול" onClick={() => setEditingId(null)}>
                        <X size={15} />
                      </IconBtn>
                    </>
                  ) : (
                    <>
                      <IconBtn aria-label="עריכה" onClick={() => startEdit(it)}>
                        <Pencil size={15} />
                      </IconBtn>
                      <IconBtn danger aria-label="מחיקה" onClick={() => onDelete(it.id)}>
                        <Trash2 size={15} />
                      </IconBtn>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
