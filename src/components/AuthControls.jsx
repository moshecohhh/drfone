import { Link } from 'react-router-dom'
import { LogIn, LogOut, UserPlus, LayoutDashboard, UserCircle, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

// Navbar auth area:
// - Logged out: "התחברות" / "הרשמה"
// - Logged in:  "שלום, [שם]" + "התנתקות"
// - ADMIN only: a link to the Admin Panel
export default function AuthControls() {
  const { user, isAuthenticated, canAccessAdmin, logout } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5"
        >
          <LogIn size={16} /> התחברות
        </Link>
        <Link
          to="/register"
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <UserPlus size={16} /> הרשמה
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Personal area — for customers (no admin access) */}
      {!canAccessAdmin && (
        <Link
          to="/account"
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <User size={16} /> איזור אישי
        </Link>
      )}
      {/* Admin Panel link — rendered for staff (חנות) and master admin */}
      {canAccessAdmin && (
        <Link
          to="/admin"
          className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-ink-dark"
        >
          <LayoutDashboard size={16} /> ניהול
        </Link>
      )}
      <span className="hidden items-center gap-1.5 text-sm text-ink sm:flex">
        <UserCircle size={18} className="text-brand-500" />
        שלום, <span className="font-semibold">{user.name}</span>
      </span>
      <button
        onClick={logout}
        className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5"
      >
        <LogOut size={16} /> התנתקות
      </button>
    </div>
  )
}
