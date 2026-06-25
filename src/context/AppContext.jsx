import { createContext, useContext, useState, useCallback } from 'react'

// The two domains of the platform. This is the only place the literal
// domain keys are defined.
export const DOMAINS = {
  STORE: 'store',
  LAB: 'lab',
}

// The landing category per domain. The storefront opens on "ראשי" (home /
// featured view, id 'home'); the lab has no home tab so it opens on "all".
const defaultCategory = (domain) => (domain === DOMAINS.STORE ? 'home' : 'all')

const makeInitialFilters = (domain) => ({
  search: '',
  category: defaultCategory(domain),
  brand: 'all',
  sort: 'recommended', // recommended | price-asc | price-desc
})

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [domain, setDomain] = useState(DOMAINS.STORE)
  const [filters, setFilters] = useState(() => makeInitialFilters(DOMAINS.STORE))

  // Switching domains ALWAYS wipes the filter state. A search term or brand
  // selected in the Store must never leak into the Lab (and vice-versa). Each
  // domain lands on its own default category ("ראשי" for the store).
  const switchDomain = useCallback((nextDomain) => {
    setDomain((current) => {
      if (current === nextDomain) return current
      setFilters(makeInitialFilters(nextDomain))
      return nextDomain
    })
  }, [])

  const setSearch = useCallback((search) => {
    setFilters((f) => {
      const next = { ...f, search }
      // The "ראשי" featured view ignores the search term, so searching there
      // would look like nothing happened — jump to the full catalog so results
      // actually show.
      if (search.trim() && f.category === 'home') next.category = 'all'
      return next
    })
  }, [])

  const setCategory = useCallback((category) => {
    setFilters((f) => ({ ...f, category }))
  }, [])

  const setBrand = useCallback((brand) => {
    setFilters((f) => ({ ...f, brand }))
  }, [])

  const setSort = useCallback((sort) => {
    setFilters((f) => ({ ...f, sort }))
  }, [])

  const resetFilters = useCallback(() => setFilters(makeInitialFilters(domain)), [domain])

  // Clicking the logo always returns to the storefront "ראשי" view: force the
  // Store domain and reset every filter (category → home, brand/search cleared).
  const goHome = useCallback(() => {
    setDomain(DOMAINS.STORE)
    setFilters(makeInitialFilters(DOMAINS.STORE))
  }, [])

  const value = {
    domain,
    isStore: domain === DOMAINS.STORE,
    isLab: domain === DOMAINS.LAB,
    switchDomain,
    filters,
    setSearch,
    setCategory,
    setBrand,
    setSort,
    resetFilters,
    goHome,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an <AppProvider>')
  return ctx
}
