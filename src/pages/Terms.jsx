import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import WhatsAppButton from '../components/WhatsAppButton.jsx'
import { BUSINESS } from '../data/business.js'

// Standard storefront terms & conditions (תקנון). This is a reasonable default
// to ship with — the business should have it reviewed by a lawyer before final.
const SECTIONS = [
  {
    title: '1. כללי',
    body: [
      `אתר זה ("האתר") מופעל על ידי ${BUSINESS.name} ("החנות"). תקנון זה מסדיר את היחסים בין החנות לבין כל אדם הגולש, מזמין או רוכש באמצעות האתר ("הלקוח").`,
      'עצם השימוש באתר ו/או ביצוע הזמנה מהווים הסכמה מלאה לתנאי תקנון זה. אם אינך מסכים לתנאים — אנא הימנע משימוש באתר.',
      'התקנון מנוסח בלשון זכר מטעמי נוחות בלבד ומופנה לכלל המגדרים כאחד.',
    ],
  },
  {
    title: '2. המוצרים והמחירים',
    body: [
      'תמונות המוצרים באתר מובאות להמחשה בלבד וייתכנו הבדלים בין התצוגה למוצר בפועל.',
      'המחירים המוצגים באתר כוללים מע״מ כחוק, אלא אם צוין אחרת, ואינם כוללים דמי משלוח אלא אם צוין במפורש.',
      'החנות רשאית לעדכן מחירים, מבצעים ומלאי בכל עת. המחיר המחייב הוא זה שהוצג בעת השלמת ההזמנה.',
      'במקרה של טעות מחיר ברורה ומהותית, החנות רשאית לבטל את ההזמנה ולהשיב את התשלום ששולם.',
    ],
  },
  {
    title: '3. ביצוע הזמנה ואמצעי תשלום',
    body: [
      'ביצוע הזמנה מותנה בהזנת פרטים מלאים ונכונים. אחריות לנכונות הפרטים חלה על הלקוח בלבד.',
      'התשלום מתבצע באמצעים המוצעים באתר. השלמת ההזמנה כפופה לאישור חברת האשראי / אמצעי התשלום.',
      'החנות רשאית, לפי שיקול דעתה, לאשר את ההזמנה רק לאחר תיאום מול הלקוח בנוגע למלאי, מחיר או פרטי משלוח.',
    ],
  },
  {
    title: '4. אספקה ומשלוחים',
    body: [
      'זמני האספקה המשוערים מוצגים בעת ההזמנה ואינם כוללים סופי שבוע וחגים. ייתכנו עיכובים שאינם בשליטת החנות.',
      'באיסוף עצמי תימסר הודעה כאשר ההזמנה מוכנה. באספקה עד הבית, האחריות למסירה היא של חברת השליחויות.',
      'על הלקוח לבדוק את המשלוח עם קבלתו ולדווח על פגם או חוסר בהקדם.',
    ],
  },
  {
    title: '5. ביטול עסקה, החזרות והחזרים',
    body: [
      'ביטול עסקה ייעשה בהתאם לחוק הגנת הצרכן, התשמ״א-1981 ולתקנותיו.',
      'ניתן לבטל עסקה ולקבל החזר תוך 14 ימים מקבלת המוצר או מסמך הגילוי, ובלבד שהמוצר לא נפגם ולא נעשה בו שימוש. ייתכן ניכוי דמי ביטול בשיעור הקבוע בחוק (עד 5% ממחיר המוצר או 100 ₪, הנמוך מביניהם).',
      'מוצרים מסוימים (כגון פריטים אישיים או מוצרים שיוצרו במיוחד עבור הלקוח) עשויים שלא להיות ניתנים לביטול בהתאם לחוק.',
      'ההחזר הכספי יבוצע לאמצעי התשלום שבו בוצעה העסקה.',
    ],
  },
  {
    title: '6. אחריות',
    body: [
      'המוצרים מכוסים באחריות יצרן / יבואן כמקובל וכמפורט במוצר, ככל שחלה.',
      'האחריות אינה חלה על נזק שנגרם משימוש לא נכון, נפילה, חדירת נוזלים, או טיפול שבוצע על ידי גורם שאינו מורשה.',
    ],
  },
  {
    title: '7. פרטיות ודיוור',
    body: [
      'החנות מכבדת את פרטיות הלקוחות ועושה שימוש בפרטים לצורך ביצוע ההזמנה, שירות ושיפור החוויה בלבד.',
      'לקוח שאישר קבלת דיוור (ניוזלטר) רשאי להסיר את עצמו מרשימת התפוצה בכל עת באמצעות פנייה לחנות או דרך האזור האישי.',
    ],
  },
  {
    title: '8. קניין רוחני',
    body: [
      'כל התכנים באתר — לרבות טקסטים, תמונות, עיצוב ולוגו — הם קניינה של החנות ואין לעשות בהם שימוש ללא אישור בכתב.',
    ],
  },
  {
    title: '9. שירות לקוחות ופניות',
    body: [
      `לכל שאלה, בקשה או פנייה ניתן ליצור קשר בטלפון ${BUSINESS.whatsappDisplay} או בכתובת ${BUSINESS.address}.`,
      'תקנון זה כפוף לדיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז המתאים.',
    ],
  },
]

export default function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <FileText size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">תקנון האתר ותנאי שימוש</h1>
            <p className="text-sm text-ink-light">{BUSINESS.name}</p>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-base font-extrabold text-ink">{s.title}</h2>
              <div className="space-y-2">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-light">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 rounded-xl bg-brand-50/60 p-4 text-xs leading-relaxed text-ink-light">
          תקנון זה מהווה נוסח כללי ומקובל. מומלץ להתאימו ולאמתו מול יועץ משפטי בטרם פרסום סופי.
        </p>

        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:underline">
          ← חזרה לחנות
        </Link>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
