import { useState } from 'react'
import { Gauge, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBrands } from '../../context/BrandsContext.jsx'
import { shrinkIfDataUrl } from '../../utils/image.js'
import { Card } from './ui.jsx'

// Only re-compress base64 images that are still large (already-small or
// http-URL images are left untouched).
const BIG = 80_000 // ~80KB of base64
const isBig = (v) => typeof v === 'string' && v.startsWith('data:image') && v.length > BIG
const shrink = (v, w, q) => (isBig(v) ? shrinkIfDataUrl(v, w, q) : Promise.resolve(v))
const len = (v) => (typeof v === 'string' ? v.length : 0)
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`

// One-click maintenance: shrinks every oversized base64 image stored in the
// catalog (and brands/ads), which slashes the data downloaded on each visit.
// It reads & writes Supabase DIRECTLY so it always operates on the real, current
// data — never on a stale/seed copy. Safe to re-run; small images are skipped.
export default function ImageOptimizer() {
  const { ads, updateAdSlide } = useSettings()
  const { brands, updateBrand } = useBrands()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { before, after, changed } | { error }

  const run = async () => {
    setBusy(true)
    setResult(null)
    let before = 0
    let after = 0
    let changed = 0

    try {
      // ---- Catalog items (this holds the heavy product photos) ----
      const { data: rows, error } = await supabase.from('catalog_items').select('id, data')
      if (error) throw error
      for (const row of rows || []) {
        const d = { ...(row.data || {}) }
        let rowChanged = false

        if (Array.isArray(d.images) && d.images.length) {
          const next = await Promise.all(d.images.map((im) => shrink(im, 1000, 0.82)))
          d.images.forEach((im, i) => {
            before += len(im)
            after += len(next[i])
          })
          if (next.some((v, i) => v !== d.images[i])) {
            d.images = next
            d.image = next[0] || ''
            rowChanged = true
          }
        } else if (d.image) {
          const ni = await shrink(d.image, 1000, 0.82)
          before += len(d.image)
          after += len(ni)
          if (ni !== d.image) {
            d.image = ni
            rowChanged = true
          }
        }

        if (d.tagImage) {
          const nt = await shrink(d.tagImage, 240, 0.85)
          before += len(d.tagImage)
          after += len(nt)
          if (nt !== d.tagImage) {
            d.tagImage = nt
            rowChanged = true
          }
        }

        // Colors may carry a single legacy `image` or an `images[]` set — shrink
        // any oversized raster ones (generated SVG placeholders are tiny / skipped).
        const colorHasBig = (c) => c && (isBig(c.image) || (Array.isArray(c.images) && c.images.some(isBig)))
        if (Array.isArray(d.colors) && d.colors.some(colorHasBig)) {
          const next = await Promise.all(
            d.colors.map(async (c) => {
              if (!c) return c
              const out = { ...c }
              if (isBig(c.image)) { before += len(c.image); const ni = await shrink(c.image, 1000, 0.82); after += len(ni); out.image = ni }
              if (Array.isArray(c.images)) {
                out.images = await Promise.all(c.images.map(async (s) => {
                  if (!isBig(s)) return s
                  before += len(s); const ns = await shrink(s, 1000, 0.82); after += len(ns); return ns
                }))
              }
              return out
            }),
          )
          d.colors = next
          rowChanged = true
        }

        if (rowChanged) {
          await supabase.from('catalog_items').update({ data: d }).eq('id', row.id)
          changed += 1
        }
      }

      // ---- Category tiles ----
      const { data: cats } = await supabase.from('catalog_categories').select('id, image')
      for (const c of cats || []) {
        if (isBig(c.image)) {
          const ni = await shrink(c.image, 800, 0.82)
          before += len(c.image)
          after += len(ni)
          if (ni !== c.image) {
            await supabase.from('catalog_categories').update({ image: ni }).eq('id', c.id)
            changed += 1
          }
        }
      }

      // ---- Brand logos & ad banners (small, via the normal context writers) ----
      for (const b of brands) {
        if (isBig(b.logo)) {
          const nl = await shrink(b.logo, 240, 0.85)
          before += len(b.logo)
          after += len(nl)
          if (nl !== b.logo) {
            updateBrand(b.id, { logo: nl })
            changed += 1
          }
        }
      }
      for (const s of ads?.slides || []) {
        const patch = {}
        if (isBig(s.image)) {
          const ni = await shrink(s.image, 1400, 0.82)
          before += len(s.image)
          after += len(ni)
          if (ni !== s.image) patch.image = ni
        }
        if (isBig(s.mobileImage)) {
          const nm = await shrink(s.mobileImage, 900, 0.82)
          before += len(s.mobileImage)
          after += len(nm)
          if (nm !== s.mobileImage) patch.mobileImage = nm
        }
        if (Object.keys(patch).length) {
          updateAdSlide(s.id, patch)
          changed += 1
        }
      }

      setResult({ before, after, changed })
    } catch (e) {
      setResult({ error: e.message || 'אירעה שגיאה' })
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
        משמעותית את זמן הטעינה, במיוחד במובייל. מומלץ להריץ ממחשב. אפשר להריץ שוב בכל עת; תמונות
        שכבר קטנות מדולגות.
      </p>

      {result?.error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle size={18} /> {result.error}
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={18} />
            <span>
              הסתיים! {result.changed} תמונות עודכנו.{' '}
              {result.before > result.after && (
                <>
                  המשקל ירד מ-{mb(result.before)} ל-{mb(result.after)} (חיסכון של{' '}
                  {Math.round((1 - result.after / result.before) * 100)}%).
                </>
              )}
            </span>
          </div>
          {result.changed > 0 && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              רענון הדף לראיית התוצאה
            </button>
          )}
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
              <Loader2 size={16} className="animate-spin" /> מבצע מיטוב… (אל תסגרו את הדף)
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
