import { Plus, Trash2, X, LayoutList, ListChecks, Tag, Megaphone, ChevronDown, Eye, EyeOff, BookmarkPlus, HardDrive, CreditCard, Search } from 'lucide-react'
import { useState } from 'react'
import { Switch, inputCls } from './ui.jsx'
import RichTextEditor from './RichTextEditor.jsx'
import { textToHtml } from '../../utils/sanitizeHtml.js'
import { useSettings, STORAGE_SIZES } from '../../context/SettingsContext.jsx'

// Editor for a single product's page config (the "דף המוצר" tab in the product
// form). Fully controlled: `value` is the product's `page` object, `onChange`
// receives the next page object. `presets` is the reusable field-preset library
// — picking one copies its definition in (then it's editable independently).
const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export default function ProductPageEditor({ value, onChange, presets = [] }) {
  const { productPage, addFieldPreset } = useSettings()
  const page = value || {}
  const allGroups = Array.isArray(page.optionGroups) ? page.optionGroups : []
  // The storage field is a special option group (kind: 'storage') edited on its
  // own; keep it out of the generic selection-fields list.
  const groups = allGroups.filter((g) => g.kind !== 'storage')
  const storageGroup = allGroups.find((g) => g.kind === 'storage')
  const specs = Array.isArray(page.specs) ? page.specs : []
  const marketing = Array.isArray(page.marketing) ? page.marketing : []
  const giftCustom = page.giftWrap != null
  const [presetOpen, setPresetOpen] = useState(false)
  const [presetQuery, setPresetQuery] = useState('')

  const patch = (p) => onChange({ ...page, ...p })
  // Mutate the FULL group list (incl. the storage group) so nothing is dropped.
  const setAllGroups = (next) => patch({ optionGroups: next })

  // ---- Selection-field groups ----
  const setGroups = (next) => setAllGroups([...next, ...(storageGroup ? [storageGroup] : [])])
  const addGroup = (preset) =>
    setGroups([
      ...groups,
      preset
        ? { ...preset, id: uid('g'), enabled: true, options: (preset.options || []).map((o) => ({ ...o, id: uid('o') })) }
        : { id: uid('g'), title: 'שדה בחירה', required: false, enabled: true, style: 'dropdown', placeholder: 'בחירה', options: [] },
    ])
  const updGroup = (id, p) => setAllGroups(allGroups.map((g) => (g.id === id ? { ...g, ...p } : g)))
  const delGroup = (id) => setAllGroups(allGroups.filter((g) => g.id !== id))
  const addOption = (gid) => updGroup(gid, { options: [...(allGroups.find((g) => g.id === gid)?.options || []), { id: uid('o'), label: '', priceDelta: 0 }] })
  const updOption = (gid, oid, p) =>
    updGroup(gid, { options: (allGroups.find((g) => g.id === gid)?.options || []).map((o) => (o.id === oid ? { ...o, ...p } : o)) })
  const delOption = (gid, oid) =>
    updGroup(gid, { options: (allGroups.find((g) => g.id === gid)?.options || []).filter((o) => o.id !== oid) })

  // Save a per-product field into the shared library for reuse on other products.
  const saveToLibrary = (g) => {
    addFieldPreset({
      title: g.title || 'שדה בחירה',
      required: !!g.required,
      style: g.style || 'dropdown',
      options: (g.options || []).map((o) => ({ label: o.label, priceDelta: Number(o.priceDelta) || 0 })),
    })
  }

  // ---- Storage field (kind: 'storage') ----
  const storageOptions = storageGroup?.options || []
  const isSizeOn = (size) => storageOptions.some((o) => o.label === size)
  const sizePrice = (size) => storageOptions.find((o) => o.label === size)?.priceDelta ?? 0
  const toggleStorage = (on) => {
    if (on && !storageGroup) {
      setAllGroups([...allGroups, { id: uid('g'), kind: 'storage', title: 'נפח אחסון', style: 'pills', required: false, enabled: true, options: [] }])
    } else if (!on && storageGroup) {
      setAllGroups(allGroups.filter((g) => g.id !== storageGroup.id))
    }
  }
  const toggleSize = (size) => {
    if (!storageGroup) return
    const opts = isSizeOn(size)
      ? storageOptions.filter((o) => o.label !== size)
      : [...storageOptions, { id: uid('o'), label: size, priceDelta: 0 }]
    updGroup(storageGroup.id, { options: opts })
  }
  const setSizePrice = (size, price) =>
    updGroup(storageGroup.id, { options: storageOptions.map((o) => (o.label === size ? { ...o, priceDelta: price } : o)) })

  // ---- Specs / Marketing ----
  const setSpecs = (next) => patch({ specs: next })
  const setMarketing = (next) => patch({ marketing: next })

  const shownPresets = presets.filter((p) => (p.title || '').toLowerCase().includes(presetQuery.trim().toLowerCase()))

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <label className="flex items-center justify-between rounded-xl border border-black/10 bg-brand-50/40 px-4 py-3">
        <span className="text-sm font-bold text-ink">דף מוצר פעיל</span>
        <Switch checked={page.enabled !== false} onChange={(v) => patch({ enabled: v })} label="דף מוצר פעיל" />
      </label>

      {/* ---- Selection fields ---- */}
      <Section icon={LayoutList} title="שדות בחירה">
        {groups.length === 0 && <p className="text-xs text-ink-light">לא הוגדרו שדות בחירה.</p>}
        <div className="space-y-3">
          {groups.map((g) => {
            const off = g.enabled === false
            return (
              <div key={g.id} className={`rounded-xl border border-black/10 bg-white p-3 ${off ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2">
                  <input
                    value={g.title}
                    onChange={(e) => updGroup(g.id, { title: e.target.value })}
                    placeholder="כותרת השדה (למשל: בחר את הגרסה)"
                    className={inputCls}
                  />
                  <EnableBtn on={!off} onClick={() => updGroup(g.id, { enabled: off })} />
                  <button type="button" onClick={() => saveToLibrary(g)} title="שמירה לספרייה" aria-label="שמירה לספרייה" className="shrink-0 rounded-lg p-2 text-ink-light hover:bg-brand-50 hover:text-brand-600">
                    <BookmarkPlus size={16} />
                  </button>
                  <button type="button" onClick={() => delGroup(g.id)} aria-label="מחיקת שדה" className="shrink-0 rounded-lg p-2 text-ink-light hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <input type="checkbox" checked={!!g.required} onChange={(e) => updGroup(g.id, { required: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                    שדה חובה
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <input type="checkbox" checked={!!g.multi} onChange={(e) => updGroup(g.id, { multi: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                    סימון מרובה (בחירת כמה אפשרויות)
                  </label>
                  {!g.multi && (
                    <select value={g.style || 'dropdown'} onChange={(e) => updGroup(g.id, { style: e.target.value })} className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:border-brand-500">
                      <option value="dropdown">רשימה נפתחת</option>
                      <option value="pills">כפתורים</option>
                    </select>
                  )}
                </div>

                {/* Options */}
                <div className="mt-3 space-y-1.5">
                  {(g.options || []).map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input
                        value={o.label}
                        onChange={(e) => updOption(g.id, o.id, { label: e.target.value })}
                        placeholder="שם האפשרות"
                        className={inputCls}
                      />
                      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2">
                        <span className="text-xs text-ink-light">+₪</span>
                        <input
                          type="number"
                          value={o.priceDelta}
                          onChange={(e) => updOption(g.id, o.id, { priceDelta: Number(e.target.value) || 0 })}
                          className="w-16 py-1.5 text-sm outline-none"
                        />
                      </div>
                      <button type="button" onClick={() => delOption(g.id, o.id)} aria-label="הסרת אפשרות" className="shrink-0 text-ink-light hover:text-red-500">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(g.id)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    <Plus size={14} /> הוספת אפשרות
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => addGroup()} className="flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50">
            <Plus size={15} /> הוספת שדה
          </button>
          {presets.length > 0 && (
            <div className="relative">
              <button type="button" onClick={() => setPresetOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-black/5">
                <Plus size={15} /> הוספה מתבנית <ChevronDown size={14} />
              </button>
              {presetOpen && (
                <div className="absolute z-10 mt-1 w-64 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
                  <div className="relative mb-2">
                    <Search size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-light" />
                    <input autoFocus value={presetQuery} onChange={(e) => setPresetQuery(e.target.value)} placeholder="חיפוש שדה…" className="w-full rounded-lg border border-black/10 py-1.5 pr-8 pl-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {shownPresets.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-light">לא נמצאו שדות.</p>}
                    {shownPresets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { addGroup(p); setPresetOpen(false); setPresetQuery('') }}
                        className="block w-full rounded-lg px-3 py-2 text-right text-sm text-ink hover:bg-brand-50"
                      >
                        {p.title} <span className="text-xs text-ink-light">({p.options?.length || 0} אפשרויות)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ---- Storage capacity ---- */}
      <Section icon={HardDrive} title="נפח אחסון">
        <label className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">הצגת בחירת נפח אחסון</span>
          <Switch checked={!!storageGroup} onChange={toggleStorage} label="נפח אחסון" />
        </label>
        {storageGroup && (
          <>
            <p className="mt-2 mb-2 text-xs text-ink-light">סמנו את הנפחים הזמינים והגדירו מחיר לכל נפח. בחירת נפח באתר תעדכן את המחיר.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STORAGE_SIZES.map((size) => {
                const on = isSizeOn(size)
                return (
                  <div key={size} className={`flex items-center gap-2 rounded-lg border p-2 ${on ? 'border-brand-300 bg-brand-50/40' : 'border-black/10'}`}>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <input type="checkbox" checked={on} onChange={() => toggleSize(size)} className="h-4 w-4 accent-brand-500" />
                      {size}
                    </label>
                    {on && (
                      <div className="flex items-center gap-0.5">
                        <span className="text-[11px] text-ink-light">+₪</span>
                        <input type="number" value={sizePrice(size)} onChange={(e) => setSizePrice(size, Number(e.target.value) || 0)} className="w-14 rounded border border-black/10 px-1 py-0.5 text-xs outline-none focus:border-brand-500" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Section>

      {/* ---- Installments (per-product override) ---- */}
      <Section icon={CreditCard} title="תשלומים">
        <label className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">הצגת תשלומים בדף זה</span>
          <Switch checked={page.installmentsVisible !== false} onChange={(v) => patch({ installmentsVisible: v })} label="הצגת תשלומים" />
        </label>
        {page.installmentsVisible !== false && (
          <div className="mt-3">
            <span className="mb-1 block text-xs font-semibold text-ink-light">מספר תשלומים למוצר זה (ריק = ברירת מחדל {productPage.installmentsCount})</span>
            <input
              type="number"
              min="1"
              value={page.installmentsCount ?? ''}
              onChange={(e) => patch({ installmentsCount: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1) })}
              placeholder={String(productPage.installmentsCount)}
              className={`${inputCls} max-w-[10rem]`}
            />
          </div>
        )}
      </Section>

      {/* ---- Spec list ---- */}
      <Section icon={ListChecks} title="רשימת מפרט">
        <div className="space-y-1.5">
          {specs.map((s) => {
            const off = s.enabled === false
            return (
              <div key={s.id} className={`flex items-center gap-2 ${off ? 'opacity-60' : ''}`}>
                <input value={s.icon} onChange={(e) => setSpecs(specs.map((x) => (x.id === s.id ? { ...x, icon: e.target.value } : x)))} placeholder="🔋" maxLength={3} className="w-14 rounded-lg border border-black/10 px-2 py-2 text-center text-sm outline-none focus:border-brand-500" />
                <input value={s.label} onChange={(e) => setSpecs(specs.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))} placeholder="שורת מפרט" className={inputCls} />
                <EnableBtn on={!off} onClick={() => setSpecs(specs.map((x) => (x.id === s.id ? { ...x, enabled: off } : x)))} />
                <button type="button" onClick={() => setSpecs(specs.filter((x) => x.id !== s.id))} aria-label="הסרה" className="shrink-0 text-ink-light hover:text-red-500"><X size={15} /></button>
              </div>
            )
          })}
        </div>
        <button type="button" onClick={() => setSpecs([...specs, { id: uid('sp'), icon: '•', label: '', enabled: true }])} className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
          <Plus size={14} /> הוספת שורת מפרט
        </button>

        {/* Free-text alternative — now a rich-text field (bold / colour / etc.). */}
        <div className="mt-4 border-t border-black/5 pt-3">
          <span className="mb-1 block text-xs font-semibold text-ink-light">טקסט מפרט חופשי — אפשר להדגיש, לצבוע ולעצב את הטקסט</span>
          <RichTextEditor
            value={page.specsHtml ?? textToHtml(page.specsText)}
            onChange={(html) => patch({ specsHtml: html, specsText: '' })}
            placeholder={'רשת: דור 4 LTE · גודל מסך: 2.8 אינץ׳ · אחסון: 32GB'}
          />
        </div>
      </Section>

      {/* ---- Marketing blocks ---- */}
      <Section icon={Megaphone} title="טקסטים שיווקיים">
        <div className="space-y-1.5">
          {marketing.map((m) => {
            const off = m.enabled === false
            return (
              <div key={m.id} className={`flex items-center gap-2 ${off ? 'opacity-60' : ''}`}>
                <input type="color" value={m.color || '#dc2626'} onChange={(e) => setMarketing(marketing.map((x) => (x.id === m.id ? { ...x, color: e.target.value } : x)))} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-black/10" />
                <input value={m.text} onChange={(e) => setMarketing(marketing.map((x) => (x.id === m.id ? { ...x, text: e.target.value } : x)))} placeholder="טקסט שיווקי" className={inputCls} />
                <EnableBtn on={!off} onClick={() => setMarketing(marketing.map((x) => (x.id === m.id ? { ...x, enabled: off } : x)))} />
                <button type="button" onClick={() => setMarketing(marketing.filter((x) => x.id !== m.id))} aria-label="הסרה" className="shrink-0 text-ink-light hover:text-red-500"><X size={15} /></button>
              </div>
            )
          })}
        </div>
        <button type="button" onClick={() => setMarketing([...marketing, { id: uid('mk'), text: '', color: '#dc2626', enabled: true }])} className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
          <Plus size={14} /> הוספת טקסט
        </button>
      </Section>

      {/* ---- Gift wrap + breadcrumb ---- */}
      <Section icon={Tag} title="עטיפת מתנה ופירור">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={giftCustom} onChange={(e) => patch({ giftWrap: e.target.checked ? { enabled: true, price: 5 } : null })} className="h-4 w-4 accent-brand-500" />
          הגדרת עטיפת מתנה מותאמת למוצר (אחרת — ברירת מחדל גלובלית)
        </label>
        {giftCustom && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-black/10 bg-brand-50/40 p-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <input type="checkbox" checked={!!page.giftWrap.enabled} onChange={(e) => patch({ giftWrap: { ...page.giftWrap, enabled: e.target.checked } })} className="h-4 w-4 accent-brand-500" />
              מציע עטיפת מתנה
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2">
              <span className="text-xs text-ink-light">₪</span>
              <input type="number" value={page.giftWrap.price} onChange={(e) => patch({ giftWrap: { ...page.giftWrap, price: Number(e.target.value) || 0 } })} className="w-16 py-1.5 text-sm outline-none" />
            </div>
          </div>
        )}
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-ink-light">כותרת קטגוריה בפירור הלחם (אופציונלי)</span>
          <input value={page.breadcrumbLabel || ''} onChange={(e) => patch({ breadcrumbLabel: e.target.value })} placeholder="ברירת מחדל: שם הקטגוריה" className={inputCls} />
        </div>
      </Section>
    </div>
  )
}

// Compact eye toggle for enabling/disabling a row without deleting it.
function EnableBtn({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? 'מוצג באתר — לחצו לכיבוי' : 'מוסתר — לחצו להצגה'}
      aria-label={on ? 'כיבוי' : 'הפעלה'}
      className={`shrink-0 rounded-lg p-2 transition ${on ? 'text-brand-600 hover:bg-brand-50' : 'text-ink-light hover:bg-black/5'}`}
    >
      {on ? <Eye size={16} /> : <EyeOff size={16} />}
    </button>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-black/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
        <Icon size={16} className="text-brand-500" /> {title}
      </div>
      {children}
    </div>
  )
}
