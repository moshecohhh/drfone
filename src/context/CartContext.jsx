import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { safeSetItem, safeGetItem } from '../utils/storage.js'

// ---------------------------------------------------------------------------
// Shopping cart — STORE PRODUCTS ONLY.
// Lab services never enter the cart; they keep their WhatsApp CTA. This context
// only ever stores items added from the Store side, and checkout uses it alone.
// The cart auto-empties 24h after the last activity; the auto-cleared items are
// kept once so the shopper can restore them (manual deletes are NOT restorable).
// ---------------------------------------------------------------------------

const CART_KEY = 'drfone_cart'
const CART_TS_KEY = 'drfone_cart_ts' // last-activity timestamp
const CART_RESTORE_KEY = 'drfone_cart_restore' // backup from a 24h auto-clear
const DAY_MS = 24 * 60 * 60 * 1000

// Stable per-line identity = product id + chosen color + chosen page-options.
// `optionsKey` is a stable signature of the selected product-page option ids, so
// the same product in two different configurations becomes two cart lines.
const makeLineKey = (id, color, optionsKey = '') => `${id}__${color || ''}__${optionsKey || ''}`

const normalize = (raw) =>
  (Array.isArray(raw) ? raw : []).map((i) => ({
    ...i,
    color: i.color || '',
    listPrice: i.listPrice ?? i.price,
    selections: Array.isArray(i.selections) ? i.selections : [],
    lineId: i.lineId || makeLineKey(i.id, i.color, i.optionsKey),
  }))

// Initial load. If the saved cart is older than 24h, empty it but stash a
// restorable backup. Backfills identity fields on legacy items.
function loadInitial() {
  let items = []
  try {
    items = normalize(JSON.parse(safeGetItem(CART_KEY)) || [])
  } catch {
    items = []
  }
  const ts = Number(safeGetItem(CART_TS_KEY)) || 0
  if (items.length && ts && Date.now() - ts > DAY_MS) {
    safeSetItem(CART_RESTORE_KEY, JSON.stringify(items))
    return { items: [], restorable: items }
  }
  // Carry over a still-pending restore backup from a previous auto-clear.
  let restorable = []
  try {
    restorable = normalize(JSON.parse(safeGetItem(CART_RESTORE_KEY)) || [])
  } catch {
    restorable = []
  }
  return { items, restorable }
}

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const initial = loadInitial()
  const [items, setItems] = useState(initial.items) // [{ id, name, price, ... }]
  const [restorable, setRestorable] = useState(initial.restorable)
  const [open, setOpen] = useState(false)

  // Persist the cart + a fresh activity timestamp on every change.
  useEffect(() => {
    safeSetItem(CART_KEY, JSON.stringify(items))
    safeSetItem(CART_TS_KEY, String(Date.now()))
  }, [items])

  // Restore the items that were auto-cleared after 24h.
  const restoreCart = useCallback(() => {
    setItems((prev) => (prev.length ? prev : restorable))
    setRestorable([])
    safeSetItem(CART_RESTORE_KEY, JSON.stringify([]))
    if (restorable.length) setOpen(true)
  }, [restorable])

  // Permanently dismiss the restore offer.
  const dismissRestore = useCallback(() => {
    setRestorable([])
    safeSetItem(CART_RESTORE_KEY, JSON.stringify([]))
  }, [])

  // Each cart line is identified by product id + chosen color, so the same
  // product in two colors becomes two independent lines.
  const lineKey = makeLineKey

  // Add a store product (optionally in a chosen color). `priceOverride` is a
  // per-transaction price set by a master admin on the storefront — it affects
  // only this cart line, never the saved catalog price. `listPrice` keeps the
  // original so a discount can be shown. Never exceed stock. Returns true if added.
  //
  // `options` carries product-page selection fields (version/upgrades/storage…):
  //   { unitPrice, selections: [{ groupTitle, optionLabel, priceDelta }], optionsKey }
  // When `unitPrice` is given it sets this line's price (base + option deltas);
  // `selections` are stored for display in the cart. Empty by default, so
  // existing callers (the product card) keep their current behaviour.
  const addItem = useCallback((product, color = '', priceOverride = null, options = null) => {
    const stock = Number(product.stock) || 0
    if (stock <= 0) return false
    const listPrice = Number(product.price) || 0
    const selections = Array.isArray(options?.selections) ? options.selections : []
    const optionsKey = options?.optionsKey || ''
    const hasUnit = options?.unitPrice != null && !Number.isNaN(Number(options.unitPrice))
    const hasOverride = priceOverride != null && priceOverride !== '' && !Number.isNaN(Number(priceOverride))
    // Precedence: master-admin override > resolved unit price (base + options) > list price.
    const price = hasOverride ? Number(priceOverride) : hasUnit ? Number(options.unitPrice) : listPrice
    const key = lineKey(product.id, color, optionsKey)
    setItems((prev) => {
      const existing = prev.find((i) => (i.lineId || lineKey(i.id, i.color, i.optionsKey)) === key)
      if (existing) {
        if (existing.qty >= stock) return prev // capped at stock
        // Latest override wins (so re-adding with a new price updates the line).
        return prev.map((i) =>
          (i.lineId || lineKey(i.id, i.color, i.optionsKey)) === key ? { ...i, qty: i.qty + 1, price, listPrice } : i,
        )
      }
      return [
        ...prev,
        {
          lineId: key,
          id: product.id,
          name: product.name,
          price,
          listPrice,
          emoji: product.emoji,
          image: product.image || '',
          color: color || '',
          optionsKey,
          selections,
          stock,
          qty: 1,
        },
      ]
    })
    // Auto-open the cart drawer on DESKTOP only. On mobile it covered the screen
    // and interrupted browsing — instead the product card shows a "go to cart"
    // link after adding.
    if (typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches) {
      setOpen(true)
    }
    return true
  }, [])

  const setQty = useCallback((lineId, qty) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if ((i.lineId || lineKey(i.id, i.color, i.optionsKey)) !== lineId) return [i]
        const clamped = Math.min(Math.max(1, qty), i.stock || qty)
        return clamped <= 0 ? [] : [{ ...i, qty: clamped }]
      }),
    )
  }, [])

  // Adjust a line's quantity by a delta, reading the current value (so rapid
  // ± clicks are reliable). Drops the line at 0; never exceeds stock.
  const changeQty = useCallback((lineId, delta) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if ((i.lineId || lineKey(i.id, i.color, i.optionsKey)) !== lineId) return [i]
        const next = i.qty + delta
        if (next <= 0) return []
        return [{ ...i, qty: Math.min(next, i.stock || next) }]
      }),
    )
  }, [])

  const removeItem = useCallback((lineId) => {
    setItems((prev) => prev.filter((i) => (i.lineId || lineKey(i.id, i.color, i.optionsKey)) !== lineId))
  }, [])

  // Clearing here is intentional (e.g. after checkout) — it is NOT a restorable
  // event, so any pending auto-clear offer is dropped too.
  const clear = useCallback(() => {
    setItems([])
    setRestorable([])
    safeSetItem(CART_RESTORE_KEY, JSON.stringify([]))
  }, [])

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items])
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items])

  const value = {
    items,
    count,
    subtotal,
    open,
    setOpen,
    addItem,
    setQty,
    changeQty,
    removeItem,
    clear,
    // 24h auto-clear restore
    restorable,
    restoreCart,
    dismissRestore,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a <CartProvider>')
  return ctx
}
