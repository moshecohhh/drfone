import { MapPin, Phone, Store, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'
import { parseCoords } from '../data/business.js'
import Logo from './Logo.jsx'

export default function Footer() {
  const { settings, waLink, mapsLink, wazeLink } = useSettings()
  // Map pin = the same coords the nav links point to (falls back to a text
  // search so the embed never breaks if coords were cleared).
  const coords = parseCoords(settings.mapCoords)
  const mapQuery = coords ? `${coords.lat},${coords.lng}` : settings.address
  const mapEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&hl=he&output=embed`
  return (
    <footer className="mt-16 border-t border-black/10 bg-black text-white">
      <div className="grid w-full gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3 xl:px-[3cm]">
        {/* Brand — logo (custom or default) with an optional white backdrop,
            controlled from Settings (off = transparent, on the dark footer). */}
        <div>
          {(() => {
            const logoEl = settings.footerLogo ? (
              <img src={settings.footerLogo} alt={settings.name} className="h-16 w-auto select-none" draggable={false} />
            ) : (
              <Logo className="h-16" withLink={false} />
            )
            return settings.footerLogoWhiteBg !== false ? (
              <div className="inline-flex rounded-xl bg-white p-3">{logoEl}</div>
            ) : (
              <div className="inline-flex">{logoEl}</div>
            )
          })()}
          {settings.footerTagline && (
            <p className="mt-3 max-w-xs whitespace-pre-line text-sm text-white/60">{settings.footerTagline}</p>
          )}
        </div>

        {/* What we do */}
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-400">
            מה אנחנו מציעים
          </h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Store size={16} className="text-brand-400" /> חנות: מכשירים כשרים, תומכי כשר ומסוננים
            </li>
            <li className="flex items-center gap-2">
              <Wrench size={16} className="text-brand-400" /> מעבדה: מסכים, סוללות, שקעים ותיקוני לוח
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-400">
            צרו קשר
          </h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex flex-col gap-1">
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-brand-400"
                title="ניווט בגוגל מפות"
              >
                <MapPin size={16} className="text-brand-400" /> {settings.address}
              </a>
              <span className="flex gap-3 pr-6 text-xs text-white/50">
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">
                  Google Maps
                </a>
                <a href={wazeLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">
                  Waze
                </a>
              </span>
            </li>
            <li>
              <a
                href={waLink('שלום, אשמח לקבל פרטים')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-brand-400"
              >
                <Phone size={16} className="text-brand-400" /> {settings.whatsappDisplay}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Location map */}
      <div className="border-t border-white/10">
        <div className="w-full px-4 py-8 xl:px-[3cm]">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-400">
            <MapPin size={16} /> המיקום שלנו
          </h4>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title="מפת מיקום העסק"
              src={mapEmbedSrc}
              className="h-64 w-full"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-2 flex gap-3 text-xs text-white/50">
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">
              פתיחת ניווט בגוגל מפות ←
            </a>
            <a href={wazeLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">
              ניווט ב-Waze ←
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {settings.name} · כל הזכויות שמורות ·{' '}
        <Link to="/terms" className="hover:text-brand-400">תקנון האתר</Link>
      </div>
    </footer>
  )
}
