import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { ChevronLeft, ShoppingCart, Gift, Check } from 'lucide-react'
import { DOMAINS, useApp } from '../context/AppContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import Header from '../components/Header.jsx'
import CartDrawer from '../components/CartDrawer.jsx'
import Footer from '../components/Footer.jsx'
import WhatsAppButton from '../components/WhatsAppButton.jsx'
import ProductGallery from '../components/ProductGallery.jsx'

// Normalize colors to { hex, image } (older data stored plain hex strings).
const normColors = (arr) =>
  (Array.isArray(arr) ? arr : []).map((c) =>
    typeof c === 'string' ? { hex: c, image: '' } : { hex: c.hex, image: c.image || '' },
  )

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { store, getCategoriesWithAll } = useCatalogStore()
  const { setCategory, switchDomain, goHome } = useApp()
  const { addItem, setOpen } = useCart()
  const { productPage, paymentMethods } = useSettings()

  const product = store.find((p) => p.id === id)

  // Resolve the page config: a product inherits the global toggle unless it
  // explicitly opts out (page.enabled === false).
  const page = product?.page || {}
  const pageEnabled = productPage.enabledGlobally && page.enabled !== false

  const colors = useMemo(() => normColors(product?.colors), [product])
  const images = useMemo(
    () =>
      Array.isArray(product?.images) && product.images.length
        ? product.images
        : product?.image
          ? [product.image]
          : [],
    [product],
  )

  const [selectedColor, setSelectedColor] = useState(colors[0]?.hex || '')
  const [activeImage, setActiveImage] = useState(colors[0]?.image || images[0] || '')
  // { [groupId]: optionId }
  const [selected, setSelected] = useState({})
  const [giftWrap, setGiftWrap] = useState(false)

  // The header (logo + category bar) AND the breadcrumb bar stay locked at the
  // top; the sticky image pins JUST BELOW both, never sliding up behind them.
  // Heights vary with the viewport, so measure them and use them as offsets.
  const bcRef = useRef(null)
  const [headerH, setHeaderH] = useState(96)
  const [bcH, setBcH] = useState(48)
  useEffect(() => {
    const measure = () => {
      const h = document.querySelector('header')?.getBoundingClientRect().height
      if (h) setHeaderH(Math.round(h))
      const b = bcRef.current?.getBoundingClientRect().height
      if (b) setBcH(Math.round(b))
    }
    measure()
    const t = setTimeout(measure, 200) // re-measure once fonts/layout settle
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Only items that aren't switched off in the admin are shown (disabled items
  // stay in the config but never render).
  const optionGroups = (Array.isArray(page.optionGroups) ? page.optionGroups : []).filter((g) => g.enabled !== false)
  const specs = (Array.isArray(page.specs) ? page.specs : []).filter((s) => s.enabled !== false)
  const rawMarketing = Array.isArray(page.marketing) && page.marketing.length ? page.marketing : productPage.defaultMarketing || []
  const marketing = rawMarketing.filter((m) => m.enabled !== false)
  const giftCfg = page.giftWrap || productPage.giftWrapDefault || { enabled: false, price: 0 }

  // Installments: a product can hide them or override the count; otherwise the
  // global default applies.
  const installmentsVisible = (page.installmentsVisible ?? productPage.installmentsVisible) !== false
  const installmentsCount = Number(page.installmentsCount) > 1 ? Number(page.installmentsCount) : Number(productPage.installmentsCount) || 1

  // A group can be single-choice (selected[id] = optionId) or multi-select
  // (selected[id] = [optionIds]); normalise both to an array of chosen ids.
  const selectedIdsFor = (g) => {
    const v = selected[g.id]
    if (g.multi) return Array.isArray(v) ? v : []
    return v ? [v] : []
  }

  // ---- Price = base + every selected option delta + gift wrap ----
  const base = Number(product?.price) || 0
  const optionsTotal = optionGroups.reduce((sum, g) => {
    return sum + selectedIdsFor(g).reduce((s, id) => {
      const opt = g.options?.find((o) => o.id === id)
      return s + (opt ? Number(opt.priceDelta) || 0 : 0)
    }, 0)
  }, 0)
  const giftPrice = giftWrap ? Number(giftCfg.price) || 0 : 0
  const unitPrice = base + optionsTotal + giftPrice

  // Required groups with nothing chosen block "add to cart".
  const missingRequired = optionGroups.filter((g) => g.required && selectedIdsFor(g).length === 0)
  const canAdd = (Number(product?.stock) || 0) > 0 && missingRequired.length === 0

  // Toggle one option in a multi-select group.
  const toggleMulti = (gid, oid) =>
    setSelected((s) => {
      const cur = Array.isArray(s[gid]) ? s[gid] : []
      return { ...s, [gid]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] }
    })

  if (!product || !pageEnabled) return <Navigate to="/" replace />

  const stock = Number(product.stock) || 0
  const cats = getCategoriesWithAll(DOMAINS.STORE)
  const catLabel = page.breadcrumbLabel || cats.find((c) => c.id === product.category)?.label || ''

  const pickColor = (c) => {
    setSelectedColor(c.hex)
    if (c.image) setActiveImage(c.image)
  }

  // Build the cart payload from the current selections (single or multi).
  const buildOptions = () => {
    const selections = []
    const keyParts = []
    optionGroups.forEach((g) => {
      selectedIdsFor(g).forEach((id) => {
        const opt = g.options?.find((o) => o.id === id)
        if (opt) {
          selections.push({ groupTitle: g.title, optionLabel: opt.label, priceDelta: Number(opt.priceDelta) || 0 })
          keyParts.push(`${g.id}:${id}`)
        }
      })
    })
    if (giftWrap) {
      selections.push({ groupTitle: 'עטיפת מתנה', optionLabel: 'כן', priceDelta: Number(giftCfg.price) || 0 })
      keyParts.push('gift:1')
    }
    return { unitPrice, selections, optionsKey: keyParts.join('|') }
  }

  const handleAdd = () => {
    if (!canAdd) return false
    return addItem(product, selectedColor, null, buildOptions())
  }
  const handleBuyNow = () => {
    if (handleAdd()) {
      setOpen(false)
      navigate('/checkout')
    }
  }

  const goCategory = () => {
    switchDomain(DOMAINS.STORE)
    setCategory(product.category)
    navigate('/')
  }
  const goStore = () => {
    switchDomain(DOMAINS.STORE)
    setCategory('all')
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pb-6 pt-2 lg:px-8">
        {/* Breadcrumb bar — clickable path back to the home / store / category.
            Locked (sticky) on desktop just below the header so it stays visible
            while the page scrolls. */}
        <nav
          ref={bcRef}
          style={{ top: `${headerH}px` }}
          className="mb-5 flex flex-wrap items-center gap-1 rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-ink-light shadow-sm lg:sticky lg:z-30"
          aria-label="פירורי לחם"
        >
          <button onClick={() => { goHome(); navigate('/') }} className="font-medium hover:text-brand-600">עמוד הבית</button>
          <ChevronLeft size={14} className="opacity-40" />
          <button onClick={goStore} className="font-medium hover:text-brand-600">חנות</button>
          {catLabel && (
            <>
              <ChevronLeft size={14} className="opacity-40" />
              <button onClick={goCategory} className="font-medium hover:text-brand-600">{catLabel}</button>
            </>
          )}
          <ChevronLeft size={14} className="opacity-40" />
          <span className="font-semibold text-ink">{product.name}</span>
        </nav>

        {/* Title — ABOVE the gallery on mobile; desktop shows it in the details. */}
        <div className="mb-4 lg:hidden">
          <h1 className="text-2xl font-extrabold leading-tight text-ink">{product.name}</h1>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Gallery — 40%, sticky on desktop. It pins right below the locked
              header/category bar (measured offset) so it never slides up behind
              it, while the details keep scrolling. First in DOM = right in RTL. */}
          <div className="lg:sticky lg:w-2/5 lg:self-start" style={{ top: `${headerH + bcH + 16}px` }}>
            <ProductGallery
              images={images}
              active={activeImage}
              onSelect={setActiveImage}
              emoji={product.emoji}
              name={product.name}
              badge={product.badge}
            />
          </div>

          {/* Details — 60%, scrollable with the page */}
          <div className="lg:w-3/5">
            {/* Title — desktop only (mobile shows it above the gallery) */}
            <h1 className="mb-3 hidden text-3xl font-extrabold leading-tight text-ink lg:block">{product.name}</h1>

            {/* Price + installments — big price on the right, a blue divider, then
                the installments box (matches the reference). */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex flex-1 items-center gap-3 rounded-2xl bg-brand-50/70 px-4 py-3">
                <span className="shrink-0 text-3xl font-extrabold text-brand-600">₪{unitPrice.toLocaleString()}</span>
                {installmentsVisible && installmentsCount > 1 && unitPrice > 0 && (
                  <span className="flex-1 border-r-4 border-brand-500 pr-3 text-sm text-ink-light">
                    או <b className="text-ink">₪{(unitPrice / installmentsCount).toFixed(2)}</b> ב-{installmentsCount} {productPage.installmentsText}
                  </span>
                )}
              </div>
              {product.oldPrice && unitPrice < Number(product.oldPrice) && (
                <span className="text-lg text-ink-light line-through">₪{Number(product.oldPrice).toLocaleString()}</span>
              )}
            </div>

            {/* Stock badge — under the price, like the reference */}
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${stock > 0 ? 'bg-brand-500 text-white' : 'bg-red-100 text-red-600'}`}>
                {stock > 0 ? (stock <= 3 ? `נותרו ${stock} במלאי` : `${stock} במלאי`) : 'אזל מהמלאי'}
              </span>
            </div>

            {product.description && <p className="mt-4 text-sm leading-relaxed text-ink-light">{product.description}</p>}

            {/* Selection table — color + dynamic fields + gift wrap, each as a
                label/control row so controls stay ~half-width (proportioned like
                the reference) and stack cleanly on mobile. */}
            {(colors.length > 0 || optionGroups.length > 0 || giftCfg.enabled) && (
              <div className="mt-5 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10">
                {colors.length > 0 && (
                  <FieldRow label="בחירת צבע">
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => {
                        const sel = c.hex === selectedColor
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => pickColor(c)}
                            aria-pressed={sel}
                            title={c.hex}
                            className={`h-9 w-9 rounded-full border transition ${
                              sel ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-2' : 'border-black/15 hover:scale-110'
                            }`}
                            style={{ background: c.hex }}
                          />
                        )
                      })}
                    </div>
                  </FieldRow>
                )}

                {optionGroups.map((g) => {
                  const chosen = selectedIdsFor(g)
                  const isMissing = g.required && chosen.length === 0
                  return (
                    <FieldRow
                      key={g.id}
                      label={
                        <>
                          {g.title}
                          {g.multi && <span className="mt-0.5 block text-[11px] font-normal text-ink-light">ניתן לבחור כמה אפשרויות</span>}
                          {g.required && <span className="mt-0.5 block text-xs font-semibold text-red-500">זהו שדה חובה*</span>}
                        </>
                      }
                    >
                      {g.multi ? (
                        // Multi-select — checkboxes; pick any number of options.
                        <div className="flex flex-wrap gap-2">
                          {(g.options || []).map((o) => {
                            const sel = chosen.includes(o.id)
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => toggleMulti(g.id, o.id)}
                                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                  sel ? 'border-brand-500 bg-brand-500 text-white' : 'border-black/15 text-ink hover:border-brand-400'
                                }`}
                              >
                                <span className={`flex h-4 w-4 items-center justify-center rounded border ${sel ? 'border-white bg-white/20' : 'border-black/30'}`}>
                                  {sel && <Check size={12} />}
                                </span>
                                {o.label}
                                {Number(o.priceDelta) > 0 && <span className={sel ? 'text-white/80' : 'text-ink-light'}> +₪{o.priceDelta}</span>}
                              </button>
                            )
                          })}
                        </div>
                      ) : g.style === 'pills' ? (
                        <div className="flex flex-wrap gap-2">
                          {(g.options || []).map((o) => {
                            const sel = chosen.includes(o.id)
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => setSelected((s) => ({ ...s, [g.id]: o.id }))}
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                  sel ? 'border-ink bg-ink text-white' : 'border-black/15 text-ink hover:border-ink/40'
                                }`}
                              >
                                {o.label}
                                {Number(o.priceDelta) > 0 && <span className={sel ? 'text-white/80' : 'text-ink-light'}> +₪{o.priceDelta}</span>}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <select
                          value={selected[g.id] || ''}
                          onChange={(e) => setSelected((s) => ({ ...s, [g.id]: e.target.value }))}
                          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 ${
                            isMissing ? 'border-red-300' : 'border-black/15'
                          }`}
                        >
                          <option value="">{g.placeholder || 'בחירה'}</option>
                          {(g.options || []).map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}{Number(o.priceDelta) ? ` (+₪${o.priceDelta})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </FieldRow>
                  )
                })}

                {giftCfg.enabled && (
                  <FieldRow label={<span className="flex items-center gap-2"><Gift size={16} className="text-brand-500" /> עטיפת מתנה</span>}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="h-5 w-5 accent-brand-500" />
                      כן{Number(giftCfg.price) > 0 && <span className="text-ink-light">(+₪{giftCfg.price})</span>}
                    </label>
                  </FieldRow>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold transition ${
                  canAdd ? 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95' : 'cursor-not-allowed bg-black/10 text-ink-light'
                }`}
              >
                <ShoppingCart size={20} /> {stock > 0 ? 'הוספה לסל' : 'אזל מהמלאי'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canAdd}
                className={`rounded-2xl border-2 py-3.5 text-base font-bold transition ${
                  canAdd ? 'border-brand-500 text-brand-600 hover:bg-brand-50 active:scale-95' : 'cursor-not-allowed border-black/10 text-ink-light'
                }`}
              >
                קנה עכשיו
              </button>
            </div>
            {missingRequired.length > 0 && (
              <p className="mt-2 text-sm text-red-500">יש לבחור: {missingRequired.map((g) => g.title).join(', ')}</p>
            )}

            {/* Spec / feature list — row items and/or a free-text block */}
            {(specs.length > 0 || (page.specsText || '').trim()) && (
              <div className="mt-8 rounded-2xl border border-black/5 p-5">
                <h2 className="mb-3 text-lg font-extrabold text-ink">מפרט המוצר</h2>
                {specs.length > 0 && (
                  <ul className="space-y-2">
                    {specs.map((s) => (
                      <li key={s.id} className="flex items-start gap-2 text-sm text-ink">
                        <span className="shrink-0 text-base">{s.icon || '•'}</span>
                        <span>{s.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(page.specsText || '').trim() && (
                  <p className={`whitespace-pre-line text-sm leading-relaxed text-ink ${specs.length > 0 ? 'mt-3 border-t border-black/5 pt-3' : ''}`}>
                    {page.specsText}
                  </p>
                )}
              </div>
            )}

            {/* Marketing blocks */}
            {marketing.length > 0 && (
              <div className="mt-6 space-y-2">
                {marketing.map((m) => (
                  <p key={m.id} className="text-center text-base font-bold" style={{ color: m.color || '#dc2626' }}>
                    {m.text}
                  </p>
                ))}
              </div>
            )}

            {/* Payment methods */}
            {productPage.paymentsVisible && paymentMethods.length > 0 && (
              <div className="mt-8">
                <span className="mb-2 block text-sm font-bold text-ink">אמצעי תשלום</span>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((p) => (
                    <span key={p.id} className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink-light">
                      <Check size={13} className="text-brand-500" /> {p.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back to store */}
            <Link to="/" onClick={goStore} className="mt-8 inline-block text-sm font-semibold text-brand-600 hover:underline">
              ← חזרה לחנות
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
      <CartDrawer />
    </div>
  )
}

// A label/control row inside the selection table: label on the right (RTL),
// control on the left, ~half each on desktop; stacks on mobile.
function FieldRow({ label, children }) {
  return (
    <div className="grid grid-cols-1 gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center sm:gap-4">
      <div className="text-sm font-bold text-ink">{label}</div>
      <div>{children}</div>
    </div>
  )
}
