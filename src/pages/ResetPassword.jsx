import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthShell, Field, FormError } from './Login.jsx'

// Landing page for the reset link from the email. Supabase establishes a
// short-lived recovery session from the URL on load (detectSessionInUrl), so
// the user can set a new password here.
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('הסיסמה חייבת להכיל לפחות 6 תווים.')
    if (form.password !== form.confirm) return setError('הסיסמאות אינן תואמות.')
    setBusy(true)
    const res = await updatePassword(form.password)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setDone(true)
    setTimeout(() => navigate('/', { replace: true }), 1600)
  }

  return (
    <AuthShell title="בחירת סיסמה חדשה" subtitle="הגדירו סיסמה חדשה לחשבון">
      {done ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
          הסיסמה עודכנה בהצלחה! מעבירים אותך לאתר…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <FormError message={error} />}
          <Field
            icon={Lock}
            name="password"
            type="password"
            placeholder="סיסמה חדשה (לפחות 6 תווים)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="new-password"
          />
          <Field
            icon={Lock}
            name="confirm"
            type="password"
            placeholder="אימות סיסמה חדשה"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            <Check size={18} /> {busy ? 'שומר…' : 'עדכון סיסמה'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
