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
          aria-label="התחברות"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold text-ink hover:bg-black/5 sm:px-3"
        >
          <LogIn size={16} /> <span className="hidden sm:inline">התחברות</span>
        </Link>
        <Link
          to="/register"
          aria-label="הרשמה"
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 sm:px-4"
        >
          <UserPlus size={16} /> <span className="hidden sm:inline">הרשמה</span>
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
          aria-label="איזור אישי"
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 sm:px-3"
        >
          <User size={16} /> <span className="hidden sm:inline">איזור אישי</span>
        </Link>
      )}
      {/* Admin Panel link — rendered for staff (חנות) and master admin */}
      {canAccessAdmin && (
        <Link
          to="/admin"
          aria-label="ניהול"
          className="flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-2 text-sm font-semibold text-white hover:bg-ink-dark sm:px-3"
        >
          <LayoutDashboard size={16} /> <span className="hidden sm:inline">ניהול</span>
        </Link>
      )}
      <span className="hidden items-center gap-1.5 text-sm text-ink sm:flex">
        <UserCircle size={18} className="text-brand-500" />
        שלום, <span className="font-semibold">{user.name}</span>
      </span>
      <button
        onClick={logout}
        aria-label="התנתקות"
        className="flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-2 text-sm font-semibold text-ink hover:bg-black/5 sm:px-3"
      >
        <LogOut size={16} /> <span className="hidden sm:inline">התנתקות</span>
      </button>
    </div>
  )
}
