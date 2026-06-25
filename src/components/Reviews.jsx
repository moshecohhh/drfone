import { Star, Quote } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'

// Home-page customer reviews row. Content is admin-editable (home management).
export default function Reviews() {
  const { home } = useSettings()
  const reviews = home?.reviews || []
  if (reviews.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-center text-xl font-extrabold text-ink sm:text-2xl">לקוחות ממליצים</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {reviews.map((r) => (
          <figure
            key={r.id}
            className="relative w-72 shrink-0 rounded-2xl border border-black/5 bg-white p-5 shadow-card sm:w-auto"
          >
            <Quote size={28} className="absolute left-4 top-4 text-brand-100" />
            <div className="flex gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} fill={i < (Number(r.rating) || 5) ? 'currentColor' : 'none'} className={i < (Number(r.rating) || 5) ? '' : 'text-black/15'} />
              ))}
            </div>
            <blockquote className="mt-3 text-sm leading-relaxed text-ink">“{r.text}”</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-ink-light">— {r.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
