import { useState } from 'react'
import { PhoneOutgoing, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { PanelHead, Field, PrimaryBtn, inputCls } from './ui.jsx'

// Cellular operators the CRM accepts for an IVR call, matching the company_id
// values from the CRM's "ביצוע IVR" modal.
const OPERATORS = [
  { id: '1', name: 'סלקום' },
  { id: '2', name: 'פרטנר' },
  { id: '4', name: 'פלאפון' },
  { id: '5', name: 'גולן טלקום' },
  { id: '6', name: 'הוט מובייל' },
  { id: '15', name: 'רמי לוי תקשורת' },
]

// "ביצוע IVR" — pick an operator, type a mobile number, and the CRM places an
// IVR call to it. Runs entirely through the `send-ivr` edge function (which
// holds the CRM credentials); the browser only sends a number + operator id.
export default function IvrCallPanel() {
  const [companyId, setCompanyId] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { message } | null
  const [error, setError] = useState('')

  const normalized = phone.replace(/\D/g, '')
  const valid = /^0\d{8,9}$/.test(normalized) && companyId

  const reset = () => { setError(''); setResult(null) }

  const send = async (e) => {
    e?.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    reset()
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-ivr', {
        body: { phone: normalized, company_id: companyId },
      })
      if (fnErr) throw fnErr
      if (data?.ok) setResult({ message: data.message || 'השיחה בוצעה בהצלחה.' })
      else if (data?.error === 'invalid phone') setError('מספר לא תקין.')
      else setError(data?.message || 'השיחה נכשלה. נסו שוב.')
    } catch {
      setError('שגיאה בביצוע השיחה. נסו שוב מאוחר יותר.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PanelHead
        title="ביצוע IVR"
        subtitle="בחרו מפעיל והזינו מספר נייד — המערכת תבצע שיחת IVR למספר."
      />
      <form onSubmit={send} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <Field label="מפעיל סלולר" req>
          <select
            value={companyId}
            onChange={(e) => { setCompanyId(e.target.value); reset() }}
            className={inputCls}
            required
          >
            <option value="">בחר מפעיל סלולר…</option>
            {OPERATORS.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </Field>
        <div className="mt-4">
          <Field label="מספר נייד" req>
            <input
              type="tel"
              inputMode="numeric"
              dir="ltr"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); reset() }}
              placeholder="05XXXXXXXX"
              className={`${inputCls} text-left`}
            />
          </Field>
        </div>
        <PrimaryBtn type="submit" disabled={!valid || loading} className="mt-4 w-full">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> מבצע…</>
            : <><PhoneOutgoing size={16} /> ביצוע שיחה</>}
        </PrimaryBtn>

        {result && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle2 className="shrink-0" />
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
