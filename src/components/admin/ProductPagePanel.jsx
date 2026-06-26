import { useState } from 'react'
import { Plus, Trash2, X, Library, Search } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { PanelHead, Card, Switch, Field, inputCls } from './ui.jsx'

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// Admin panel for global product-page settings + the reusable selection-field
// preset library. Per-product page content lives in the product editor's
// "דף המוצר" tab; this controls the site-wide defaults and shared presets.
export default function ProductPagePanel() {
  const { productPage, updateProductPage, fieldPresets, addFieldPreset, updateFieldPreset, removeFieldPreset } = useSettings()
  const gift = productPage.giftWrapDefault || { enabled: false, price: 0 }
  const marketing = productPage.defaultMarketing || []
  const [presetQuery, setPresetQuery] = useState('')
  const shownPresets = fieldPresets.filter((p) => (p.title || '').toLowerCase().includes(presetQuery.trim().toLowerCase()))

  const setMarketing = (next) => updateProductPage({ defaultMarketing: next })

  // ---- Preset option helpers ----
  const setOptions = (preset, opts) => updateFieldPreset(preset.id, { options: opts })
  const addOption = (preset) => setOptions(preset, [...(preset.options || []), { id: uid('o'), label: '', priceDelta: 0 }])
  const updOption = (preset, oid, p) => setOptions(preset, (preset.options || []).map((o) => (o.id === oid ? { ...o, ...p } : o)))
  const delOption = (preset, oid) => setOptions(preset, (preset.options || []).filter((o) => o.id !== oid))

  return (
    <div>
      <PanelHead title="דף מוצר" subtitle="הגדרות גלובליות לדף המוצר וספריית שדות בחירה לשימוש חוזר." />

      {/* ---- Global settings ---- */}
      <Card className="mb-5 space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">הפעלת דפי מוצר באתר</span>
          <Switch checked={!!productPage.enabledGlobally} onChange={(v) => updateProductPage({ enabledGlobally: v })} label="הפעלת דפי מוצר" />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">הצגת תשלומים בדף המוצר</span>
          <Switch checked={productPage.installmentsVisible !== false} onChange={(v) => updateProductPage({ installmentsVisible: v })} label="הצגת תשלומים" />
        </label>
        {productPage.installmentsVisible !== false && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="מספר תשלומים (ברירת מחדל)">
              <input type="number" min="1" value={productPage.installmentsCount} onChange={(e) => updateProductPage({ installmentsCount: Math.max(1, Number(e.target.value) || 1) })} className={inputCls} />
            </Field>
            <Field label="טקסט תשלומים">
              <input value={productPage.installmentsText} onChange={(e) => updateProductPage({ installmentsText: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}

        <label className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">הצגת אייקוני אמצעי תשלום</span>
          <Switch checked={!!productPage.paymentsVisible} onChange={(v) => updateProductPage({ paymentsVisible: v })} label="אמצעי תשלום" />
        </label>

        {/* Gift wrap default */}
        <div className="rounded-xl border border-black/10 bg-brand-50/40 p-3">
          <label className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">הצגת עטיפת מתנה בדף המוצר</span>
            <Switch checked={!!gift.enabled} onChange={(v) => updateProductPage({ giftWrapDefault: { ...gift, enabled: v } })} label="עטיפת מתנה" />
          </label>
          {gift.enabled && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-light">מחיר עטיפה</span>
              <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2">
                <span className="text-xs text-ink-light">₪</span>
                <input type="number" value={gift.price} onChange={(e) => updateProductPage({ giftWrapDefault: { ...gift, price: Number(e.target.value) || 0 } })} className="w-16 py-1.5 text-sm outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Default marketing blocks */}
        <div>
          <span className="mb-2 block text-xs font-bold text-ink-light">טקסטים שיווקיים (ברירת מחדל לכל המוצרים)</span>
          <div className="space-y-1.5">
            {marketing.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <input type="color" value={m.color || '#dc2626'} onChange={(e) => setMarketing(marketing.map((x) => (x.id === m.id ? { ...x, color: e.target.value } : x)))} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-black/10" />
                <input value={m.text} onChange={(e) => setMarketing(marketing.map((x) => (x.id === m.id ? { ...x, text: e.target.value } : x)))} placeholder="טקסט שיווקי" className={inputCls} />
                <button type="button" onClick={() => setMarketing(marketing.filter((x) => x.id !== m.id))} aria-label="הסרה" className="shrink-0 text-ink-light hover:text-red-500"><X size={15} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setMarketing([...marketing, { id: uid('mk'), text: '', color: '#dc2626' }])} className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
            <Plus size={14} /> הוספת טקסט
          </button>
        </div>
      </Card>

      {/* ---- Reusable field presets ---- */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-ink"><Library size={16} className="text-brand-500" /> ספריית שדות בחירה</span>
          <button type="button" onClick={() => addFieldPreset()} className="flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50">
            <Plus size={15} /> תבנית חדשה
          </button>
        </div>

        {/* Search the library */}
        {fieldPresets.length > 0 && (
          <div className="relative mb-3">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light" />
            <input value={presetQuery} onChange={(e) => setPresetQuery(e.target.value)} placeholder="חיפוש שדה בספרייה…" className={`${inputCls} pr-9`} />
          </div>
        )}

        {fieldPresets.length === 0 && <p className="text-xs text-ink-light">אין תבניות. צרו תבנית שתוכלו לשייך לכל מוצר.</p>}
        {fieldPresets.length > 0 && shownPresets.length === 0 && <p className="text-xs text-ink-light">לא נמצאו שדות התואמים לחיפוש.</p>}

        <div className="space-y-3">
          {shownPresets.map((preset) => (
            <div key={preset.id} className="rounded-xl border border-black/10 bg-white p-3">
              <div className="flex items-center gap-2">
                <input value={preset.title} onChange={(e) => updateFieldPreset(preset.id, { title: e.target.value })} placeholder="כותרת השדה" className={inputCls} />
                <button type="button" onClick={() => removeFieldPreset(preset.id)} aria-label="מחיקת תבנית" className="shrink-0 rounded-lg p-2 text-ink-light hover:bg-red-50 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <input type="checkbox" checked={!!preset.required} onChange={(e) => updateFieldPreset(preset.id, { required: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                  שדה חובה
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <input type="checkbox" checked={!!preset.multi} onChange={(e) => updateFieldPreset(preset.id, { multi: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                  סימון מרובה
                </label>
                {!preset.multi && (
                  <select value={preset.style || 'dropdown'} onChange={(e) => updateFieldPreset(preset.id, { style: e.target.value })} className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:border-brand-500">
                    <option value="dropdown">רשימה נפתחת</option>
                    <option value="pills">כפתורים</option>
                  </select>
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {(preset.options || []).map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input value={o.label} onChange={(e) => updOption(preset, o.id, { label: e.target.value })} placeholder="שם האפשרות" className={inputCls} />
                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2">
                      <span className="text-xs text-ink-light">+₪</span>
                      <input type="number" value={o.priceDelta} onChange={(e) => updOption(preset, o.id, { priceDelta: Number(e.target.value) || 0 })} className="w-16 py-1.5 text-sm outline-none" />
                    </div>
                    <button type="button" onClick={() => delOption(preset, o.id)} aria-label="הסרת אפשרות" className="shrink-0 text-ink-light hover:text-red-500"><X size={15} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => addOption(preset)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                  <Plus size={14} /> הוספת אפשרות
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
