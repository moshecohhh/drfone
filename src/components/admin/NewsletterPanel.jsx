import { Mail, Download, BellRing } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { PanelHead, Table, PrimaryBtn, EmptyState } from './ui.jsx'
import { exportCsv } from '../../utils/exportCsv.js'

// Lists everyone subscribed to the newsletter, with CSV/Excel export.
export default function NewsletterPanel() {
  const { users } = useAuth()
  const subscribers = users.filter((u) => u.newsletter)

  const exportList = () => {
    const today = new Date().toISOString().slice(0, 10)
    exportCsv(
      `newsletter-${today}.csv`,
      ['שם', 'אימייל'],
      subscribers.map((u) => [u.name, u.email]),
    )
  }

  return (
    <div>
      <PanelHead
        title="ניוזלטר"
        subtitle={`${subscribers.length} נרשמים לרשימת התפוצה.`}
        action={
          subscribers.length > 0 && (
            <PrimaryBtn onClick={exportList}>
              <Download size={16} /> ייצוא לאקסל
            </PrimaryBtn>
          )
        }
      />

      {subscribers.length === 0 ? (
        <EmptyState icon={BellRing} title="אין נרשמים עדיין" hint="לקוחות שירשמו לניוזלטר באזור האישי יופיעו כאן." />
      ) : (
        <Table columns={['שם', 'אימייל']}>
          {subscribers.map((u) => (
            <tr key={u.id} className="hover:bg-brand-50/40">
              <td className="px-4 py-3 font-semibold text-ink">{u.name}</td>
              <td className="px-4 py-3 text-ink-light" dir="ltr">
                <span className="flex items-center justify-end gap-1.5 sm:justify-start">
                  <Mail size={14} /> {u.email}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
