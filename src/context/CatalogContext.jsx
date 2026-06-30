import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { DOMAINS } from './AppContext.jsx'
import { STORE_PRODUCTS, STORE_CATEGORIES } from '../data/storeProducts.js'
import { LAB_SERVICES, LAB_CATEGORIES } from '../data/labServices.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { normImei, imeiOf, colorOf } from '../utils/imei.js'

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

// Local cache of the last-known catalog, so a returning visitor sees the real
// (admin-edited) data instantly while the network revalidates in the background.
// Writes are best-effort — if the snapshot is too large for localStorage (e.g.
// big base64 images) it's simply skipped.
const CACHE_KEY = 'drfone_catalog_v1'
function loadCatalogCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY))
    if (c && Array.isArray(c.store) && Array.isArray(c.storeCats)) return c
  } catch {
    /* ignore */
  }
  return null
}

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  // Show content on the very first paint with NO network wait: prefer the local
  // cache (the real catalog from a previous visit), falling back to the bundled
  // defaults. The Supabase fetch below only reconciles this in the background
  // and never blanks it out. `ready` is therefore true from the start.
  const cached = loadCatalogCache()
  const [store, setStore] = useState(() => cached?.store ?? normalizeProducts(ITEM_SEEDS[DOMAINS.STORE]))
  const [lab, setLab] = useState(() => cached?.lab ?? ITEM_SEEDS[DOMAINS.LAB])
  const [storeCats, setStoreCats] = useState(() => cached?.storeCats ?? CAT_SEEDS[DOMAINS.STORE].map((c) => ({ ...c })))
  const [labCats, setLabCats] = useState(() => cached?.labCats ?? CAT_SEEDS[DOMAINS.LAB].map((c) => ({ ...c })))
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

  // Private product costs (master admin only) — kept out of the public catalog
  // data so the cost never reaches a customer. Map of productId -> cost.
  const { isMaster } = useAuth()
  const [costs, setCosts] = useState({})
  useEffect(() => {
    if (!isMaster) {
      setCosts({})
      return
    }
    let active = true
    supabase
      .from('product_costs')
      .select('*')
      .then(({ data }) => {
        if (active && Array.isArray(data)) setCosts(Object.fromEntries(data.map((r) => [r.id, Number(r.cost) || 0])))
      })
    return () => {
      active = false
    }
  }, [isMaster])
  const getCost = useCallback((id) => Number(costs[id]) || 0, [costs])

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
      const nextStore = itemRows.length
        ? normalizeProducts(itemRows.filter((r) => r.domain === DOMAINS.STORE).map(rowToItem))
        : store
      const nextLab = itemRows.length ? itemRows.filter((r) => r.domain === DOMAINS.LAB).map(rowToItem) : lab
      const nextSCats = catRows.length ? catRows.filter((r) => r.domain === DOMAINS.STORE).map(rowToCat) : storeCats
      const nextLCats = catRows.length ? catRows.filter((r) => r.domain === DOMAINS.LAB).map(rowToCat) : labCats
      if (itemRows.length) {
        setStore(nextStore)
        setLab(nextLab)
      }
      if (catRows.length) {
        setStoreCats(nextSCats)
        setLabCats(nextLCats)
      }
      // Refresh the local cache so the next visit paints the real data instantly.
      // Skip oversized snapshots (image-heavy base64 catalogs) — caching megabytes
      // gives no benefit and can blow the localStorage quota on mobile. Once
      // images move to Storage URLs the snapshot is tiny and caches cleanly.
      if (itemRows.length || catRows.length) {
        try {
          const snapshot = JSON.stringify({ store: nextStore, lab: nextLab, storeCats: nextSCats, labCats: nextLCats })
          if (snapshot.length < 2_000_000) localStorage.setItem(CACHE_KEY, snapshot)
          else localStorage.removeItem(CACHE_KEY)
        } catch {
          /* storage unavailable / quota — ignore */
        }
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

  // Persist a product's private cost to the admin-only table (never the catalog).
  const persistCost = (id, cost) => {
    const c = Number(cost) || 0
    setCosts((m) => ({ ...m, [id]: c }))
    supabase.from('product_costs').upsert({ id, cost: c, updated_at: new Date().toISOString() }).then(({ error }) => {
      if (error) console.warn('[catalog] persistCost failed:', error.message)
    })
  }

  const addItem = useCallback((domain, item) => {
    const id = `${domain}-${Date.now()}`
    // `cost` is private — store it separately, never in the public catalog data.
    const { cost, ...rest } = item
    const withId = { ...rest, id }
    setItemsState(domain)((prev) => [withId, ...prev])
    supabase.from('catalog_items').insert(itemToRow(domain, withId)).then(({ error }) => {
      if (error) console.warn('[catalog] addItem failed:', error.message)
    })
    if (cost != null && cost !== '') persistCost(id, cost)
    return id
  }, [])

  const updateItem = useCallback((domain, id, patch) => {
    const hasCost = 'cost' in patch
    const { cost, ...rest } = patch
    if (Object.keys(rest).length) {
      const current = itemsRef(domain).current.find((it) => it.id === id)
      const merged = current ? { ...current, ...rest } : null
      setItemsState(domain)((prev) => prev.map((it) => (it.id === id ? { ...it, ...rest } : it)))
      if (merged) {
        const { id: _omit, ...data } = merged
        supabase.from('catalog_items').update({ data }).eq('id', id).then(({ error }) => {
          if (error) console.warn('[catalog] updateItem failed:', error.message)
        })
      }
    }
    if (hasCost) persistCost(id, cost)
  }, [])

  const deleteItem = useCallback((domain, id) => {
    setItemsState(domain)((prev) => prev.filter((it) => it.id !== id))
    supabase.from('catalog_items').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('[catalog] deleteItem failed:', error.message)
    })
    supabase.from('product_costs').delete().eq('id', id).then(() => {})
    setCosts((m) => { const n = { ...m }; delete n[id]; return n })
  }, [])

  // Lower stock when an order is placed. Goes through a SECURITY DEFINER RPC so
  // it persists even for a customer/guest checkout (RLS blocks non-admins from
  // writing catalog_items directly). The local update is just an optimistic echo.
  const decrementStock = useCallback((domain, id, qty) => {
    const current = itemsRef(domain).current.find((it) => it.id === id)
    if (current) {
      const nextStock = Math.max(0, (Number(current.stock) || 0) - qty)
      setItemsState(domain)((prev) => prev.map((it) => (it.id === id ? { ...it, stock: nextStock, inStock: nextStock > 0 } : it)))
    }
    supabase.rpc('decrement_stock', { p_id: id, p_qty: Number(qty) || 0 }).then(({ error }) => {
      if (error) console.warn('[catalog] decrementStock failed:', error.message)
    })
  }, [])

  // Allocate `qty` IMEIs of a chosen COLOR for an order, so each sold unit's
  // exact IMEI stays tied to the color the customer picked — a pink order can
  // never be fulfilled with a black unit. Returns { allocated:[{imei,color}],
  // shortage } synchronously from the local list (used for the order record),
  // and persists the authoritative removal via a color-aware SECURITY DEFINER
  // RPC. Non-serial products just decrement their plain stock.
  const allocateImeis = useCallback((domain, id, color, qty) => {
    const n = Math.max(0, Number(qty) || 0)
    const product = itemsRef(domain).current.find((it) => it.id === id)
    if (!product || !product.hasSerial) {
      if (product) decrementStock(domain, id, n)
      return { allocated: [], shortage: 0 }
    }
    const list = (Array.isArray(product.imeis) ? product.imeis : []).map(normImei).filter((e) => imeiOf(e).trim())
    const want = color || ''
    // Trust color tags once any unit is tagged; otherwise allocate by position.
    const anyTagged = list.some((e) => colorOf(e))
    const allocated = []
    const remaining = []
    list.forEach((e) => {
      const ok = allocated.length < n && (!want || !anyTagged || colorOf(e) === want)
      if (ok) allocated.push(e)
      else remaining.push(e)
    })
    // Optimistic local update so the admin catalog reflects the sale at once.
    setItemsState(domain)((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, imeis: remaining, stock: remaining.length, inStock: remaining.length > 0, imei1: remaining[0]?.imei || '', imei2: remaining[1]?.imei || '' }
          : it,
      ),
    )
    // Server-authoritative removal. Falls back to a plain decrement if the
    // allocate_imeis RPC hasn't been deployed yet (see schema_imei_alloc.sql).
    supabase.rpc('allocate_imeis', { p_id: id, p_color: want, p_qty: n }).then(({ error }) => {
      if (error) {
        console.warn('[catalog] allocateImeis failed, falling back to decrement_stock:', error.message)
        supabase.rpc('decrement_stock', { p_id: id, p_qty: n }).then(() => {})
      }
    })
    return { allocated, shortage: Math.max(0, n - allocated.length) }
  }, [decrementStock])

  // Bulk-import predefined products (e.g. the Samsung/Apple device catalog).
  // Uses stable ids + upsert so a re-import UPDATES rather than duplicates, and
  // ensures any required categories exist first. Runs with the caller's own
  // (master-admin) session, so no server credentials are needed here.
  const importItems = useCallback(async (domain, items, cats = []) => {
    try {
      // Ensure categories exist (by id).
      const existing = new Set(catRef.current[domain].map((c) => c.id))
      const newCats = cats.filter((c) => !existing.has(c.id))
      if (newCats.length) {
        const base = catRef.current[domain].length
        const rows = newCats.map((c, i) => ({ id: c.id, domain, label: c.label, image: null, sort_order: base + i }))
        const { error } = await supabase.from('catalog_categories').upsert(rows)
        if (error) return { ok: false, error: error.message }
        setCatsState(domain)((prev) => [...prev, ...newCats.map((c) => ({ id: c.id, label: c.label }))])
      }
      // Upsert the items.
      const rows = items.map((it) => itemToRow(domain, it))
      const { error } = await supabase.from('catalog_items').upsert(rows)
      if (error) return { ok: false, error: error.message }
      // Merge into local state (replace existing ids, prepend new ones).
      const normed = domain === DOMAINS.STORE ? normalizeProducts(items) : items
      setItemsState(domain)((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]))
        normed.forEach((it) => byId.set(it.id, it))
        return Array.from(byId.values())
      })
      return { ok: true, count: items.length }
    } catch (e) {
      return { ok: false, error: e?.message || 'import failed' }
    }
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
    allocateImeis,
    getCost,
    importItems,
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
