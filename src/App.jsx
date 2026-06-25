import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Checkout from './pages/Checkout.jsx'
import Account from './pages/Account.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import AccessibilityWidget from './components/AccessibilityWidget.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
      {/* Site-wide accessibility menu (required by law). */}
      <AccessibilityWidget />
    </>
  )
}
