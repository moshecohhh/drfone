import { useState, useEffect } from 'react'
import { Trash2, Crown, UserCircle, Store, Pencil, Check, X, Plus, Eye, EyeOff, AlertCircle, RotateCcw } from 'lucide-react'
import { useAuth, ROLES, ROLE_LABELS, ROLE_OPTIONS } from '../../context/AuthContext.jsx'
import { PanelHead, Table, Card, Field, PrimaryBtn, GhostBtn, IconBtn, inputCls } from './ui.jsx'

// Distinct icon per role.
const RoleIcon = ({ role, ...p }) => {
  if (role === ROLES.MASTER_ADMIN) return <Crown {...p} />
  if (role === ROLES.STORE) return <Store {...p} />
  return <UserCircle {...p} />
}

const blankNew = { name: '', email: '', password: '', role: ROLES.STORE }

// Users & Permissions — create accounts, rename, and set user type (role).
export default function UsersPanel() {
  const { users, masterAdminId, updateUser, deleteUser, createUser, refreshUsers } = useAuth()
  // Pull the latest profiles whenever the panel opens, so registrations made
  // after the admin loaded the page (Google sign-ups included) appear here.
  useEffect(() => { refreshUsers() }, [refreshUsers])
  const [refreshing, setRefreshing] = useState(false)
  const doRefresh = async () => {
    setRefreshing(true)
    await refreshUsers()
    setRefreshing(false)
  }
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState(ROLES.CUSTOMER)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(blankNew)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const startEdit = (u) => {
    setEditingId(u.id)
    setEditName(u.name)
    setEditRole(u.role)
  }
  const saveEdit = (isMasterRow) => {
    // Role unlocks for editing only here; master admin's role stays locked.
    updateUser(editingId, { name: editName, role: isMasterRow ? undefined : editRole })
    setEditingId(null)
  }

  const submitNew = async (e) => {
    e.preventDefault()
    const res = await createUser(form)
    if (!res.ok) return setError(res.error)
    setError('')
    setForm(blankNew)
    setShowForm(false)
  }

  const roleBadge = (r) =>
    ({
      [ROLES.MASTER_ADMIN]: 'bg-ink text-white',
      [ROLES.STORE]: 'bg-amber-100 text-amber-700',
      [ROLES.CUSTOMER]: 'bg-brand-100 text-brand-700',
    })[r] || 'bg-black/10 text-ink'

  return (
    <div>
      <PanelHead
        title="משתמשים והרשאות"
        subtitle="יצירת חשבונות, עריכת שמות והגדרת סוג משתמש."
        action={
          <div className="flex gap-2">
            <GhostBtn onClick={doRefresh} disabled={refreshing}>
              <RotateCcw size={16} /> {refreshing ? 'מרענן…' : 'רענון'}
            </GhostBtn>
            {showForm ? (
              <GhostBtn onClick={() => setShowForm(false)}>
                <X size={16} /> סגירה
              </GhostBtn>
            ) : (
              <PrimaryBtn
                onClick={() => {
                  setForm(blankNew)
                  setError('')
                  setShowForm(true)
                }}
              >
                <Plus size={16} /> משתמש חדש
              </PrimaryBtn>
            )}
          </div>
        }
      />

      {showForm && (
        <Card className="mb-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <form onSubmit={submitNew} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Field label="שם מלא" req>
              <input className={inputCls} value={form.name} onChange={(e) => setF('name', e.target.value)} />
            </Field>
            <Field label="סוג המשתמש / הלקוח" req>
              <select className={inputCls} value={form.role} onChange={(e) => setF('role', e.target.value)}>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="אימייל" req>
              <input className={inputCls} dir="ltr" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} placeholder="name@email.com" />
            </Field>
            <Field label="סיסמה" req>
              <div className="relative">
                <input
                  className={`${inputCls} pl-10`}
                  dir="ltr"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setF('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
                  aria-label={showPw ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <PrimaryBtn type="submit">
                <Plus size={16} /> יצירת משתמש
              </PrimaryBtn>
            </div>
          </form>
        </Card>
      )}

      <Table columns={['משתמש', 'אימייל', 'סוג המשתמש / הלקוח', '']}>
        {users.map((u) => {
          const isMasterRow = u.id === masterAdminId
          const editing = editingId === u.id
          return (
            <tr key={u.id} className="hover:bg-brand-50/40">
              <td className="px-4 py-3">
                {editing ? (
                  <input
                    autoFocus
                    className={inputCls}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(isMasterRow)}
                  />
                ) : (
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <RoleIcon role={u.role} size={16} className={isMasterRow ? 'text-amber-500' : 'text-ink-light'} />
                    {u.name}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-ink-light" dir="ltr">{u.email}</td>
              <td className="px-4 py-3">
                {/* Read-only by default; unlocks to a select only while editing (non-master) */}
                {editing && !isMasterRow ? (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="cursor-pointer rounded-lg border border-brand-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-brand-500"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${roleBadge(u.role)}`}>
                    <RoleIcon role={u.role} size={13} />
                    {ROLE_LABELS[u.role]}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-left">
                <div className="flex justify-end gap-1">
                  {editing ? (
                    <>
                      <IconBtn aria-label="שמירה" onClick={() => saveEdit(isMasterRow)}>
                        <Check size={16} />
                      </IconBtn>
                      <IconBtn aria-label="ביטול" onClick={() => setEditingId(null)}>
                        <X size={16} />
                      </IconBtn>
                    </>
                  ) : (
                    <>
                      <IconBtn aria-label="עריכה" onClick={() => startEdit(u)}>
                        <Pencil size={16} />
                      </IconBtn>
                      {!isMasterRow && (
                        <IconBtn danger aria-label="מחיקה" onClick={() => window.confirm(`למחוק את ${u.name}?`) && deleteUser(u.id)}>
                          <Trash2 size={16} />
                        </IconBtn>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
