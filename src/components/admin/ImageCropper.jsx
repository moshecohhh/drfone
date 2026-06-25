import { useEffect, useRef, useState } from 'react'
import { X, Check, ZoomIn } from 'lucide-react'

// Modal cropper with a fixed-aspect frame. The image is panned (drag) and
// zoomed (slider) BEHIND a fixed crop window — what you see in the frame is
// exactly what gets saved (live WYSIWYG preview). On confirm it renders the
// visible region to a canvas and returns a compressed JPEG data-URL.
//
// Props: src (image url/dataURL), aspect (w/h), outWidth, onCancel, onConfirm(dataUrl)
export default function ImageCropper({ src, aspect = 4, outWidth = 1200, onCancel, onConfirm }) {
  const frameRef = useRef(null)
  const imgRef = useRef(null)
  const [nat, setNat] = useState({ w: 0, h: 0 }) // natural image size
  const [frame, setFrame] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 }) // pan in frame px
  const drag = useRef({ down: false, x: 0, y: 0 })

  // Measure the frame once it's laid out (and on resize).
  useEffect(() => {
    const measure = () => {
      const el = frameRef.current
      if (el) setFrame({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Scale that makes the image just cover the frame at zoom = 1.
  const baseScale = nat.w && frame.w ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1
  const scale = baseScale * zoom
  const dispW = nat.w * scale
  const dispH = nat.h * scale

  // Keep the image covering the frame — clamp the pan so no empty edge shows.
  const clamp = (o) => {
    const maxX = Math.max(0, (dispW - frame.w) / 2)
    const maxY = Math.max(0, (dispH - frame.h) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) }
  }

  useEffect(() => {
    setOffset((o) => clamp(o))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nat, frame])

  const onDown = (e) => {
    drag.current = { down: true, x: e.clientX - offset.x, y: e.clientY - offset.y }
  }
  const onMove = (e) => {
    if (!drag.current.down) return
    setOffset(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }))
  }
  const onUp = () => {
    drag.current.down = false
  }

  const confirm = () => {
    const img = imgRef.current
    if (!img || !frame.w) return
    const outH = Math.round(outWidth / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    // Displayed image top-left in frame coordinates.
    const imgLeft = frame.w / 2 - dispW / 2 + offset.x
    const imgTop = frame.h / 2 - dispH / 2 + offset.y
    // Source rectangle (in natural px) that is visible inside the frame.
    const sx = (0 - imgLeft) / scale
    const sy = (0 - imgTop) / scale
    const sw = frame.w / scale
    const sh = frame.h / scale
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outH)
    onConfirm(canvas.toDataURL('image/jpeg', 0.82))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
          <h3 className="text-base font-extrabold text-ink">חיתוך תמונת הפרסומת</h3>
          <button onClick={onCancel} aria-label="סגירה" className="text-ink-light hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 text-xs text-ink-light">גררו למיקום וזזמו את התמונה. מה שנראה במסגרת — זה מה שיוצג בפרסומת.</p>

          {/* Crop frame (fixed banner aspect). This IS the live preview. */}
          <div
            ref={frameRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            style={{ aspectRatio: String(aspect) }}
            className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black/80 active:cursor-grabbing"
          >
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: dispW || 'auto',
                height: dispH || 'auto',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                maxWidth: 'none',
              }}
            />
            {/* Rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/15" />
              ))}
            </div>
          </div>

          {/* Zoom */}
          <label className="mt-4 flex items-center gap-3">
            <ZoomIn size={16} className="shrink-0 text-ink-light" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-brand-500"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-black/5 px-5 py-3">
          <button onClick={onCancel} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5">
            ביטול
          </button>
          <button onClick={confirm} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Check size={16} /> שמירת החיתוך
          </button>
        </div>
      </div>
    </div>
  )
}
