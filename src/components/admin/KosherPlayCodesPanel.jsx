import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Wallet, RefreshCw, Copy, Check, KeyRound } from 'lucide-react'
import { kpCode, kpBalance } from '../../lib/kosherplay.js'
import { PanelHead, PrimaryBtn, GhostBtn } from './ui.jsx'
import KosherPlayLogo from './KosherPlayLogo.jsx'

// Code types with their credit cost (₪). Free needs no credits; paid types fail
// if the balance is too low.
const CODE_TYPES = [
  { id: 'free', label: 'חינמי', price: 0 },
  { id: 'chrome', label: 'כרום', price: 60 },
  { id: 'magen', label: 'כשר פלי / מגן', price: 85 },
  { id: 'pc', label: 'כשר פליי למחשב', price: 100 },
  { id: 'combined', label: 'משולב', price: 140 },
]

export default function KosherPlayCodesPanel() {
  const [balance, setBalance] = useState(null)
  const [loadingBal, setLoadingBal] = useState(false)
  const [type, setType] = useState('free')
  const [generating, setGenerating] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadBalance = async () => {
    setLoadingBal(true)
    try {
      const r = await kpBalance()
      setBalance(r?.balance ?? null)
    } catch {
      setBalance(null)
    } finally {
      setLoadingBal(false)
    }
  }
  useEffect(() => { loadBalance() }, [])

  const generate = async () => {
    if (generating) return
    setGenerating(true); setError(''); setCode(''); setCopied(false)
    try {
      const r = await kpCode(type)
      if (r?.ok && r?.code) { setCode(r.code); loadBalance() }
      else setError(r?.msg || 'יצירת הקוד נכשלה.')
    } catch {
      setError('שגיאה בתקשורת עם המערכת. נסו שוב.')
    } finally {
      setGenerating(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PanelHead
        title="קודים ויתרה — כשר פליי"
        subtitle="בדיקת יתרת קרדיטים ויצירת קודי הפעלה. יצירת קוד אורכת מספר שניות."
        action={<KosherPlayLogo size={40} />}
      />

      {/* Balance */}
      <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Wallet size={22} /></span>
          <div>
            <p className="text-xs font-semibold text-ink-light">יתרה</p>
            <p className="text-2xl font-extrabold text-ink">
              {loadingBal ? <Loader2 size={20} className="animate-spin" /> : balance != null ? `₪${balance}` : '—'}
            </p>
          </div>
        </div>
        <GhostBtn type="button" onClick={loadBalance} disabled={loadingBal}>
          <RefreshCw size={16} className={loadingBal ? 'animate-spin' : ''} /> רענון
        </GhostBtn>
      </div>

      {/* Code generation */}
      <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><KeyRound size={16} /> יצירת קוד</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CODE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setType(t.id); setError(''); setCode('') }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${
                type === t.id ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20' : 'border-black/10 text-ink hover:bg-black/5'
              }`}
            >
              <span>{t.label}</span>
              <span className="text-xs text-ink-light">{t.price ? `₪${t.price}` : 'חינם'}</span>
            </button>
          ))}
        </div>

        <PrimaryBtn type="button" onClick={generate} disabled={generating} className="mt-4 w-full">
          {generating ? <><Loader2 size={16} className="animate-spin" /> יוצר קוד…</> : <><KeyRound size={16} /> צור קוד</>}
        </PrimaryBtn>

        {code && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <div>
              <p className="text-xs font-semibold text-green-700">הקוד נוצר</p>
              <p className="text-2xl font-extrabold tracking-widest text-green-900" dir="ltr">{code}</p>
            </div>
            <GhostBtn type="button" onClick={copy}>
              {copied ? <><Check size={16} /> הועתק</> : <><Copy size={16} /> העתקה</>}
            </GhostBtn>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  )
}
