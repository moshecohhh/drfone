import { useState } from 'react'
import { Lock, ArrowLeft } from 'lucide-react'
import { Card, PrimaryBtn, inputCls } from './ui.jsx'

// Lightweight client-side access-code gate in front of a sensitive admin
// section. NOT a replacement for login/RBAC — it just stops someone who's
// already at the (authenticated) admin from wandering in and clicking by
// accident. The code must be re-entered each time the section is opened.
const GATE_CODE = '2800'

export default function PasswordGate({ title, children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return children

  const submit = (e) => {
    e.preventDefault()
    if (value.trim() === GATE_CODE) {
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-6">
      <Card className="text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Lock size={26} />
        </span>
        <h2 className="text-lg font-extrabold text-ink">אזור מוגן — {title}</h2>
        <p className="mt-1 text-sm text-ink-light">להמשך יש להזין את קוד הגישה.</p>
        <form onSubmit={submit} className="mt-5 space-y-3 text-right">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false) }}
            placeholder="קוד גישה"
            className={`${inputCls} text-center tracking-widest`}
          />
          {error && <p className="text-sm font-medium text-red-600">קוד שגוי, נסו שוב.</p>}
          <PrimaryBtn type="submit" className="w-full justify-center">
            <ArrowLeft size={16} /> כניסה
          </PrimaryBtn>
        </form>
      </Card>
    </div>
  )
}
