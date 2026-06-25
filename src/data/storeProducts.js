// ============================================================================
// STORE DOMAIN (חנות)
// This file is the SINGLE source of truth for everything in the Store.
// It must never import from or reference labServices.js.
// ============================================================================

export const STORE_CATEGORIES = [
  { id: 'all', label: 'כל הקטגוריות' },
  { id: 'kosher', label: 'מכשירים כשרים' },
  { id: 'kosher-support', label: 'מכשירים תומך כשר' },
  { id: 'filtered-smartphones', label: 'סמארטפונים מסוננים' },
  { id: 'accessories', label: 'אביזרים' },
  { id: 'deals', label: 'מבצעים' },
]

// brand ids must match src/data/brands.js
// `image` is an optional URL / data-URL; `emoji` is the fallback visual.
// `stock` is the on-hand quantity (inStock is derived from it for products).
export const STORE_PRODUCTS = [
  {
    id: 'store-1',
    deal: true,
    name: 'נוקיה 105 כשר',
    brand: 'nokia',
    category: 'kosher',
    price: 149,
    oldPrice: null,
    stock: 12,
    inStock: true,
    badge: 'כשר בהמלצת ועדת הרבנים',
    description: 'מכשיר כשר חסום לחלוטין, ללא אינטרנט וללא מסרונים. סוללה חזקה ומחיר משתלם.',
    emoji: '📵',
    image: '',
  },
  {
    id: 'store-2',
    deal: true,
    name: 'Samsung Galaxy A05 תומך כשר',
    brand: 'samsung',
    category: 'kosher-support',
    price: 599,
    oldPrice: 699,
    stock: 5,
    inStock: true,
    badge: 'תומך כשר',
    description: 'סמארטפון אנדרואיד מוכן להתקנת פרופיל כשר, מסך גדול וביצועים יומיומיים מצוינים.',
    emoji: '📱',
    image: '',
  },
  {
    id: 'store-3',
    deal: true,
    name: 'iPhone 13 מסונן',
    brand: 'apple',
    category: 'filtered-smartphones',
    price: 2490,
    oldPrice: null,
    stock: 3,
    inStock: true,
    badge: 'סינון רימון / נטפרי',
    description: 'אייפון 13 עם סינון מאושר, כולל אחריות. מתאים למי שצריך גלישה מסוננת ובטוחה.',
    emoji: '🍏',
    image: '',
  },
  {
    id: 'store-4',
    deal: true,
    name: 'מטען מהיר Type-C 25W',
    brand: 'xiaomi',
    category: 'accessories',
    price: 79,
    oldPrice: 99,
    stock: 40,
    inStock: true,
    badge: 'מבצע',
    description: 'מטען קיר מהיר 25W עם כבל Type-C מקורי. טעינה מהירה ובטוחה לכל מכשיר תואם.',
    emoji: '🔌',
    image: '',
  },
  {
    id: 'store-5',
    deal: true,
    name: 'OnePlus Nord מסונן - מבצע',
    brand: 'oneplus',
    category: 'deals',
    price: 1190,
    oldPrice: 1490,
    stock: 0,
    inStock: false,
    badge: 'מבצע חם',
    description: 'וואן פלוס נורד עם סינון מאושר במחיר מבצע מיוחד. כמות מוגבלת במלאי.',
    emoji: '🔥',
    image: '',
  },
]
