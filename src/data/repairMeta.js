// Shared constants & seeds for the Lab CRM/ERP (repairs, devices, loaners).
// This data is independent of the public Lab *catalog* (services) — it lives in
// its own context/localStorage, keeping the strict Store/Lab separation intact.

export const REPAIR_STATUSES = [
  { id: 'waiting-check', label: 'ממתין לבדיקה', color: 'bg-slate-100 text-slate-700' },
  { id: 'waiting-part', label: 'ממתין לחלק', color: 'bg-amber-100 text-amber-700' },
  { id: 'in-repair', label: 'בתיקון', color: 'bg-blue-100 text-blue-700' },
  { id: 'ready', label: 'מוכן לאיסוף', color: 'bg-brand-100 text-brand-700' },
  { id: 'delivered', label: 'נמסר ללקוח', color: 'bg-green-100 text-green-700' },
]

export const repairStatusMeta = (id) =>
  REPAIR_STATUSES.find((s) => s.id === id) || REPAIR_STATUSES[0]

// ---------------------------------------------------------------------------
// Central device registry. Real-world models for the Israeli kosher market.
// SEED_DEVICE_BRANDS / SEED_DEVICE_MODELS are derived from this single source.
// Bump DEVICE_SEED_VERSION whenever this dataset changes so the registry is
// re-seeded for existing installs (replacing earlier placeholder data).
// ---------------------------------------------------------------------------
export const INITIAL_BRANDS_AND_MODELS = {
  Samsung: [
    'Galaxy S26 Ultra', 'Galaxy S26+', 'Galaxy S26',
    'Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25',
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23',
    'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
    'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21',
    'Galaxy S24 FE', 'Galaxy S23 FE', 'Galaxy S21 FE', 'Galaxy S20 FE',
    'Galaxy A56', 'Galaxy A55', 'Galaxy A54', 'Galaxy A53', 'Galaxy A52',
    'Galaxy A35', 'Galaxy A34', 'Galaxy A33', 'Galaxy A32',
    'Galaxy A16', 'Galaxy A15', 'Galaxy A14', 'Galaxy A13', 'Galaxy A12',
    'Galaxy Z Fold 7', 'Galaxy Z Fold 6', 'Galaxy Z Fold 5', 'Galaxy Z Fold 4',
    'Galaxy Z Flip 7', 'Galaxy Z Flip 6', 'Galaxy Z Flip 5', 'Galaxy Z Flip 4',
  ],
  Apple: [
    'iPhone 17 Pro Max', 'iPhone 16 Pro Max', 'iPhone 15 Pro Max',
    'iPhone 14 Pro Max', 'iPhone 13 Pro Max', 'iPhone 17 Pro',
    'iPhone 16 Pro', 'iPhone 15 Pro', 'iPhone 14 Pro', 'iPhone 13 Pro',
    'iPhone 17', 'iPhone 16', 'iPhone 15', 'iPhone 14', 'iPhone 13',
    'iPhone SE (2022)',
  ],
  Xiaomi: [
    'Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14',
    'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13',
    'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13',
    'Redmi Note 12 Pro', 'Redmi Note 12', 'Redmi Note 11',
  ],
  'QLIUX / Askols': ['Q7', 'Q8', '4*4', '5*5'],
  'FIRST PHONE': ['Pro 10', 'Pro 30', 'Four G1', 'Four G5', 'Class'],
}

// Bump this when INITIAL_BRANDS_AND_MODELS changes (triggers a registry reseed).
export const DEVICE_SEED_VERSION = 2

const brandSlug = (name) =>
  'brand-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const SEED_DEVICE_BRANDS = Object.keys(INITIAL_BRANDS_AND_MODELS).map((name) => ({
  id: brandSlug(name),
  label: name,
}))

export const SEED_DEVICE_MODELS = Object.entries(INITIAL_BRANDS_AND_MODELS).flatMap(
  ([name, models]) =>
    models.map((label, i) => ({
      id: `${brandSlug(name)}-m${i}`,
      brandId: brandSlug(name),
      label,
    })),
)

export const SEED_LOANERS = [
  { id: 'loaner-1', model: 'Samsung Galaxy A03', imei: '356789012345671', status: 'available', assignedRepairId: null },
  { id: 'loaner-2', model: 'Nokia 105', imei: '356789012345672', status: 'available', assignedRepairId: null },
]

// "Condition on arrival" checkboxes — customizable via the admin panel.
// ids 'battery'/'cover'/'sim' match earlier persisted repair data.
export const SEED_CONDITION_OPTIONS = [
  { id: 'battery', label: 'הגיע עם סוללה' },
  { id: 'cover', label: 'הגיע עם מגן' },
  { id: 'sim', label: 'הגיע עם סים' },
]

export const SEED_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'ישראל ישראלי',
    phone1: '0501234567',
    phone2: '',
    address: 'הרב קוק 10, מודיעין עילית',
    createdAt: new Date().toISOString(),
  },
]
