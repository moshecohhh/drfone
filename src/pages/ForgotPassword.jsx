import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthShell, Field, FormError } from './Login.jsx'

// "שכחתי סיסמה" — asks Supabase to email a reset link (→ /reset-password).
export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await requestPasswordReset(email)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setSent(true)
  }

  return (
    <AuthShell title="איפוס סיסמה" subtitle="נשלח אליך קישור לאיפוס">
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            אם הכתובת רשומה אצלנו — נשלח אליה מייל עם קישור לאיפוס הסיסמה. בדקו את תיבת הדואר (וגם בתיקיית הספאם).
          </div>
          <Link to="/login" className="inline-block text-sm font-semibold text-brand-600 hover:underline">
            ← חזרה להתחברות
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <FormError message={error} />}
          <Field
            icon={Mail}
            name="email"
            type="email"
            placeholder="האימייל שלך"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            <Send size={18} className="-scale-x-100" /> {busy ? 'שולח…' : 'שליחת קישור איפוס'}
          </button>
          <p className="text-center text-sm text-ink-light">
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              ← חזרה להתחברות
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
