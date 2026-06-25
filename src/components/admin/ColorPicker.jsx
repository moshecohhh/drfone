import { useEffect, useRef, useState } from 'react'
import { Pipette } from 'lucide-react'

// ===========================================================================
// Full-spectrum color picker (all 16M colors).
//   • A row of popular preset swatches for quick picks.
//   • An HSV color WHEEL with a draggable marker — angle = hue, distance from
//     center = saturation. Click/drag anywhere on the wheel to set the color.
//   • A brightness (value) slider for the third HSV axis.
//   • A hex field + live preview, and the native eyedropper where supported.
// Controlled: `value` is a #RRGGBB string, `onChange(hex)` fires on every change.
// ===========================================================================

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#9CA3AF', '#6B7280', '#1F2937',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
  '#7C3AED', '#0EA5E9', '#D946EF', '#B91C1C', '#065F46',
]

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

function hexToRgb(hex) {
  let s = String(hex || '').replace('#', '').trim()
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
}

function rgbToHex({ r, g, b }) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

const hsvToHex = (h, s, v) => rgbToHex(hsvToRgb(h, s, v))

export default function ColorPicker({ value = '#3B82F6', onChange }) {
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value) || { r: 59, g: 130, b: 246 }))
  const wheelRef = useRef(null)
  const dragging = useRef(false)

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v)

  // Sync from the outside (preset click, hex typed, parent reset) without
  // clobbering the in-progress hue/sat while the user drags.
  useEffect(() => {
    const rgb = hexToRgb(value)
    if (!rgb) return
    if (rgbToHex(rgb) !== currentHex) setHsv(rgbToHsv(rgb))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = (next) => {
    setHsv(next)
    onChange?.(hsvToHex(next.h, next.s, next.v))
  }

  // Translate a pointer position on the wheel into hue + saturation.
  const pickFromPointer = (clientX, clientY) => {
    const el = wheelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const radius = rect.width / 2
    const s = clamp(Math.hypot(dx, dy) / radius, 0, 1)
    let phi = (Math.atan2(dx, -dy) * 180) / Math.PI // clockwise from top
    if (phi < 0) phi += 360
    emit({ h: phi, s, v: hsv.v })
  }

  const onWheelDown = (e) => {
    dragging.current = true
    pickFromPointer(e.clientX, e.clientY)
    const move = (ev) => dragging.current && pickFromPointer(ev.clientX, ev.clientY)
    const up = () => {
      dragging.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Marker position (% within the wheel) for the current hue/saturation.
  const markerLeft = 50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50
  const markerTop = 50 - Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50

  const onHex = (raw) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`
    onChange?.(v.toUpperCase())
    const rgb = hexToRgb(v)
    if (rgb) setHsv(rgbToHsv(rgb))
  }

  const pickEyedropper = async () => {
    try {
      // eslint-disable-next-line no-undef
      const res = await new window.EyeDropper().open()
      onHex(res.sRGBHex)
    } catch {
      /* user cancelled */
    }
  }
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  return (
    <div className="space-y-4">
      {/* Preview + hex + eyedropper */}
      <div className="flex items-center gap-2">
        <span
          className="h-9 w-9 shrink-0 rounded-lg border border-black/15 shadow-inner"
          style={{ background: currentHex }}
          aria-hidden
        />
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-light">#</span>
          <input
            dir="ltr"
            value={currentHex.replace('#', '')}
            onChange={(e) => onHex(e.target.value)}
            maxLength={7}
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-6 pr-3 text-sm font-mono uppercase text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        {hasEyeDropper && (
          <button
            type="button"
            onClick={pickEyedropper}
            title="דגימת צבע מהמסך"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 text-ink-light transition hover:bg-black/5 hover:text-ink"
          >
            <Pipette size={16} />
          </button>
        )}
      </div>

      {/* HSV wheel */}
      <div className="flex flex-col items-center gap-3">
        <div
          ref={wheelRef}
          onPointerDown={onWheelDown}
          className="relative aspect-square w-44 cursor-crosshair touch-none select-none rounded-full ring-1 ring-black/10"
          style={{
            background:
              'radial-gradient(circle at center, #fff 0%, rgba(255,255,255,0) 70%), ' +
              'conic-gradient(from 0deg, red, #ff0, #0f0, #0ff, #00f, #f0f, red)',
          }}
        >
          {/* Brightness overlay — darkens the whole wheel as value drops. */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: '#000', opacity: 1 - hsv.v }}
          />
          {/* Marker */}
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40"
            style={{ left: `${markerLeft}%`, top: `${markerTop}%`, background: currentHex }}
          />
        </div>

        {/* Brightness slider */}
        <label className="w-44">
          <span className="mb-1 block text-[11px] font-semibold text-ink-light">בהירות</span>
          <input
            dir="ltr"
            type="range"
            min="0"
            max="100"
            value={Math.round(hsv.v * 100)}
            onChange={(e) => emit({ ...hsv, v: Number(e.target.value) / 100 })}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{ background: `linear-gradient(to right, #000, ${hsvToHex(hsv.h, hsv.s, 1)})` }}
          />
        </label>
      </div>

      {/* Popular presets */}
      <div>
        <span className="mb-2 block text-[11px] font-semibold text-ink-light">צבעים פופולריים</span>
        <div className="grid grid-cols-10 gap-1.5">
          {PRESET_COLORS.map((c) => {
            const selected = c.toUpperCase() === currentHex
            return (
              <button
                key={c}
                type="button"
                onClick={() => onHex(c)}
                title={c}
                aria-label={c}
                className={`aspect-square w-full rounded-full border transition ${
                  selected ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-1' : 'border-black/15 hover:scale-110'
                }`}
                style={{ background: c }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
