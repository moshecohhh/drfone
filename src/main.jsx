import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { CatalogProvider } from './context/CatalogContext.jsx'
import { CouponsProvider } from './context/CouponsContext.jsx'
import { BrandsProvider } from './context/BrandsContext.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { LabProvider } from './context/LabContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
        <CatalogProvider>
          <CouponsProvider>
          <BrandsProvider>
          <OrdersProvider>
            <CartProvider>
              <LabProvider>
                <AppProvider>
                  <App />
                </AppProvider>
              </LabProvider>
            </CartProvider>
          </OrdersProvider>
          </BrandsProvider>
          </CouponsProvider>
        </CatalogProvider>
        </SettingsProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
