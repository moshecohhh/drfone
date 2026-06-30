import { useState, useEffect, useRef } from 'react'
import { X, Save, Upload, ImageOff, Plus, Link2, Flame, BadgeCheck, Package, LayoutTemplate } from 'lucide-react'
import { useBrands } from '../../context/BrandsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { downscaleImage } from '../../utils/image.js'
import { Switch } from './ui.jsx'
import ColorPicker from './ColorPicker.jsx'
import ProductPageEditor from './ProductPageEditor.jsx'
import ImeiListEditor from './ImeiListEditor.jsx'

const MAX_IMAGES = 7

const emptyItem = {
  name: '',
  brand: 'samsung',
  category: '',
  price: '',
  oldPrice: '',
  cost: '', // private cost price (admin-only) — for profit tracking
  hasSerial: false, // device with a serial number / IMEI
  imeis: [], // one IMEI per unit; for IMEI-managed products stock = imeis.length
  imei1: '', // kept in sync with imeis[0]/[1] for search + back-compat
  imei2: '',
  stock: 1,
  description: '',
  badge: '',
  emoji: '📦',
  barcode: '',
  image: '',
  images: [],
  inStock: true,
  colors: [],
  tag: '', // '' | 'deal' | 'importer' | 'custom'  (visual product stamp)
  tagImage: '', // round-image used when tag === 'custom'
  page: {}, // product-page config (option groups, specs, marketing…) — see "דף המוצר" tab
}

// Colors may have been persisted as plain hex strings or a single { hex, image }
// by earlier builds; normalize every entry to { hex, name, images[] } so a color
// can be tied to MULTIPLE gallery images (the product page browses just those).
const normColors = (arr) =>
  (Array.isArray(arr) ? arr : []).map((c) => {
    if (typeof c === 'string') return { hex: c, name: '', images: [] }
    const images = Array.isArray(c.images) ? c.images.filter(Boolean) : c.image ? [c.image] : []
    return { hex: c.hex, name: c.name || '', images }
  })

// Modal form for creating/editing a single catalog item.
// `categories` is the active domain's category list (already excludes "all").
// `kind` adjusts wording and which fields show ('product' has stock; both have image).
export default function ItemFormModal({ open, onClose, onSave, item, categories, kind }) {
  const isService = kind === 'service'
  const { brands } = useBrands()
  const { fieldPresets } = useSettings()
  const { getCost } = useCatalogStore()
  const [form, setForm] = useState(emptyItem)
  const [initialForm, setInitialForm] = useState(null) // snapshot to detect unsaved changes
  const [confirmClose, setConfirmClose] = useState(false)
  const [tab, setTab] = useState('product') // 'product' | 'page' (products only)
  const [draftColor, setDraftColor] = useState('#3B82F6')
  const [urlDraft, setUrlDraft] = useState('')
  const fileRef = useRef(null)
  const tagFileRef = useRef(null)

  // Pick an image for the custom round tag → enables the 'custom' tag.
  const onTagFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Tag badge is tiny on screen — a small, compressed image is plenty.
    downscaleImage(file, 240, 0.85)
      .then((url) => setForm((f) => ({ ...f, tagImage: url, tag: 'custom' })))
      .catch(() => {})
    e.target.value = ''
  }

  useEffect(() => {
    let next
    if (item) {
      const images = Array.isArray(item.images) && item.images.length
        ? item.images
        : item.image
          ? [item.image]
          : []
      next = {
        ...emptyItem,
        ...item,
        oldPrice: item.oldPrice ?? '',
        cost: getCost(item.id) || '', // private cost lives in a separate admin table
        // IMEI list: prefer the array; fall back to the legacy imei1/imei2 pair.
        imeis: Array.isArray(item.imeis) && item.imeis.length
          ? item.imeis
          : [item.imei1, item.imei2].filter(Boolean),
        images,
        image: images[0] || '',
        colors: normColors(item.colors),
        page: item.page || {},
      }
    } else {
      next = { ...emptyItem, category: categories[0]?.id || '', brand: brands[0]?.id || '', images: [], colors: [], page: {} }
    }
    setForm(next)
    setInitialForm(next) // baseline for the unsaved-changes check
    setTab('product')
    setConfirmClose(false)
  }, [item, categories, open])

  if (!open) return null

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Unsaved-changes guard: ask before discarding edits when closing.
  const dirty = initialForm && JSON.stringify(form) !== JSON.stringify(initialForm)
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose())

  // ---- Image gallery (up to MAX_IMAGES) ----
  const addImages = (urls) =>
    setForm((f) => {
      const next = [...f.images, ...urls.filter(Boolean)].slice(0, MAX_IMAGES)
      return { ...f, images: next, image: next[0] || '' }
    })
  const removeImage = (idx) =>
    setForm((f) => {
      const removed = f.images[idx]
      const next = f.images.filter((_, i) => i !== idx)
      return {
        ...f,
        images: next,
        image: next[0] || '',
        // Drop the removed image from any color's tagged-image set.
        colors: f.colors.map((c) => ({ ...c, images: (Array.isArray(c.images) ? c.images : []).filter((s) => s !== removed) })),
      }
    })

  const onFiles = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    // Downscale + JPEG-compress each photo so the catalog payload stays small.
    Promise.all(files.map((file) => downscaleImage(file, 1000, 0.82).catch(() => null))).then((urls) =>
      addImages(urls.filter(Boolean)),
    )
    e.target.value = '' // allow re-selecting the same file
  }

  // ---- Colors (each can be tied to several gallery images + a name) ----
  const addColor = () => {
    const hex = draftColor.toUpperCase()
    setForm((f) => (f.colors.some((c) => c.hex === hex) ? f : { ...f, colors: [...f.colors, { hex, name: '', images: [] }] }))
  }
  const removeColor = (hex) => setForm((f) => ({ ...f, colors: f.colors.filter((c) => c.hex !== hex) }))
  const setColorName = (hex, name) =>
    setForm((f) => ({ ...f, colors: f.colors.map((c) => (c.hex === hex ? { ...c, name } : c)) }))
  // Toggle a gallery image in/out of a color's image set.
  const toggleColorImage = (hex, src) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.map((c) => {
        if (c.hex !== hex) return c
        const images = Array.isArray(c.images) ? c.images : []
        return { ...c, images: images.includes(src) ? images.filter((s) => s !== src) : [...images, src] }
      }),
    }))

  const buildPayload = () => {
    // For an IMEI-managed product, stock is DERIVED from the IMEI list; otherwise
    // it's the plain stock number.
    const cleanImeis = (Array.isArray(form.imeis) ? form.imeis : [])
      .map((s) => String(s || '').replace(/\D/g, ''))
      .filter(Boolean)
    const serial = !!form.hasSerial && !isService
    const stock = isService
      ? undefined
      : serial
        ? cleanImeis.length
        : Math.max(0, Number(form.stock) || 0)
    return {
      ...form,
      image: form.images[0] || '',
      price: Number(form.price) || 0,
      oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
      cost: form.cost === '' ? 0 : Number(form.cost) || 0,
      // Serial / IMEI list (cleared when the toggle is off). imei1/imei2 mirror
      // the first two entries for search + back-compat.
      hasSerial: !!form.hasSerial,
      imeis: serial ? cleanImeis : [],
      imei1: serial ? (cleanImeis[0] || '') : '',
      imei2: serial ? (cleanImeis[1] || '') : '',
      // For products, availability is driven by stock.
      ...(isService ? {} : { stock, inStock: stock > 0 }),
    }
  }
  // onSave persists AND closes the modal (the parent owns `open`).
  const submit = (e) => {
    e.preventDefault()
    onSave(buildPayload())
  }

  const brandOptions = brands

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white px-6 py-4">
          <h3 className="text-lg font-extrabold text-ink">
            {item ? 'עריכת' : 'הוספת'} {isService ? 'שירות' : 'מוצר'}
          </h3>
          <button onClick={requestClose} aria-label="סגירה" className="text-ink-light hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {/* Unsaved-changes confirmation */}
        {confirmClose && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <h4 className="text-base font-extrabold text-ink">שמירת השינויים?</h4>
              <p className="mt-1 text-sm text-ink-light">ביצעת שינויים שלא נשמרו. מה לעשות?</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmClose(false); onSave(buildPayload()) }}
                  className="rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
                >
                  שמירה
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmClose(false); onClose() }}
                  className="rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-ink hover:bg-black/5"
                >
                  אל תשמור
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClose(false)}
                  className="rounded-xl py-2 text-sm font-semibold text-ink-light hover:text-ink"
                >
                  חזרה לעריכה
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs — product details vs. the product-page builder (products only) */}
        {!isService && (
          <div className="flex gap-1 border-b border-black/5 px-6 pt-3">
            <TabBtn active={tab === 'product'} onClick={() => setTab('product')} Icon={Package}>פרטי המוצר</TabBtn>
            <TabBtn active={tab === 'page'} onClick={() => setTab('page')} Icon={LayoutTemplate}>דף המוצר</TabBtn>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 p-6">
          {/* ===== Product details tab ===== */}
          <div className={tab === 'product' ? 'space-y-4' : 'hidden'}>
          {/* Image gallery (up to MAX_IMAGES) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-light">תמונות המוצר</span>
              <span className="text-[11px] text-ink-light">{form.images.length}/{MAX_IMAGES}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.images.map((src, idx) => (
                <div
                  key={`${idx}-${src.slice(0, 24)}`}
                  className="group relative h-16 w-16 overflow-hidden rounded-xl border border-black/10 bg-brand-50"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/55 text-center text-[9px] font-semibold text-white">
                      ראשית
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    aria-label="הסרת תמונה"
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {form.images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-black/20 text-ink-light transition hover:border-brand-400 hover:text-brand-600"
                >
                  <Upload size={16} />
                  <span className="text-[10px] font-semibold">העלאה</span>
                </button>
              )}
              {form.images.length === 0 && (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-black/10 bg-brand-50 text-2xl">
                  <span>{form.emoji || <ImageOff size={20} />}</span>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="או הדבק כתובת תמונה (URL)"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (urlDraft.trim()) { addImages([urlDraft.trim()]); setUrlDraft('') }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => { if (urlDraft.trim()) { addImages([urlDraft.trim()]); setUrlDraft('') } }}
                disabled={!urlDraft.trim() || form.images.length >= MAX_IMAGES}
                className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-ink hover:bg-black/5 disabled:opacity-40"
              >
                הוספה
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
          </div>

          <Row label={isService ? 'שם השירות' : 'שם המוצר'}>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </Row>

          <div className="grid grid-cols-2 gap-4">
            <Row label="מותג">
              <select value={form.brand} onChange={(e) => set('brand', e.target.value)} className={inputCls}>
                {brandOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="קטגוריה">
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Row>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Row label="מחיר (₪)">
              <input
                required
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className={inputCls}
              />
            </Row>
            <Row label="מחיר קודם (אופציונלי)">
              <input
                type="number"
                min="0"
                value={form.oldPrice}
                onChange={(e) => set('oldPrice', e.target.value)}
                className={inputCls}
              />
            </Row>
          </div>

          {!isService && (
            <Row label="מחיר עלות — פנימי, מוצג רק לך (לחישוב רווח)">
              <input
                type="number"
                min="0"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
                placeholder="כמה המוצר עלה לך"
                className={inputCls}
              />
            </Row>
          )}

          <Row label="תיאור">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={inputCls}
            />
          </Row>

          <div className="grid grid-cols-2 gap-4">
            <Row label="תווית (Badge)">
              <input value={form.badge} onChange={(e) => set('badge', e.target.value)} className={inputCls} />
            </Row>
            <Row label="אימוג׳י">
              <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={4} className={inputCls} />
            </Row>
          </div>

          {/* Barcode — internal only, never shown to customers. Lets a scan in
              the storefront search jump straight to this product. */}
          {!isService && (
            <Row label="ברקוד (פנימי — לא מוצג ללקוח)">
              <input
                value={form.barcode}
                onChange={(e) => set('barcode', e.target.value)}
                placeholder="סרקו או הקלידו ברקוד"
                dir="ltr"
                className={`${inputCls} text-right font-mono`}
              />
            </Row>
          )}

          {/* Serial number / IMEI — for individually-tracked devices. */}
          {!isService && (
            <div className="rounded-xl border border-black/10 bg-brand-50/30 p-3">
              <Switch checked={!!form.hasSerial} onChange={(v) => set('hasSerial', v)} label="מוצר עם מספר סידורי (IMEI)" />
              {form.hasSerial && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-ink-light">
                    רשימת IMEI — שורה לכל יחידה. המלאי נקבע אוטומטית לפי מספר ה-IMEI
                    {` (כרגע: ${(form.imeis || []).filter((s) => String(s || '').trim()).length})`}
                  </p>
                  <ImeiListEditor imeis={form.imeis || []} onChange={(next) => set('imeis', next)} />
                </div>
              )}
            </div>
          )}

          {/* Product tag — a visual stamp on the card. Only ONE of the two may
              be active (turning one on switches the other off). */}
          {!isService && (
            <div className="rounded-xl border border-black/10 p-4">
              <span className="mb-2 block text-xs font-semibold text-ink-light">תג מוצר (ניתן לבחור אחד בלבד)</span>
              <div className="space-y-2">
                <label className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Flame size={16} className="text-orange-500" /> תג מבצע
                  </span>
                  <Switch checked={form.tag === 'deal'} onChange={(v) => set('tag', v ? 'deal' : '')} label="תג מבצע" />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <BadgeCheck size={16} className="text-blue-600" /> תג יבואן רשמי
                  </span>
                  <Switch checked={form.tag === 'importer'} onChange={(v) => set('tag', v ? 'importer' : '')} label="תג יבואן רשמי" />
                </label>

                {/* Custom round-image tag — pick a photo/logo for a circular badge. */}
                <div className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <button
                      type="button"
                      onClick={() => tagFileRef.current?.click()}
                      title="בחירת תמונה לתג"
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-black/25 text-ink-light transition hover:border-brand-400 hover:text-brand-600"
                    >
                      {form.tagImage ? (
                        <img src={form.tagImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Plus size={16} />
                      )}
                    </button>
                    תג תמונה עגול
                  </span>
                  <Switch
                    checked={form.tag === 'custom'}
                    onChange={(v) => {
                      if (v) {
                        if (form.tagImage) set('tag', 'custom')
                        else tagFileRef.current?.click()
                      } else {
                        set('tag', '')
                      }
                    }}
                    label="תג תמונה עגול"
                  />
                </div>
                <input ref={tagFileRef} type="file" accept="image/*" onChange={onTagFile} className="hidden" />
              </div>
            </div>
          )}

          {/* Colors — products only. Each color can be tied to a gallery image,
              so picking that color on the storefront swaps the shown image. */}
          {!isService && (
            <div className="rounded-xl border border-black/10 bg-brand-50/30 p-4">
              <span className="mb-2 block text-xs font-semibold text-ink-light">צבעים זמינים למוצר</span>

              {/* Selected colors — per color: swatch + hex + name, then a grid of
                  gallery images to tag this color with. Picking that color on the
                  storefront shows ONLY its tagged images. */}
              {form.colors.length > 0 ? (
                <div className="mb-3 space-y-2">
                  {form.colors.map((c) => (
                    <div key={c.hex} className="rounded-lg border border-black/10 bg-white p-2">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 shrink-0 rounded-full border border-black/15" style={{ background: c.hex }} />
                        <span dir="ltr" className="w-16 shrink-0 font-mono text-xs text-ink">{c.hex}</span>
                        <input
                          value={c.name || ''}
                          onChange={(e) => setColorName(c.hex, e.target.value)}
                          placeholder="שם הצבע (לדוגמה: ורוד)"
                          className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1 text-xs text-ink outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeColor(c.hex)}
                          aria-label={`הסרת ${c.hex}`}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-light hover:bg-black/10 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Image tagging — toggle which gallery images belong to this color */}
                      {form.images.length > 0 ? (
                        <div className="mt-2">
                          <span className="mb-1 flex items-center gap-1 text-[11px] text-ink-light">
                            <Link2 size={12} /> תמונות הצבע ({(c.images || []).length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {form.images.map((src, i) => {
                              const on = (c.images || []).includes(src)
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => toggleColorImage(c.hex, src)}
                                  title={`תמונה ${i + 1}`}
                                  className={`h-10 w-10 overflow-hidden rounded-md border-2 transition ${on ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                  <img src={src} alt="" className="h-full w-full object-cover" />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-light"><ImageOff size={12} /> העלו תמונות למוצר כדי לשייך אותן לצבע</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-3 text-xs text-ink-light">לא נבחרו צבעים. בחרו צבע למטה והוסיפו אותו לרשימה.</p>
              )}

              <ColorPicker value={draftColor} onChange={setDraftColor} />

              <button
                type="button"
                onClick={addColor}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-500 bg-white py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                <Plus size={16} /> הוספת הצבע לרשימה
              </button>
            </div>
          )}

          {/* Inventory — products only */}
          {isService ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => set('inStock', e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              זמין לתיקון
            </label>
          ) : form.hasSerial ? (
            <Row label="כמות במלאי">
              <input
                type="number"
                value={(form.imeis || []).filter((s) => String(s || '').trim()).length}
                readOnly
                className={`${inputCls} bg-black/5 text-ink-light`}
                title="המלאי נקבע אוטומטית לפי מספר ה-IMEI"
              />
            </Row>
          ) : (
            <Row label="כמות במלאי">
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                className={inputCls}
              />
            </Row>
          )}
          </div>

          {/* ===== Product-page builder tab ===== */}
          {!isService && (
            <div className={tab === 'page' ? '' : 'hidden'}>
              <ProductPageEditor
                value={form.page}
                onChange={(page) => set('page', page)}
                presets={fieldPresets}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Save size={16} /> שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'

function Row({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-light">{label}</span>
      {children}
    </label>
  )
}

function TabBtn({ active, onClick, Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-bold transition ${
        active ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-light hover:text-ink'
      }`}
    >
      <Icon size={16} /> {children}
    </button>
  )
}
