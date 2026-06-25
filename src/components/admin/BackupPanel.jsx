import { useState, useEffect, useCallback } from 'react'
import {
  DatabaseBackup, Save, RotateCcw, Trash2, Loader2, CheckCircle2, AlertTriangle, Copy, History, Check,
} from 'lucide-react'
import {
  COLLECTIONS, createBackup, listBackups, getBackup, deleteBackup, restoreBackup,
  BACKUPS_TABLE_SQL, isMissingTable,
} from '../../lib/backup.js'
import { PanelHead, Card, PrimaryBtn, GhostBtn, EmptyState } from './ui.jsx'

const fmt = (iso) =>
  new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
const labelOf = (id) => COLLECTIONS.find((c) => c.id === id)?.label || id

export default function BackupPanel() {
  const [picked, setPicked] = useState(() => new Set(COLLECTIONS.map((c) => c.id))) // for a new backup
  const [label, setLabel] = useState('')
  const [backups, setBackups] = useState([])
  const [busy, setBusy] = useState('') // '' | 'create' | 'list' | 'restore' | collectionId
  const [needsSetup, setNeedsSetup] = useState(false)
  const [toast, setToast] = useState(null) // { ok, text }
  const [restoreFor, setRestoreFor] = useState(null) // { meta, data, sel:Set }
  const [copied, setCopied] = useState(false)

  const flash = (ok, text) => {
    setToast({ ok, text })
    setTimeout(() => setToast(null), 4000)
  }

  const refresh = useCallback(async () => {
    setBusy('list')
    try {
      setBackups(await listBackups())
      setNeedsSetup(false)
    } catch (e) {
      if (isMissingTable(e)) setNeedsSetup(true)
      else flash(false, e.message)
    } finally {
      setBusy('')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = (id) =>
    setPicked((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const allPicked = picked.size === COLLECTIONS.length
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(COLLECTIONS.map((c) => c.id)))

  // Create a backup of `cols` (the multi-select set, or a single collection).
  const runBackup = async (cols, busyKey) => {
    if (!cols.length) return flash(false, 'יש לבחור לפחות פריט אחד לגיבוי.')
    setBusy(busyKey)
    try {
      await createBackup(cols, label.trim())
      setLabel('')
      flash(true, `הגיבוי נוצר (${cols.length} פריטים).`)
      await refresh()
    } catch (e) {
      if (isMissingTable(e)) setNeedsSetup(true)
      else flash(false, 'הגיבוי נכשל: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  const openRestore = async (meta) => {
    setBusy('restore')
    try {
      const full = await getBackup(meta.id)
      setRestoreFor({ meta, data: full.data, sel: new Set(meta.collections) })
    } catch (e) {
      flash(false, 'טעינת הגיבוי נכשלה: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  const doRestore = async () => {
    const cols = [...restoreFor.sel]
    if (!cols.length) return
    if (!window.confirm(`לשחזר ${cols.length} פריטים מהגיבוי מ-${fmt(restoreFor.meta.created_at)}?\nהמידע הנוכחי יוחלף בנתוני הגיבוי (פריטים חדשים יותר לא יימחקו).`)) return
    setBusy('restore')
    try {
      await restoreBackup(restoreFor.data, cols)
      setRestoreFor(null)
      flash(true, 'השחזור הושלם! טוען מחדש…')
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      flash(false, 'השחזור נכשל: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  const removeBackup = async (id) => {
    if (!window.confirm('למחוק את נקודת השחזור?')) return
    try {
      await deleteBackup(id)
      await refresh()
    } catch (e) {
      flash(false, e.message)
    }
  }

  return (
    <div>
      <PanelHead
        title="גיבוי ושחזור"
        subtitle="צרו נקודות שחזור בשרת ושחזרו נתונים לפי תאריך — קטלוג, לקוחות, תיקונים, הגדרות ועוד."
      />

      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            toast.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {toast.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} {toast.text}
        </div>
      )}

      {needsSetup ? (
        <Card>
          <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-ink">
            <AlertTriangle size={18} className="text-amber-500" /> נדרשת הגדרה חד-פעמית
          </h3>
          <p className="mb-3 text-sm text-ink-light">
            כדי לשמור גיבויים בשרת, הריצו פעם אחת את הקוד הבא ב-Supabase (SQL Editor), ואז רעננו את הדף.
          </p>
          <pre className="max-h-64 overflow-auto rounded-xl bg-ink/5 p-3 text-left text-xs leading-relaxed text-ink" dir="ltr">
            {BACKUPS_TABLE_SQL}
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(BACKUPS_TABLE_SQL)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'הועתק' : 'העתקת הקוד'}
          </button>
          <button type="button" onClick={refresh} className="mt-3 block text-sm font-semibold text-brand-600 hover:underline">
            כבר הרצתי — בדיקה מחדש
          </button>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Create a new backup */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
                <DatabaseBackup size={18} className="text-brand-500" /> יצירת גיבוי
              </h3>
              <button type="button" onClick={toggleAll} className="text-xs font-semibold text-brand-600 hover:underline">
                {allPicked ? 'ניקוי הבחירה' : 'בחירת הכל'}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {COLLECTIONS.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={picked.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 shrink-0 accent-brand-500"
                    />
                    <span className="truncate text-sm text-ink">{c.label}</span>
                  </label>
                  {/* per-collection "back up now" */}
                  <button
                    type="button"
                    onClick={() => runBackup([c.id], c.id)}
                    disabled={!!busy}
                    title="גיבוי הפריט הזה בלבד"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-light transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                  >
                    {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} גבה כעת
                  </button>
                </div>
              ))}
            </div>

            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="שם / הערה לגיבוי (אופציונלי)"
              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
            />

            <PrimaryBtn onClick={() => runBackup([...picked], 'create')} disabled={!!busy} className="mt-3">
              {busy === 'create' ? <Loader2 size={16} className="animate-spin" /> : <DatabaseBackup size={16} />}
              גיבוי הנבחרים עכשיו
            </PrimaryBtn>
          </Card>

          {/* Restore points */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-ink">
              <History size={18} className="text-brand-500" /> נקודות שחזור
            </h3>

            {busy === 'list' ? (
              <div className="flex items-center gap-2 py-6 text-sm text-ink-light">
                <Loader2 size={16} className="animate-spin" /> טוען…
              </div>
            ) : backups.length === 0 ? (
              <EmptyState icon={DatabaseBackup} title="אין גיבויים עדיין" hint="צרו את הגיבוי הראשון למעלה." />
            ) : (
              <ul className="space-y-2">
                {backups.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-bold text-ink">
                        {fmt(b.created_at)}
                        {b.label && <span className="text-xs font-medium text-ink-light">· {b.label}</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(b.collections || []).map((c) => (
                          <span key={c} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                            {labelOf(c)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <GhostBtn onClick={() => openRestore(b)} disabled={!!busy}>
                        <RotateCcw size={15} /> שחזור
                      </GhostBtn>
                      <button
                        type="button"
                        onClick={() => removeBackup(b.id)}
                        title="מחיקה"
                        className="rounded-lg p-2 text-ink-light transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Restore modal — choose what to restore FROM the chosen backup */}
      {restoreFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRestoreFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-ink">שחזור מגיבוי</h3>
            <p className="mt-1 text-sm text-ink-light">{fmt(restoreFor.meta.created_at)} — בחרו מה לשחזר:</p>

            <div className="mt-4 space-y-2">
              {restoreFor.meta.collections.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={restoreFor.sel.has(c)}
                    onChange={() =>
                      setRestoreFor((r) => {
                        const sel = new Set(r.sel)
                        sel.has(c) ? sel.delete(c) : sel.add(c)
                        return { ...r, sel }
                      })
                    }
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className="text-sm text-ink">{labelOf(c)}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <GhostBtn onClick={() => setRestoreFor(null)}>ביטול</GhostBtn>
              <PrimaryBtn onClick={doRestore} disabled={busy === 'restore' || restoreFor.sel.size === 0}>
                {busy === 'restore' ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                שחזור הנבחרים
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
