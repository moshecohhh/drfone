import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'

// Camera barcode / IMEI scanner (modal). Uses the phone's rear camera; on a
// successful read it returns the digits to `onDetected` and closes.
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

export default function BarcodeScanner({ onDetected, onClose, title = 'סריקת ברקוד / IMEI' }) {
  const boxRef = useRef(null)
  const scannerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const elId = 'barcode-scanner-' + Math.random().toString(36).slice(2)
    if (boxRef.current) boxRef.current.id = elId
    let stopped = false
    let scanner
    try {
      scanner = new Html5Qrcode(elId, { formatsToSupport: FORMATS, verbose: false })
    } catch (e) {
      setError('לא ניתן לאתחל את הסורק.')
      return
    }
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (stopped) return
          stopped = true
          const digits = String(decoded).replace(/\D/g, '') || String(decoded).trim()
          scanner.stop().catch(() => {}).finally(() => onDetected(digits))
        },
        () => {}, // per-frame "not found" — ignore
      )
      .catch(() => setError('אין גישה למצלמה. אשרו הרשאה ונסו שוב.'))

    return () => {
      try {
        if (scanner?.isScanning) scanner.stop().catch(() => {})
      } catch { /* ignore */ }
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-ink"><Camera size={18} /> {title}</span>
          <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-lg p-1 text-ink-light hover:bg-black/5"><X size={20} /></button>
        </div>
        {error ? (
          <p className="py-8 text-center text-sm font-medium text-red-600">{error}</p>
        ) : (
          <>
            <div ref={boxRef} className="overflow-hidden rounded-xl bg-black" />
            <p className="mt-2 text-center text-xs text-ink-light">כוונו את המצלמה אל הברקוד</p>
          </>
        )}
      </div>
    </div>
  )
}
