import { useState } from 'react'
import { Plus, Trash2, ScanLine } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner.jsx'
import { inputCls, IconBtn } from './ui.jsx'

// Editable list of IMEIs (one per unit). Each row has a numeric input, a camera
// scan button, and a delete button. Empty strings are kept while editing; the
// owner filters them on save. `onChange` receives the full array.
export default function ImeiListEditor({ imeis = [], onChange }) {
  const [scanIdx, setScanIdx] = useState(null)
  const rows = imeis.length ? imeis : ['']

  const setAt = (i, v) => {
    const next = [...rows]
    next[i] = v.replace(/\D/g, '')
    onChange(next)
  }
  const removeAt = (i) => onChange(rows.filter((_, idx) => idx !== i))
  const addRow = () => onChange([...rows, ''])

  return (
    <div className="space-y-2">
      {rows.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-xs text-ink-light">{i + 1}</span>
          <input
            type="text"
            dir="ltr"
            inputMode="numeric"
            value={v}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder="IMEI"
            maxLength={20}
            className={`${inputCls} text-left`}
          />
          <IconBtn type="button" onClick={() => setScanIdx(i)} title="סריקת ברקוד"><ScanLine size={16} /></IconBtn>
          <IconBtn type="button" danger onClick={() => removeAt(i)} title="מחיקה"><Trash2 size={15} /></IconBtn>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        <Plus size={15} /> הוספת IMEI
      </button>

      {scanIdx !== null && (
        <BarcodeScanner
          onDetected={(code) => { setAt(scanIdx, code); setScanIdx(null) }}
          onClose={() => setScanIdx(null)}
        />
      )}
    </div>
  )
}
