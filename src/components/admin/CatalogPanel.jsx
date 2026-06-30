import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { Store, Wrench, Plus, Pencil, Trash2, RotateCcw, AlertTriangle, ImagePlus, Tags, Flame, Star, ChevronDown, Check, Smartphone } from 'lucide-react'
import { DOMAINS } from '../../context/AppContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { downscaleImage } from '../../utils/image.js'
import { PanelHead, Table, PrimaryBtn, GhostBtn, IconBtn, PanelSearch } from './ui.jsx'
import ItemFormModal from './ItemFormModal.jsx'
import ImeiListEditor from './ImeiListEditor.jsx'
import DomainToggle from './DomainToggle.jsx'
import CategoryManager from './CategoryManager.jsx'

const MAX_IMAGES = 7

const META = {
  [DOMAINS.STORE]: { label: 'חנות', kind: 'product' },
  [DOMAINS.LAB]: { label: 'מעבדה', kind: 'service' },
}

const LOW_STOCK_THRESHOLD = 3

// Store/Lab item management — kept strictly per-domain via the domain toggle.
// `lowStockInitial` (from the dashboard drilldown) pre-enables the low-stock filter.
export default function CatalogPanel({ lowStockInitial = false, editTarget = null }) {
  const { getItems, getCategories, getCategoriesWithAll, addItem, updateItem, deleteItem, resetDomain, importItems } =
    useCatalogStore()
  const [importing, setImporting] = useState('')
  const runImport = async (brandKey) => {
    if (importing) return
    setImporting(brandKey)
    try {
      const { samsungProducts, appleProducts, DEVICE_CATEGORIES } = await import('../../data/deviceCatalog.js')
      const items = brandKey === 'samsung' ? samsungProducts() : appleProducts()
      const res = await importItems(DOMAINS.STORE, items, DEVICE_CATEGORIES)
      if (res.ok) alert(`יובאו ${res.count} דגמים בהצלחה. ניתן לערוך מחיר, מלאי ותמונות לכל מוצר.`)
      else alert(`הייבוא נכשל: ${res.error || 'שגיאה'}`)
    } finally {
      setImporting('')
    }
  }
  const { brands, brandLabel } = useBrands()
  const [domain, setDomain] = useState(DOMAINS.STORE)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [lowOnly, setLowOnly] = useState(lowStockInitial)
  const [brandFilter, setBrandFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  // IMEI inventory UI: which rows have their IMEI list expanded, the editable
  // stock draft per row, and the "enter N new IMEIs" prompt after a stock bump.
  const [expanded, setExpanded] = useState({})
  const [stockDraft, setStockDraft] = useState({})
  const [imeiPrompt, setImeiPrompt] = useState(null) // { id, list: string[] }

  // Count of real IMEIs on a product, and a helper to persist a new IMEI list
  // (stock + imei1/imei2 + inStock all derive from it).
  // Prefer the IMEI array; fall back to the legacy imei1/imei2 pair so older
  // products still show their numbers (a re-save migrates them to the array).
  const imeiList = (item) =>
    Array.isArray(item.imeis) && item.imeis.length ? item.imeis : [item.imei1, item.imei2].filter(Boolean)
  const imeiCount = (item) => imeiList(item).filter((s) => String(s || '').trim()).length
  const saveImeis = (item, list) => {
    const clean = (list || []).map((s) => String(s || '').replace(/\D/g, '')).filter(Boolean)
    updateItem(domain, item.id, {
      imeis: clean, stock: clean.length, inStock: clean.length > 0,
      imei1: clean[0] || '', imei2: clean[1] || '',
    })
  }
  // "אישור" on the stock field of an IMEI product: bump → prompt for the new
  // IMEIs; reduce → tell the user to remove specific ones from the list.
  const confirmStock = (item) => {
    const target = Math.max(0, Number(stockDraft[item.id]) || 0)
    const cur = imeiCount(item)
    if (target === cur) { setStockDraft((d) => { const n = { ...d }; delete n[item.id]; return n }); return }
    if (target < cur) {
      setExpanded((e) => ({ ...e, [item.id]: true }))
      alert('להפחתת מלאי במוצר מנוהל-IMEI, פתחו את רשימת ה-IMEI ומחקו את המספרים הרצויים.')
      return
    }
    setImeiPrompt({ id: item.id, list: Array(target - cur).fill('') })
  }
  const [query, setQuery] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const imgInputRef = useRef(null)
  const uploadIdRef = useRef(null)

  // Launched from the global search → jump to the right domain and open the
  // item's edit modal directly. `nonce` lets the same item re-trigger.
  useEffect(() => {
    if (!editTarget?.id) return
    const dom = editTarget.domain || DOMAINS.STORE
    setDomain(dom)
    const item = getItems(dom).find((it) => it.id === editTarget.id)
    if (item) {
      setEditing(item)
      setModalOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTarget?.nonce])

  // Quick image edit straight from the list — append uploaded files to the
  // product's gallery without opening the full edit modal.
  const onQuickImages = (e) => {
    const id = uploadIdRef.current
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!id || !files.length) return
    const product = allItems.find((it) => it.id === id)
    const current = Array.isArray(product?.images) && product.images.length
      ? product.images
      : product?.image
        ? [product.image]
        : []
    Promise.all(files.map((file) => downscaleImage(file, 1000, 0.82).catch(() => null))).then((results) => {
      const images = [...current, ...results.filter(Boolean)].slice(0, MAX_IMAGES)
      updateItem(domain, id, { images, image: images[0] || '' })
    })
  }
  const openImagePicker = (id) => {
    uploadIdRef.current = id
    imgInputRef.current?.click()
  }

  const meta = META[domain]
  const isService = meta.kind === 'service'
  const allItems = getItems(domain)
  const editableCats = getCategories(domain)
  const allCats = getCategoriesWithAll(domain)
  const catLabel = (id) => allCats.find((c) => c.id === id)?.label || id

  // Reset the per-domain filters/sort (used when switching Store/Lab).
  const resetFilters = () => {
    setBrandFilter('all')
    setCatFilter('all')
    setSortBy('default')
    setLowOnly(false)
    setQuery('')
  }

  // Apply search + low-stock + brand + category filters, then the chosen sort.
  const items = useMemo(() => {
    let list = allItems
    const term = query.trim().toLowerCase()
    if (term) {
      list = list.filter(
        (it) =>
          (it.name || '').toLowerCase().includes(term) ||
          (it.description || '').toLowerCase().includes(term) ||
          brandLabel(it.brand).toLowerCase().includes(term) ||
          catLabel(it.category).toLowerCase().includes(term) ||
          (!!it.barcode && String(it.barcode).toLowerCase().includes(term)) ||
          (!!it.imei1 && String(it.imei1).includes(term)) ||
          (!!it.imei2 && String(it.imei2).includes(term)) ||
          (Array.isArray(it.imeis) && it.imeis.some((m) => String(m).includes(term))),
      )
    }
    if (lowOnly && !isService) list = list.filter((it) => (Number(it.stock) || 0) <= LOW_STOCK_THRESHOLD)
    if (brandFilter !== 'all') list = list.filter((it) => it.brand === brandFilter)
    if (catFilter !== 'all') list = list.filter((it) => it.category === catFilter)
    const sorters = {
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'he'),
      'price-asc': (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
      'price-desc': (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0),
      'stock-asc': (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0),
      'stock-desc': (a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0),
    }
    return sortBy !== 'default' && sorters[sortBy] ? [...list].sort(sorters[sortBy]) : list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, lowOnly, isService, brandFilter, catFilter, sortBy, query])

  const save = (data) => {
    if (editing) updateItem(domain, editing.id, data)
    else addItem(domain, data)
    setModalOpen(false)
  }

  return (
    <div>
      <PanelHead
        title="ניהול קטלוג"
        subtitle="מוצרי החנות ושירותי המעבדה — בהפרדה מלאה."
        action={
          <div className="flex flex-wrap gap-2">
            {!isService && (
              <>
                <GhostBtn onClick={() => runImport('samsung')} disabled={!!importing}>
                  <Plus size={16} /> {importing === 'samsung' ? 'מייבא…' : 'ייבוא דגמי סמסונג'}
                </GhostBtn>
                <GhostBtn onClick={() => runImport('apple')} disabled={!!importing}>
                  <Plus size={16} /> {importing === 'apple' ? 'מייבא…' : 'ייבוא דגמי אפל'}
                </GhostBtn>
              </>
            )}
            <GhostBtn onClick={() => setShowCategories((v) => !v)}>
              <Tags size={16} /> ניהול קטגוריות
            </GhostBtn>
            <GhostBtn
              onClick={() =>
                window.confirm(`לאפס את ${meta.label} לברירת מחדל?`) && resetDomain(domain)
              }
            >
              <RotateCcw size={16} /> איפוס
            </GhostBtn>
            <PrimaryBtn
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <Plus size={16} /> הוספת {isService ? 'שירות' : 'מוצר'}
            </PrimaryBtn>
          </div>
        }
      />

      {/* Inline category management for the active domain */}
      {showCategories && (
        <div className="mb-5">
          <CategoryManager domain={domain} domainLabel={meta.label} />
        </div>
      )}

      {/* Hidden input for quick in-list image uploads */}
      <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={onQuickImages} className="hidden" />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <DomainToggle
          domain={domain}
          onChange={(d) => {
            setDomain(d)
            resetFilters()
          }}
          options={[
            { id: DOMAINS.STORE, label: 'חנות', Icon: Store },
            { id: DOMAINS.LAB, label: 'מעבדה', Icon: Wrench },
          ]}
        />

        <PanelSearch
          value={query}
          onChange={setQuery}
          placeholder={isService ? 'חיפוש שירות…' : 'חיפוש מוצר / ברקוד / IMEI…'}
          className="w-full sm:w-56"
        />

        {/* Filter: brand */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className={filterCls}
          aria-label="סינון לפי מותג"
        >
          <option value="all">כל המותגים</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>

        {/* Filter: category */}
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className={filterCls}
          aria-label="סינון לפי קטגוריה"
        >
          <option value="all">כל הקטגוריות</option>
          {editableCats.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={filterCls}
          aria-label="מיון"
        >
          <option value="default">מיון: ברירת מחדל</option>
          <option value="name">שם א׳-ת׳</option>
          <option value="price-asc">מחיר: מהנמוך לגבוה</option>
          <option value="price-desc">מחיר: מהגבוה לנמוך</option>
          {!isService && <option value="stock-asc">מלאי: מהנמוך לגבוה</option>}
          {!isService && <option value="stock-desc">מלאי: מהגבוה לנמוך</option>}
        </select>

        {!isService && (
          <button
            type="button"
            onClick={() => setLowOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              lowOnly ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-black/10 text-ink-light hover:text-ink'
            }`}
          >
            <AlertTriangle size={15} /> מלאי נמוך בלבד
          </button>
        )}

        {(brandFilter !== 'all' || catFilter !== 'all' || sortBy !== 'default' || lowOnly) && (
          <span className="text-xs text-ink-light">{items.length} תוצאות</span>
        )}
      </div>

      <Table columns={['פריט', 'מותג', 'קטגוריה', 'מחיר ₪', isService ? 'זמינות' : 'מלאי', '']}>
        {items.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-ink-light">
              אין פריטים. לחצו על ״הוספה״.
            </td>
          </tr>
        )}
        {items.map((item) => (
          <Fragment key={item.id}>
          <tr className="hover:bg-brand-50/40">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {/* IMEI list expander (devices only) */}
                {item.hasSerial && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                    aria-label="רשימת IMEI"
                    title="רשימת IMEI"
                    className="shrink-0 rounded-lg p-1 text-ink-light hover:bg-black/5 hover:text-ink"
                  >
                    <ChevronDown size={16} className={`transition-transform ${expanded[item.id] ? '' : '-rotate-90'}`} />
                  </button>
                )}
                {/* Quick image edit — hover shows an edit overlay; click adds images */}
                <button
                  type="button"
                  onClick={() => openImagePicker(item.id)}
                  title="הוספת/החלפת תמונה"
                  aria-label="עריכת תמונת המוצר"
                  className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-lg"
                >
                  {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <span>{item.emoji}</span>}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus size={15} />
                  </span>
                </button>
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{item.name}</span>
                  {item.hasSerial && (
                    <span className="block text-[11px] text-ink-light">{imeiCount(item)} יח׳ IMEI במלאי</span>
                  )}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-ink-light">{brandLabel(item.brand)}</td>
            <td className="px-4 py-3 text-ink-light">{catLabel(item.category)}</td>
            <td className="px-4 py-3">
              <input
                type="number"
                min="0"
                value={item.price}
                onChange={(e) => updateItem(domain, item.id, { price: Number(e.target.value) || 0 })}
                className="w-24 rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
            </td>
            <td className="px-4 py-3">
              {isService ? (
                <button
                  onClick={() => updateItem(domain, item.id, { inStock: !item.inStock })}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.inStock ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {item.inStock ? 'זמין' : 'לא זמין'}
                </button>
              ) : item.hasSerial ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={stockDraft[item.id] ?? imeiCount(item)}
                    onChange={(e) => setStockDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                    className={`w-16 rounded-lg border px-2 py-1 text-sm outline-none focus:border-brand-500 ${
                      imeiCount(item) <= 3 ? 'border-amber-300 bg-amber-50' : 'border-black/10'
                    }`}
                  />
                  <IconBtn type="button" title="אישור עדכון מלאי" onClick={() => confirmStock(item)}><Check size={16} /></IconBtn>
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  value={item.stock ?? 0}
                  onChange={(e) => {
                    const stock = Math.max(0, Number(e.target.value) || 0)
                    updateItem(domain, item.id, { stock, inStock: stock > 0 })
                  }}
                  className={`w-20 rounded-lg border px-2 py-1 text-sm outline-none focus:border-brand-500 ${
                    (item.stock ?? 0) <= 3 ? 'border-amber-300 bg-amber-50' : 'border-black/10'
                  }`}
                />
              )}
            </td>
            <td className="px-4 py-3 text-left">
              <div className="flex items-center justify-end gap-1">
                {/* Mark/unmark as a HOT DEAL (store products only) */}
                {!isService && (
                  <button
                    type="button"
                    onClick={() => updateItem(domain, item.id, { deal: !item.deal })}
                    aria-pressed={!!item.deal}
                    title={item.deal ? 'הסרה ממבצעים חמים' : 'סימון כמבצע חם'}
                    className={`rounded-lg p-2 transition ${
                      item.deal ? 'bg-orange-100 text-orange-600' : 'text-ink-light hover:bg-orange-50 hover:text-orange-500'
                    }`}
                  >
                    <Flame size={16} fill={item.deal ? 'currentColor' : 'none'} />
                  </button>
                )}
                {/* Mark/unmark as a FEATURED product (store products only) */}
                {!isService && (
                  <button
                    type="button"
                    onClick={() => updateItem(domain, item.id, { featured: !item.featured })}
                    aria-pressed={!!item.featured}
                    title={item.featured ? 'הסרה ממוצרים נבחרים' : 'סימון כמוצר נבחר'}
                    className={`rounded-lg p-2 transition ${
                      item.featured ? 'bg-amber-100 text-amber-600' : 'text-ink-light hover:bg-amber-50 hover:text-amber-500'
                    }`}
                  >
                    <Star size={16} fill={item.featured ? 'currentColor' : 'none'} />
                  </button>
                )}
                <IconBtn
                  aria-label="עריכה"
                  onClick={() => {
                    setEditing(item)
                    setModalOpen(true)
                  }}
                >
                  <Pencil size={16} />
                </IconBtn>
                <IconBtn danger aria-label="מחיקה" onClick={() => window.confirm(`למחוק את "${item.name}"?`) && deleteItem(domain, item.id)}>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
            </td>
          </tr>
          {item.hasSerial && expanded[item.id] && (
            <tr className="bg-brand-50/30">
              <td colSpan={6} className="px-4 pb-3">
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-ink-light">רשימת IMEI ({imeiCount(item)} יח׳)</p>
                  <ImeiListEditor imeis={imeiList(item)} onChange={(next) => saveImeis(item, next)} />
                </div>
              </td>
            </tr>
          )}
          </Fragment>
        ))}
      </Table>

      <ItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={save}
        item={editing}
        categories={editableCats}
        kind={meta.kind}
      />

      {/* Enter the IMEIs for newly-added units (after bumping an IMEI product's stock) */}
      {imeiPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setImeiPrompt(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-extrabold text-ink"><Smartphone size={18} /> הזנת IMEI ליחידות החדשות</h3>
            <p className="mb-3 text-sm text-ink-light">הזינו {imeiPrompt.list.length} מספרי IMEI (או סרקו עם המצלמה):</p>
            <ImeiListEditor imeis={imeiPrompt.list} onChange={(next) => setImeiPrompt((p) => ({ ...p, list: next }))} />
            <div className="mt-4 flex gap-2">
              <PrimaryBtn
                type="button"
                className="flex-1"
                onClick={() => {
                  const item = getItems(domain).find((it) => it.id === imeiPrompt.id)
                  if (item) {
                    const entered = imeiPrompt.list.map((s) => String(s || '').replace(/\D/g, '')).filter(Boolean)
                    saveImeis(item, [...imeiList(item).filter(Boolean), ...entered])
                  }
                  setStockDraft((d) => { const n = { ...d }; delete n[imeiPrompt.id]; return n })
                  setImeiPrompt(null)
                }}
              >
                שמירה
              </PrimaryBtn>
              <GhostBtn type="button" onClick={() => setImeiPrompt(null)}>ביטול</GhostBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const filterCls =
  'rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink-light outline-none transition hover:text-ink focus:border-brand-500'
