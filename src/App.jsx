import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import AccessibilityWidget from './components/AccessibilityWidget.jsx'

// Code-splitting: the storefront home page loads eagerly (it's the landing
// page), but every other route — especially the heavy admin panel — is loaded
// on demand, so a regular visitor never downloads admin/checkout code up front.
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'))

// Lightweight fallback while a lazy route's code is being fetched.
function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Account />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          {/* Unknown routes fall back to the storefront. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {/* Site-wide accessibility menu (required by law). */}
      <AccessibilityWidget />
    </>
  )
}
