import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { UserPlus, User, Mail, Lock, Phone, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { savePasswordCredential } from '../utils/credentials.js'
import { emailIssue, passwordIssue, isValidMobileIL, sanitizePhone, nameIssue } from '../utils/validation.js'
import { AuthShell, Field, FormError } from './Login.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Arriving from "not registered → sign up": pre-fill the email & password the
  // customer already typed on the login page. They still confirm the password.
  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: location.state?.email || '',
    phone: '',
    password: location.state?.password || '',
    confirm: '',
  })
  const [remember, setRemember] = useState(true)
  const [newsletter, setNewsletter] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [busy, setBusy] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: name === 'phone' ? sanitizePhone(value) : value }))
  }

  // Live, per-field problems — surfaced in red once a field has any content.
  const firstNameErr = form.firstName.trim() ? nameIssue(form.firstName) : null
  const lastNameErr = form.lastName.trim() ? nameIssue(form.lastName) : null
  const emailErr = form.email.trim() ? emailIssue(form.email) : null
  const phoneErr =
    form.phone.trim() && !isValidMobileIL(form.phone)
      ? 'מספר נייד חייב להתחיל ב-05 ולהכיל 10 ספרות.'
      : null
  const pwErr = form.password ? passwordIssue(form.password) : null
  const showGmailHint = form.email.trim() && !form.email.includes('@')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setEmailExists(false)
    const fErr = nameIssue(form.firstName)
    if (fErr) return setError('שם פרטי: ' + fErr)
    const lErr = nameIssue(form.lastName)
    if (lErr) return setError('שם משפחה: ' + lErr)
    if (!isValidMobileIL(form.phone)) {
      return setError('יש להזין מספר נייד תקין (מתחיל ב-05, 10 ספרות).')
    }
    const eErr = emailIssue(form.email)
    if (eErr) return setError(eErr)
    const pErr = passwordIssue(form.password)
    if (pErr) return setError(pErr)
    if (form.password !== form.confirm) {
      return setError('הסיסמאות אינן תואמות.')
    }
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`
    // Record the "remember me" choice BEFORE signing up so the session token is
    // stored in the right place (local vs session storage).
    try {
      localStorage.setItem('drfone_remember', remember ? 'true' : 'false')
    } catch {
      /* ignore */
    }
    setBusy(true)
    const res = await register({ name, email: form.email, password: form.password, phone: form.phone, newsletter })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setEmailExists(!!res.emailExists)
      return
    }
    // Offer to save the new credentials in the browser's password manager.
    savePasswordCredential(form.email, form.password, name)
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
        {/* The email is already registered → steer the customer to log in. */}
        {emailExists && (
          <Link
            to="/login"
            state={{ email: form.email }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            <LogIn size={18} /> כבר יש לך חשבון — מעבר להתחברות
          </Link>
        )}
        {notice && (
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{notice}</div>
        )}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              icon={User}
              name="firstName"
              type="text"
              placeholder="שם פרטי"
              value={form.firstName}
              onChange={onChange}
              autoComplete="given-name"
              invalid={!!firstNameErr}
            />
            <Field
              name="lastName"
              type="text"
              placeholder="שם משפחה"
              value={form.lastName}
              onChange={onChange}
              autoComplete="family-name"
              invalid={!!lastNameErr}
            />
          </div>
          {(firstNameErr || lastNameErr) && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {firstNameErr ? 'שם פרטי: ' + firstNameErr : 'שם משפחה: ' + lastNameErr}
            </p>
          )}
        </div>

        <div>
          <Field
            icon={Phone}
            name="phone"
            type="tel"
            dir="ltr"
            placeholder="טלפון נייד (05XXXXXXXX)"
            value={form.phone}
            onChange={onChange}
            autoComplete="tel"
            invalid={!!phoneErr}
          />
          {phoneErr && <p className="mt-1 text-xs font-medium text-red-600">{phoneErr}</p>}
        </div>

        <div>
          <Field
            icon={Mail}
            name="email"
            type="email"
            dir="ltr"
            placeholder="אימייל"
            value={form.email}
            onChange={onChange}
            autoComplete="email"
            invalid={!!emailErr}
          />
          {showGmailHint && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, email: `${f.email}@gmail.com` }))}
              className="mt-1 text-xs font-medium text-brand-600 hover:underline"
            >
              הוספת ‎@gmail.com‎
            </button>
          )}
          {emailErr && <p className="mt-1 text-xs font-medium text-red-600">{emailErr}</p>}
        </div>

        <div>
          <Field
            icon={Lock}
            name="password"
            type="password"
            placeholder="סיסמה (לפחות 6 תווים)"
            value={form.password}
            onChange={onChange}
            autoComplete="new-password"
            invalid={!!pwErr}
          />
          {pwErr && <p className="mt-1 text-xs font-medium text-red-600">{pwErr}</p>}
        </div>

        <Field
          icon={Lock}
          name="confirm"
          type="password"
          placeholder="אימות סיסמה"
          value={form.confirm}
          onChange={onChange}
          autoComplete="new-password"
          invalid={!!form.confirm && form.confirm !== form.password}
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-light">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-black/20 text-brand-500 focus:ring-brand-500"
          />
          זכור אותי
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-light">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="h-4 w-4 rounded border-black/20 text-brand-500 focus:ring-brand-500"
          />
          אני מעוניין/ת לקבל עדכונים ומבצעים לניוזלטר
        </label>

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
