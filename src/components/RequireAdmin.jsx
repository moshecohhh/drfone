import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Route guard for /admin.
// - Unauthenticated users are sent to /login (remembering where they wanted to go).
// - Authenticated CUSTOMERs are denied and sent home.
// Only ADMINs render the protected children.
export default function RequireAdmin({ children }) {
  const { isAuthenticated, canAccessAdmin, loading } = useAuth()
  const location = useLocation()

  // Wait for the initial Supabase session check to finish. Otherwise a refresh
  // momentarily sees user=null and bounces a logged-in admin to /login.
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-light">טוען…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!canAccessAdmin) {
    return <Navigate to="/" replace state={{ unauthorized: true }} />
  }
  return children
}
