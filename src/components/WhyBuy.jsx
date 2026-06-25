import { Wrench, Truck, Store, BadgeCheck } from 'lucide-react'

const ITEMS = [
  { Icon: Wrench, title: 'שירותי מעבדה במקום', text: 'תיקון מקצועי לכל המכשירים — אצלנו, בלי לשלוח לאף אחד.' },
  { Icon: Truck, title: 'משלוחים לכל הארץ', text: 'המוצר מגיע עד הבית, לכל יישוב בארץ.' },
  { Icon: Store, title: 'אפשרות לאיסוף עצמי', text: 'מעדיפים לאסוף? אפשר לאסוף ישירות מהחנות.' },
  { Icon: BadgeCheck, title: 'מוצרים איכותיים', text: 'מכשירים ואביזרים נבחרים, באחריות ובמחיר הוגן.' },
]

// Home-page "why buy from us" strip.
export default function WhyBuy() {
  return (
    <section className="mt-12">
      <h2 className="mb-5 text-center text-xl font-extrabold text-ink sm:text-2xl">למה כדאי לרכוש אצלנו?</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {ITEMS.map(({ Icon, title, text }) => (
          <div
            key={title}
            className="flex flex-col items-center rounded-2xl border border-black/5 bg-white p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon size={24} />
            </span>
            <h3 className="mt-3 text-sm font-extrabold text-ink sm:text-base">{title}</h3>
            <p className="mt-1 text-xs leading-snug text-ink-light sm:text-sm">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
