import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'

// Camera barcode / IMEI scanner (modal). Phones expose several rear lenses
// (wide / ultra-wide / telephoto); the browser's default `environment` lens is
// often the zoomed telephoto, which can't focus on a close barcode. So we
// enumerate the cameras, default to the MAIN rear lens (the 3rd camera on most
// phones), and let the user switch — the choice is remembered for next time.
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

const CAM_KEY = 'drfone_scanner_cam' // remembered camera deviceId

export default function BarcodeScanner({ onDetected, onClose, title = 'סריקת ברקוד / IMEI' }) {
  const boxRef = useRef(null)
  const scannerRef = useRef(null)
  const elIdRef = useRef('barcode-scanner-' + Math.random().toString(36).slice(2))
  const detected = useRef(false)
  const [error, setError] = useState('')
  const [cameras, setCameras] = useState([])
  const [camId, setCamId] = useState('')

  // (Re)start the live scan on a specific camera id (or the rear-facing default).
  const startWith = async (id) => {
    const scanner = scannerRef.current
    if (!scanner) return
    try { if (scanner.isScanning) await scanner.stop() } catch { /* ignore */ }
    const source = id ? { deviceId: { exact: id } } : { facingMode: 'environment' }
    try {
      await scanner.start(
        source,
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (detected.current) return
          detected.current = true
          const digits = String(decoded).replace(/\D/g, '') || String(decoded).trim()
          scanner.stop().catch(() => {}).finally(() => onDetected(digits))
        },
        () => {}, // per-frame "not found" — ignore
      )
      setError('')
    } catch {
      setError('אין גישה למצלמה. אשרו הרשאה ונסו שוב.')
    }
  }

  useEffect(() => {
    let cancelled = false
    if (boxRef.current) boxRef.current.id = elIdRef.current
    let scanner
    try {
      scanner = new Html5Qrcode(elIdRef.current, { formatsToSupport: FORMATS, verbose: false })
    } catch {
      setError('לא ניתן לאתחל את הסורק.')
      return
    }
    scannerRef.current = scanner

    ;(async () => {
      // getCameras() also triggers the permission prompt on first use.
      let cams = []
      try { cams = (await Html5Qrcode.getCameras()) || [] } catch { /* permission denied / none */ }
      if (cancelled) return
      setCameras(cams)

      // Pick: remembered camera → the 3rd camera (main rear lens on most phones)
      // → a back-labelled camera → the last camera → the first. Falls back to the
      // generic rear-facing mode when the device exposes no enumerable cameras.
      const saved = (() => { try { return localStorage.getItem(CAM_KEY) } catch { return null } })()
      let chosen = ''
      if (saved && cams.some((c) => c.id === saved)) chosen = saved
      if (!chosen && cams.length) {
        const back = cams.find((c) => /back|rear|environment|אחורית/i.test(c.label || ''))
        chosen = cams[2]?.id || back?.id || cams[cams.length - 1]?.id || cams[0]?.id || ''
      }
      setCamId(chosen)
      await startWith(chosen)
    })()

    return () => {
      cancelled = true
      try { if (scanner?.isScanning) scanner.stop().catch(() => {}) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickCamera = async (id) => {
    setCamId(id)
    try { localStorage.setItem(CAM_KEY, id) } catch { /* ignore */ }
    await startWith(id)
  }

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

            {/* Camera selector — switch lens if the default one zooms / won't focus. */}
            {cameras.length > 1 && (
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-semibold text-ink-light">בחירת מצלמה (אם התמונה מזוּמת או לא חדה — נסו מצלמה אחרת)</span>
                <select
                  value={camId}
                  onChange={(e) => pickCamera(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm text-ink outline-none focus:border-brand-500"
                >
                  {cameras.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      מצלמה {i + 1}{c.label ? ` — ${c.label}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
      </div>
    </div>
  )
}
