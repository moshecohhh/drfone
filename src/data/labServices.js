// ============================================================================
// LAB DOMAIN (מעבדה)
// This file is the SINGLE source of truth for everything in the Lab.
// It must never import from or reference storeProducts.js.
// ============================================================================

export const LAB_CATEGORIES = [
  { id: 'all', label: 'כל הקטגוריות' },
  { id: 'screens', label: 'מסכי סמארטפון' },
  { id: 'charging-ports', label: 'שקעי טעינה' },
  { id: 'batteries', label: 'סוללות' },
  { id: 'board-repair', label: 'תיקוני דרג ג׳/ד׳' },
  { id: 'unlocking', label: 'פתיחת נעילות' },
]

// brand ids must match src/data/brands.js
export const LAB_SERVICES = [
  {
    id: 'lab-1',
    name: 'החלפת מסך Samsung Galaxy S22',
    brand: 'samsung',
    category: 'screens',
    price: 449,
    oldPrice: null,
    inStock: true, // "זמין לתיקון"
    badge: 'אחריות 6 חודשים',
    description: 'החלפת מסך AMOLED מקורי כולל הרכבה. זמן תיקון ממוצע: עד שעה במעבדה.',
    emoji: '📲',
    image: '',
  },
  {
    id: 'lab-2',
    name: 'תיקון שקע טעינה iPhone 12',
    brand: 'apple',
    category: 'charging-ports',
    price: 199,
    oldPrice: null,
    inStock: true,
    badge: 'תיקון מהיר',
    description: 'ניקוי או החלפת שקע הטעינה (Lightning) לאייפון 12. פתרון לבעיות טעינה לסירוגין.',
    emoji: '⚡',
    image: '',
  },
  {
    id: 'lab-3',
    name: 'החלפת סוללה Xiaomi Redmi Note 11',
    brand: 'xiaomi',
    category: 'batteries',
    price: 159,
    oldPrice: 199,
    inStock: true,
    badge: 'מבצע',
    description: 'החלפת סוללה מקורית עם אחריות. מחזיר את משך חיי הסוללה לימים שלמים.',
    emoji: '🔋',
    image: '',
  },
  {
    id: 'lab-4',
    name: 'תיקון דרג ד׳ - שחזור לוח אם',
    brand: 'apple',
    category: 'board-repair',
    price: 690,
    oldPrice: null,
    inStock: true,
    badge: 'מעבדת מיקרו',
    description: 'תיקון רמת רכיב על גבי הלוח (Micro-Soldering) למכשירים שאינם נדלקים. אבחון ללא התחייבות.',
    emoji: '🔬',
    image: '',
  },
  {
    id: 'lab-5',
    name: 'פתיחת נעילת חשבון / קוד',
    brand: 'oneplus',
    category: 'unlocking',
    price: 249,
    oldPrice: null,
    inStock: true,
    badge: 'דיסקרטי',
    description: 'שירות פתיחת נעילות קוד וחשבון למכשירים בבעלותכם בלבד, בכפוף להצגת הוכחת בעלות.',
    emoji: '🔓',
    image: '',
  },
]
