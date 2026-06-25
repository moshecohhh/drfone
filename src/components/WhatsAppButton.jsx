import { useEffect, useState } from 'react'
import { X, Send } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'

// WhatsApp glyph (lucide has no brand icon, so inline SVG).
function WhatsAppGlyph({ size = 30 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.257.59 4.46 1.71 6.402L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.62h.005c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.804-12.8zm0 23.04h-.004a10.6 10.6 0 0 1-5.4-1.48l-.388-.23-3.9 1.022 1.04-3.8-.252-.39a10.6 10.6 0 0 1-1.626-5.66c0-5.87 4.778-10.64 10.65-10.64 2.845 0 5.518 1.11 7.53 3.122a10.58 10.58 0 0 1 3.116 7.526c0 5.87-4.778 10.64-10.616 10.64zm5.84-7.97c-.32-.16-1.894-.934-2.188-1.04-.294-.108-.508-.16-.722.16-.214.32-.828 1.04-1.016 1.254-.187.214-.374.24-.694.08-.32-.16-1.35-.498-2.572-1.587-.95-.847-1.592-1.894-1.78-2.214-.187-.32-.02-.493.14-.652.144-.143.32-.374.48-.56.16-.187.214-.32.32-.534.107-.214.054-.4-.026-.56-.08-.16-.722-1.74-.99-2.382-.26-.625-.525-.54-.722-.55l-.615-.01c-.214 0-.56.08-.854.4-.294.32-1.12 1.094-1.12 2.667 0 1.573 1.146 3.093 1.306 3.307.16.214 2.255 3.443 5.464 4.827.764.33 1.36.527 1.824.674.766.244 1.464.21 2.016.127.615-.092 1.894-.774 2.16-1.522.267-.747.267-1.387.187-1.52-.08-.134-.294-.214-.614-.374z" />
    </svg>
  )
}

// Permanent floating WhatsApp button. After 10s a chat-style help card pops up
// offering assistance (once per session, dismissible). Tapping "start chat"
// opens WhatsApp with a friendly pre-filled message.
export default function WhatsAppButton() {
  const { waLink, settings } = useSettings()
  const [showBubble, setShowBubble] = useState(false)
  const [shown, setShown] = useState(false) // drives the slide/fade-in transition
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return
    // On mobile, never auto-open the help card — it would cover the screen and
    // disturb the user. The floating button stays and still opens WhatsApp on tap.
    if (window.matchMedia('(max-width: 767px)').matches) return
    const t = setTimeout(() => setShowBubble(true), 10000)
    return () => clearTimeout(t)
  }, [dismissed])

  // Flip the entrance transition on the next tick so it animates in (and so the
  // card's resting state is always fully visible, never stuck transparent).
  useEffect(() => {
    if (!showBubble) {
      setShown(false)
      return
    }
    const t = setTimeout(() => setShown(true), 30)
    return () => clearTimeout(t)
  }, [showBubble])

  const closeBubble = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowBubble(false)
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {/* Chat-style help card */}
      {showBubble && (
        <div
          className={`w-72 max-w-[calc(100vw-2.5rem)] origin-bottom-left overflow-hidden rounded-3xl bg-[#fff] shadow-card-hover ring-1 ring-black/10 transition-all duration-300 ease-out ${
            shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          {/* Header — business identity + live "online" status */}
          <div
            className="relative flex items-center gap-3 bg-gradient-to-l from-[#128C7E] to-[#25D366] px-4 py-3 text-white"
            dir="rtl"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
              <WhatsAppGlyph size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{settings.name || 'ד״ר פון'}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/90">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-200 ring-1 ring-white/60" />
                זמין עכשיו · עונים תוך דקות
              </p>
            </div>
            <button
              type="button"
              onClick={closeBubble}
              aria-label="סגירה"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body — WhatsApp "chat paper" with an incoming message + CTA */}
          <div className="bg-[#e9e2d8] px-4 py-4" dir="rtl">
            <div className="relative max-w-[88%] rounded-2xl rounded-tr-sm bg-[#fff] px-3.5 py-2.5 text-right shadow-sm">
              <p className="text-sm font-semibold text-[#1f2c33]">היי 👋</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#54656f]">
                מתלבטים? צריכים עזרה? אנחנו כאן כדי לתת לכם שירות מהיר ואדיב.
              </p>
              <span className="mt-1 block text-left text-[10px] text-[#54656f]/60">עכשיו</span>
            </div>

            <a
              href={waLink('היי, אשמח לקבל עזרה 🙂')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1ebe5d] hover:shadow-lg"
            >
              <Send size={16} className="-scale-x-100" />
              התחילו שיחה בוואטסאפ
            </a>
          </div>
        </div>
      )}

      {/* The floating button — hidden while the help card is open, returns on close. */}
      {!showBubble && (
        <a
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="צ׳אט בוואטסאפ"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          <WhatsAppGlyph />
        </a>
      )}
    </div>
  )
}
