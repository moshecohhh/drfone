import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, User, Mail, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthShell, Field, FormError } from './Login.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    // Require both a first AND last name.
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('יש להזין שם פרטי ושם משפחה.')
      return
    }
    if (form.password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.')
      return
    }
    if (form.password !== form.confirm) {
      setError('הסיסמאות אינן תואמות.')
      return
    }
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`
    setBusy(true)
    const res = await register({ name, email: form.email, password: form.password })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    // If email confirmation is required, there's no session yet — tell the user.
    if (res.needsConfirmation) {
      setNotice('נשלח אליך מייל לאימות הכתובת. אשרו אותו ואז התחברו.')
      return
    }
    // New users are CUSTOMERs → straight to the store.
    navigate('/', { replace: true })
  }

  return (
    <AuthShell title="הרשמה" subtitle="פתיחת חשבון לקוח חדש">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormError message={error} />}
        {notice && (
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{notice}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field
            icon={User}
            name="firstName"
            type="text"
            placeholder="שם פרטי"
            value={form.firstName}
            onChange={onChange}
            autoComplete="given-name"
          />
          <Field
            name="lastName"
            type="text"
            placeholder="שם משפחה"
            value={form.lastName}
            onChange={onChange}
            autoComplete="family-name"
          />
        </div>
        <Field
          icon={Mail}
          name="email"
          type="email"
          placeholder="אימייל"
          value={form.email}
          onChange={onChange}
          autoComplete="email"
        />
        <Field
          icon={Lock}
          name="password"
          type="password"
          placeholder="סיסמה (לפחות 6 תווים)"
          value={form.password}
          onChange={onChange}
          autoComplete="new-password"
        />
        <Field
          icon={Lock}
          name="confirm"
          type="password"
          placeholder="אימות סיסמה"
          value={form.confirm}
          onChange={onChange}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          <UserPlus size={18} /> {busy ? 'יוצר חשבון…' : 'יצירת חשבון'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-light">
        כבר רשום?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          התחברות
        </Link>
      </p>
    </AuthShell>
  )
}
