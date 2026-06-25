import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { DOMAINS } from './AppContext.jsx'
import { STORE_PRODUCTS, STORE_CATEGORIES } from '../data/storeProducts.js'
import { LAB_SERVICES, LAB_CATEGORIES } from '../data/labServices.js'
import { supabase } from '../lib/supabase.js'

// ---------------------------------------------------------------------------
// Persistent catalog (items + categories), backed by Supabase so an admin edit
// reaches every visitor. Reads are public; writes require the master admin
// (enforced by RLS — see supabase/schema_catalog.sql). The Context keeps the
// same synchronous API as before: mutations update local state optimistically
// and persist to Supabase in the background.
// ---------------------------------------------------------------------------

const ITEM_SEEDS = {
  [DOMAINS.STORE]: STORE_PRODUCTS,
  [DOMAINS.LAB]: LAB_SERVICES,
}
// Categories are managed without the virtual "all" entry (that's a filter).
const CAT_SEEDS = {
  [DOMAINS.STORE]: STORE_CATEGORIES.filter((c) => c.id !== 'all'),
  [DOMAINS.LAB]: LAB_CATEGORIES.filter((c) => c.id !== 'all'),
}

// The virtual "all" filter prepended for the storefront UI.
export const ALL_CATEGORY = { id: 'all', label: 'כל הקטגוריות' }

// Backfill fields added in later versions onto products (so older data works).
function normalizeProducts(list) {
  return list.map((p) => {
    const hasStock = typeof p.stock === 'number'
    const stock = hasStock ? p.stock : p.inStock === false ? 0 : 10
    return { ...p, stock, inStock: stock > 0, image: p.image || '' }
  })
}

// Row <-> item helpers. The item's full object lives in the jsonb `data`
// column; `id` is the primary key.
const rowToItem = (row) => ({ id: row.id, ...row.data })
const itemToRow = (domain, item) => {
  const { id, ...data } = item
  return { id, domain, data }
}
const rowToCat = (row) => ({ id: row.id, label: row.label, ...(row.image ? { image: row.image } : {}) })

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  // Seed from the bundled defaults IMMEDIATELY so the catalog (products +
  // categories) is on screen from the very first paint — no waiting on the
  // network. The Supabase fetch below only reconciles this in the background,
  // and never blanks it out. `ready` is therefore true from the start.
  const [store, setStore] = useState(() => normalizeProducts(ITEM_SEEDS[DOMAINS.STORE]))
  const [lab, setLab] = useState(() => ITEM_SEEDS[DOMAINS.LAB])
  const [storeCats, setStoreCats] = useState(() => CAT_SEEDS[DOMAINS.STORE].map((c) => ({ ...c })))
  const [labCats, setLabCats] = useState(() => CAT_SEEDS[DOMAINS.LAB].map((c) => ({ ...c })))
  const [ready, setReady] = useState(true)
  // `synced` flips true once the Supabase fetch has completed (success or not).
  // The seed has products & categories but NO deals (those are admin-set), so a
  // "no deals" / "no results" message must wait for the real data before showing.
  const [synced, setSynced] = useState(false)

  // Refs mirror state so mutation helpers can read current values for the
  // Supabase payload without stale closures.
  const storeRef = useRef(store)
  const labRef = useRef(lab)
  const catRef = useRef({ store: storeCats, lab: labCats })
  storeRef.current = store
  labRef.current = lab
  catRef.current = { store: storeCats, lab: labCats }

  const setItemsState = (domain) => (domain === DOMAINS.STORE ? setStore : setLab)
  const itemsRef = (domain) => (domain === DOMAINS.STORE ? storeRef : labRef)
  const setCatsState = (domain) => (domain === DOMAINS.STORE ? setStoreCats : setLabCats)

  // ---- Initial load (+ one-time seed when the catalog is empty) ----
  useEffect(() => {
    let active = true
    // Safety net: never leave "no deals / no results" states waiting forever if
    // the network hangs — flip `synced` after 6s regardless.
    const failSafe = setTimeout(() => active && setSynced(true), 6000)
    ;(async () => {
      try {
      const [{ data: items }, { data: cats }] = await Promise.all([
        supabase.from('catalog_items').select('*').order('created_at', { ascending: false }),
        supabase.from('catalog_categories').select('*').order('sort_order', { ascending: true }),
      ])
      let itemRows = items || []
      let catRows = cats || []

      // First run: seed from the bundled defaults. Best-effort — only succeeds
      // for the master admin (RLS); other visitors just see an empty catalog
      // until an admin seeds it. Fixed primary keys make this safe to retry.
      if (itemRows.length === 0 && catRows.length === 0) {
        const seededItems = [
          ...ITEM_SEEDS[DOMAINS.STORE].map((it, i) => ({
            ...itemToRow(DOMAINS.STORE, it),
            created_at: new Date(Date.now() - i * 1000).toISOString(),
          })),
          ...ITEM_SEEDS[DOMAINS.LAB].map((it, i) => ({
            ...itemToRow(DOMAINS.LAB, it),
            created_at: new Date(Date.now() - i * 1000).toISOString(),
          })),
        ]
        const seededCats = [
          ...CAT_SEEDS[DOMAINS.STORE].map((c, i) => ({
            id: c.id, domain: DOMAINS.STORE, label: c.label, image: c.image || null, sort_order: i,
          })),
          ...CAT_SEEDS[DOMAINS.LAB].map((c, i) => ({
            id: c.id, domain: DOMAINS.LAB, label: c.label, image: c.image || null, sort_order: i,
          })),
        ]
        const [insItems, insCats] = await Promise.all([
          supabase.from('catalog_items').insert(seededItems).select('*'),
          supabase.from('catalog_categories').insert(seededCats).select('*'),
        ])
        if (!insItems.error && insItems.data) itemRows = insItems.data
        if (!insCats.error && insCats.data) catRows = insCats.data
      }

      if (!active) return
      // Reconcile with the server — but only overwrite the seeded state when the
      // fetch actually returned rows, so a slow / empty / failed request never
      // wipes the catalog back to nothing.
      if (itemRows.length) {
        setStore(normalizeProducts(itemRows.filter((r) => r.domain === DOMAINS.STORE).map(rowToItem)))
        setLab(itemRows.filter((r) => r.domain === DOMAINS.LAB).map(rowToItem))
      }
      if (catRows.length) {
        setStoreCats(catRows.filter((r) => r.domain === DOMAINS.STORE).map(rowToCat))
        setLabCats(catRows.filter((r) => r.domain === DOMAINS.LAB).map(rowToCat))
      }
      setReady(true)
      } catch {
        /* network / RLS failure — keep the bundled seed that's already on screen */
      } finally {
        if (active) setSynced(true)
        clearTimeout(failSafe)
      }
    })()
    return () => {
      active = false
      clearTimeout(failSafe)
    }
  }, [])

  // ---- Items ----
  const getItems = useCallback((domain) => (domain === DOMAINS.STORE ? store : lab), [store, lab])

  const addItem = useCallback((domain, item) => {
    const id = `${domain}-${Date.now()}`
    const withId = { ...item, id }
    setItemsState(domain)((prev) => [withId, ...prev])
    supabase.from('catalog_items').insert(itemToRow(domain, withId)).then(({ error }) => {
      if (error) console.warn('[catalog] addItem failed:', error.message)
    })
  }, [])

  const updateItem = useCallback((domain, id, patch) => {
    const current = itemsRef(domain).current.find((it) => it.id === id)
    const merged = current ? { ...current, ...patch } : null
    setItemsState(domain)((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    if (merged) {
      const { id: _omit, ...data } = merged
      supabase.from('catalog_items').update({ data }).eq('id', id).then(({ error }) => {
        if (error) console.warn('[catalog] updateItem failed:', error.message)
      })
    }
  }, [])

  const deleteItem = useCallback((domain, id) => {
    setItemsState(domain)((prev) => prev.filter((it) => it.id !== id))
    supabase.from('catalog_items').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('[catalog] deleteItem failed:', error.message)
    })
  }, [])

  // Lower stock when an order is placed (inventory tracking). Never below 0.
  const decrementStock = useCallback((domain, id, qty) => {
    const current = itemsRef(domain).current.find((it) => it.id === id)
    if (!current) return
    const nextStock = Math.max(0, (Number(current.stock) || 0) - qty)
    const merged = { ...current, stock: nextStock, inStock: nextStock > 0 }
    setItemsState(domain)((prev) => prev.map((it) => (it.id === id ? merged : it)))
    const { id: _omit, ...data } = merged
    supabase.from('catalog_items').update({ data }).eq('id', id).then(() => {})
  }, [])

  const resetDomain = useCallback(async (domain) => {
    // Wipe this domain and re-insert the bundled defaults.
    await Promise.all([
      supabase.from('catalog_items').delete().eq('domain', domain),
      supabase.from('catalog_categories').delete().eq('domain', domain),
    ])
    const seededItems = ITEM_SEEDS[domain].map((it, i) => ({
      ...itemToRow(domain, it),
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }))
    const seededCats = CAT_SEEDS[domain].map((c, i) => ({
      id: c.id, domain, label: c.label, image: c.image || null, sort_order: i,
    }))
    await Promise.all([
      supabase.from('catalog_items').insert(seededItems),
      supabase.from('catalog_categories').insert(seededCats),
    ])
    setItemsState(domain)(
      domain === DOMAINS.STORE ? normalizeProducts(ITEM_SEEDS[domain]) : ITEM_SEEDS[domain],
    )
    setCatsState(domain)(CAT_SEEDS[domain].map((c) => ({ ...c })))
  }, [])

  // ---- Categories ----
  const getCategories = useCallback(
    (domain) => (domain === DOMAINS.STORE ? storeCats : labCats),
    [storeCats, labCats],
  )

  const getCategoriesWithAll = useCallback(
    (domain) => [ALL_CATEGORY, ...(domain === DOMAINS.STORE ? storeCats : labCats)],
    [storeCats, labCats],
  )

  const slugify = (label) =>
    'cat-' +
    label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w֐-׿-]/g, '') +
    '-' +
    Date.now().toString().slice(-4)

  const addCategory = useCallback((domain, label) => {
    if (!label.trim()) return
    const id = slugify(label)
    const sort_order = catRef.current[domain].length
    setCatsState(domain)((prev) => [...prev, { id, label: label.trim() }])
    supabase
      .from('catalog_categories')
      .insert({ id, domain, label: label.trim(), sort_order })
      .then(({ error }) => error && console.warn('[catalog] addCategory failed:', error.message))
  }, [])

  const updateCategory = useCallback((domain, id, label) => {
    setCatsState(domain)((prev) => prev.map((c) => (c.id === id ? { ...c, label: label.trim() } : c)))
    supabase.from('catalog_categories').update({ label: label.trim() }).eq('id', id).then(() => {})
  }, [])

  const setCategoryImage = useCallback((domain, id, image) => {
    setCatsState(domain)((prev) => prev.map((c) => (c.id === id ? { ...c, image } : c)))
    supabase.from('catalog_categories').update({ image: image || null }).eq('id', id).then(() => {})
  }, [])

  const deleteCategory = useCallback((domain, id) => {
    setCatsState(domain)((prev) => prev.filter((c) => c.id !== id))
    supabase.from('catalog_categories').delete().eq('id', id).then(() => {})
  }, [])

  // Move a category up (-1) or down (+1), persisting the new ordering.
  const moveCategory = useCallback((domain, id, dir) => {
    setCatsState(domain)((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      const next = idx + dir
      if (idx === -1 || next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      // Persist sort_order for the two swapped rows.
      supabase.from('catalog_categories').update({ sort_order: next }).eq('id', copy[next].id).then(() => {})
      supabase.from('catalog_categories').update({ sort_order: idx }).eq('id', copy[idx].id).then(() => {})
      return copy
    })
  }, [])

  const value = {
    store,
    lab,
    ready,
    synced,
    getItems,
    addItem,
    updateItem,
    deleteItem,
    decrementStock,
    resetDomain,
    // categories
    getCategories,
    getCategoriesWithAll,
    addCategory,
    updateCategory,
    setCategoryImage,
    deleteCategory,
    moveCategory,
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalogStore() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalogStore must be used within a <CatalogProvider>')
  return ctx
}
