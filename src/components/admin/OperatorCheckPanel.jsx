import { useState } from 'react'
import { Signal, Search, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { PanelHead, Field, PrimaryBtn, inputCls } from './ui.jsx'

// "בדיקת מפעיל למספר" — type a mobile number, get back the cellular operator it
// belongs to. The lookup runs entirely in the `check-operator` edge function
// (which holds the CRM credentials); the browser only ever sends a phone number.
export default function OperatorCheckPanel() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { operator, company_id } | null
  const [error, setError] = useState('')

  const normalized = phone.replace(/\D/g, '')
  const valid = /^0\d{8,9}$/.test(normalized)

  const reset = () => { setError(''); setResult(null) }

  const check = async (e) => {
    e?.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    reset()
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('check-operator', {
        body: { phone: normalized },
      })
      if (fnErr) throw fnErr
      if (data?.operator) setResult({ operator: data.operator, company_id: data.company_id })
      else if (data?.error === 'invalid phone') setError('מספר לא תקין.')
      else setError('לא נמצא מפעיל למספר זה.')
    } catch {
      setError('שגיאה בבדיקה. נסו שוב מאוחר יותר.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PanelHead
        title="בדיקת מפעיל למספר"
        subtitle="הזינו מספר נייד וקבלו את שם המפעיל שאליו המספר משויך."
      />
      <form onSubmit={check} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <Field label="מספר נייד" req>
          <input
            type="tel"
            inputMode="numeric"
            dir="ltr"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); reset() }}
            placeholder="05XXXXXXXX"
            className={`${inputCls} text-left`}
            autoFocus
          />
        </Field>
        <PrimaryBtn type="submit" disabled={!valid || loading} className="mt-4 w-full">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> בודק…</>
            : <><Search size={16} /> בדיקת מפעיל</>}
        </PrimaryBtn>

        {result && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <Signal className="shrink-0 text-brand-600" />
            <div>
              <p className="text-xs font-semibold text-ink-light">המפעיל של {normalized}</p>
              <p className="text-lg font-extrabold text-ink">{result.operator}</p>
            </div>
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
