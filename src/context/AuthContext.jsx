import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// ---------------------------------------------------------------------------
// Authentication + Role-Based Access Control (RBAC), backed by Supabase.
// Email + password live in Supabase's `auth.users` (passwords are hashed and
// verified server-side — never in this code). Everything else lives in the
// `public.profiles` table (see supabase/schema.sql), guarded by RLS.
// ---------------------------------------------------------------------------

export const ROLES = {
  MASTER_ADMIN: 'MASTER_ADMIN',
  STORE: 'STORE',
  CUSTOMER: 'CUSTOMER',
}

export const ROLE_LABELS = {
  [ROLES.MASTER_ADMIN]: 'מנהל ראשי',
  [ROLES.STORE]: 'חנות',
  [ROLES.CUSTOMER]: 'לקוח כללי',
}

export const ROLE_OPTIONS = [
  { value: ROLES.MASTER_ADMIN, label: ROLE_LABELS[ROLES.MASTER_ADMIN] },
  { value: ROLES.STORE, label: ROLE_LABELS[ROLES.STORE] },
  { value: ROLES.CUSTOMER, label: ROLE_LABELS[ROLES.CUSTOMER] },
]

// The account that is allowed to be the master admin. This is just an email
// (NOT a secret) — the actual role lives in the DB and can't be self-assigned.
const MASTER_ADMIN_EMAIL = 'moshecohh@gmail.com'

// Map a `profiles` row (snake_case DB) to the app's user shape (camelCase).
function rowToUser(row, email) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name || '',
    email: email || row.email || '',
    role: row.role || ROLES.CUSTOMER,
    phone: row.phone || '',
    address: row.address || '',
    newsletter: !!row.newsletter,
    savedPayments: row.saved_payments || [],
  }
}

// Turn a Supabase auth error into a friendly Hebrew message.
function authErrorMessage(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'אימייל או סיסמה שגויים.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'כתובת אימייל זו כבר רשומה.'
  if (m.includes('email not confirmed')) return 'יש לאמת את כתובת האימייל לפני התחברות.'
  if (m.includes('password')) return 'הסיסמה אינה עומדת בדרישות (לפחות 6 תווים).'
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי ניסיונות. נסו שוב בעוד מספר דקות.'
  return error?.message || 'אירעה שגיאה. נסו שוב.'
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // app-shaped user, or null
  const [loading, setLoading] = useState(true) // first session check in flight
  const [users, setUsers] = useState([]) // admin: all profiles (master admin only)

  // Fetch the profile row for an authenticated user and merge the auth email.
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
    if (data) return rowToUser(data, authUser.email)
    // Profile may not be visible yet (just-created row / confirmation pending) —
    // fall back to a minimal customer so the app still has a coherent user.
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || '',
      email: authUser.email || '',
      role: ROLES.CUSTOMER,
      phone: '',
      address: '',
      newsletter: false,
      savedPayments: [],
    }
  }, [])

  // Bootstrap: read the current session, then keep `user` in sync with auth.
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = await loadProfile(session?.user)
      if (active) {
        setUser(u)
        setLoading(false)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = await loadProfile(session?.user)
      if (active) setUser(u)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  // Admin: load every profile (only the master admin is allowed by RLS).
  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (error || !data) {
      setUsers([])
      return
    }
    setUsers(data.map((r) => rowToUser(r)))
  }, [])

  useEffect(() => {
    if (user?.role === ROLES.MASTER_ADMIN) refreshUsers()
    else setUsers([])
  }, [user?.role, user?.id, refreshUsers])

  // ---- Auth actions (async) -> { ok, error?, user?, needsConfirmation? } ----
  const register = useCallback(async ({ name, email, password, phone }) => {
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 10)
    if (!name?.trim() || !cleanEmail || !password) {
      return { ok: false, error: 'נא למלא את כל השדות.' }
    }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: name.trim(), phone: cleanPhone } },
    })
    if (error) return { ok: false, error: authErrorMessage(error) }
    // With email-confirmation ON, there is no session until the user confirms.
    if (data.session) {
      // The DB trigger seeds name/email only — persist the phone onto the new
      // profile row now that we have a session.
      if (cleanPhone) await supabase.from('profiles').update({ phone: cleanPhone }).eq('id', data.user.id)
      const u = await loadProfile(data.user)
      setUser(u)
      return { ok: true, user: u }
    }
    return { ok: true, needsConfirmation: true }
  }, [loadProfile])

  const login = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password,
    })
    if (error) return { ok: false, error: authErrorMessage(error) }
    const u = await loadProfile(data.user)
    setUser(u)
    return { ok: true, user: u }
  }, [loadProfile])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // Send a "reset your password" email. The link returns the user to
  // /reset-password (which must be allowed in Supabase Auth → Redirect URLs).
  const requestPasswordReset = useCallback(async (email) => {
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail) return { ok: false, error: 'נא להזין כתובת אימייל.' }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { ok: false, error: authErrorMessage(error) }
    return { ok: true }
  }, [])

  // Set a new password for the currently-recovering (or logged-in) user.
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: authErrorMessage(error) }
    return { ok: true }
  }, [])

  // Self-service update of the logged-in user's own profile.
  const updateProfile = useCallback(
    async (patch) => {
      if (!user) return
      // Whitelist columns and map camelCase -> snake_case for the DB.
      const dbPatch = {}
      if (patch.name !== undefined) dbPatch.name = patch.name
      if (patch.phone !== undefined) dbPatch.phone = patch.phone
      if (patch.address !== undefined) dbPatch.address = patch.address
      if (patch.newsletter !== undefined) dbPatch.newsletter = patch.newsletter
      if (patch.savedPayments !== undefined) dbPatch.saved_payments = patch.savedPayments
      // Optimistic local update so the UI feels instant.
      setUser((cur) => (cur ? { ...cur, ...patch } : cur))
      if (Object.keys(dbPatch).length) {
        await supabase.from('profiles').update(dbPatch).eq('id', user.id)
      }
    },
    [user],
  )

  // ---- Admin user management (master admin only; enforced by RLS) ----
  const deleteUser = useCallback(
    async (id) => {
      if (id === user?.id) return // don't delete yourself
      await supabase.from('profiles').delete().eq('id', id)
      refreshUsers()
    },
    [refreshUsers, user?.id],
  )

  const updateRole = useCallback(
    async (id, role) => {
      await supabase.from('profiles').update({ role }).eq('id', id)
      refreshUsers()
    },
    [refreshUsers],
  )

  const updateUser = useCallback(
    async (id, { name, role }) => {
      const patch = {}
      if (typeof name === 'string' && name.trim()) patch.name = name.trim()
      if (role) patch.role = role
      if (Object.keys(patch).length) {
        await supabase.from('profiles').update(patch).eq('id', id)
        refreshUsers()
        // Keep our own session in sync if we edited ourselves.
        if (id === user?.id) setUser((cur) => (cur ? { ...cur, ...patch } : cur))
      }
    },
    [refreshUsers, user?.id],
  )

  // Creating a *new* account with a password from the admin panel needs the
  // server-side admin API (service_role) — not available in the browser. This
  // will be added as a Supabase Edge Function in a later step.
  const createUser = useCallback(async () => {
    return {
      ok: false,
      error: 'יצירת משתמש מהניהול תתווסף בקרוב (דורשת פונקציית שרת מאובטחת).',
    }
  }, [])

  const role = user?.role
  const isMaster = role === ROLES.MASTER_ADMIN
  const isStaff = role === ROLES.STORE

  const value = {
    user, // null | { id, name, email, role, phone, address, newsletter, savedPayments }
    loading,
    isAuthenticated: !!user,
    isMaster,
    isStaff,
    isMasterAdminAccount: user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL,
    canAccessAdmin: isMaster || isStaff,
    isAdmin: isMaster || isStaff, // backwards-compat alias
    users, // master-admin view of all profiles (empty otherwise)
    masterAdminId: null, // no longer a fixed seed id; kept for API compatibility
    register,
    login,
    logout,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    deleteUser,
    updateRole,
    updateUser,
    createUser,
    refreshUsers,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
