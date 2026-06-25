import { useRef, useState, useEffect } from 'react'
import { Store, Wrench } from 'lucide-react'
import { useApp, DOMAINS } from '../context/AppContext.jsx'

// Segmented toggle between the Store (חנות) and the Lab (מעבדה), dressed in an
// Apple-style "liquid glass" treatment (see .glass-switch in index.css).
export default function DomainSwitch() {
  const { domain, switchDomain, isStore, filters } = useApp()
  const ref = useRef(null)
  const [intro, setIntro] = useState(false)

  // Play the 3-second glass intro whenever the storefront "ראשי" view becomes
  // active (initial load and when returning home), so the switch invites a tap.
  const onHome = isStore && filters.category === 'home'
  useEffect(() => {
    if (!onHome) return
    setIntro(true)
    const t = setTimeout(() => setIntro(false), 3000)
    return () => clearTimeout(t)
  }, [onHome])

  // Move the specular glass lens to track the pointer across the control.
  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const tabs = [
    { id: DOMAINS.STORE, label: 'חנות', Icon: Store },
    { id: DOMAINS.LAB, label: 'מעבדה', Icon: Wrench },
  ]

  return (
    // Prominent segmented control — this is a major switch between the two halves
    // of the site (Store ⇄ Lab), so it's larger, bolder and brand-tinted.
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`glass-switch inline-flex items-center rounded-full border-2 border-brand-300 bg-brand-50 p-1 shadow-sm ${
        intro ? 'glass-intro' : ''
      }`}
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = domain === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => switchDomain(id)}
            aria-pressed={active}
            className={`glass-tab flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold transition-all duration-200 hover:z-10 hover:scale-105 sm:text-base ${
              active
                ? 'bg-brand-500 text-white shadow'
                : 'text-brand-700'
            }`}
          >
            <Icon size={19} strokeWidth={2.4} />
            {label}
          </button>
        )
      })}
      {/* Travelling shine bar used by the intro animation. */}
      <span className="glass-sweep" aria-hidden="true" />
    </div>
  )
}
