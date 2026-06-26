import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, Wrench, Smartphone, HardDrive,
  Tags, Users, UserCog, Settings as SettingsIcon, LogOut, Home, Tag, Mail,
  LayoutTemplate, Inbox, DatabaseBackup, PenSquare, GripVertical, RotateCcw, Check,
} from 'lucide-react'
import { useAuth, ROLE_LABELS } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { AdminEditProvider } from '../context/AdminEditContext.jsx'
import { EditableText } from '../components/admin/ui.jsx'
import Logo from '../components/Logo.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import AdminSearch from '../components/admin/AdminSearch.jsx'
import DashboardSummary from '../components/admin/DashboardSummary.jsx'
import HomePanel from '../components/admin/HomePanel.jsx'
import InquiriesPanel from '../components/admin/InquiriesPanel.jsx'
import CatalogPanel from '../components/admin/CatalogPanel.jsx'
import ProductPagePanel from '../components/admin/ProductPagePanel.jsx'
import OrdersPanel from '../components/admin/OrdersPanel.jsx'
import RepairsPanel from '../components/admin/RepairsPanel.jsx'
import LoanersPanel from '../components/admin/LoanersPanel.jsx'
import DevicesPanel from '../components/admin/DevicesPanel.jsx'
import CategoriesPanel from '../components/admin/CategoriesPanel.jsx'
import BrandsPanel from '../components/admin/BrandsPanel.jsx'
import UsersPanel from '../components/admin/UsersPanel.jsx'
import CustomersPanel from '../components/admin/CustomersPanel.jsx'
import NewsletterPanel from '../components/admin/NewsletterPanel.jsx'
import SettingsPanel from '../components/admin/SettingsPanel.jsx'
import BackupPanel from '../components/admin/BackupPanel.jsx'

// `store: true` marks the only sections a STORE account may see. The master
// admin sees everything; STORE sees Repairs only; CUSTOMER has no admin access.
const NAV = [
  {
    group: 'ראשי',
    items: [{ id: 'overview', label: 'סקירה', Icon: LayoutDashboard }],
  },
  {
    group: 'חנות',
    items: [
      { id: 'home-page', label: 'דף ראשי', Icon: LayoutTemplate },
      { id: 'catalog', label: 'קטלוג', Icon: Package },
      { id: 'product-page', label: 'דף מוצר', Icon: LayoutTemplate },
      { id: 'brands', label: 'מותגים', Icon: Tag },
      { id: 'orders', label: 'הזמנות', Icon: ShoppingBag },
      { id: 'inquiries', label: 'פניות', Icon: Inbox },
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
    group: 'ניהול',
    items: [
      { id: 'categories', label: 'קטגוריות', Icon: Tags },
      { id: 'users', label: 'משתמשים והרשאות', Icon: UserCog },
      { id: 'newsletter', label: 'ניוזלטר', Icon: Mail },
      { id: 'backup', label: 'גיבוי ושחזור', Icon: DatabaseBackup },
      { id: 'settings', label: 'הגדרות', Icon: SettingsIcon },
    ],
  },
]

const PANELS = {
  overview: DashboardSummary,
  'home-page': HomePanel,
  catalog: CatalogPanel,
  'product-page': ProductPagePanel,
  brands: BrandsPanel,
  orders: OrdersPanel,
  inquiries: InquiriesPanel,
  repairs: RepairsPanel,
  customers: CustomersPanel,
  loaners: LoanersPanel,
  devices: DevicesPanel,
  categories: CategoriesPanel,
  users: UsersPanel,
  newsletter: NewsletterPanel,
  backup: BackupPanel,
  settings: SettingsPanel,
}

export default function AdminDashboard() {
  const { user, logout, isMaster } = useAuth()
  const { inquiries, adminUI, updateAdminUI, setNavOrder, uiLabel } = useSettings()
  const unreadInquiries = inquiries.filter((i) => !i.read).length

  // ---- Edit mode (rename labels / reorder lists) ----
  const RESTORE_KEY = 'drfone_adminui_restore'
  const [editMode, setEditMode] = useState(false)
  const dragRef = useRef(null)
  // Entering edit mode silently snapshots the current customisation so it can be
  // restored if the changes don't work out.
  const enterEdit = () => {
    try { localStorage.setItem(RESTORE_KEY, JSON.stringify(adminUI)) } catch { /* ignore */ }
    setEditMode(true)
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
  const flat = groups.flatMap((g) => g.items)

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

  const [section, setSection] = useState(isMaster ? 'overview' : 'repairs')
  const [catalogLowStock, setCatalogLowStock] = useState(false)

  // Navigate to a section; clears the low-stock drilldown flag unless requested.
  const go = (id, lowStock = false) => {
    setCatalogLowStock(lowStock)
    setSection(id)
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
        ? { lowStockInitial: catalogLowStock }
        : {}

  const NavItem = ({ id, label, Icon, group }) => {
    const active = section === id
    const badge = id === 'inquiries' && unreadInquiries > 0 ? unreadInquiries : null

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
                <AdminSearch onNavigate={go} />
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
              className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:bg-black/5"
            >
              <Home size={16} /> לאתר
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-ink-dark"
            >
              <LogOut size={16} /> התנתקות
            </button>
          </div>
        </div>
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
          <Panel {...panelProps} />
        </main>
      </div>
    </div>
    </AdminEditProvider>
  )
}
