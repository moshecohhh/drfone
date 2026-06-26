import { useRef } from 'react'
import { LayoutGrid, Star, Plus, Trash2, ImagePlus, MessageSquareQuote } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { DOMAINS } from '../../context/AppContext.jsx'
import { PanelHead, Card, Switch, inputCls } from './ui.jsx'
import { downscaleImage } from '../../utils/image.js'
import FeatureManager from './FeatureManager.jsx'

// "ניהול דף ראשי": choose which categories appear in the home showcase (and set
// their images), and edit the customer reviews shown on the home page.
export default function HomePanel() {
  const { home, toggleCategoryHidden, addReview, updateReview, deleteReview } = useSettings()
  const { getCategories, setCategoryImage } = useCatalogStore()
  const cats = getCategories(DOMAINS.STORE)
  const hidden = home.hiddenCats || []
  const fileRefs = useRef({})

  const onImg = async (id, e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setCategoryImage(DOMAINS.STORE, id, await downscaleImage(f, 900, 0.82))
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <PanelHead title="ניהול דף ראשי" subtitle="רצועת המבצעים, הקטגוריות והתמונות שיוצגו בדף הראשי, וביקורות הלקוחות." />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Promo strip — "מבצעים והטבות" (moved here from Settings) */}
        <FeatureManager />

        {/* Showcase categories — image + show/hide */}
        <Card>
          <h3 className="mb-1 flex items-center gap-2 text-base font-extrabold text-ink">
            <LayoutGrid size={18} className="text-brand-500" /> קטגוריות בדף הראשי
          </h3>
          <p className="mb-4 text-sm text-ink-light">בחרו אילו קטגוריות יוצגו באריחים שבדף הראשי, ועדכנו את התמונה לכל אחת.</p>
          <ul className="space-y-2">
            {cats.map((c) => {
              const visible = !hidden.includes(c.id)
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-black/10 p-2">
                  <button
                    type="button"
                    onClick={() => fileRefs.current[c.id]?.click()}
                    title="עריכת תמונה"
                    className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-brand-50"
                  >
                    {c.image ? (
                      <img src={c.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-light">
                        <ImagePlus size={16} />
                      </span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ImagePlus size={15} />
                    </span>
                  </button>
                  <input
                    ref={(el) => (fileRefs.current[c.id] = el)}
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImg(c.id, e)}
                    className="hidden"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{c.label}</span>
                  {c.image && (
                    <button
                      type="button"
                      onClick={() => setCategoryImage(DOMAINS.STORE, c.id, '')}
                      className="shrink-0 text-[11px] text-ink-light hover:text-red-500"
                    >
                      הסר
                    </button>
                  )}
                  <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink">
                    {visible ? 'מוצג' : 'מוסתר'}
                    <Switch checked={visible} onChange={() => toggleCategoryHidden(c.id)} label="הצגת קטגוריה" />
                  </label>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Reviews */}
        <Card>
          <h3 className="mb-1 flex items-center gap-2 text-base font-extrabold text-ink">
            <MessageSquareQuote size={18} className="text-brand-500" /> ביקורות לקוחות
          </h3>
          <p className="mb-4 text-sm text-ink-light">הביקורות שמופיעות בדף הראשי תחת "לקוחות ממליצים".</p>
          <div className="space-y-3">
            {home.reviews.map((r) => (
              <div key={r.id} className="space-y-2 rounded-xl border border-black/10 bg-brand-50/30 p-3">
                <div className="flex gap-2">
                  <input
                    value={r.name}
                    onChange={(e) => updateReview(r.id, { name: e.target.value })}
                    placeholder="שם הלקוח"
                    className={inputCls}
                  />
                  <select
                    value={r.rating}
                    onChange={(e) => updateReview(r.id, { rating: Number(e.target.value) })}
                    className="w-24 shrink-0 rounded-xl border border-black/10 bg-white px-2 py-2.5 text-sm outline-none focus:border-brand-500"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} ★
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={r.text}
                  onChange={(e) => updateReview(r.id, { text: e.target.value })}
                  placeholder="תוכן הביקורת"
                  className={inputCls}
                />
                <div className="flex items-center justify-between">
                  <span className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} fill={i < (Number(r.rating) || 5) ? 'currentColor' : 'none'} className={i < (Number(r.rating) || 5) ? '' : 'text-black/15'} />
                    ))}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteReview(r.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={13} /> מחיקה
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addReview()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-500 bg-white py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
          >
            <Plus size={16} /> הוספת ביקורת
          </button>
        </Card>
      </div>
    </div>
  )
}
