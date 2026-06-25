import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldAlert, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import Header from '../components/Header.jsx'
import BrandCarousel from '../components/BrandCarousel.jsx'
import FeatureStrip from '../components/FeatureStrip.jsx'
import ItemGrid from '../components/ItemGrid.jsx'
import HotDeals from '../components/HotDeals.jsx'
import CategoryShowcase from '../components/CategoryShowcase.jsx'
import WhyBuy from '../components/WhyBuy.jsx'
import Reviews from '../components/Reviews.jsx'
import ContactSection from '../components/ContactSection.jsx'
import WhatsAppButton from '../components/WhatsAppButton.jsx'
import CartDrawer from '../components/CartDrawer.jsx'
import Footer from '../components/Footer.jsx'

// Short hero that reflects the active domain.
function DomainHero() {
  const { isStore } = useApp()
  const { settings } = useSettings()
  return (
    <div className="bg-gradient-to-l from-brand-500 to-brand-700 text-white">
      <div className="w-full px-4 py-4 sm:py-8 xl:px-[3cm]">
        <h2 className="text-lg font-extrabold sm:text-3xl">
          {isStore ? `החנות של ${settings.name}` : `מעבדת ${settings.name}`}
        </h2>
        <p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">
          {isStore
            ? 'מכשירים כשרים, תומכי כשר וסמארטפונים מסוננים — הכל במקום אחד.'
            : 'תיקון מקצועי לכל סוגי המכשירים: מסכים, סוללות, שקעים ותיקוני לוח אם.'}
        </p>
      </div>
    </div>
  )
}

// Shown when a CUSTOMER/guest was redirected away from /admin.
function UnauthorizedBanner() {
  const location = useLocation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (location.state?.unauthorized) {
      setShow(true)
      // Clear the history state so a refresh doesn't re-show it.
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  if (!show) return null
  return (
    <div className="bg-red-50">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm text-red-700 xl:px-[3cm]">
        <span className="flex items-center gap-2">
          <ShieldAlert size={16} /> אין לך הרשאת גישה לאזור הניהול.
        </span>
        <button onClick={() => setShow(false)} aria-label="סגירה" className="hover:text-red-900">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

// The promo strip belongs to the home view only — it hides on any other
// category/brand selection and returns when "ראשי" is active again.
function HomeFeatureStrip() {
  const { isStore, filters } = useApp()
  if (isStore && filters.category === 'home') return <FeatureStrip />
  return null
}

// The "ראשי" tab (store only) shows the hot-deals view; everything else uses
// the normal product/service grid.
function HomeBody() {
  const { isStore, filters } = useApp()
  if (isStore && filters.category === 'home')
    return (
      <>
        <HotDeals />
        <CategoryShowcase />
        <WhyBuy />
        <Reviews />
        <ContactSection />
      </>
    )
  return <ItemGrid />
}

export default function Home() {
  return (
    // App-shell: the header, hero and brand row stay fixed; only the lower
    // region (products + footer) scrolls. The category sidebar is sticky so it
    // stays visible while the products scroll.
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <UnauthorizedBanner />
      <DomainHero />
      <BrandCarousel />
      {/* Rotating featured-content strip — home view only */}
      <HomeFeatureStrip />

      <main className="w-full px-4 py-6 xl:px-[3cm] 2xl:px-[7cm]">
        <HomeBody />
      </main>

      <Footer />
      <WhatsAppButton />
      <CartDrawer />
    </div>
  )
}
