import { useState, useRef } from 'react'
import { Plus, Trash2, Pencil, X, Check, Tag, Upload, ArrowUp, ArrowDown, ImagePlus } from 'lucide-react'
import { useBrands } from '../../context/BrandsContext.jsx'
import { PanelHead, Table, Card, Field, PrimaryBtn, GhostBtn, IconBtn, EmptyState, inputCls } from './ui.jsx'
import BrandLogo from './BrandLogo.jsx'

const blank = { label: '', logo: '' }

// Renders a brand's logo (image/SVG URL) or a monogram fallback.
function LogoPreview({ brand, size = 36 }) {
  if (brand.logo) {
    return (
      <span
        className="flex items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <img src={brand.logo} alt={brand.label} className="h-full w-full object-contain" />
      </span>
    )
  }
  return <BrandLogo brand={brand.label} size={size} />
}

export default function BrandsPanel() {
  const { brands, addBrand, updateBrand, deleteBrand, moveBrand } = useBrands()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blank)
  const fileRef = useRef(null)
  const rowFileRefs = useRef({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Inline logo edit straight from the list — no need to open the edit form.
  const onRowFile = (id, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateBrand(id, { logo: reader.result })
    reader.readAsDataURL(file)
  }

  const openNew = () => {
    setEditingId(null)
    setForm(blank)
    setShowForm(true)
  }
  const openEdit = (b) => {
    setEditingId(b.id)
    setForm({ label: b.label, logo: b.logo || '' })
    setShowForm(true)
  }
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('logo', reader.result)
    reader.readAsDataURL(file)
  }
  const submit = (e) => {
    e.preventDefault()
    if (!form.label.trim()) return
    if (editingId) updateBrand(editingId, form)
    else addBrand(form)
    setForm(blank)
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div>
      <PanelHead
        title="מותגים"
        subtitle="ניהול מותגי החנות והלוגואים — מוצגים בקרוסלה ובסינון."
        action={
          showForm ? (
            <GhostBtn onClick={() => setShowForm(false)}>
              <X size={16} /> סגירה
            </GhostBtn>
          ) : (
            <PrimaryBtn onClick={openNew}>
              <Plus size={16} /> מותג חדש
            </PrimaryBtn>
          )
        }
      />

      {showForm && (
        <Card className="mb-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-4">
              <LogoPreview brand={form} size={56} />
              <div className="flex-1 space-y-3">
                <Field label="שם המותג" req>
                  <input className={inputCls} value={form.label} onChange={(e) => set('label', e.target.value)} />
                </Field>
                <Field label="לוגו (כתובת תמונה / SVG)">
                  <input className={inputCls} dir="ltr" value={form.logo} onChange={(e) => set('logo', e.target.value)} placeholder="https://… או data:image/svg…" />
                </Field>
                <div className="flex items-center gap-2">
                  <GhostBtn type="button" onClick={() => fileRef.current?.click()}>
                    <Upload size={14} /> העלאת קובץ
                  </GhostBtn>
                  {form.logo && (
                    <button type="button" onClick={() => set('logo', '')} className="text-xs text-red-500 hover:underline">
                      הסרת לוגו
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <PrimaryBtn type="submit">
                <Check size={16} /> {editingId ? 'שמירת שינויים' : 'הוספת מותג'}
              </PrimaryBtn>
            </div>
          </form>
        </Card>
      )}

      {brands.length === 0 ? (
        <EmptyState icon={Tag} title="אין מותגים" hint="הוסיפו מותג ראשון." />
      ) : (
        <Table columns={['סדר', 'לוגו', 'שם', '']}>
          {brands.map((b, idx) => (
            <tr key={b.id} className="hover:bg-brand-50/40">
              {/* Reorder (drives the storefront carousel order) */}
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveBrand(b.id, -1)}
                    disabled={idx === 0}
                    aria-label="העלאה"
                    className="text-ink-light transition hover:text-brand-600 disabled:opacity-30"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => moveBrand(b.id, 1)}
                    disabled={idx === brands.length - 1}
                    aria-label="הורדה"
                    className="text-ink-light transition hover:text-brand-600 disabled:opacity-30"
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              </td>
              {/* Logo — click to edit the image inline (no need to open the form) */}
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => rowFileRefs.current[b.id]?.click()}
                  title="עריכת תמונה"
                  aria-label="עריכת לוגו"
                  className="group relative inline-flex overflow-hidden rounded-lg"
                >
                  <LogoPreview brand={b} />
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus size={15} />
                  </span>
                </button>
                <input
                  ref={(el) => (rowFileRefs.current[b.id] = el)}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onRowFile(b.id, e)}
                  className="hidden"
                />
              </td>
              <td className="px-4 py-3 font-semibold text-ink">{b.label}</td>
              <td className="px-4 py-3 text-left">
                <div className="flex justify-end gap-1">
                  {b.logo && (
                    <IconBtn aria-label="הסרת לוגו" onClick={() => updateBrand(b.id, { logo: '' })}>
                      <X size={16} />
                    </IconBtn>
                  )}
                  <IconBtn aria-label="עריכה" onClick={() => openEdit(b)}>
                    <Pencil size={16} />
                  </IconBtn>
                  <IconBtn danger aria-label="מחיקה" onClick={() => window.confirm(`למחוק את ${b.label}?`) && deleteBrand(b.id)}>
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
