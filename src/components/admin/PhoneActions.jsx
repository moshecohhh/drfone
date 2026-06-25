import { Phone } from 'lucide-react'
import { telLink, waFromLocal } from '../../utils/validation.js'

// Renders a phone number with adjacent call (tel:) + WhatsApp (wa.me) shortcuts.
// Used in orders, customer records and repair tickets.
export default function PhoneActions({ phone, showNumber = true, className = '' }) {
  if (!phone) return <span className="text-ink-light">—</span>
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showNumber && <span className="text-ink" dir="ltr">{phone}</span>}
      <a
        href={telLink(phone)}
        aria-label={`חיוג ל-${phone}`}
        title="חיוג"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-light transition hover:bg-brand-50 hover:text-brand-600"
        onClick={(e) => e.stopPropagation()}
      >
        <Phone size={15} />
      </a>
      <a
        href={waFromLocal(phone)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`וואטסאפ ל-${phone}`}
        title="וואטסאפ"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-light transition hover:bg-green-50 hover:text-green-600"
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 32 32" width="15" height="15" fill="currentColor" aria-hidden>
          <path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.257.59 4.46 1.71 6.402L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.62h.005c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.804-12.8zm0 23.04h-.004a10.6 10.6 0 0 1-5.4-1.48l-.388-.23-3.9 1.022 1.04-3.8-.252-.39a10.6 10.6 0 0 1-1.626-5.66c0-5.87 4.778-10.64 10.65-10.64 2.845 0 5.518 1.11 7.53 3.122a10.58 10.58 0 0 1 3.116 7.526c0 5.87-4.778 10.64-10.616 10.64zm5.84-7.97c-.32-.16-1.894-.934-2.188-1.04-.294-.108-.508-.16-.722.16-.214.32-.828 1.04-1.016 1.254-.187.214-.374.24-.694.08-.32-.16-1.35-.498-2.572-1.587-.95-.847-1.592-1.894-1.78-2.214-.187-.32-.02-.493.14-.652.144-.143.32-.374.48-.56.16-.187.214-.32.32-.534.107-.214.054-.4-.026-.56-.08-.16-.722-1.74-.99-2.382-.26-.625-.525-.54-.722-.55l-.615-.01c-.214 0-.56.08-.854.4-.294.32-1.12 1.094-1.12 2.667 0 1.573 1.146 3.093 1.306 3.307.16.214 2.255 3.443 5.464 4.827.764.33 1.36.527 1.824.674.766.244 1.464.21 2.016.127.615-.092 1.894-.774 2.16-1.522.267-.747.267-1.387.187-1.52-.08-.134-.294-.214-.614-.374z" />
        </svg>
      </a>
    </span>
  )
}
