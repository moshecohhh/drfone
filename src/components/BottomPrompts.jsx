import { useState, useEffect } from 'react'
import { Moon, Mail, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const DAY = 86400000
const NIGHT_KEY = 'drfone_night_prompt' // timestamp of last shown (suppress 24h)
const NEWS_KEY = 'drfone_news_prompt_dismissed' // permanent newsletter dismiss

// Small, dismissable bottom toasts: a one-time night-mode offer (00:00–05:00)
// and a newsletter nudge for a signed-in customer who isn't subscribed.
export default function BottomPrompts() {
  const { isDark, setMode } = useTheme()
  const { user, updateProfile } = useAuth()
  const [showNight, setShowNight] = useState(false)
  const [showNews, setShowNews] = useState(false)

  // Night-mode offer: only between midnight and 5am, in light mode, and at most
  // once per 24h (even across refreshes).
  useEffect(() => {
    if (isDark) return
    const hour = new Date().getHours()
    if (hour >= 5) return
    try {
      const last = Number(localStorage.getItem(NIGHT_KEY)) || 0
      if (Date.now() - last < DAY) return
    } catch { /* ignore */ }
    setShowNight(true)
  }, [isDark])

  // Newsletter nudge: signed-in, not subscribed, not previously dismissed.
  useEffect(() => {
    if (!user || user.newsletter) { setShowNews(false); return }
    try {
      if (localStorage.getItem(NEWS_KEY) === '1') return
    } catch { /* ignore */ }
    setShowNews(true)
  }, [user])

  const stampNight = () => { try { localStorage.setItem(NIGHT_KEY, String(Date.now())) } catch { /* ignore */ } }
  const goDark = () => { setMode('dark'); stampNight(); setShowNight(false) }
  const dismissNight = () => { stampNight(); setShowNight(false) }

  const subscribe = () => { updateProfile?.({ newsletter: true }); setShowNews(false) }
  const dismissNews = () => { try { localStorage.setItem(NEWS_KEY, '1') } catch { /* ignore */ } setShowNews(false) }

  if (!showNight && !showNews) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-3 pb-3">
      {showNight && (
        <Toast onClose={dismissNight} Icon={Moon}>
          <span className="text-sm text-ink">לילה טוב 🌙 רוצים לעבור למצב כהה לנוחות העיניים?</span>
          <button onClick={goDark} className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-dark">
            מעבר למצב כהה
          </button>
        </Toast>
      )}
      {showNews && (
        <Toast onClose={dismissNews} Icon={Mail}>
          <span className="text-sm text-ink">רוצים לקבל מבצעים והטבות לניוזלטר?</span>
          <button onClick={subscribe} className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600">
            הרשמה
          </button>
        </Toast>
      )}
    </div>
  )
}

function Toast({ Icon, children, onClose }) {
  return (
    <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-card-hover">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon size={18} />
      </span>
      <div className="flex flex-1 items-center justify-between gap-3">{children}</div>
      <button onClick={onClose} aria-label="סגירה" className="shrink-0 text-ink-light hover:text-ink">
        <X size={18} />
      </button>
    </div>
  )
}
