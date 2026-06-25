import { useState, useMemo, useRef } from 'react'
import { Store, Wrench, Plus, Pencil, Trash2, RotateCcw, AlertTriangle, ImagePlus, Tags, Flame } from 'lucide-react'
import { DOMAINS } from '../../context/AppContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { downscaleImage } from '../../utils/image.js'
import { PanelHead, Table, PrimaryBtn, GhostBtn, IconBtn, PanelSearch } from './ui.jsx'
import ItemFormModal from './ItemFormModal.jsx'
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
export default function CatalogPanel({ lowStockInitial = false }) {
  const { getItems, getCategories, getCategoriesWithAll, addItem, updateItem, deleteItem, resetDomain } =
    useCatalogStore()
  const { brands, brandLabel } = useBrands()
  const [domain, setDomain] = useState(DOMAINS.STORE)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [lowOnly, setLowOnly] = useState(lowStockInitial)
  const [brandFilter, setBrandFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [query, setQuery] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const imgInputRef = useRef(null)
  const uploadIdRef = useRef(null)

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
          (!!it.barcode && String(it.barcode).toLowerCase().includes(term)),
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
          <div className="flex gap-2">
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
          placeholder={isService ? 'חיפוש שירות…' : 'חיפוש מוצר / ברקוד…'}
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
          <tr key={item.id} className="hover:bg-brand-50/40">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
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
                <span className="font-semibold text-ink">{item.name}</span>
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
    </div>
  )
}

const filterCls =
  'rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink-light outline-none transition hover:text-ink focus:border-brand-500'
