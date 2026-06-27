import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth, ROLES } from '../context/AuthContext.jsx'
import { savePasswordCredential } from '../utils/credentials.js'
import Logo from '../components/Logo.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Pre-fill the email when arriving from "already registered → log in".
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' })
  const [error, setError] = useState('')

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await login(form)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    // Offer to save the credentials in the browser's password manager.
    savePasswordCredential(form.email, form.password)
    // Redirect by role; honour an intended destination if one was set.
    // Staff (חנות) and master admin go to the panel; customers go to the store.
    if (res.user.role === ROLES.MASTER_ADMIN || res.user.role === ROLES.STORE) {
      navigate('/admin', { replace: true })
    } else {
      const dest = location.state?.from?.pathname
      navigate(dest && dest !== '/admin' ? dest : '/', { replace: true })
    }
  }

  return (
    <AuthShell title="התחברות" subtitle="שמחים לראות אותך שוב">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormError message={error} />}
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
          placeholder="סיסמה"
          value={form.password}
          onChange={onChange}
          autoComplete="current-password"
        />
        <div className="text-left">
          {/* Carry the typed email over so the reset page is ready to send. */}
          <Link
            to="/forgot-password"
            state={{ email: form.email }}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            שכחתי סיסמה?
          </Link>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          <LogIn size={18} /> {busy ? 'מתחבר…' : 'התחברות'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-light">
        אין לך חשבון?{' '}
        {/* Carry what was already typed over to registration so the customer
            doesn't re-enter their email/password. */}
        <Link
          to="/register"
          state={{ email: form.email, password: form.password }}
          className="font-semibold text-brand-600 hover:underline"
        >
          הרשמה
        </Link>
      </p>
    </AuthShell>
  )
}

// ---- Shared auth UI (used by Login & Register) ----------------------------

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-24" />
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-card">
          <h1 className="text-center text-2xl font-extrabold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-center text-sm text-ink-light">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-ink-light">
          <Link to="/" className="hover:text-brand-600">
            ← חזרה לאתר
          </Link>
        </p>
      </div>
    </div>
  )
}

export function Field({ icon: Icon, invalid, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-light"
        />
      )}
      <input
        {...props}
        className={`w-full rounded-xl border bg-white py-3 pr-10 pl-3 text-sm text-ink outline-none transition focus:ring-2 ${
          invalid
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
            : 'border-black/10 focus:border-brand-500 focus:ring-brand-500/30'
        }`}
      />
    </div>
  )
}

export function FormError({ message }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
      <AlertCircle size={16} /> {message}
    </div>
  )
}
