import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle, KeyRound, ArrowRight, MailCheck } from 'lucide-react'
import { useAuth, ROLES } from '../context/AuthContext.jsx'
import { savePasswordCredential } from '../utils/credentials.js'
import Logo from '../components/Logo.jsx'

export default function Login() {
  const { login, sendEmailOtp, verifyEmailOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' })
  const [mode, setMode] = useState('password') // 'password' | 'otp'
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // Arriving from the OTP email's "fill the code" button: /login?email=&otp=
  // → open the verify screen with the email + code already filled.
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const code = p.get('otp')
    if (!code) return
    const mail = p.get('email')
    setMode('otp')
    setOtpSent(true)
    setOtp(code)
    if (mail) setForm((f) => ({ ...f, email: mail }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Shared post-login redirect: staff/admin → panel, customer → intended/home.
  const redirectByRole = (u) => {
    if (u.role === ROLES.MASTER_ADMIN || u.role === ROLES.STORE) {
      navigate('/admin', { replace: true })
    } else {
      const dest = location.state?.from?.pathname
      navigate(dest && dest !== '/admin' ? dest : '/', { replace: true })
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await login(form)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    savePasswordCredential(form.email, form.password)
    redirectByRole(res.user)
  }

  const onSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await sendEmailOtp(form.email)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setOtpSent(true)
  }

  const onVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await verifyEmailOtp(form.email, otp)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    redirectByRole(res.user)
  }

  return (
    <AuthShell title="התחברות" subtitle="שמחים לראות אותך שוב">
      {error && <div className="mb-4"><FormError message={error} /></div>}

      {mode === 'password' ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field icon={Mail} name="email" type="email" placeholder="אימייל" value={form.email} onChange={onChange} autoComplete="email" />
          <Field icon={Lock} name="password" type="password" placeholder="סיסמה" value={form.password} onChange={onChange} autoComplete="current-password" />
          <div className="text-left">
            <Link to="/forgot-password" state={{ email: form.email }} className="text-sm font-medium text-brand-600 hover:underline">שכחתי סיסמה?</Link>
          </div>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
            <LogIn size={18} /> {busy ? 'מתחבר…' : 'התחברות'}
          </button>
        </form>
      ) : !otpSent ? (
        <form onSubmit={onSendOtp} className="space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><KeyRound size={24} /></span>
            <p className="text-sm text-ink-light">נשלח אליך קוד התחברות חד-פעמי למייל — בלי צורך בסיסמה.</p>
          </div>
          <Field icon={Mail} name="email" type="email" placeholder="אימייל" value={form.email} onChange={onChange} autoComplete="email" />
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
            <KeyRound size={18} /> {busy ? 'שולח…' : 'שליחת קוד למייל'}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MailCheck size={24} /></span>
            <h2 className="text-base font-extrabold text-ink">הזנת קוד האימות</h2>
            <p className="text-sm text-ink-light">שלחנו קוד לכתובת<br /><span dir="ltr" className="font-semibold text-ink">{form.email}</span></p>
          </div>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="••••••"
            className="w-full rounded-xl border border-black/10 bg-white py-3.5 text-center text-2xl font-bold tracking-[0.4em] text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
            <LogIn size={18} /> {busy ? 'מאמת…' : 'אימות והתחברות'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError('') }} className="flex items-center gap-1 font-medium text-ink-light hover:text-ink">
              <ArrowRight size={14} /> שינוי מייל
            </button>
            <button type="button" disabled={busy} onClick={onSendOtp} className="font-semibold text-brand-600 hover:underline disabled:opacity-60">
              שליחת קוד מחדש
            </button>
          </div>
        </form>
      )}

      {/* Switch between password and email-code login */}
      <button
        type="button"
        onClick={() => { setMode(mode === 'password' ? 'otp' : 'password'); setError(''); setOtpSent(false); setOtp('') }}
        className="mt-4 w-full text-center text-sm font-semibold text-brand-600 hover:underline"
      >
        {mode === 'password' ? 'התחברות עם קוד למייל (ללא סיסמה)' : 'התחברות עם סיסמה'}
      </button>

      <Divider />
      <GoogleButton label="התחברות עם Google" />

      <p className="mt-6 text-center text-sm text-ink-light">
        אין לך חשבון?{' '}
        <Link to="/register" state={{ email: form.email, password: form.password }} className="font-semibold text-brand-600 hover:underline">
          הרשמה
        </Link>
      </p>
    </AuthShell>
  )
}

// ---- Google OAuth button (shared by Login & Register) ---------------------
export function GoogleButton({ label }) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const click = async () => {
    setBusy(true)
    const res = await signInWithGoogle()
    if (!res.ok) setBusy(false) // on success the page redirects away
  }
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/15 bg-white py-3 font-semibold text-ink transition hover:bg-black/[.03] disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.98 7.28C4.68 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {busy ? '…' : label}
    </button>
  )
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-ink-light">
      <span className="h-px flex-1 bg-black/10" /> או <span className="h-px flex-1 bg-black/10" />
    </div>
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
