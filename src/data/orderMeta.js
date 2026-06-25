// Shared constants for the Store checkout & Orders admin panel.

export const ORDER_STATUSES = [
  { id: 'new', label: 'חדש', color: 'bg-blue-100 text-blue-700' },
  { id: 'processing', label: 'בטיפול', color: 'bg-amber-100 text-amber-700' },
  { id: 'shipped', label: 'נשלח', color: 'bg-purple-100 text-purple-700' },
  { id: 'completed', label: 'הושלם', color: 'bg-brand-100 text-brand-700' },
]

export const statusMeta = (id) =>
  ORDER_STATUSES.find((s) => s.id === id) || ORDER_STATUSES[0]

export const PAYMENT_METHODS = [
  { id: 'credit', label: 'כרטיס אשראי', hint: 'תשלום מאובטח (הדמיה)' },
  { id: 'bit', label: 'ביט', hint: 'העברה דרך אפליקציית Bit (הדמיה)' },
  { id: 'representative', label: 'תיאום מול נציג', hint: 'נציג יחזור אליכם לתיאום תשלום' },
]

export const DELIVERY_METHODS = [
  { id: 'pickup', label: 'איסוף עצמי', hint: 'רשבי 49, מודיעין עילית' },
  { id: 'delivery', label: 'משלוח עד הבית', hint: 'בתיאום מול נציג' },
]
