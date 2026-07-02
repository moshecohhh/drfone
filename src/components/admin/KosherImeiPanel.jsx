import { useState } from 'react'
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { crmErrorMessage } from '../../lib/crmError.js'
import { PanelHead, Field, PrimaryBtn, inputCls } from './ui.jsx'

// "בדיקת IMEI כשר" — type a device IMEI and the CRM reports whether it's a
// kosher device. Runs entirely through the `check-kosher-imei` edge function
// (which holds the CRM credentials); the browser only sends the IMEI.
export default function KosherImeiPanel() {
  const [imei, setImei] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { ok, message } | null
  const [error, setError] = useState('')

  const normalized = imei.replace(/\D/g, '')
  const valid = /^\d{14,17}$/.test(normalized)

  const reset = () => { setError(''); setResult(null) }

  const check = async (e) => {
    e?.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    reset()
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('check-kosher-imei', {
        body: { imei: normalized },
      })
      if (fnErr) throw fnErr
      if (data?.message) setResult({ ok: !!data.ok, message: data.message })
      else if (data?.error === 'invalid imei') setError('מספר IMEI לא תקין.')
      else setError('הבדיקה נכשלה. נסו שוב.')
    } catch (err) {
      setError(await crmErrorMessage(err, 'שגיאה בבדיקה. נסו שוב מאוחר יותר.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PanelHead
        title="בדיקת IMEI כשר"
        subtitle="הזינו מספר IMEI של מכשיר וקבלו האם הוא מכשיר כשר."
      />
      <form onSubmit={check} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <Field label="מספר IMEI" req hint="15 ספרות (אפשר לחייג *#06# במכשיר לקבלת המספר).">
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={imei}
            onChange={(e) => { setImei(e.target.value); reset() }}
            placeholder="357812345678901"
            maxLength={20}
            className={`${inputCls} text-left`}
            autoFocus
          />
        </Field>
        <PrimaryBtn type="submit" disabled={!valid || loading} className="mt-4 w-full">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> בודק…</>
            : <><ShieldCheck size={16} /> בדיקה</>}
        </PrimaryBtn>

        {result && (
          <div
            className={`mt-5 flex items-center gap-3 rounded-xl border p-4 ${
              result.ok
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {result.ok ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
            <p className="font-semibold">{result.message}</p>
          </div>
        )}
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}
      </form>
    </div>
  )
}
