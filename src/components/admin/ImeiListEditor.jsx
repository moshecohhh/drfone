import { useState } from 'react'
import { Plus, Trash2, ScanLine } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner.jsx'
import { inputCls, IconBtn } from './ui.jsx'
import { imeiOf, colorOf } from '../../utils/imei.js'

// Editable list of IMEIs (one per unit). Each row has a numeric input, an
// optional color picker (when the product has colors), a camera scan button,
// and a delete button. Entries are emitted as { imei, color } objects so each
// physical unit stays tied to its color even after it sells. `onChange`
// receives the full array. `colors` is the product's available colors
// ([{ hex, name }]) — omit it to hide the color column entirely.
export default function ImeiListEditor({ imeis = [], colors = [], onChange }) {
  const [scanIdx, setScanIdx] = useState(null)
  const rows = imeis.length ? imeis : ['']
  const hasColors = Array.isArray(colors) && colors.length > 0

  // Always emit normalized { imei, color } objects so the color link is kept.
  const emit = (next) => onChange(next.map((e) => ({ imei: imeiOf(e), color: colorOf(e) })))
  const setImeiAt = (i, v) => {
    const next = [...rows]
    next[i] = { imei: v.replace(/\D/g, ''), color: colorOf(rows[i]) }
    emit(next)
  }
  const setColorAt = (i, hex) => {
    const next = [...rows]
    next[i] = { imei: imeiOf(rows[i]), color: hex }
    emit(next)
  }
  const removeAt = (i) => emit(rows.filter((_, idx) => idx !== i))
  const addRow = () => emit([...rows, { imei: '', color: '' }])

  const colorLabel = (hex) => colors.find((c) => c.hex === hex)?.name || hex

  return (
    <div className="space-y-2">
      {rows.map((entry, i) => {
        const v = imeiOf(entry)
        const color = colorOf(entry)
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-xs text-ink-light">{i + 1}</span>
            <input
              type="text"
              dir="ltr"
              inputMode="numeric"
              value={v}
              onChange={(e) => setImeiAt(i, e.target.value)}
              placeholder="IMEI"
              maxLength={20}
              className={`${inputCls} text-left`}
            />
            {hasColors && (
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/15"
                  style={{ background: color || 'transparent' }}
                  title={color ? colorLabel(color) : 'ללא צבע'}
                />
                <select
                  value={color}
                  onChange={(e) => setColorAt(i, e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs text-ink outline-none focus:border-brand-500"
                  title="צבע היחידה"
                  aria-label="צבע היחידה"
                >
                  <option value="">צבע…</option>
                  {colors.map((c) => (
                    <option key={c.hex} value={c.hex}>
                      {c.name || c.hex}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <IconBtn type="button" onClick={() => setScanIdx(i)} title="סריקת ברקוד"><ScanLine size={16} /></IconBtn>
            <IconBtn type="button" danger onClick={() => removeAt(i)} title="מחיקה"><Trash2 size={15} /></IconBtn>
          </div>
        )
      })}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        <Plus size={15} /> הוספת IMEI
      </button>

      {scanIdx !== null && (
        <BarcodeScanner
          onDetected={(code) => { setImeiAt(scanIdx, code); setScanIdx(null) }}
          onClose={() => setScanIdx(null)}
        />
      )}
    </div>
  )
}
