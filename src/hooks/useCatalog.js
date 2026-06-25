import { useMemo } from 'react'
import { useApp, DOMAINS } from '../context/AppContext.jsx'
import { useCatalogStore } from '../context/CatalogContext.jsx'

// `kind` is static per domain; items AND categories come from the persistent
// CatalogContext (so admin edits are reflected live). This per-domain sourcing
// is what enforces the strict separation rule: filtering only ever sees one side.
const KIND = {
  [DOMAINS.STORE]: 'product',
  [DOMAINS.LAB]: 'service',
}

export function useCatalog() {
  const { domain, filters } = useApp()
  const { getItems, getCategoriesWithAll } = useCatalogStore()
  const { search, category, brand, sort } = filters

  const items = getItems(domain)
  // Store-only virtual tabs: "ראשי" (home / featured deals view) and "מבצעים"
  // (the deals collection — any product flagged `deal` belongs to it, no matter
  // its real category). They are injected for the storefront only.
  const categories = useMemo(() => {
    const base = getCategoriesWithAll(domain)
    if (domain !== DOMAINS.STORE) return base
    // Prepend "ראשי" (home). Only add a virtual "מבצעים" if no real deals
    // category already exists (the seed ships one) — avoids a duplicate chip.
    const hasDeals = base.some((c) => c.id === 'deals')
    return [{ id: 'home', label: 'ראשי' }, ...base, ...(hasDeals ? [] : [{ id: 'deals', label: 'מבצעים' }])]
  }, [getCategoriesWithAll, domain])

  const results = useMemo(() => {
    const term = search.trim().toLowerCase()

    // Start from the active domain's items ONLY — the other domain's data is
    // never part of this array, so cross-contamination is structurally impossible.
    const filtered = items.filter((item) => {
      const matchesCategory =
        category === 'all' || category === 'home'
          ? true
          : category === 'deals'
            ? // The deals collection = products assigned to it OR flagged as a deal.
              item.category === 'deals' || item.deal === true
            : item.category === category
      const matchesBrand = brand === 'all' || item.brand === brand
      const matchesSearch =
        term === '' ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        // Barcode match (e.g. scanning a barcode into the search box). Internal
        // only — the barcode itself is never displayed to customers.
        (!!item.barcode && String(item.barcode).toLowerCase().includes(term))

      return matchesCategory && matchesBrand && matchesSearch
    })

    if (sort === 'price-asc') return [...filtered].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') return [...filtered].sort((a, b) => b.price - a.price)
    return filtered
  }, [items, search, category, brand, sort])

  return {
    results,
    categories,
    kind: KIND[domain], // 'product' | 'service' — lets the UI relabel itself
    total: items.length,
  }
}
