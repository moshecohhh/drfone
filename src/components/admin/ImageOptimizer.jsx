import { useState } from 'react'
import { Gauge, Loader2, CheckCircle2 } from 'lucide-react'
import { DOMAINS } from '../../context/AppContext.jsx'
import { useCatalogStore } from '../../context/CatalogContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { shrinkIfDataUrl } from '../../utils/image.js'
import { Card } from './ui.jsx'

// Only bother re-compressing base64 images that are still large (already-small
// or http-URL images are left untouched).
const BIG = 120_000 // ~120KB of base64
const isBig = (v) => typeof v === 'string' && v.startsWith('data:image') && v.length > BIG
const shrink = (v, w, q) => (isBig(v) ? shrinkIfDataUrl(v, w, q) : Promise.resolve(v))
const kb = (n) => `${Math.round(n / 1024).toLocaleString('he-IL')} KB`

// One-click maintenance: shrinks every oversized base64 image already stored in
// the catalog / brands / ads, which slashes the payload downloaded on each
// visit. Safe to run repeatedly — already-small images are skipped.
export default function ImageOptimizer() {
  const { store, lab, getCategories, updateItem, setCategoryImage } = useCatalogStore()
  const { brands, updateBrand } = useBrands()
  const { ads, updateAdSlide } = useSettings()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { before, after, changed }

  const run = async () => {
    setBusy(true)
    setResult(null)
    let before = 0
    let after = 0
    let changed = 0
    const track = (oldV, newV) => {
      if (typeof oldV === 'string') before += oldV.length
      if (typeof newV === 'string') after += newV.length
      if (oldV !== newV) changed += 1
    }

    try {
      // Products (store + lab): main image, gallery, tag badge, colour images.
      for (const domain of [DOMAINS.STORE, DOMAINS.LAB]) {
        const items = domain === DOMAINS.STORE ? store : lab
        for (const it of items) {
          const patch = {}
          if (Array.isArray(it.images) && it.images.length) {
            const next = await Promise.all(it.images.map((im) => shrink(im, 1000, 0.82)))
            it.images.forEach((im, i) => track(im, next[i]))
            if (next.some((v, i) => v !== it.images[i])) {
              patch.images = next
              patch.image = next[0] || ''
            }
          } else if (it.image) {
            const ni = await shrink(it.image, 1000, 0.82)
            track(it.image, ni)
            if (ni !== it.image) patch.image = ni
          }
          if (it.tagImage) {
            const nt = await shrink(it.tagImage, 240, 0.85)
            track(it.tagImage, nt)
            if (nt !== it.tagImage) patch.tagImage = nt
          }
          if (Array.isArray(it.colors) && it.colors.some((c) => c && isBig(c.image))) {
            const next = await Promise.all(
              it.colors.map(async (c) => (c && c.image ? { ...c, image: await shrink(c.image, 1000, 0.82) } : c)),
            )
            it.colors.forEach((c, i) => track(c?.image, next[i]?.image))
            patch.colors = next
          }
          if (Object.keys(patch).length) updateItem(domain, it.id, patch)
        }
      }

      // Category tiles.
      for (const domain of [DOMAINS.STORE, DOMAINS.LAB]) {
        for (const c of getCategories(domain)) {
          if (c.image) {
            const ni = await shrink(c.image, 800, 0.82)
            track(c.image, ni)
            if (ni !== c.image) setCategoryImage(domain, c.id, ni)
          }
        }
      }

      // Brand logos.
      for (const b of brands) {
        if (b.logo) {
          const nl = await shrink(b.logo, 240, 0.85)
          track(b.logo, nl)
          if (nl !== b.logo) updateBrand(b.id, { logo: nl })
        }
      }

      // Ad banners (desktop + mobile images).
      for (const s of ads?.slides || []) {
        const patch = {}
        if (s.image) {
          const ni = await shrink(s.image, 1400, 0.82)
          track(s.image, ni)
          if (ni !== s.image) patch.image = ni
        }
        if (s.mobileImage) {
          const nm = await shrink(s.mobileImage, 900, 0.82)
          track(s.mobileImage, nm)
          if (nm !== s.mobileImage) patch.mobileImage = nm
        }
        if (Object.keys(patch).length) updateAdSlide(s.id, patch)
      }

      setResult({ before, after, changed })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-ink">
        <Gauge size={18} className="text-brand-500" /> מיטוב תמונות (האצת האתר)
      </h3>
      <p className="mb-4 text-sm text-ink-light">
        דוחס תמונות גדולות ששמורות באתר כדי להקטין את משקל הנתונים שנטענים בכל כניסה — מה שמאיץ
        משמעותית את זמן הטעינה, במיוחד במובייל. אפשר להריץ שוב בכל עת; תמונות שכבר קטנות מדולגות.
      </p>

      {result ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          <span>
            הסתיים! {result.changed} תמונות עודכנו.{' '}
            {result.before > result.after && (
              <>
                המשקל ירד מ-{kb(result.before)} ל-{kb(result.after)} (חיסכון של{' '}
                {Math.round((1 - result.after / result.before) * 100)}%).
              </>
            )}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> מבצע מיטוב…
            </>
          ) : (
            <>
              <Gauge size={16} /> הרצת מיטוב תמונות
            </>
          )}
        </button>
      )}
    </Card>
  )
}
