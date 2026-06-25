import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { SEED_BRANDS, ALL_BRAND } from '../data/brands.js'
import { kvLoadAll, kvSave } from '../lib/kv.js'
import { useAuth } from './AuthContext.jsx'

// ---------------------------------------------------------------------------
// Dynamic, admin-editable STORE brand registry. Each brand has { id, label,
// logo }. Drives the storefront brand carousel, the catalog brand filter, and
// the product form's brand selector. Persisted to Supabase (app_state/brands):
// public read, master-admin write.
// ---------------------------------------------------------------------------

const slug = (s) =>
  'brand-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4)

const BrandsContext = createContext(null)

export function BrandsProvider({ children }) {
  const { isMaster } = useAuth()
  const [brands, setBrands] = useState(SEED_BRANDS)
  const [loaded, setLoaded] = useState(false)

  // Load from Supabase (falls back to the seed until an admin first saves it).
  useEffect(() => {
    let active = true
    kvLoadAll('app_state').then((m) => {
      if (!active) return
      if (Array.isArray(m.brands)) setBrands(m.brands)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  // Persist on change — only for the master admin (the only writer allowed by
  // RLS). This also seeds the row on the admin's first load.
  useEffect(() => {
    if (loaded && isMaster) kvSave('app_state', 'brands', brands)
  }, [brands, loaded, isMaster])

  const addBrand = useCallback(({ label, logo = '' }) => {
    if (!label.trim()) return
    setBrands((prev) => [...prev, { id: slug(label), label: label.trim(), logo: logo.trim() }])
  }, [])

  const updateBrand = useCallback((id, patch) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch, label: (patch.label ?? b.label).trim() } : b)),
    )
  }, [])

  const deleteBrand = useCallback((id) => {
    setBrands((prev) => prev.filter((b) => b.id !== id))
  }, [])

  // Move a brand up (-1) or down (+1) in the ordering (drives the carousel order).
  const moveBrand = useCallback((id, dir) => {
    setBrands((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      const next = idx + dir
      if (idx === -1 || next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      return copy
    })
  }, [])

  const value = {
    brands, // editable list (no "all")
    brandsWithAll: [ALL_BRAND, ...brands],
    brandLabel: (id) => brands.find((b) => b.id === id)?.label || id,
    addBrand,
    updateBrand,
    deleteBrand,
    moveBrand,
  }
  return <BrandsContext.Provider value={value}>{children}</BrandsContext.Provider>
}

export function useBrands() {
  const ctx = useContext(BrandsContext)
  if (!ctx) throw new Error('useBrands must be used within a <BrandsProvider>')
  return ctx
}
