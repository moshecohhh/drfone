import { useState, useEffect, useRef } from 'react'
import {
  Star, Plus, Trash2, Loader2, AlertCircle, CheckCircle2, PauseCircle,
  PlayCircle, Smartphone, Timer, ChevronDown,
} from 'lucide-react'
import { kpAction, kpTimerStart, kpTimerList, kpTimerFinish } from '../../lib/kosherplay.js'
import { PanelHead, Field, PrimaryBtn, GhostBtn, IconBtn, inputCls } from './ui.jsx'
import KosherPlayLogo from './KosherPlayLogo.jsx'

// Temporary-action labels. The timer itself runs server-side (it does the
// immediate action now and the opposite action when it elapses), so the browser
// can be closed. t ∈ 'sub' | 'gp'.
const TARGETS = {
  sub: { label: 'מנוי — השהה עכשיו, הפעל בסיום' },
  gp: { label: 'גוגל פליי — פתח עכשיו, חסום בסיום' },
}

const readFavs = () => {
  try { return JSON.parse(localStorage.getItem('kp_favs') || '[]') } catch { return [] }
}
const two = (n) => String(n).padStart(2, '0')
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`
}

export default function KosherPlayCustomerPanel() {
  const [device, setDevice] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState('') // which action is running
  const [flash, setFlash] = useState(null) // { ok, msg }

  // Favorites ----------------------------------------------------------------
  const [favList, setFavList] = useState(readFavs)
  const [favOpen, setFavOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [fName, setFName] = useState('')
  const [fDevice, setFDevice] = useState('')
  const [fPhone, setFPhone] = useState('')
  const favBox = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (favBox.current && !favBox.current.contains(e.target)) setFavOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const persistFavs = (a) => { localStorage.setItem('kp_favs', JSON.stringify(a)); setFavList(a) }
  const pickFav = (f) => { setDevice(f.device); setPhone(f.phone); setFavOpen(false); setFlash(null) }
  const addFav = () => {
    if (!fDevice.trim() || !fPhone.trim()) return
    persistFavs([...favList, { name: fName.trim() || fDevice.trim(), device: fDevice.trim(), phone: fPhone.trim() }])
    setFName(''); setFDevice(''); setFPhone(''); setAdding(false)
  }
  const removeFav = (i) => persistFavs(favList.filter((_, idx) => idx !== i))

  // Direct actions -----------------------------------------------------------
  const run = async (action) => {
    if (!device.trim() || !phone.trim()) return setFlash({ ok: false, msg: 'יש למלא מזהה וטלפון.' })
    if (busy) return
    setBusy(action); setFlash(null)
    try {
      const r = await kpAction(device.trim(), phone.trim(), action)
      setFlash({ ok: !!r?.ok, msg: r?.msg || (r?.ok ? 'בוצע.' : 'הפעולה נכשלה.') })
    } catch {
      setFlash({ ok: false, msg: 'שגיאה בתקשורת עם המערכת. נסו שוב.' })
    } finally {
      setBusy('')
    }
  }

  // Temporary-action timers (scheduled server-side) -------------------------
  const [tType, setTType] = useState('sub')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(30)
  const [timers, setTimers] = useState([]) // active timers from the server
  const [, setTick] = useState(0) // forces the countdown to re-render each second

  const refreshTimers = async () => {
    try { const r = await kpTimerList(); setTimers(Array.isArray(r?.timers) ? r.timers : []) } catch { /* ignore */ }
  }
  // Load on mount, re-render the countdown every second, and re-sync with the
  // server periodically (so timers the server finished disappear here too).
  useEffect(() => { refreshTimers() }, [])
  useEffect(() => {
    const tickId = setInterval(() => setTick((n) => n + 1), 1000)
    const syncId = setInterval(refreshTimers, 30000)
    return () => { clearInterval(tickId); clearInterval(syncId) }
  }, [])

  const startTimer = async () => {
    if (!device.trim() || !phone.trim()) return setFlash({ ok: false, msg: 'יש למלא מזהה וטלפון.' })
    const ms = (Number(hours) * 60 + Number(minutes)) * 60000
    if (!ms) return setFlash({ ok: false, msg: 'יש להזין משך זמן.' })
    if (busy) return
    setBusy('timer'); setFlash(null)
    try {
      const r = await kpTimerStart(device.trim(), phone.trim(), tType, ms)
      setFlash({ ok: !!r?.ok, msg: `התחלת טיימר — ${r?.msg || ''}` })
      await refreshTimers()
    } catch {
      setFlash({ ok: false, msg: 'שגיאה בהתחלת הטיימר.' })
    } finally {
      setBusy('')
    }
  }
  const finishTimer = async (id) => {
    if (busy) return
    setBusy('timer:' + id); setFlash(null)
    try {
      const r = await kpTimerFinish(id)
      setFlash({ ok: !!r?.ok, msg: `סיום ידני — ${r?.msg || ''}` })
      await refreshTimers()
    } catch { setFlash({ ok: false, msg: 'שגיאה בסיום הטיימר.' }) } finally { setBusy('') }
  }

  const spin = (id) => busy === id

  return (
    <div className="mx-auto max-w-2xl">
      <PanelHead
        title="ניהול לקוח — כשר פליי"
        subtitle="הזינו מזהה מכשיר וטלפון, ובצעו פעולות מול ה-CRM. כל פעולה אורכת מספר שניות."
        action={<KosherPlayLogo size={40} />}
      />

      {/* Customer identity + favorites */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div ref={favBox} className="relative">
            <Field label="מזהה המכשיר" req>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  value={device}
                  onFocus={() => favList.length && setFavOpen(true)}
                  onChange={(e) => { setDevice(e.target.value); setFlash(null) }}
                  placeholder="מזהה המכשיר"
                  className={`${inputCls} text-left pl-9`}
                />
                {favList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFavOpen((o) => !o)}
                    aria-label="מועדפים"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-light hover:text-brand-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}
              </div>
            </Field>
            {favOpen && favList.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                {favList.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-brand-50">
                    <button type="button" onClick={() => pickFav(f)} className="min-w-0 flex-1 text-right">
                      <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                      <span className="block truncate text-xs text-ink-light" dir="ltr">{f.device} · {f.phone}</span>
                    </button>
                    <IconBtn danger onClick={() => removeFav(i)} aria-label="מחיקה"><Trash2 size={15} /></IconBtn>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Field label="טלפון" req>
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setFlash(null) }}
              placeholder="טלפון"
              className={`${inputCls} text-left`}
            />
          </Field>
        </div>

        {/* Add-favorite */}
        {adding ? (
          <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-black/15 p-3 sm:grid-cols-4">
            <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="שם" className={inputCls} />
            <input value={fDevice} onChange={(e) => setFDevice(e.target.value)} placeholder="מזהה" dir="ltr" className={`${inputCls} text-left`} />
            <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="טלפון" dir="ltr" className={`${inputCls} text-left`} />
            <div className="flex gap-2">
              <PrimaryBtn type="button" onClick={addFav} className="flex-1">שמירה</PrimaryBtn>
              <GhostBtn type="button" onClick={() => setAdding(false)}>ביטול</GhostBtn>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setFDevice(device); setFPhone(phone); setAdding(true) }}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <Star size={15} /> הוספה למועדפים
          </button>
        )}

        {/* Feedback */}
        {flash && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm font-medium ${
            flash.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {flash.ok ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            {flash.msg}
          </div>
        )}
      </div>

      {/* Direct actions */}
      <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <h3 className="mb-3 text-sm font-bold text-ink">פעולות מיידיות</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionBtn onClick={() => run('suspend')} busy={spin('suspend')} disabled={!!busy} icon={PauseCircle} tone="amber">השהיית מנוי</ActionBtn>
          <ActionBtn onClick={() => run('activate')} busy={spin('activate')} disabled={!!busy} icon={PlayCircle} tone="green">הפעלת מנוי</ActionBtn>
          <ActionBtn onClick={() => run('gp_open')} busy={spin('gp_open')} disabled={!!busy} icon={Smartphone} tone="green">פתיחת גוגל פליי (24 ש׳)</ActionBtn>
          <ActionBtn onClick={() => run('gp_block')} busy={spin('gp_block')} disabled={!!busy} icon={Smartphone} tone="amber">חסימת גוגל פליי</ActionBtn>
        </div>
        <p className="mt-3 text-xs text-ink-light">גוגל פליי זמין רק כשהמנוי פעיל.</p>
      </div>

      {/* Temporary-action timers (server-scheduled) */}
      <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink"><Timer size={16} /> פעולה זמנית</h3>
        <p className="mb-3 text-xs text-ink-light">מבצע את הפעולה מיד, ובסיום הזמן מחזיר אוטומטית — התזמון רץ בשרת, אז אפשר לסגור את הדף ולהמשיך לגלוש.</p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <select value={tType} onChange={(e) => setTType(e.target.value)} className={inputCls}>
            <option value="sub">{TARGETS.sub.label}</option>
            <option value="gp">{TARGETS.gp.label}</option>
          </select>
          <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className={`${inputCls} w-24`} placeholder="שעות" aria-label="שעות" />
          <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${inputCls} w-24`} placeholder="דקות" aria-label="דקות" />
          <PrimaryBtn type="button" onClick={startTimer} disabled={!!busy}>
            {spin('timer') ? <Loader2 size={16} className="animate-spin" /> : <Timer size={16} />} התחל
          </PrimaryBtn>
        </div>

        {/* Active timers (from the server) */}
        {timers.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-ink-light">טיימרים פעילים</p>
            {timers.map((tm) => {
              const left = tm.run_at_ms - Date.now()
              return (
                <div key={tm.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <div>
                    <p className="text-xs font-semibold text-ink-light">{TARGETS[tm.t]?.label || tm.t}</p>
                    <p className="text-xl font-extrabold tabular-nums text-brand-700" dir="ltr">{left > 0 ? fmt(left) : 'מסיים…'}</p>
                    <p className="text-xs text-ink-light" dir="ltr">{tm.device} · {tm.phone}</p>
                  </div>
                  <GhostBtn type="button" onClick={() => finishTimer(tm.id)} disabled={!!busy}>
                    {spin('timer:' + tm.id) ? <Loader2 size={16} className="animate-spin" /> : null} סיום עכשיו
                  </GhostBtn>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick, busy, disabled, icon: Icon, tone }) {
  const tones = {
    green: 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />} {children}
    </button>
  )
}
