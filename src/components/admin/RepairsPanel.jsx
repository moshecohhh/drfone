import { useState, Fragment } from 'react'
import { Plus, Pencil, Trash2, Wrench, ChevronDown, Phone, Hash, Wallet, ShieldCheck, Smartphone, Lock } from 'lucide-react'
import { useLab } from '../../context/LabContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { PanelHead, Table, PrimaryBtn, IconBtn, EmptyState, PanelSearch } from './ui.jsx'
import PhoneActions from './PhoneActions.jsx'
import PatternReplay from './PatternReplay.jsx'
import JournalLog from './JournalLog.jsx'
import BrandLogo from './BrandLogo.jsx'
import RepairForm from './RepairForm.jsx'

const fmt = (iso) =>
  new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })

export default function RepairsPanel() {
  const { repairs, updateRepairStatus, deleteRepair, addRepairLog, conditionOptions, repairStatuses, repairStatusMeta } = useLab()
  const { user, isMaster } = useAuth()
  const conditionBadges = (cond) =>
    conditionOptions.filter((o) => cond?.[o.id]).map((o) => o.label)

  // STORE accounts see ONLY the tickets they personally opened; master sees all.
  const ownRepairs = isMaster ? repairs : repairs.filter((t) => t.createdById === user?.id)
  // null = table · 'new' = create form · repair object = edit form
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [query, setQuery] = useState('')

  const term = query.trim().toLowerCase()
  const visibleRepairs = term
    ? ownRepairs.filter((r) =>
        [r.repairNo, r.customerName, r.phone1, r.phone2, r.device, r.brandLabel, r.imei].some((f) =>
          (f || '').toString().toLowerCase().includes(term),
        ),
      )
    : ownRepairs

  if (editing) {
    return <RepairForm repair={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
  }

  return (
    <div>
      <PanelHead
        title="ניהול תיקונים"
        subtitle={`${ownRepairs.length} תיקונים${isMaster ? ' במערכת' : ' שפתחת'}.`}
        action={
          <PrimaryBtn onClick={() => setEditing('new')}>
            <Plus size={16} /> תיקון חדש
          </PrimaryBtn>
        }
      />

      {ownRepairs.length > 0 && (
        <PanelSearch value={query} onChange={setQuery} placeholder="חיפוש לפי מס׳ תיקון / לקוח / מכשיר…" className="mb-4 sm:max-w-sm" />
      )}

      {ownRepairs.length === 0 ? (
        <EmptyState icon={Wrench} title="אין תיקונים עדיין" hint="לחצו על ״תיקון חדש״ כדי לפתוח כרטיס תיקון." />
      ) : visibleRepairs.length === 0 ? (
        <EmptyState icon={Wrench} title="לא נמצאו תיקונים" hint={`אין תוצאות עבור “${query.trim()}”.`} />
      ) : (
        <Table columns={['מס׳ תיקון', 'לקוח', 'מכשיר', 'סטטוס', 'תאריך', 'נפתח ע״י', '']}>
          {visibleRepairs.map((r, idx) => {
            const meta = repairStatusMeta(r.status)
            const isOpen = expanded === r.id
            return (
              <Fragment key={r.id}>
                <tr className={`${idx % 2 ? 'bg-brand-50/40' : 'bg-white'} hover:bg-brand-100/50`}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="flex items-center gap-1.5 font-bold text-ink"
                    >
                      <ChevronDown size={15} className={`text-ink-light transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      <Hash size={13} className="text-ink-light" />
                      {r.repairNo}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{r.customerName || '—'}</td>
                  <td className="px-4 py-3 text-ink-light">
                    <span className="flex items-center gap-2">
                      {r.brandLabel && <BrandLogo brand={r.brandLabel} size={20} />}
                      {r.device}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={(e) => updateRepairStatus(r.id, e.target.value)}
                      className={`cursor-pointer appearance-none rounded-full px-3 py-1.5 text-xs font-bold outline-none ${meta.color}`}
                    >
                      {repairStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-light">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-light">{r.createdBy}</td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex justify-end gap-1">
                      <IconBtn aria-label="עריכה" onClick={() => setEditing(r)}>
                        <Pencil size={16} />
                      </IconBtn>
                      <IconBtn danger aria-label="מחיקה" onClick={() => window.confirm(`למחוק תיקון #${r.repairNo}?`) && deleteRepair(r.id)}>
                        <Trash2 size={16} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-brand-50/30">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-light">
                            <Phone size={13} /> טלפונים
                          </p>
                          <div className="space-y-1 font-medium text-ink">
                            <PhoneActions phone={r.phone1} />
                            {r.phone2 && <PhoneActions phone={r.phone2} />}
                            {!r.phone1 && !r.phone2 && '—'}
                          </div>
                        </div>
                        <Detail icon={Smartphone} label="IMEI" value={r.imei || '—'} />
                        <Detail icon={Wallet} label="מקדמה" value={`₪${r.advance || 0}`} />
                        {/* Condition on arrival as stylized badges */}
                        <div>
                          <p className="mb-1 text-xs font-semibold text-ink-light">מצב בקבלה</p>
                          {conditionBadges(r.condition).length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {conditionBadges(r.condition).map((label) => (
                                <span key={label} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                  ✅ {label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink-light">ללא</span>
                          )}
                        </div>
                        {/* Device password — visual pattern grid or text code */}
                        <div>
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-light">
                            <Lock size={13} /> קוד מכשיר
                          </p>
                          {!r.deviceCode?.has ? (
                            <span className="text-ink-light">אין</span>
                          ) : r.deviceCode.type === 'pattern' ? (
                            <PatternReplay pattern={r.deviceCode.value} />
                          ) : (
                            <span className="font-mono font-semibold text-ink">{r.deviceCode.value}</span>
                          )}
                        </div>
                        <Detail
                          icon={ShieldCheck}
                          label="אחריות"
                          value={r.warranty ? `כן · ${r.warrantyImei || 'ללא IMEI'}` : 'לא'}
                        />
                        <Detail
                          label="מכשיר חלופי"
                          value={r.loanerGiven ? r.loanerModel || 'הושאל' : 'לא'}
                        />
                      </div>
                      <div className="mt-4 border-t border-black/5 pt-4">
                        <JournalLog entries={r.log} onAdd={(text) => addRepairLog(r.id, text, user?.name)} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </Table>
      )}
    </div>
  )
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-light">
        {Icon && <Icon size={13} />} {label}
      </p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  )
}
