import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

// ---------------------------------------------------------------------------
// Discount coupons. The master admin manages them (RLS limits the table to the
// admin); customers validate/redeem a single code through SECURITY DEFINER RPCs
// (validate_coupon / redeem_coupon) so codes aren't publicly listable.
// See supabase/schema_coupons.sql.
// ---------------------------------------------------------------------------

const rowToCoupon = (row) => ({
  id: row.id,
  code: row.code,
  usedCount: row.used_count || 0,
  createdAt: row.created_at,
  ...(row.data || {}),
})

// Extract the jsonb `data` payload from a coupon object.
const couponToData = ({ percent, active, scope, categoryIds, productIds, singleUse, customerEmail, oneTime }) => ({
  percent: Number(percent) || 0,
  active: active !== false,
  scope: scope || 'all', // 'all' | 'categories' | 'products'
  categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
  productIds: Array.isArray(productIds) ? productIds : [],
  singleUse: !!singleUse, // general coupon: redeemable once in total
  customerEmail: (customerEmail || '').trim().toLowerCase(), // compensation coupon target
  oneTime: !!oneTime, // compensation coupon: once vs. permanent
})

const CouponsContext = createContext(null)

export function CouponsProvider({ children }) {
  const { user, isMaster } = useAuth()
  const [coupons, setCoupons] = useState([])
  const ref = useRef(coupons)
  ref.current = coupons

  // Only the admin can list coupons (RLS). Everyone else keeps an empty list and
  // validates codes one at a time via the RPC.
  useEffect(() => {
    if (!isMaster) {
      setCoupons([])
      return
    }
    let active = true
    supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setCoupons((data || []).map(rowToCoupon))
      })
    return () => {
      active = false
    }
  }, [isMaster, user?.id])

  const addCoupon = useCallback((coupon) => {
    const id = `cpn-${Date.now()}`
    const code = String(coupon.code || '').trim().toUpperCase()
    if (!code) return { ok: false, error: 'יש להזין קוד קופון.' }
    const data = couponToData(coupon)
    const created = { id, code, usedCount: 0, createdAt: new Date().toISOString(), ...data }
    setCoupons((prev) => [created, ...prev])
    supabase.from('coupons').insert({ id, code, data }).then(({ error }) => {
      if (error) console.warn('[coupons] addCoupon failed:', error.message)
    })
    return { ok: true, coupon: created }
  }, [])

  const updateCoupon = useCallback((id, patch) => {
    const current = ref.current.find((c) => c.id === id)
    if (!current) return
    const merged = { ...current, ...patch }
    setCoupons((prev) => prev.map((c) => (c.id === id ? merged : c)))
    const dbPatch = { data: couponToData(merged) }
    if (patch.code) dbPatch.code = String(patch.code).trim().toUpperCase()
    supabase.from('coupons').update(dbPatch).eq('id', id).then(({ error }) => {
      if (error) console.warn('[coupons] updateCoupon failed:', error.message)
    })
  }, [])

  const deleteCoupon = useCallback((id) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id))
    supabase.from('coupons').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('[coupons] deleteCoupon failed:', error.message)
    })
  }, [])

  // Validate a code for a given email (customer or guest). Returns the RPC's
  // JSON: { ok, reason?, code, percent, scope, categoryIds, productIds }.
  const validateCoupon = useCallback(async (code, email) => {
    const { data, error } = await supabase.rpc('validate_coupon', { p_code: code, p_email: email || '' })
    if (error) return { ok: false, reason: 'error' }
    return data || { ok: false, reason: 'error' }
  }, [])

  // Mark a coupon redeemed (best-effort) after an order using it is placed.
  const redeemCoupon = useCallback(async (code) => {
    if (!code) return
    await supabase.rpc('redeem_coupon', { p_code: code })
  }, [])

  const value = { coupons, addCoupon, updateCoupon, deleteCoupon, validateCoupon, redeemCoupon }
  return <CouponsContext.Provider value={value}>{children}</CouponsContext.Provider>
}

export function useCoupons() {
  const ctx = useContext(CouponsContext)
  if (!ctx) throw new Error('useCoupons must be used within a <CouponsProvider>')
  return ctx
}

// Compute the discount for a validated coupon against a set of cart lines.
// Each line: { id, price, qty, category? }. Returns { amount, eligible }.
export function computeCouponDiscount(coupon, lines, productCategory) {
  if (!coupon?.ok) return { amount: 0, eligible: 0 }
  const percent = Number(coupon.percent) || 0
  if (percent <= 0) return { amount: 0, eligible: 0 }
  const catIds = Array.isArray(coupon.categoryIds) ? coupon.categoryIds : []
  const prodIds = Array.isArray(coupon.productIds) ? coupon.productIds : []
  const lineEligible = (l) => {
    if (coupon.scope === 'products') return prodIds.includes(l.id)
    if (coupon.scope === 'categories') return catIds.includes(productCategory?.(l.id))
    return true // 'all'
  }
  const eligible = lines.reduce((sum, l) => (lineEligible(l) ? sum + Number(l.price) * Number(l.qty) : sum), 0)
  return { amount: Math.round(eligible * percent) / 100, eligible }
}
