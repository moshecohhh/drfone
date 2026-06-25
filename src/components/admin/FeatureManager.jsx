import { useRef, useState } from 'react'
import { Megaphone, Plus, Trash2, Upload, Crop, Link as LinkIcon, Clock, Image as ImageIcon } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { DOMAINS } from '../../context/AppContext.jsx'
import { Card, Switch, inputCls } from './ui.jsx'
import ImageCropper from './ImageCropper.jsx'
import ProductPicker from './ProductPicker.jsx'

// Aspect of the featured strip (shared with <FeatureStrip/>). Intentionally
// avoids ad-related identifiers (file name, labels) so ad blockers don't block
// the module and white-page the site for those users.
export const STRIP_ASPECT = 4

// Master-only manager for the rotating top-of-site featured strip.
export default function FeatureManager() {
  const { ads, updateAds, addAdSlide, updateAdSlide, removeAdSlide } = useSettings()
  const { brands } = useBrands()
  const { getCategories } = useCatalogStore()
  const storeCategories = getCategories(DOMAINS.STORE)
  const [cropFor, setCropFor] = useState(null) // { slideId, src } | null
  const fileRefs = useRef({})

  const pickFile = (slideId) => fileRefs.current[slideId]?.click()
  const onFile = (slideId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropFor({ slideId, src: reader.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <Card className="lg:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
          <Megaphone size={18} className="text-brand-500" /> מבצעים והטבות (רצועה עליונה)
        </h3>
        {/* Master on/off switch */}
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          {ads.enabled ? 'פעיל' : 'כבוי'}
          <Switch checked={ads.enabled} onChange={(v) => updateAds({ enabled: v })} label="הפעלת רצועת מבצעים" />
        </label>
      </div>
      <p className="mb-4 text-sm text-ink-light">
        רצועה לרוחב האתר, מתחת לשורת המותגים. הוסיפו תמונות (עם חיתוך), קבעו תזמון לכל פריט והדליקו/כבו לפי הצורך.
      </p>

      {/* Rotation interval */}
      <div className="mb-5 flex items-center gap-2 text-sm text-ink">
        <Clock size={15} className="text-ink-light" />
        החלפת תמונה כל
        <input
          type="number"
          min="2"
          max="60"
          value={ads.rotateSeconds}
          onChange={(e) => updateAds({ rotateSeconds: Math.max(2, Number(e.target.value) || 5) })}
          className="w-16 rounded-lg border border-black/10 px-2 py-1 text-center text-sm outline-none focus:border-brand-500"
        />
        שניות
      </div>

      {/* Slides */}
      <div className="space-y-3">
        {ads.slides.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/15 py-8 text-center text-sm text-ink-light">
            <ImageIcon size={28} className="mb-2 text-black/20" />
            אין פריטים עדיין. הוסיפו את הראשון.
          </div>
        )}

        {ads.slides.map((s, i) => (
          <div key={s.id} className="rounded-xl border border-black/10 bg-brand-50/30 p-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Preview / upload */}
              <div className="sm:w-56 shrink-0">
                <div
                  style={{ aspectRatio: String(STRIP_ASPECT) }}
                  className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white"
                >
                  {s.image ? (
                    <img src={s.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-ink-light">ללא תמונה</span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => pickFile(s.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-ink hover:bg-black/5"
                  >
                    {s.image ? <Crop size={13} /> : <Upload size={13} />} {s.image ? 'החלפה / חיתוך' : 'העלאת תמונה'}
                  </button>
                  <input
                    ref={(el) => (fileRefs.current[s.id] = el)}
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFile(s.id, e)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink-light">פריט #{i + 1}</span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink">
                    {s.enabled ? 'מוצג' : 'מושהה'}
                    <Switch checked={s.enabled !== false} onChange={(v) => updateAdSlide(s.id, { enabled: v })} label="הצגת פריט" />
                  </label>
                </div>

                {/* Click target — choose ONE: none / custom URL / product / brand / category */}
                <div>
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-ink-light">
                    <LinkIcon size={12} /> בלחיצה על התמונה (בחרו אופציה אחת)
                  </span>
                  <select
                    value={s.linkType || (s.link ? 'url' : 'none')}
                    onChange={(e) => updateAdSlide(s.id, { linkType: e.target.value, targetId: '', ...(e.target.value === 'url' ? {} : { link: '' }) })}
                    className={inputCls}
                  >
                    <option value="none">לא לחיץ</option>
                    <option value="url">קישור חיצוני שאני מגדיר</option>
                    <option value="product">מוצר מהחנות</option>
                    <option value="brand">מותג</option>
                    <option value="category">קטגוריה</option>
                  </select>

                  {(s.linkType || (s.link ? 'url' : 'none')) === 'url' && (
                    <input
                      dir="ltr"
                      value={s.link || ''}
                      onChange={(e) => updateAdSlide(s.id, { link: e.target.value })}
                      placeholder="https://..."
                      className={`${inputCls} mt-2`}
                    />
                  )}

                  {s.linkType === 'brand' && (
                    <select
                      value={s.targetId || ''}
                      onChange={(e) => updateAdSlide(s.id, { targetId: e.target.value })}
                      className={`${inputCls} mt-2`}
                    >
                      <option value="">בחרו מותג…</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  )}

                  {s.linkType === 'category' && (
                    <select
                      value={s.targetId || ''}
                      onChange={(e) => updateAdSlide(s.id, { targetId: e.target.value })}
                      className={`${inputCls} mt-2`}
                    >
                      <option value="">בחרו קטגוריה…</option>
                      {storeCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  )}

                  {s.linkType === 'product' && (
                    <div className="mt-2">
                      <ProductPicker value={s.targetId || ''} onChange={(id) => updateAdSlide(s.id, { targetId: id })} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-ink-light">
                      <Clock size={12} /> התחלה (אופציונלי)
                    </span>
                    <input
                      type="datetime-local"
                      value={s.start || ''}
                      onChange={(e) => updateAdSlide(s.id, { start: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-ink-light">
                      <Clock size={12} /> סיום (אופציונלי)
                    </span>
                    <input
                      type="datetime-local"
                      value={s.end || ''}
                      onChange={(e) => updateAdSlide(s.id, { end: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeAdSlide(s.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={14} /> מחיקת פריט
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addAdSlide()}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-500 bg-white py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
      >
        <Plus size={16} /> הוספת פריט
      </button>

      {/* Cropper modal */}
      {cropFor && (
        <ImageCropper
          src={cropFor.src}
          aspect={STRIP_ASPECT}
          onCancel={() => setCropFor(null)}
          onConfirm={(dataUrl) => {
            updateAdSlide(cropFor.slideId, { image: dataUrl })
            setCropFor(null)
          }}
        />
      )}
    </Card>
  )
}
