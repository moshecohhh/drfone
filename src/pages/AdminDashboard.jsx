import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, Wrench, Smartphone, HardDrive,
  Tags, Users, UserCog, Settings as SettingsIcon, LogOut, Home, Tag, Mail,
  LayoutTemplate, Inbox, DatabaseBackup, PenSquare, GripVertical, RotateCcw, Check, ChevronDown, Ticket, ShoppingCart, Signal, PhoneOutgoing, ShieldCheck, KeyRound,
} from 'lucide-react'
import { useAuth, ROLE_LABELS } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { AdminEditProvider } from '../context/AdminEditContext.jsx'
import { EditableText } from '../components/admin/ui.jsx'
import Logo from '../components/Logo.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import AdminSearch from '../components/admin/AdminSearch.jsx'
import DashboardSummary from '../components/admin/DashboardSummary.jsx'
import HomePanel from '../components/admin/HomePanel.jsx'
import InquiriesPanel from '../components/admin/InquiriesPanel.jsx'
import CatalogPanel from '../components/admin/CatalogPanel.jsx'
import CouponsPanel from '../components/admin/CouponsPanel.jsx'
import CartsPanel from '../components/admin/CartsPanel.jsx'
import BrandsPanel from '../components/admin/BrandsPanel.jsx'
import ProductPagePanel from '../components/admin/ProductPagePanel.jsx'
import OrdersPanel from '../components/admin/OrdersPanel.jsx'
import RepairsPanel from '../components/admin/RepairsPanel.jsx'
import LoanersPanel from '../components/admin/LoanersPanel.jsx'
import DevicesPanel from '../components/admin/DevicesPanel.jsx'
import CategoriesPanel from '../components/admin/CategoriesPanel.jsx'
import UsersPanelGate from '../components/admin/UsersPanelGate.jsx'
import CustomersPanel from '../components/admin/CustomersPanel.jsx'
import SettingsPanel from '../components/admin/SettingsPanel.jsx'
import BackupPanelGate from '../components/admin/BackupPanelGate.jsx'
import OperatorCheckPanel from '../components/admin/OperatorCheckPanel.jsx'
import IvrCallPanel from '../components/admin/IvrCallPanel.jsx'
import KosherImeiPanel from '../components/admin/KosherImeiPanel.jsx'
import KosherPlayCustomerPanel from '../components/admin/KosherPlayCustomerPanel.jsx'
import KosherPlayCodesPanel from '../components/admin/KosherPlayCodesPanel.jsx'
import KosherPlayLogo from '../components/admin/KosherPlayLogo.jsx'

// Catalog sub-pages — shown BOTH as expandable children in the sidebar AND as a
// tab row at the top of each of these pages.
const CATALOG_TABS = [
  { id: 'catalog', label: 'מוצרים', Icon: Package },
  { id: 'brands', label: 'מותגים', Icon: Tag },
  { id: 'product-page', label: 'דף מוצר', Icon: LayoutTemplate },
  { id: 'categories', label: 'קטגוריות', Icon: Tags },
  { id: 'coupons', label: 'קופונים', Icon: Ticket },
]

// `store: true` marks the only sections a STORE account may see. The master
// admin sees everything; STORE sees Repairs only; CUSTOMER has no admin access.
const NAV = [
  {
    group: 'ראשי',
    items: [
      { id: 'overview', label: 'סקירה', Icon: LayoutDashboard },
      { id: 'orders', label: 'הזמנות', Icon: ShoppingBag },
      { id: 'carts', label: 'עגלות', Icon: ShoppingCart },
      { id: 'inquiries', label: 'פניות', Icon: Inbox },
    ],
  },
  {
    group: 'חנות',
    items: [
      { id: 'home-page', label: 'דף ראשי', Icon: LayoutTemplate },
      // "קטלוג" expands (via the chevron) to its sub-pages.
      { id: 'catalog', label: 'קטלוג', Icon: Package, children: CATALOG_TABS },
    ],
  },
  {
    group: 'מעבדה',
    items: [
      { id: 'repairs', label: 'תיקונים', Icon: Wrench, store: true },
      { id: 'customers', label: 'לקוחות', Icon: Users },
      { id: 'loaners', label: 'מכשירים חלופיים', Icon: Smartphone },
      { id: 'devices', label: 'מאגר מכשירים', Icon: HardDrive },
    ],
  },
  {
    group: 'חיבור קווי סלולר',
    items: [
      { id: 'operator-check', label: 'בדיקת מפעיל', Icon: Signal },
      { id: 'ivr-call', label: 'ביצוע IVR', Icon: PhoneOutgoing },
      { id: 'kosher-imei', label: 'בדיקת IMEI כשר', Icon: ShieldCheck },
    ],
  },
  {
    group: 'מערכת כשר פליי',
    items: [
      { id: 'kp-customer', label: 'ניהול לקוח', Icon: KosherPlayLogo },
      { id: 'kp-codes', label: 'קודים ויתרה', Icon: KeyRound },
    ],
  },
  {
    group: 'ניהול',
    items: [
      { id: 'users', label: 'משתמשים והרשאות', Icon: UserCog },
      { id: 'backup', label: 'גיבוי ושחזור', Icon: DatabaseBackup },
      { id: 'settings', label: 'הגדרות', Icon: SettingsIcon },
    ],
  },
]

const PANELS = {
  overview: DashboardSummary,
  'home-page': HomePanel,
  catalog: CatalogPanel,
  brands: BrandsPanel,
  'product-page': ProductPagePanel,
  orders: OrdersPanel,
  carts: CartsPanel,
  inquiries: InquiriesPanel,
  repairs: RepairsPanel,
  customers: CustomersPanel,
  loaners: LoanersPanel,
  devices: DevicesPanel,
  categories: CategoriesPanel,
  coupons: CouponsPanel,
  users: UsersPanelGate,
  backup: BackupPanelGate,
  settings: SettingsPanel,
  'operator-check': OperatorCheckPanel,
  'ivr-call': IvrCallPanel,
  'kosher-imei': KosherImeiPanel,
  'kp-customer': KosherPlayCustomerPanel,
  'kp-codes': KosherPlayCodesPanel,
}

export default function AdminDashboard() {
  const { user, logout, isMaster } = useAuth()
  const { inquiries, adminUI, updateAdminUI, setNavOrder, uiLabel } = useSettings()
  const { orders } = useOrders()
  const unreadInquiries = inquiries.filter((i) => !i.read).length
  const unreadOrders = orders.filter((o) => !o.read).length

  // ---- Edit mode (rename labels / reorder lists) ----
  const RESTORE_KEY = 'drfone_adminui_restore'
  const EDIT_CODE = '2800'
  const [editMode, setEditMode] = useState(false)
  const [editPrompt, setEditPrompt] = useState(false) // access-code prompt before editing
  const [editCode, setEditCode] = useState('')
  const [editErr, setEditErr] = useState(false)
  const dragRef = useRef(null)
  // Entering edit mode requires the access code, then silently snapshots the
  // current customisation so it can be restored if the changes don't work out.
  const enterEdit = () => { setEditCode(''); setEditErr(false); setEditPrompt(true) }
  const confirmEdit = (e) => {
    e.preventDefault()
    if (editCode.trim() !== EDIT_CODE) { setEditErr(true); setEditCode(''); return }
    try { localStorage.setItem(RESTORE_KEY, JSON.stringify(adminUI)) } catch { /* ignore */ }
    setEditMode(true)
    setEditPrompt(false)
  }
  const restoreUI = () => {
    try {
      const snap = JSON.parse(localStorage.getItem(RESTORE_KEY))
      if (snap && window.confirm('לשחזר את הפאנל למצב שלפני העריכה הנוכחית?')) updateAdminUI(snap)
    } catch { /* ignore */ }
  }

  // Apply any saved custom ordering to a group's items (new items append at end).
  const orderItems = (groupName, items) => {
    const order = adminUI.navOrder?.[groupName]
    if (!order?.length) return items
    const byId = new Map(items.map((it) => [it.id, it]))
    const ordered = order.map((id) => byId.get(id)).filter(Boolean)
    const extra = items.filter((it) => !order.includes(it.id))
    return [...ordered, ...extra]
  }

  // Build the nav the current role is allowed to see (master: everything;
  // STORE: only items flagged `store`), then apply the custom ordering.
  const groups = NAV.map((g) => ({
    ...g,
    items: orderItems(g.group, g.items.filter((it) => isMaster || it.store)),
  })).filter((g) => g.items.length > 0)
  // Mobile strip shows every navigable leaf (a parent's children, not the parent).
  const flat = groups.flatMap((g) => g.items.flatMap((it) => (it.children ? it.children : [it])))

  // Drop a dragged nav item before the target, persisting the new order.
  const handleNavDrop = (targetId, group) => {
    const src = dragRef.current
    dragRef.current = null
    if (!src || src.group !== group || src.id === targetId) return
    const g = groups.find((x) => x.group === group)
    if (!g) return
    const ids = g.items.map((it) => it.id)
    const from = ids.indexOf(src.id)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setNavOrder(group, ids)
  }

  // Deep link from the order email: /admin?order=<id> opens the Orders section
  // and focuses that order. Captured once, then the URL is cleaned.
  const [orderFocus, setOrderFocus] = useState(() => new URLSearchParams(window.location.search).get('order'))
  useEffect(() => {
    if (!orderFocus) return
    window.history.replaceState({}, '', '/admin')
    const t = setTimeout(() => setOrderFocus(null), 2500)
    return () => clearTimeout(t)
  }, [orderFocus])

  // Initial section: ?order → orders; ?section=<id> (e.g. from the service email)
  // → that section; otherwise overview (master) / repairs (store).
  const [section, setSection] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (!isMaster) return 'repairs'
    if (params.get('order')) return 'orders'
    const s = params.get('section')
    if (s && PANELS[s]) { window.history.replaceState({}, '', '/admin'); return s }
    return 'overview'
  })
  const [catalogLowStock, setCatalogLowStock] = useState(false)
  // A product/service to open straight into its edit modal (from global search).
  const [catalogEdit, setCatalogEdit] = useState(null)
  // Which parent items (e.g. "קטלוג") are expanded to reveal their sub-pages.
  // undefined → follow the active section; explicit true/false overrides it.
  const [expandedItems, setExpandedItems] = useState({})

  // Navigate to a section; clears the low-stock drilldown flag unless requested.
  const go = (id, lowStock = false) => {
    setCatalogLowStock(lowStock)
    setSection(id)
  }

  // Global-search result click: a product/service jumps into the catalog AND
  // opens its edit modal; everything else just navigates to its section.
  const handleSearchNavigate = (r) => {
    if (r?.editId) {
      setCatalogLowStock(false)
      setCatalogEdit({ id: r.editId, domain: r.domain, nonce: Date.now() })
      setSection('catalog')
    } else {
      go(typeof r === 'string' ? r : r.section)
    }
  }

  const Panel = PANELS[section] || (() => null)
  const panelProps =
    section === 'overview'
      ? {
          onGoToOrders: () => go('orders'),
          onGoToRevenue: () => go('orders'),
          onGoToLowStock: () => go('catalog', true),
        }
      : section === 'catalog'
        ? { lowStockInitial: catalogLowStock, editTarget: catalogEdit }
        : section === 'orders'
          ? { focusId: orderFocus }
          : section === 'inquiries'
            ? { onOpenOrder: (orderId) => { setOrderFocus(orderId); go('orders') } }
            : {}

  const NavItem = ({ id, label, Icon, group, children }) => {
    const active = section === id
    const badge =
      id === 'inquiries' && unreadInquiries > 0 ? unreadInquiries
      : id === 'orders' && unreadOrders > 0 ? unreadOrders
      : null

    // Edit mode: a draggable row with an inline-renamable label (no navigation).
    if (editMode) {
      return (
        <div
          draggable
          onDragStart={() => (dragRef.current = { id, group })}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleNavDrop(id, group) }}
          className={`flex w-full items-center gap-1.5 rounded-xl border border-dashed px-2 py-1.5 text-sm ${
            active ? 'border-brand-500 bg-brand-50' : 'border-brand-300 bg-white'
          }`}
        >
          <GripVertical size={15} className="shrink-0 cursor-grab text-ink-light" />
          {/* The icon still navigates so you can open a section while editing. */}
          <button type="button" onClick={() => go(id)} title="מעבר לעמוד" className="shrink-0 rounded-lg p-1 text-ink-light hover:bg-brand-100 hover:text-brand-600">
            <Icon size={16} />
          </button>
          <EditableText textKey={`nav:${id}`} fallback={label} className="font-semibold text-ink" />
        </div>
      )
    }

    // Parent item with sub-pages (e.g. "קטלוג") — expandable via the chevron.
    if (children?.length) {
      const childIds = children.map((c) => c.id)
      const activeInside = section === id || childIds.includes(section)
      const open = expandedItems[id] ?? activeInside
      return (
        <div>
          <div className={`flex w-full items-center rounded-xl transition ${activeInside ? 'bg-brand-50' : 'hover:bg-black/5'}`}>
            <button
              onClick={() => { go(id); setExpandedItems((e) => ({ ...e, [id]: true })) }}
              className={`flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${section === id ? 'text-brand-700' : 'text-ink-light hover:text-ink'}`}
            >
              <Icon size={18} /> <span className="whitespace-nowrap">{uiLabel(`nav:${id}`, label)}</span>
            </button>
            <button
              type="button"
              onClick={() => setExpandedItems((e) => ({ ...e, [id]: !open }))}
              aria-label={open ? 'כיווץ' : 'הרחבה'}
              aria-expanded={open}
              className="shrink-0 rounded-lg p-2 text-ink-light hover:bg-black/10 hover:text-ink"
            >
              <ChevronDown size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
            </button>
          </div>
          {open && (
            <div className="mr-4 mt-0.5 space-y-0.5 border-r border-black/10 pr-2">
              {children.map((c) => {
                const cActive = section === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => go(c.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      cActive ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-light hover:bg-black/5 hover:text-ink'
                    }`}
                  >
                    <c.Icon size={15} /> <span className="whitespace-nowrap">{uiLabel(`nav:${c.id}`, c.label)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        onClick={() => go(id)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          active ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-light hover:bg-black/5 hover:text-ink'
        }`}
      >
        <Icon size={18} /> <span className="whitespace-nowrap">{uiLabel(`nav:${id}`, label)}</span>
        {badge && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-brand-500 text-white'}`}>
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <AdminEditProvider editMode={editMode}>
    <div className="min-h-screen bg-brand-50/30">
      {/* Access-code prompt before entering edit mode */}
      {editPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setEditPrompt(false)}>
          <form onSubmit={confirmEdit} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"><PenSquare size={26} /></span>
            <h2 className="text-lg font-extrabold text-ink">עריכת הפאנל</h2>
            <p className="mt-1 text-sm text-ink-light">להמשך יש להזין את קוד הגישה.</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={editCode}
              onChange={(e) => { setEditCode(e.target.value); setEditErr(false) }}
              placeholder="קוד גישה"
              className="mt-4 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center tracking-widest text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            {editErr && <p className="mt-2 text-sm font-medium text-red-600">קוד שגוי, נסו שוב.</p>}
            <div className="mt-4 flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600">כניסה</button>
              <button type="button" onClick={() => setEditPrompt(false)} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-black/5">ביטול</button>
            </div>
          </form>
        </div>
      )}
      {/* Edit-mode banner */}
      {editMode && (
        <div className="bg-brand-600 px-4 py-1.5 text-center text-xs font-semibold text-white">
          מצב עריכה פעיל — לחצו על ✏️ לשינוי שמות, גררו פריטים בתפריט לשינוי הסדר. נשמרה נקודת שחזור אוטומטית.
        </div>
      )}
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-10" />
            <span className="hidden rounded-full bg-ink px-3 py-1 text-xs font-bold text-white sm:inline">
              לוח ניהול
            </span>
          </div>
          {/* Global search — shown ONLY on the Overview dashboard. Every other
              section has its own scoped search inside its panel. */}
          {isMaster && section === 'overview' && (
            <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
              <div className="w-full max-w-md">
                <AdminSearch onNavigate={handleSearchNavigate} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-ink-light md:inline">
              שלום, <span className="font-semibold text-ink">{user?.name}</span>
              {user?.role && <span className="text-ink-light"> · {ROLE_LABELS[user.role]}</span>}
            </span>
            {/* Edit-mode controls (master admin only) */}
            {isMaster && (editMode ? (
              <>
                <button
                  onClick={restoreUI}
                  title="שחזור הפאנל למצב שלפני העריכה"
                  className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                >
                  <RotateCcw size={16} /> <span className="hidden sm:inline">שחזור</span>
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex items-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  <Check size={16} /> <span className="hidden sm:inline">סיום עריכה</span>
                </button>
              </>
            ) : (
              <button
                onClick={enterEdit}
                title="מצב עריכת הפאנל — שינוי שמות וסדר"
                className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5"
              >
                <PenSquare size={16} /> <span className="hidden sm:inline">עריכת הפאנל</span>
              </button>
            ))}
            <ThemeToggle />
            <Link
              to="/"
              title="לאתר"
              className="flex items-center gap-1 rounded-xl border border-black/10 px-2.5 py-2 text-sm font-semibold text-ink hover:bg-black/5"
            >
              <Home size={16} /> <span className="hidden sm:inline">לאתר</span>
            </Link>
            <button
              onClick={logout}
              title="התנתקות"
              className="flex items-center gap-1 rounded-xl bg-ink px-2.5 py-2 text-sm font-semibold text-white hover:bg-ink-dark"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">התנתקות</span>
            </button>
          </div>
        </div>

        {/* Mobile global search — the desktop one is centered in the bar above,
            but there's no room for it on a phone, so it gets its own full-width
            row here (Overview only). */}
        {isMaster && section === 'overview' && (
          <div className="border-t border-black/5 px-4 py-2 md:hidden">
            <AdminSearch onNavigate={handleSearchNavigate} />
          </div>
        )}
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-60 shrink-0 overflow-y-auto border-l border-black/5 bg-white px-3 py-5 lg:block">
          <nav className="space-y-5">
            {groups.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wide text-ink-light/70">
                  {g.group}
                </p>
                <div className="space-y-0.5">
                  {g.items.map((it) => (
                    <NavItem key={it.id} {...it} group={g.group} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile nav strip */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-black/5 bg-white/95 px-2 py-2 backdrop-blur no-scrollbar lg:hidden">
          {flat.map(({ id, label, Icon }) => {
            const active = section === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                  active ? 'text-brand-600' : 'text-ink-light'
                }`}
              >
                <Icon size={18} /> {uiLabel(`nav:${id}`, label)}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-6">
          {/* Catalog tab row — shown at the top of every catalog sub-page */}
          {CATALOG_TABS.some((t) => t.id === section) && (
            <div className="mb-5 flex flex-wrap gap-1 border-b border-black/5">
              {CATALOG_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(t.id)}
                  className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-bold transition ${
                    section === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-light hover:text-ink'
                  }`}
                >
                  <t.Icon size={16} /> {uiLabel(`nav:${t.id}`, t.label)}
                </button>
              ))}
            </div>
          )}
          <Panel {...panelProps} />
        </main>
      </div>
    </div>
    </AdminEditProvider>
  )
}
