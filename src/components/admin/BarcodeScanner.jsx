import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera, Zap, ZapOff } from 'lucide-react'

// Camera barcode / IMEI scanner (modal).
//
// Phones expose several rear lenses (wide / ultra-wide / telephoto); the
// browser's default `environment` lens is often the zoomed telephoto, which
// can't focus on a close barcode. We therefore lock onto the MAIN rear lens —
// the 3rd camera on most phones — with no lens-switching UI. A torch toggle and
// an animated scan frame make close-range reads easier.
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

export default function BarcodeScanner({ onDetected, onClose, title = 'סריקת ברקוד / IMEI' }) {
  const boxRef = useRef(null)
  const scannerRef = useRef(null)
  const elIdRef = useRef('barcode-scanner-' + Math.random().toString(36).slice(2))
  const detected = useRef(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvail, setTorchAvail] = useState(false)

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

    const onHit = (decoded) => {
      if (detected.current) return
      detected.current = true
      const digits = String(decoded).replace(/\D/g, '') || String(decoded).trim()
      scanner.stop().catch(() => {}).finally(() => onDetected(digits))
    }
    const cfg = { fps: 12, qrbox: { width: 280, height: 180 }, aspectRatio: 1.33 }

    ;(async () => {
      // Enumerate cameras and lock onto the MAIN rear lens. On most phones the
      // 3rd camera (index 2) is the standard wide lens that focuses up close;
      // fall back to a back-labelled lens, then the last/first, then the generic
      // environment mode if nothing is enumerable.
      let cams = []
      try { cams = (await Html5Qrcode.getCameras()) || [] } catch { /* permission denied / none */ }
      if (cancelled) return
      const back = cams.find((c) => /back|rear|environment|אחורית/i.test(c.label || ''))
      const target = cams[2]?.id || back?.id || cams[cams.length - 1]?.id || cams[0]?.id || ''
      const source = target ? { deviceId: { exact: target } } : { facingMode: 'environment' }
      try {
        await scanner.start(source, cfg, onHit, () => {})
        if (cancelled) return
        setScanning(true)
        try {
          const caps = scanner.getRunningTrackCapabilities?.() || {}
          if (caps.torch) setTorchAvail(true)
        } catch { /* capabilities unavailable */ }
      } catch {
        if (!cancelled) setError('אין גישה למצלמה. אשרו הרשאה ונסו שוב.')
      }
    })()

    return () => {
      cancelled = true
      try { if (scanner?.isScanning) scanner.stop().catch(() => {}) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTorch = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    const next = !torchOn
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      setTorchAvail(false) // device refused — hide the control
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-ink"><Camera size={18} /> {title}</span>
          <div className="flex items-center gap-1">
            {torchAvail && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label="פנס"
                title="פנס"
                className={`rounded-lg p-1.5 transition ${torchOn ? 'bg-amber-100 text-amber-600' : 'text-ink-light hover:bg-black/5'}`}
              >
                {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-lg p-1 text-ink-light hover:bg-black/5"><X size={20} /></button>
          </div>
        </div>
        {error ? (
          <p className="py-8 text-center text-sm font-medium text-red-600">{error}</p>
        ) : (
          <>
            {/* Camera feed + scan-frame overlay (brackets + sweeping laser line). */}
            <div className="relative overflow-hidden rounded-xl bg-black">
              <div ref={boxRef} className="w-full" />
              {scanning && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-6 rounded-lg border-2 border-white/30">
                    <span className="absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-lg border-l-4 border-t-4 border-brand-400" />
                    <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-lg border-r-4 border-t-4 border-brand-400" />
                    <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-lg border-b-4 border-l-4 border-brand-400" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-lg border-b-4 border-r-4 border-brand-400" />
                  </div>
                  <div className="animate-scan-line absolute inset-x-8 h-0.5 rounded bg-brand-400 shadow-[0_0_8px_2px_rgba(45,212,191,0.7)]" />
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-ink-light">כוונו את המצלמה אל הברקוד</p>
          </>
        )}
      </div>
    </div>
  )
}
