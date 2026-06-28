import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { BUSINESS } from '../data/business.js'
import { PAYMENT_METHODS, DELIVERY_METHODS, ORDER_STATUSES } from '../data/orderMeta.js'
import { kvLoadAll, kvSave } from '../lib/kv.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

// ---------------------------------------------------------------------------
// Editable CONSUMER-SIDE settings (storefront / checkout): business details,
// payment/delivery methods, order statuses, ad banner, home content. Persisted
// to Supabase (app_state: public read, master-admin write). Contact-form
// inquiries live in their own `inquiries` table (anyone submits, admin reads).
// ---------------------------------------------------------------------------

const DEFAULT_ADS = { enabled: false, rotateSeconds: 5, slides: [] }

const DEFAULT_HOME = {
  hiddenCats: [],
  reviews: [
    { id: 'rv1', name: 'משה כ.', rating: 5, text: 'שירות מעולה ומחירים הוגנים. תיקנו לי את המסך תוך שעה!' },
    { id: 'rv2', name: 'יוסי ל.', rating: 5, text: 'קניתי מכשיר כשר, הכל הוסבר בסבלנות. ממליץ בחום.' },
    { id: 'rv3', name: 'דבורה מ.', rating: 5, text: 'הזמנתי אונליין והגיע מהר עם משלוח עד הבית. מרוצה מאוד.' },
  ],
}

// Global, admin-controlled product-page configuration (the master enable toggle,
// gift-wrap default, installments text, payment-icon visibility, and default
// marketing blocks). A product can override gift-wrap & marketing per-product.
const DEFAULT_PRODUCT_PAGE = {
  enabledGlobally: true,
  giftWrapDefault: { enabled: true, price: 5 },
  installmentsCount: 6,
  installmentsText: 'תשלומים',
  installmentsVisible: true, // global default; a product can override (show/hide)
  paymentsVisible: true,
  defaultMarketing: [],
}

// The standard storage capacities offered when adding a storage field to a
// product. Shared so the admin always picks from a consistent list.
export const STORAGE_SIZES = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']

// Admin-panel UI customisation (the "edit mode"): label overrides and custom
// list ordering. Empty by default — every label falls back to its built-in text.
const DEFAULT_ADMIN_UI = { labels: {}, navOrder: {} }

const DEFAULTS = {
  name: BUSINESS.name,
  address: BUSINESS.address,
  whatsappDisplay: BUSINESS.whatsappDisplay,
  whatsappIntl: BUSINESS.whatsappIntl,
  // Footer (the black bottom panel): an optional custom logo + tagline.
  footerLogo: '', // empty → use the main site logo
  footerLogoWhiteBg: true, // white panel behind the footer logo (off = transparent)
  footerTagline: 'חנות מכשירים כשרים ומסוננים, לצד מעבדה מקצועית לתיקון סמארטפונים בכל הרמות.',
}

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// Normalise an inquiry into a conversation thread (legacy rows had only a flat
// `message`; new ones carry `messages` + `status`).
const normalizeInquiry = (inq) => {
  const messages =
    Array.isArray(inq.messages) && inq.messages.length
      ? inq.messages
      : inq.message
        ? [{ id: 'm0', from: 'customer', text: inq.message, at: inq.createdAt }]
        : []
  const status = inq.status || (messages.some((m) => m.from === 'shop') ? 'answered' : 'open')
  return { ...inq, messages, status }
}
const rowToInquiry = (row) =>
  normalizeInquiry({ id: row.id, read: row.read, createdAt: row.created_at, userId: row.user_id, ...(row.data || {}) })

// Local cache of the public app_state (ad banner, business details, home
// content…) so a returning visitor sees the real content — including the
// uploaded ad images — instantly, while the network revalidates in the
// background. Best-effort: oversized snapshots are skipped.
const APP_STATE_CACHE = 'drfone_appstate_v1'
function loadAppStateCache() {
  try {
    const c = JSON.parse(localStorage.getItem(APP_STATE_CACHE))
    if (c && typeof c === 'object') return c
  } catch {
    /* ignore */
  }
  return null
}
function saveAppStateCache(m) {
  try {
    const snapshot = JSON.stringify({
      settings: m.settings, payments: m.payments, deliveries: m.deliveries,
      orderStatuses: m.orderStatuses, ads: m.ads, home: m.home,
      productPage: m.productPage, fieldPresets: m.fieldPresets, adminUI: m.adminUI,
    })
    if (snapshot.length < 2_000_000) localStorage.setItem(APP_STATE_CACHE, snapshot)
    else localStorage.removeItem(APP_STATE_CACHE)
  } catch {
    /* storage unavailable / quota — ignore */
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { isMaster, user } = useAuth()
  // Initialise from the local cache (real content, incl. uploaded ad images) so
  // the storefront — and the ad banner — paint instantly; fall back to defaults.
  const cached = loadAppStateCache()
  const [settings, setSettings] = useState(() => (cached?.settings ? { ...DEFAULTS, ...cached.settings } : DEFAULTS))
  const [paymentMethods, setPaymentMethods] = useState(() =>
    Array.isArray(cached?.payments) ? cached.payments : PAYMENT_METHODS,
  )
  const [deliveryMethods, setDeliveryMethods] = useState(() =>
    Array.isArray(cached?.deliveries) ? cached.deliveries : DELIVERY_METHODS,
  )
  const [orderStatuses, setOrderStatuses] = useState(() =>
    Array.isArray(cached?.orderStatuses) ? cached.orderStatuses : ORDER_STATUSES,
  )
  const [ads, setAds] = useState(() => (cached?.ads ? { ...DEFAULT_ADS, ...cached.ads } : DEFAULT_ADS))
  const [home, setHome] = useState(() => (cached?.home ? { ...DEFAULT_HOME, ...cached.home } : DEFAULT_HOME))
  // Global product-page config + the reusable selection-field preset library.
  const [productPage, setProductPage] = useState(() =>
    cached?.productPage ? { ...DEFAULT_PRODUCT_PAGE, ...cached.productPage } : DEFAULT_PRODUCT_PAGE,
  )
  const [fieldPresets, setFieldPresets] = useState(() => (Array.isArray(cached?.fieldPresets) ? cached.fieldPresets : []))
  // Admin-panel edit-mode customisation (labels + list ordering).
  const [adminUI, setAdminUI] = useState(() => (cached?.adminUI ? { ...DEFAULT_ADMIN_UI, ...cached.adminUI } : DEFAULT_ADMIN_UI))
  const [inquiries, setInquiries] = useState([]) // admin: every inquiry
  const [myInquiries, setMyInquiries] = useState([]) // customer: own service tickets
  const inquiriesRef = useRef(inquiries)
  inquiriesRef.current = inquiries
  const myInquiriesRef = useRef(myInquiries)
  myInquiriesRef.current = myInquiries
  const [loaded, setLoaded] = useState(false)

  // Load the public app_state collections (falls back to defaults until saved),
  // then refresh the local cache so the next visit paints instantly.
  useEffect(() => {
    let active = true
    kvLoadAll('app_state').then((m) => {
      if (!active) return
      if (m.settings) setSettings({ ...DEFAULTS, ...m.settings })
      if (Array.isArray(m.payments)) setPaymentMethods(m.payments)
      if (Array.isArray(m.deliveries)) setDeliveryMethods(m.deliveries)
      if (Array.isArray(m.orderStatuses)) setOrderStatuses(m.orderStatuses)
      if (m.ads) setAds({ ...DEFAULT_ADS, ...m.ads })
      if (m.home) setHome({ ...DEFAULT_HOME, ...m.home })
      if (m.productPage) setProductPage({ ...DEFAULT_PRODUCT_PAGE, ...m.productPage })
      if (Array.isArray(m.fieldPresets)) setFieldPresets(m.fieldPresets)
      if (m.adminUI) setAdminUI({ ...DEFAULT_ADMIN_UI, ...m.adminUI })
      setLoaded(true)
      saveAppStateCache(m)
    })
    return () => {
      active = false
    }
  }, [])

  // Persist each collection on change — only the master admin writes (RLS).
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'settings', settings) }, [settings, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'payments', paymentMethods) }, [paymentMethods, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'deliveries', deliveryMethods) }, [deliveryMethods, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'orderStatuses', orderStatuses) }, [orderStatuses, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'ads', ads) }, [ads, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'home', home) }, [home, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'productPage', productPage) }, [productPage, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'fieldPresets', fieldPresets) }, [fieldPresets, loaded, isMaster])
  useEffect(() => { if (loaded && isMaster) kvSave('app_state', 'adminUI', adminUI) }, [adminUI, loaded, isMaster])

  // Inquiries: the master admin loads them all (RLS hides them from everyone else).
  useEffect(() => {
    if (!isMaster) {
      setInquiries([])
      return
    }
    let active = true
    supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setInquiries((data || []).map(rowToInquiry))
      })
    return () => {
      active = false
    }
  }, [isMaster])

  // A signed-in customer loads their own service tickets (RLS returns only the
  // rows whose user_id matches them).
  useEffect(() => {
    if (!user?.id) {
      setMyInquiries([])
      return
    }
    let active = true
    supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setMyInquiries((data || []).map(rowToInquiry).filter((i) => i.userId === user.id))
      })
    return () => {
      active = false
    }
  }, [user?.id])

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])

  // ---- Home page (showcase visibility + reviews) ----
  const toggleCategoryHidden = useCallback((catId) => {
    setHome((h) => {
      const hidden = h.hiddenCats.includes(catId)
        ? h.hiddenCats.filter((c) => c !== catId)
        : [...h.hiddenCats, catId]
      return { ...h, hiddenCats: hidden }
    })
  }, [])
  const addReview = useCallback(
    (data = {}) =>
      setHome((h) => ({
        ...h,
        reviews: [...h.reviews, { id: uid('rv'), name: '', rating: 5, text: '', ...data }],
      })),
    [],
  )
  const updateReview = useCallback(
    (id, patch) => setHome((h) => ({ ...h, reviews: h.reviews.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    [],
  )
  const deleteReview = useCallback(
    (id) => setHome((h) => ({ ...h, reviews: h.reviews.filter((r) => r.id !== id) })),
    [],
  )

  // ---- Contact inquiries / service tickets ----
  // Open a new inquiry (home-page contact OR a post-purchase service request).
  // A service request carries userId (for the customer to track it) + an order
  // reference and product snapshot; the first message seeds the conversation.
  const addInquiry = useCallback(
    (input) => {
      const id = uid('inq')
      const now = new Date().toISOString()
      const { userId = null, message = '', ...rest } = input
      const messages = message ? [{ id: `m-${Date.now()}`, from: 'customer', text: message, at: now }] : []
      const data = { ...rest, message, messages, status: 'open' }
      const inquiry = normalizeInquiry({ id, createdAt: now, read: false, userId, ...data })
      if (isMaster) setInquiries((prev) => [inquiry, ...prev])
      if (userId && userId === user?.id) setMyInquiries((prev) => [inquiry, ...prev])
      supabase.from('inquiries').insert({ id, read: false, user_id: userId, data }).then(({ error }) => {
        if (error) console.warn('[inquiries] add failed:', error.message)
      })
      return inquiry
    },
    [isMaster, user?.id],
  )

  // Admin replies to a ticket: append a shop message, mark answered + read, and
  // email the customer (best-effort) via the service-reply edge function.
  const replyToInquiry = useCallback(async (id, text, author) => {
    const t = (text || '').trim()
    if (!t) return { ok: false }
    const current = inquiriesRef.current.find((i) => i.id === id)
    if (!current) return { ok: false }
    // `read: false` on the message = the customer hasn't read it yet (receipt).
    const msg = { id: `m-${Date.now()}`, from: 'shop', text: t, at: new Date().toISOString(), author, read: false }
    const merged = { ...current, messages: [...(current.messages || []), msg], status: 'answered', read: true }
    setInquiries((prev) => prev.map((i) => (i.id === id ? merged : i)))
    const { id: _i, read: _r, createdAt: _c, userId: _u, ...data } = merged
    await supabase.from('inquiries').update({ read: true, data }).eq('id', id)
    // Email the customer (best-effort). The recipient is resolved server-side.
    supabase.functions.invoke('service-reply', { body: { inquiryId: id, direction: 'to-customer', message: t } }).catch(() => {})
    return { ok: true }
  }, [])

  // Customer adds a follow-up message to their own ticket (re-opens it).
  const addTicketMessage = useCallback(async (id, text) => {
    const t = (text || '').trim()
    if (!t) return { ok: false }
    const current = myInquiriesRef.current.find((i) => i.id === id)
    if (!current) return { ok: false }
    const msg = { id: `m-${Date.now()}`, from: 'customer', text: t, at: new Date().toISOString(), read: false }
    // Re-open + mark unread so the admin sees it pop in the panel.
    const merged = { ...current, messages: [...(current.messages || []), msg], status: 'open', read: false }
    setMyInquiries((prev) => prev.map((i) => (i.id === id ? merged : i)))
    const { id: _i, read: _r, createdAt: _c, userId: _u, ...data } = merged
    await supabase.from('inquiries').update({ read: false, data }).eq('id', id)
    // Notify the shop by email (recipient resolved server-side = the admin).
    supabase.functions.invoke('service-reply', { body: { inquiryId: id, direction: 'to-admin', message: t } }).catch(() => {})
    return { ok: true }
  }, [])

  // Read receipts: when one side opens a ticket, mark the OTHER side's messages
  // as read (reader 'shop' reads customer messages; 'customer' reads shop ones).
  const markTicketRead = useCallback(async (id, reader) => {
    const fromSide = reader === 'shop' ? 'customer' : 'shop'
    const ref = reader === 'shop' ? inquiriesRef : myInquiriesRef
    const setList = reader === 'shop' ? setInquiries : setMyInquiries
    const current = ref.current.find((i) => i.id === id)
    if (!current) return
    const messages = current.messages || []
    if (!messages.some((m) => m.from === fromSide && !m.read)) return // nothing unread
    const merged = { ...current, messages: messages.map((m) => (m.from === fromSide && !m.read ? { ...m, read: true } : m)) }
    setList((prev) => prev.map((i) => (i.id === id ? merged : i)))
    const { id: _i, read: _r, createdAt: _c, userId: _u, ...data } = merged
    await supabase.from('inquiries').update({ data }).eq('id', id)
  }, [])

  // Toggle a ❤️ reaction on a single message (works from either side — the
  // admin on any ticket, the customer on their own — RLS permits both).
  const toggleMessageReaction = useCallback(async (inquiryId, messageId) => {
    const inAdmin = inquiriesRef.current.find((i) => i.id === inquiryId)
    const inMine = myInquiriesRef.current.find((i) => i.id === inquiryId)
    const current = inAdmin || inMine
    if (!current) return
    const messages = (current.messages || []).map((m) =>
      m.id === messageId ? { ...m, reaction: m.reaction ? null : '❤️' } : m,
    )
    const merged = { ...current, messages }
    if (inAdmin) setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? merged : i)))
    if (inMine) setMyInquiries((prev) => prev.map((i) => (i.id === inquiryId ? merged : i)))
    const { id: _i, read: _r, createdAt: _c, userId: _u, ...data } = merged
    await supabase.from('inquiries').update({ data }).eq('id', inquiryId)
  }, [])

  const markInquiryRead = useCallback((id, read = true) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, read } : i)))
    supabase.from('inquiries').update({ read }).eq('id', id).then(() => {})
  }, [])
  const deleteInquiry = useCallback((id) => {
    setInquiries((prev) => prev.filter((i) => i.id !== id))
    supabase.from('inquiries').delete().eq('id', id).then(() => {})
  }, [])

  // ---- Ad banner ----
  const updateAds = useCallback((patch) => setAds((a) => ({ ...a, ...patch })), [])
  const addAdSlide = useCallback(
    (slide = {}) =>
      setAds((a) => ({
        ...a,
        slides: [
          ...a.slides,
          { id: uid('ad'), image: '', mobileImage: '', linkType: 'none', link: '', targetId: '', start: '', end: '', enabled: true, ...slide },
        ],
      })),
    [],
  )
  const updateAdSlide = useCallback(
    (id, patch) => setAds((a) => ({ ...a, slides: a.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    [],
  )
  const removeAdSlide = useCallback(
    (id) => setAds((a) => ({ ...a, slides: a.slides.filter((s) => s.id !== id) })),
    [],
  )

  // ---- Product page: global config ----
  const updateProductPage = useCallback((patch) => setProductPage((p) => ({ ...p, ...patch })), [])

  // ---- Product page: reusable selection-field presets ----
  // A preset's shape matches a per-product option group, so it can be copied
  // straight into a product's page config (and edited there independently).
  const addFieldPreset = useCallback(
    (preset = {}) =>
      setFieldPresets((list) => [
        ...list,
        { id: uid('fp'), title: 'שדה בחירה', required: false, style: 'dropdown', options: [], ...preset },
      ]),
    [],
  )
  const updateFieldPreset = useCallback(
    (id, patch) => setFieldPresets((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [],
  )
  const removeFieldPreset = useCallback(
    (id) => setFieldPresets((list) => list.filter((p) => p.id !== id)),
    [],
  )

  // ---- Admin panel edit-mode (label/order overrides) ----
  const updateAdminUI = useCallback((next) => setAdminUI(next), [])
  const setUiLabel = useCallback(
    (key, label) =>
      setAdminUI((s) => {
        const labels = { ...s.labels }
        if (label == null || label === '') delete labels[key]
        else labels[key] = label
        return { ...s, labels }
      }),
    [],
  )
  const setNavOrder = useCallback(
    (group, ids) => setAdminUI((s) => ({ ...s, navOrder: { ...s.navOrder, [group]: ids } })),
    [],
  )

  // Generic add/rename/delete for a label list. `extra()` adds default props.
  // `add`/`update` accept an optional `patch` object to set extra fields
  // (e.g. a delivery method's `price`), so the same ops serve plain and
  // priced lists without breaking existing label-only callers.
  const makeOps = (setter, prefix, extra) => ({
    add: (label, patch) => {
      if (!label.trim()) return
      setter((prev) => [...prev, { id: uid(prefix), label: label.trim(), ...(extra ? extra() : {}), ...(patch || {}) }])
    },
    update: (id, label, patch) => {
      if (!label.trim()) return
      setter((prev) => prev.map((x) => (x.id === id ? { ...x, label: label.trim(), ...(patch || {}) } : x)))
    },
    remove: (id) => setter((prev) => prev.filter((x) => x.id !== id)),
  })

  const payments = useMemo(() => makeOps(setPaymentMethods, 'pay', () => ({ hint: '' })), [])
  const deliveries = useMemo(() => makeOps(setDeliveryMethods, 'del', () => ({ hint: '', price: 0, pickup: false })), [])
  const orderStatusOps = useMemo(
    () => makeOps(setOrderStatuses, 'ostat', () => ({ color: 'bg-slate-100 text-slate-700' })),
    [],
  )

  const mapsLink = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`,
    [settings.address],
  )
  const wazeLink = useMemo(
    () => `https://waze.com/ul?q=${encodeURIComponent(settings.address)}&navigate=yes`,
    [settings.address],
  )
  const waLink = useCallback(
    (message) => {
      const base = `https://wa.me/${settings.whatsappIntl}`
      return message ? `${base}?text=${encodeURIComponent(message)}` : base
    },
    [settings.whatsappIntl],
  )

  const value = {
    settings,
    updateSettings,
    // ad banner
    ads,
    updateAds,
    addAdSlide,
    updateAdSlide,
    removeAdSlide,
    // product page (global config + reusable field presets)
    productPage,
    updateProductPage,
    fieldPresets,
    addFieldPreset,
    updateFieldPreset,
    removeFieldPreset,
    // admin edit-mode customisation
    adminUI,
    updateAdminUI,
    setUiLabel,
    setNavOrder,
    uiLabel: (key, fallback) => adminUI.labels?.[key] ?? fallback,
    // home page content
    home,
    toggleCategoryHidden,
    addReview,
    updateReview,
    deleteReview,
    // contact inquiries / service tickets
    inquiries,
    myInquiries,
    addInquiry,
    replyToInquiry,
    addTicketMessage,
    toggleMessageReaction,
    markTicketRead,
    markInquiryRead,
    deleteInquiry,
    mapsLink,
    wazeLink,
    waLink,
    // editable consumer lists
    paymentMethods,
    deliveryMethods,
    orderStatuses,
    payments, // { add, update, remove }
    deliveries,
    orderStatusOps,
    // label/meta helpers
    paymentLabel: (id) => paymentMethods.find((p) => p.id === id)?.label || id,
    deliveryLabel: (id) => deliveryMethods.find((d) => d.id === id)?.label || id,
    orderStatusMeta: (id) =>
      orderStatuses.find((s) => s.id === id) || orderStatuses[0] || { label: id, color: 'bg-black/10 text-ink' },
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a <SettingsProvider>')
  return ctx
}
