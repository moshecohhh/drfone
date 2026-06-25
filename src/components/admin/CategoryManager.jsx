import { useState, useRef } from 'react'
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, Check, X, ImagePlus } from 'lucide-react'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { downscaleImage } from '../../utils/image.js'

// Manage categories for a single domain (Store or Lab) — add, rename, delete,
// reorder, and set the home-page showcase image. STRICT SEPARATION: all ops pass `domain`.
export default function CategoryManager({ domain, domainLabel }) {
  const { getCategories, addCategory, updateCategory, setCategoryImage, deleteCategory, moveCategory } =
    useCatalogStore()
  const categories = getCategories(domain)

  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const fileRefs = useRef({})

  const onPickImage = (id) => fileRefs.current[id]?.click()
  const onImageFile = async (id, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await downscaleImage(file, 900, 0.82)
      setCategoryImage(domain, id, dataUrl)
    } catch {
      /* ignore bad image */
    }
  }

  const onAdd = (e) => {
    e.preventDefault()
    if (!newLabel.trim()) return
    addCategory(domain, newLabel)
    setNewLabel('')
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditLabel(cat.label)
  }
  const saveEdit = () => {
    if (editLabel.trim()) updateCategory(domain, editingId, editLabel)
    setEditingId(null)
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-base font-extrabold text-ink">קטגוריות — {domainLabel}</h3>

      {/* Add */}
      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="שם קטגוריה חדשה"
          className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} /> הוספה
        </button>
      </form>

      {/* List */}
      <ul className="divide-y divide-black/5">
        {categories.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-light">אין קטגוריות. הוסף קטגוריה ראשונה.</li>
        )}
        {categories.map((cat, idx) => (
          <li key={cat.id} className="flex items-center gap-2 py-2.5">
            {/* Reorder */}
            <div className="flex flex-col">
              <button
                onClick={() => moveCategory(domain, cat.id, -1)}
                disabled={idx === 0}
                aria-label="העלאה"
                className="text-ink-light hover:text-brand-600 disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => moveCategory(domain, cat.id, 1)}
                disabled={idx === categories.length - 1}
                aria-label="הורדה"
                className="text-ink-light hover:text-brand-600 disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
            </div>

            {/* Home-page showcase image */}
            <button
              type="button"
              onClick={() => onPickImage(cat.id)}
              title="עריכת תמונת הקטגוריה לדף הראשי"
              className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-brand-50"
            >
              {cat.image ? (
                <img src={cat.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-ink-light">
                  <ImagePlus size={15} />
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <ImagePlus size={14} />
              </span>
            </button>
            <input
              ref={(el) => (fileRefs.current[cat.id] = el)}
              type="file"
              accept="image/*"
              onChange={(e) => onImageFile(cat.id, e)}
              className="hidden"
            />

            {/* Label / edit */}
            {editingId === cat.id ? (
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                autoFocus
                className="flex-1 rounded-lg border border-brand-400 px-2 py-1 text-sm outline-none"
              />
            ) : (
              <span className="flex-1 text-sm font-medium text-ink">{cat.label}</span>
            )}
            {cat.image && (
              <button
                type="button"
                onClick={() => setCategoryImage(domain, cat.id, '')}
                title="הסרת תמונה"
                className="shrink-0 text-[11px] text-ink-light hover:text-red-500"
              >
                הסר תמונה
              </button>
            )}

            {/* Actions */}
            <div className="flex gap-1">
              {editingId === cat.id ? (
                <>
                  <button onClick={saveEdit} aria-label="שמירה" className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingId(null)} aria-label="ביטול" className="rounded-lg p-1.5 text-ink-light hover:bg-black/5">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(cat)} aria-label="עריכה" className="rounded-lg p-1.5 text-ink-light hover:bg-brand-50 hover:text-brand-600">
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`למחוק את הקטגוריה "${cat.label}"?`)) deleteCategory(domain, cat.id)
                    }}
                    aria-label="מחיקה"
                    className="rounded-lg p-1.5 text-ink-light hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
