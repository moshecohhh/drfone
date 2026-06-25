import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, Smartphone, ChevronLeft } from 'lucide-react'
import { useLab } from '../../context/LabContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { PanelHead, Card, PrimaryBtn, IconBtn, PanelSearch, inputCls } from './ui.jsx'
import EditableList from './EditableList.jsx'
import BrandLogo from './BrandLogo.jsx'

// Device registry — brands & models. Editing is master-only (read-only for staff).
export default function DevicesPanel() {
  const { brands, modelsForBrand, addBrand, updateBrand, deleteBrand, addModel, updateModel, deleteModel } = useLab()
  const { isMaster } = useAuth()
  const [selected, setSelected] = useState(brands[0]?.id || null)
  const [brandInput, setBrandInput] = useState('')
  const [editingBrand, setEditingBrand] = useState(null)
  const [editBrandLabel, setEditBrandLabel] = useState('')
  const [query, setQuery] = useState('')

  const term = query.trim().toLowerCase()
  // Brands matching the term directly OR having a model that matches.
  const visibleBrands = term
    ? brands.filter(
        (b) =>
          b.label.toLowerCase().includes(term) ||
          modelsForBrand(b.id).some((m) => m.label.toLowerCase().includes(term)),
      )
    : brands
  const allModels = selected ? modelsForBrand(selected) : []
  const models = term ? allModels.filter((m) => m.label.toLowerCase().includes(term)) : allModels

  const onAddBrand = (e) => {
    e.preventDefault()
    const b = addBrand(brandInput)
    if (b) {
      setBrandInput('')
      setSelected(b.id)
    }
  }
  const saveBrandEdit = () => {
    if (editBrandLabel.trim()) updateBrand(editingBrand, editBrandLabel)
    setEditingBrand(null)
  }

  return (
    <div>
      <PanelHead title="מאגר מכשירים" subtitle="ניהול מותגים ודגמים לשימוש בטופסי התיקון." />

      <PanelSearch value={query} onChange={setQuery} placeholder="חיפוש מותג / דגם…" className="mb-4 sm:max-w-sm" />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Brands */}
        <Card>
          <h3 className="mb-3 text-base font-extrabold text-ink">מותגים</h3>
          {isMaster && (
            <form onSubmit={onAddBrand} className="mb-4 flex gap-2">
              <input className={inputCls} placeholder="הוספת מותג חדש" value={brandInput} onChange={(e) => setBrandInput(e.target.value)} />
              <PrimaryBtn type="submit" className="shrink-0">
                <Plus size={16} />
              </PrimaryBtn>
            </form>
          )}
          <ul className="max-h-72 space-y-1 overflow-y-auto overscroll-contain pe-1">
            {visibleBrands.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink-light">לא נמצאו מותגים.</li>
            )}
            {visibleBrands.map((b) => {
              const active = selected === b.id
              const editing = editingBrand === b.id
              return (
                <li key={b.id}>
                  <div className={`flex items-center justify-between rounded-xl px-3 py-2 transition ${active ? 'bg-brand-50 text-brand-700' : 'hover:bg-black/5'}`}>
                    {editing ? (
                      <input
                        autoFocus
                        className="flex-1 rounded-lg border border-brand-400 px-2 py-1 text-sm outline-none"
                        value={editBrandLabel}
                        onChange={(e) => setEditBrandLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveBrandEdit()}
                      />
                    ) : (
                      <button onClick={() => setSelected(b.id)} className="flex flex-1 items-center gap-2 text-right text-sm font-semibold">
                        <BrandLogo brand={b.label} size={20} />
                        {b.label}
                        <span className="text-xs font-normal text-ink-light">({modelsForBrand(b.id).length})</span>
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      {editing ? (
                        <>
                          <IconBtn aria-label="שמירה" onClick={saveBrandEdit}>
                            <Check size={15} />
                          </IconBtn>
                          <IconBtn aria-label="ביטול" onClick={() => setEditingBrand(null)}>
                            <X size={15} />
                          </IconBtn>
                        </>
                      ) : (
                        <>
                          {!active && <ChevronLeft size={15} className="text-ink-light/50" />}
                          {isMaster && (
                            <>
                              <IconBtn
                                aria-label="עריכת מותג"
                                onClick={() => {
                                  setEditingBrand(b.id)
                                  setEditBrandLabel(b.label)
                                }}
                              >
                                <Pencil size={15} />
                              </IconBtn>
                              <IconBtn danger aria-label="מחיקת מותג" onClick={() => window.confirm(`למחוק את ${b.label} וכל הדגמים שלו?`) && deleteBrand(b.id)}>
                                <Trash2 size={15} />
                              </IconBtn>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Models for selected brand */}
        <Card>
          <h3 className="mb-3 text-base font-extrabold text-ink">
            דגמים {selected && <span className="text-ink-light">· {brands.find((b) => b.id === selected)?.label}</span>}
          </h3>
          {!selected ? (
            <p className="text-sm text-ink-light">בחרו מותג כדי לנהל את הדגמים שלו.</p>
          ) : (
            <EditableList
              items={models}
              onAdd={(label) => addModel(selected, label)}
              onUpdate={updateModel}
              onDelete={deleteModel}
              placeholder="הוספת דגם חדש"
              readOnly={!isMaster}
              scroll
            />
          )}
        </Card>
      </div>
    </div>
  )
}
