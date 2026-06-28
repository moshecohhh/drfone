import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

// ---------------------------------------------------------------------------
// Orders store (Store checkout -> Admin Orders panel), backed by Supabase.
// Anyone can place an order; RLS makes the master admin see all of them and a
// customer see only their own. Same synchronous API as before — mutations
// update local state optimistically and persist to Supabase in the background.
// ---------------------------------------------------------------------------

// Map a DB row to the app's flat order shape.
const rowToOrder = (row) => ({
  id: row.id,
  number: row.number,
  status: row.status,
  createdAt: row.created_at,
  ...(row.data || {}),
})

// Extract the jsonb `data` payload from a flat order object.
const orderToData = ({ customer, payment, delivery, deliveryPrice, notes, items, total, log, read, trackToken }) => ({
  customer,
  payment,
  delivery,
  deliveryPrice: deliveryPrice || 0, // shipping cost included in `total`
  notes: notes || '', // optional customer note
  items,
  total,
  trackToken: trackToken || '', // unguessable token for the public order-tracking link
  log: log || [],
  read: !!read, // whether an admin has opened this order yet
})

// Unguessable token for the public order-tracking page (in the order email).
const makeTrackToken = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '')
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

const OrdersContext = createContext(null)

export function OrdersProvider({ children }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const ordersRef = useRef(orders)
  ordersRef.current = orders

  // Load orders whenever the signed-in user changes. RLS returns the right
  // subset: everything for the master admin, own orders for a customer, none
  // for a guest.
  useEffect(() => {
    let active = true
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setOrders((data || []).map(rowToOrder))
      })
    return () => {
      active = false
    }
  }, [user?.id])

  // Create an order. Returns the created order (with its generated number) so
  // the checkout can show a confirmation immediately.
  const addOrder = useCallback(
    ({ customer, payment, delivery, deliveryPrice, notes, items, total }) => {
      const id = `ord-${Date.now()}`
      const number = `#${String(Date.now()).slice(-6)}`
      const order = {
        id,
        number,
        createdAt: new Date().toISOString(),
        status: 'pending', // new orders await the shop's approval before processing
        read: false, // new orders start unread (red) until an admin opens them
        customer,
        payment,
        delivery,
        deliveryPrice: deliveryPrice || 0,
        notes: notes || '',
        items,
        total,
        trackToken: makeTrackToken(),
        log: [],
      }
      setOrders((prev) => [order, ...prev])
      supabase
        .from('orders')
        .insert({
          id,
          number,
          status: 'pending',
          user_id: user?.id || null,
          data: orderToData(order),
        })
        .then(({ error }) => error && console.warn('[orders] addOrder failed:', error.message))
      return order
    },
    [user?.id],
  )

  const updateStatus = useCallback((id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    supabase.from('orders').update({ status }).eq('id', id).then(({ error }) => {
      if (error) console.warn('[orders] updateStatus failed:', error.message)
    })
  }, [])

  // Admin: replace an order's line items (edit/remove/add custom) and re-total.
  // Shipping is preserved; total = items subtotal + delivery price.
  const updateOrderItems = useCallback((id, items) => {
    const current = ordersRef.current.find((o) => o.id === id)
    if (!current) return
    const subtotal = items.reduce((n, it) => n + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
    const total = subtotal + (Number(current.deliveryPrice) || 0)
    const merged = { ...current, items, total }
    setOrders((prev) => prev.map((o) => (o.id === id ? merged : o)))
    supabase.from('orders').update({ data: orderToData(merged) }).eq('id', id).then(({ error }) => {
      if (error) console.warn('[orders] updateOrderItems failed:', error.message)
    })
  }, [])

  // Mark an order as read (the admin opened it). Persists into the jsonb `data`.
  const markOrderRead = useCallback((id) => {
    const current = ordersRef.current.find((o) => o.id === id)
    if (!current || current.read) return
    const merged = { ...current, read: true }
    setOrders((prev) => prev.map((o) => (o.id === id ? merged : o)))
    supabase.from('orders').update({ data: orderToData(merged) }).eq('id', id).then(({ error }) => {
      if (error) console.warn('[orders] markOrderRead failed:', error.message)
    })
  }, [])

  // Append a timestamped journal entry for documentation.
  const addOrderLog = useCallback((id, text, author) => {
    if (!text.trim()) return
    const entry = { id: `log-${Date.now()}`, text: text.trim(), at: new Date().toISOString(), author }
    const current = ordersRef.current.find((o) => o.id === id)
    if (!current) return
    const merged = { ...current, log: [...(current.log || []), entry] }
    setOrders((prev) => prev.map((o) => (o.id === id ? merged : o)))
    supabase.from('orders').update({ data: orderToData(merged) }).eq('id', id).then(() => {})
  }, [])

  const deleteOrder = useCallback((id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id))
    supabase.from('orders').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('[orders] deleteOrder failed:', error.message)
    })
  }, [])

  const value = { orders, addOrder, updateStatus, updateOrderItems, deleteOrder, addOrderLog, markOrderRead }

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within an <OrdersProvider>')
  return ctx
}
