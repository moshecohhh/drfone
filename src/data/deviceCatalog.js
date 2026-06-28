// ---------------------------------------------------------------------------
// Predefined Samsung & Apple device catalog (models marketed in Israel ~last
// year). Each spec is expanded into a full product object — storage selection,
// official-style colours with per-colour generated images, est. ILS prices and
// a "featured" flag. Imported into the live catalog from the admin (one click),
// using stable ids so a re-import updates instead of duplicating.
//
// Prices are realistic STARTING points — edit them in the admin. Images are
// neutral copyright-free placeholders that swap per colour; replace with real
// photos any time.
// ---------------------------------------------------------------------------

import { deviceImages } from './deviceImage.js'

// Category ids used by the imported devices (created on import if missing).
export const DEVICE_CATEGORIES = [
  { id: 'filtered-smartphones', label: 'סמארטפונים מסוננים' },
  { id: 'tablets', label: 'טאבלטים' },
]

// Storage option sets → [label, priceDelta(₪)].
const ST_PHONE = [['128GB', 0], ['256GB', 150], ['512GB', 450]]
const ST_PHONE_HI = [['256GB', 0], ['512GB', 300], ['1TB', 700]]
const ST_TAB = [['64GB', 0], ['128GB', 150], ['256GB', 350]]
const ST_TAB_HI = [['128GB', 0], ['256GB', 250]]

// Common colour palettes — [name, hex].
const NAVY = ['כחול נייבי', '#2b3a52']
const SILVER = ['כסף', '#c7ccce']
const MINT = ['מנטה', '#cfe3d0']
const ICY = ['תכלת', '#bcd3e6']
const BLACK = ['שחור', '#1c1c1e']
const WHITE = ['לבן', '#ededed']
const GRAY = ['אפור', '#8e8e93']
const BLUE = ['כחול', '#3b6db5']
const GREEN = ['ירוק', '#3f7d62']
const PINK = ['ורוד', '#e7b6c6']
const TI_BLACK = ['טיטניום שחור', '#3a3a3c']
const TI_GRAY = ['טיטניום אפור', '#8e8e93']
const TI_SILVER = ['טיטניום כסף', '#cfd2d4']
const TI_WHITE = ['טיטניום לבן', '#e9e9ea']
const TI_BLUE = ['טיטניום כחול', '#aebfcf']
const TI_ORANGE = ['כתום', '#d4753a']
const slug = (s) => s.toLowerCase().replace(/\+/g, '-plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// kind: 'phone' | 'tablet' | 'fold'  ·  conn: undefined | 'wifi' | 'sim'
const SAMSUNG = [
  { model: 'Galaxy S25', kind: 'phone', price: 3499, featured: true, storage: ST_PHONE, colors: [NAVY, SILVER, MINT, ICY] },
  { model: 'Galaxy S25+', kind: 'phone', price: 4299, featured: true, storage: ST_PHONE_HI, colors: [NAVY, SILVER, MINT, ICY] },
  { model: 'Galaxy S25 Ultra', kind: 'phone', price: 5699, featured: true, storage: ST_PHONE_HI, colors: [TI_BLACK, TI_GRAY, TI_BLUE, TI_WHITE] },
  { model: 'Galaxy S25 Edge', kind: 'phone', price: 4999, featured: true, storage: ST_PHONE_HI, colors: [TI_SILVER, TI_BLACK, ICY] },
  { model: 'Galaxy S25 FE', kind: 'phone', price: 2799, storage: ST_PHONE, colors: [NAVY, WHITE, BLACK, ICY] },
  { model: 'Galaxy S26', kind: 'phone', price: 3799, featured: true, storage: ST_PHONE_HI, colors: [BLACK, SILVER, GREEN] },
  { model: 'Galaxy S26+', kind: 'phone', price: 4599, featured: true, storage: ST_PHONE_HI, colors: [BLACK, SILVER, GREEN] },
  { model: 'Galaxy S26 Ultra', kind: 'phone', price: 5999, featured: true, storage: ST_PHONE_HI, colors: [TI_BLACK, TI_GRAY, TI_BLUE, TI_WHITE] },
  { model: 'Galaxy A16', kind: 'phone', price: 699, storage: ST_PHONE, colors: [BLACK, BLUE, GRAY] },
  { model: 'Galaxy A26', kind: 'phone', price: 999, storage: ST_PHONE, colors: [BLACK, WHITE, MINT] },
  { model: 'Galaxy A36', kind: 'phone', price: 1299, storage: ST_PHONE, colors: [BLACK, WHITE, ICY] },
  { model: 'Galaxy A56', kind: 'phone', price: 1699, storage: ST_PHONE, colors: [BLACK, GRAY, PINK, ICY] },
  { model: 'Galaxy A17', kind: 'phone', price: 799, storage: ST_PHONE, colors: [BLACK, BLUE, GRAY] },
  { model: 'Galaxy A27', kind: 'phone', price: 1099, storage: ST_PHONE, colors: [BLACK, WHITE, MINT] },
  { model: 'Galaxy A37', kind: 'phone', price: 1399, storage: ST_PHONE, colors: [BLACK, WHITE, ICY] },
  { model: 'Galaxy A57', kind: 'phone', price: 1799, storage: ST_PHONE, colors: [BLACK, GRAY, PINK, ICY] },
  { model: 'Galaxy Z Fold7', kind: 'fold', price: 7999, featured: true, storage: ST_PHONE_HI, colors: [NAVY, SILVER, BLACK] },
  // Tablets — each in two SKUs: Wi-Fi only and Wi-Fi + SIM (cellular).
  { model: 'Galaxy Tab A9', kind: 'tablet', price: 549, storage: ST_TAB, colors: [GRAY, SILVER, NAVY], conn: 'both' },
  { model: 'Galaxy Tab A9+', kind: 'tablet', price: 749, storage: ST_TAB, colors: [GRAY, SILVER, NAVY], conn: 'both' },
  { model: 'Galaxy Tab A11', kind: 'tablet', price: 649, storage: ST_TAB, colors: [GRAY, SILVER], conn: 'both' },
  { model: 'Galaxy Tab A11+', kind: 'tablet', price: 949, storage: ST_TAB_HI, colors: [GRAY, SILVER], conn: 'both' },
  { model: 'Galaxy Tab Active5', kind: 'tablet', price: 1799, storage: ST_TAB_HI, colors: [BLACK], conn: 'both' },
]

const APPLE = [
  { model: 'iPhone 17', kind: 'phone', price: 3999, featured: true, storage: ST_PHONE, colors: [BLACK, WHITE, BLUE, GREEN] },
  { model: 'iPhone 17 Pro', kind: 'phone', price: 5499, featured: true, storage: ST_PHONE_HI, colors: [TI_SILVER, TI_ORANGE, NAVY] },
  { model: 'iPhone 17 Pro Max', kind: 'phone', price: 6299, featured: true, storage: ST_PHONE_HI, colors: [TI_SILVER, TI_ORANGE, NAVY] },
  { model: 'iPhone 17 Air', kind: 'phone', price: 4699, featured: true, storage: ST_PHONE_HI, colors: [BLACK, WHITE, ICY] },
  { model: 'iPhone 16', kind: 'phone', price: 3399, storage: ST_PHONE, colors: [BLACK, WHITE, BLUE, PINK] },
  { model: 'iPhone 16 Pro', kind: 'phone', price: 4799, storage: ST_PHONE_HI, colors: [TI_BLACK, TI_WHITE, TI_GRAY] },
  { model: 'iPhone 16 Pro Max', kind: 'phone', price: 5599, storage: ST_PHONE_HI, colors: [TI_BLACK, TI_WHITE, TI_GRAY] },
  { model: 'iPhone 16e', kind: 'phone', price: 2499, storage: ST_PHONE, colors: [BLACK, WHITE] },
  { model: 'iPhone 15', kind: 'phone', price: 2899, storage: ST_PHONE, colors: [BLACK, BLUE, GREEN, PINK] },
  // iPads — each in two SKUs: Wi-Fi and Wi-Fi + Cellular (SIM).
  { model: 'iPad (11th gen)', kind: 'tablet', price: 1799, storage: ST_TAB_HI, colors: [SILVER, BLUE, PINK], conn: 'both' },
  { model: 'iPad mini', kind: 'tablet', price: 2399, storage: ST_TAB_HI, colors: [GRAY, SILVER, BLUE], conn: 'both' },
  { model: 'iPad Air', kind: 'tablet', price: 2999, storage: ST_TAB_HI, colors: [GRAY, SILVER, BLUE], conn: 'both' },
  { model: 'iPad Pro', kind: 'tablet', price: 4999, featured: true, storage: ST_PHONE_HI, colors: [GRAY, SILVER], conn: 'both' },
]

// Build one product object (without an `id` decoration beyond the stable id).
function build(spec, brandId, conn) {
  const kind = spec.kind
  const isTablet = kind === 'tablet'
  const connLabel = conn === 'wifi' ? 'Wi‑Fi' : conn === 'sim' ? 'Wi‑Fi + סים' : ''
  const name = connLabel ? `${spec.model} · ${connLabel}` : spec.model
  const stableId = `store-${brandId}-${slug(spec.model)}${conn ? '-' + conn : ''}`
  const category = isTablet ? 'tablets' : 'filtered-smartphones'

  const colors = spec.colors.map(([cname, hex]) => ({ hex, name: cname, images: deviceImages(hex, kind) }))
  const images = colors.length ? colors[0].images.slice() : []

  const storage = spec.storage || []
  const optionGroups = storage.length
    ? [{
        id: `${stableId}-storage`,
        kind: 'storage',
        title: 'נפח אחסון',
        style: 'pills',
        required: false,
        enabled: true,
        options: storage.map(([label, priceDelta], i) => ({ id: `${stableId}-st-${i}`, label, priceDelta, enabled: true })),
      }]
    : []

  const colorNames = colors.map((c) => c.name).join(', ')
  const emoji = isTablet ? '📲' : kind === 'fold' ? '📱' : '📱'
  const description = isTablet
    ? `${spec.model} ${connLabel ? `(${connLabel}) ` : ''}— טאבלט מקורי. זמין בצבעים: ${colorNames}.`
    : `${spec.model} — מכשיר מקורי. בחירת נפח אחסון וצבע. זמין בצבעים: ${colorNames}.`

  return {
    id: stableId,
    name,
    brand: brandId,
    category,
    price: spec.price,
    oldPrice: null,
    stock: 5,
    inStock: true,
    badge: brandId === 'samsung' ? 'Samsung' : 'Apple',
    description,
    emoji,
    image: images[0] || '',
    images,
    colors,
    featured: !!spec.featured,
    deal: false,
    hasSerial: false,
    imei1: '',
    imei2: '',
    page: {
      enabled: true,
      optionGroups,
      specs: [],
      marketing: [],
      installmentsVisible: true,
      installmentsCount: 12,
    },
  }
}

// Expand a brand's spec list into product objects. Tablets with conn:'both'
// become two separate products (Wi‑Fi and SIM); the SIM SKU costs a bit more.
function expand(specs, brandId) {
  const out = []
  specs.forEach((spec) => {
    if (spec.kind === 'tablet' && spec.conn === 'both') {
      out.push(build(spec, brandId, 'wifi'))
      out.push(build({ ...spec, price: Math.round(spec.price * 1.18 / 10) * 10 }, brandId, 'sim'))
    } else {
      out.push(build(spec, brandId))
    }
  })
  return out
}

export function samsungProducts() {
  return expand(SAMSUNG, 'samsung')
}
export function appleProducts() {
  return expand(APPLE, 'apple')
}
