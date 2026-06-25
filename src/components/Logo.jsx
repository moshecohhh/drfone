import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApp } from '../context/AppContext.jsx'

// Renders the brand logo image. `className` controls the height.
export default function Logo({ className = 'h-12', withLink = true }) {
  const { settings } = useSettings()
  const { goHome } = useApp()
  const img = (
    <img
      src="/logo.png"
      alt={`${settings.name} — מעבדת תיקונים מקצועית`}
      className={`${className} w-auto select-none`}
      draggable={false}
    />
  )
  if (!withLink) return img
  return (
    // Always lands on the storefront "ראשי" view — navigate to "/" AND reset
    // the app state (domain + filters), so it works even when already on "/".
    <Link to="/" onClick={goHome} aria-label={settings.name} className="inline-flex items-center">
      {img}
    </Link>
  )
}
