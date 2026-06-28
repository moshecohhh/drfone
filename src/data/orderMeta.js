// Shared constants for the Store checkout & Orders admin panel.

export const ORDER_STATUSES = [
  { id: 'pending', label: 'ממתין לאישור', color: 'bg-amber-100 text-amber-700' },
  { id: 'processing', label: 'בטיפול', color: 'bg-blue-100 text-blue-700' },
  { id: 'shipped', label: 'נשלח', color: 'bg-purple-100 text-purple-700' },
  { id: 'completed', label: 'הושלם', color: 'bg-brand-100 text-brand-700' },
]

// Older orders may carry the legacy 'new' status — treat it as the first step.
export const statusMeta = (id) =>
  ORDER_STATUSES.find((s) => s.id === id) || ORDER_STATUSES[0]

export const PAYMENT_METHODS = [
  { id: 'credit', label: 'כרטיס אשראי', hint: 'תשלום מאובטח (הדמיה)' },
  { id: 'bit', label: 'ביט', hint: 'העברה דרך אפליקציית Bit (הדמיה)' },
  { id: 'representative', label: 'תיאום מול נציג', hint: 'נציג יחזור אליכם לתיאום תשלום' },
]

// `price` (₪) is added to the order total. `pickup: true` marks a self-collect
// option that needs no shipping address. Both are editable from the admin panel.
export const DELIVERY_METHODS = [
  { id: 'pickup', label: 'איסוף עצמי', hint: 'רשבי 49, מודיעין עילית', price: 0, pickup: true },
  { id: 'delivery', label: 'משלוח עד הבית', hint: 'משלוח עד פתח הבית', price: 0, pickup: false },
]
