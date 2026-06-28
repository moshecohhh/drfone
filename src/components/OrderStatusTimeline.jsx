import { Check, Package, Truck, ClipboardList, PackageCheck } from 'lucide-react'
import { ORDER_STATUSES } from '../data/orderMeta.js'

// Horizontal status timeline (new → processing → shipped → completed), shared by
// the public tracking page and the customer's account orders. RTL-aware: the
// connector extends rightward from each step toward the previous one.
const STEP_ICONS = { new: ClipboardList, processing: Package, shipped: Truck, completed: PackageCheck }

export default function OrderStatusTimeline({ status }) {
  const currentIdx = Math.max(0, ORDER_STATUSES.findIndex((s) => s.id === status))
  // While the order is still in progress, the current step "bubbles" (pulses).
  // Once completed, everything is static.
  const isCompleted = status === 'completed'
  return (
    <div className="flex items-start justify-between">
      {ORDER_STATUSES.map((s, i) => {
        const Icon = STEP_ICONS[s.id] || Package
        const done = i <= currentIdx
        const current = i === currentIdx
        const pulse = current && !isCompleted
        return (
          <div key={s.id} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className={`absolute left-1/2 top-5 -z-0 h-0.5 w-full ${i <= currentIdx ? 'bg-brand-500' : 'bg-black/10'}`} />
            )}
            <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
              done ? 'border-brand-500 bg-brand-500 text-white' : 'border-black/15 bg-white text-ink-light'
            } ${current ? 'ring-4 ring-brand-500/20' : ''} ${pulse ? 'animate-bubble' : ''}`}>
              {done && !current ? <Check size={18} /> : <Icon size={18} />}
            </span>
            <span className={`mt-2 text-xs font-semibold ${done ? 'text-brand-700' : 'text-ink-light'}`}>{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}
