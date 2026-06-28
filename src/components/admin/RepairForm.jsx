import { useState, useMemo } from 'react'
import {
  Check, ArrowRight, User, Smartphone, ClipboardList, Wallet, ShieldCheck, Lock, AlertCircle,
} from 'lucide-react'
import { useLab } from '../../context/LabContext.jsx'
import { useAuth, ROLES } from '../../context/AuthContext.jsx'
import { Card, Field, PrimaryBtn, GhostBtn, inputCls } from './ui.jsx'
import PatternLock from './PatternLock.jsx'
import ComboBox from './ComboBox.jsx'
import BrandLogo from './BrandLogo.jsx'
import { sanitizePhone, isValidPhone } from '../../utils/validation.js'

const emptyCustomer = { name: '', address: '', phone1: '', phone2: '' }

// Inline repair-ticket form. Creates a new ticket, or edits `repair` when given.
export default function RepairForm({ repair, onDone }) {
  const isEdit = !!repair
  const lab = useLab()
  const { user, isMasterAdminAccount, users } = useAuth()
  const bypass = isMasterAdminAccount // master admin skips all validation
  // Customers who registered on the site (selectable here too, alongside the
  // lab's own customer list).
  const registered = (users || []).filter((u) => u.role === ROLES.CUSTOMER)
  const {
    customers, brands, models, modelsForBrand, loaners, conditionOptions, labSettings,
    addBrand, addModel, addCustomer, addRepair, updateRepair,
  } = lab

  // Customer
  const [customerId, setCustomerId] = useState(repair?.customerId || '')
  const [selValue, setSelValue] = useState(repair?.customerId || '') // picker value (lab id or reg:<id>)
  const [cust, setCust] = useState(
    repair
      ? { name: repair.customerName || '', address: repair.address || '', phone1: repair.phone1 || '', phone2: repair.phone2 || '' }
      : emptyCustomer,
  )

  // Device — brand & model are free-text with autocomplete (auto-saved on submit)
  const [brandText, setBrandText] = useState(
    repair ? brands.find((b) => b.id === repair.brandId)?.label || repair.brandLabel || '' : '',
  )
  const [modelText, setModelText] = useState(
    repair ? models.find((m) => m.id === repair.modelId)?.label || repair.modelLabel || '' : '',
  )
  const [imei, setImei] = useState(repair?.imei || '')

  // Device password / pattern
  const [hasCode, setHasCode] = useState(repair ? (repair.deviceCode?.has ? 'yes' : 'no') : '')
  const [codeType, setCodeType] = useState(repair?.deviceCode?.type || 'text')
  const [codeText, setCodeText] = useState(repair?.deviceCode?.type === 'text' ? repair.deviceCode.value : '')
  const [codePattern, setCodePattern] = useState(repair?.deviceCode?.type === 'pattern' ? repair.deviceCode.value : '')

  // Custom fields defined in Lab Settings (keyed by field id).
  const [custom, setCustom] = useState(repair?.custom || {})
  const setCustomField = (id, v) => setCustom((c) => ({ ...c, [id]: v }))
  const renderCustomFields = (section) =>
    labSettings[section].map((f) => (
      <Field key={f.id} label={f.label} req={f.required}>
        <input
          className={inputCls}
          type={f.type === 'number' ? 'number' : 'text'}
          value={custom[f.id] || ''}
          onChange={(e) => setCustomField(f.id, e.target.value)}
        />
      </Field>
    ))

  // Condition / financial / warranty / loaner
  const [condition, setCondition] = useState(repair?.condition || {})
  const [advance, setAdvance] = useState(repair?.advance ? String(repair.advance) : '')
  const [warranty, setWarranty] = useState(repair?.warranty || false)
  const [warrantyImei, setWarrantyImei] = useState(repair?.warrantyImei || '')
  const [loanerGiven, setLoanerGiven] = useState(repair?.loanerGiven || false)
  const [loanerId, setLoanerId] = useState(repair?.loanerId || '')

  const [error, setError] = useState('')

  // Model suggestions filter by the typed brand when it matches a known brand.
  const matchedBrand = brands.find((b) => b.label.toLowerCase() === brandText.trim().toLowerCase())
  const modelSuggestions = matchedBrand ? modelsForBrand(matchedBrand.id) : models

  const loanerOptions = useMemo(() => {
    const opts = loaners.filter((l) => l.status === 'available')
    if (repair?.loanerId) {
      const cur = loaners.find((l) => l.id === repair.loanerId)
      if (cur && !opts.some((o) => o.id === cur.id)) opts.push(cur)
    }
    return opts
  }, [loaners, repair])

  // Build a readable address string from a registered profile's saved address.
  const profileAddress = (u) => {
    const a = Array.isArray(u.addresses) && u.addresses[0]
    if (a) return `${a.street || ''} ${a.house || ''}${a.apartment ? ', ' + a.apartment : ''}, ${a.city || ''}`.trim()
    return u.address || ''
  }
  const onPickCustomer = (val) => {
    setSelValue(val)
    // A registered site customer → fill the fields; a lab customer is created
    // (or matched) on save, like a manually-typed customer.
    if (val.startsWith('reg:')) {
      const u = registered.find((x) => x.id === val.slice(4))
      setCustomerId('')
      setCust(u ? { name: u.name || '', address: profileAddress(u), phone1: u.phone || '', phone2: '' } : emptyCustomer)
      return
    }
    setCustomerId(val)
    const c = customers.find((x) => x.id === val)
    setCust(c ? { name: c.name, address: c.address || '', phone1: c.phone1 || '', phone2: c.phone2 || '' } : emptyCustomer)
  }
  const setC = (k, v) => {
    const val = k === 'phone1' || k === 'phone2' ? sanitizePhone(v, bypass) : v
    setCust((c) => ({ ...c, [k]: val }))
    setCustomerId('')
    setSelValue('')
  }

  const toggleCond = (k) => setCondition((c) => ({ ...c, [k]: !c[k] }))

  const submit = (e) => {
    e.preventDefault()
    // ---- Validation (skipped entirely for the master admin account) ----
    if (!bypass) {
      if (!cust.name.trim()) return setError('שם הלקוח הוא שדה חובה.')
      if (!isValidPhone(cust.phone1)) return setError('טלפון 1 חייב להכיל בדיוק 10 ספרות.')
      if (cust.phone2 && !isValidPhone(cust.phone2)) return setError('טלפון 2 חייב להכיל בדיוק 10 ספרות.')
      if (hasCode === '') return setError('יש לבחור האם יש קוד למכשיר.')
      if (hasCode === 'yes') {
        if (codeType === 'text' && !codeText.trim()) return setError('יש להזין קוד טקסט.')
        if (codeType === 'pattern') {
          const dots = codePattern ? codePattern.split('-').filter(Boolean).length : 0
          if (dots < 4) return setError('קוד דפוס חייב לכלול לפחות 4 נקודות.')
        }
      }
      // Custom "required" condition options must be checked.
      const missingReq = conditionOptions.filter((o) => o.required && !condition[o.id])
      if (missingReq.length) {
        return setError(`יש לסמן שדות חובה: ${missingReq.map((o) => o.label).join(', ')}`)
      }
      // Required custom fields (Lab Settings) must be filled.
      for (const section of ['customer', 'device', 'code', 'payment']) {
        const miss = labSettings[section].find((f) => f.required && !String(custom[f.id] ?? '').trim())
        if (miss) return setError(`שדה חובה: ${miss.label}`)
      }
    }
    setError('')

    // Resolve customer (existing or auto-create).
    let cid = customerId
    const cname = cust.name.trim()
    if (!cid && cname) {
      const created = addCustomer({ name: cname, address: cust.address, phone1: cust.phone1, phone2: cust.phone2 })
      cid = created.id
    }

    // Resolve / auto-register brand & model into the global registry.
    const bLabel = brandText.trim()
    const mLabel = modelText.trim()
    let brandObj = brands.find((b) => b.label.toLowerCase() === bLabel.toLowerCase())
    if (!brandObj && bLabel) brandObj = addBrand(bLabel)
    let modelObj = brandObj
      ? modelsForBrand(brandObj.id).find((m) => m.label.toLowerCase() === mLabel.toLowerCase())
      : null
    if (!modelObj && mLabel && brandObj) modelObj = addModel(brandObj.id, mLabel)

    const loaner = loanerOptions.find((l) => l.id === loanerId)

    const deviceCode =
      hasCode === 'yes'
        ? { has: true, type: codeType, value: codeType === 'text' ? codeText : codePattern }
        : { has: false, type: null, value: '' }

    const payload = {
      customerId: cid,
      customerName: cname,
      address: cust.address,
      phone1: cust.phone1,
      phone2: cust.phone2,
      brandId: brandObj?.id || '',
      modelId: modelObj?.id || '',
      brandLabel: bLabel,
      modelLabel: mLabel,
      device: [bLabel, mLabel].filter(Boolean).join(' ') || '—',
      imei,
      deviceCode,
      condition,
      custom,
      advance: Number(advance) || 0,
      warranty,
      warrantyImei: warranty ? warrantyImei : '',
      loanerGiven,
      loanerId: loanerGiven ? loanerId : null,
      loanerModel: loanerGiven ? loaner?.model || '' : '',
    }

    if (isEdit) updateRepair(repair.id, payload)
    else addRepair({ ...payload, createdBy: user?.name || 'מנהל', createdById: user?.id || null })
    onDone()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-ink">
          {isEdit ? `עריכת תיקון #${repair.repairNo}` : 'טופס פתיחת תיקון'}
        </h2>
        <GhostBtn onClick={onDone}>
          <ArrowRight size={16} /> חזרה לרשימה
        </GhostBtn>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        {/* A. Customer */}
        <Card>
          <SectionTitle icon={User} title="פרטי לקוח" />
          <Field label="בחירת לקוח קיים">
            <select className={inputCls} value={selValue} onChange={(e) => onPickCustomer(e.target.value)}>
              <option value="">— לקוח חדש / בחר מהרשימה —</option>
              {customers.length > 0 && (
                <optgroup label="לקוחות מעבדה">
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {c.phone1}</option>
                  ))}
                </optgroup>
              )}
              {registered.length > 0 && (
                <optgroup label="לקוחות רשומים באתר">
                  {registered.map((u) => (
                    <option key={u.id} value={`reg:${u.id}`}>{u.name} · {u.phone || u.email}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="שם מלא" req>
              <input className={inputCls} value={cust.name} onChange={(e) => setC('name', e.target.value)} />
            </Field>
            <Field label="כתובת">
              <input className={inputCls} value={cust.address} onChange={(e) => setC('address', e.target.value)} />
            </Field>
            <Field label="טלפון 1" req>
              <input className={inputCls} dir="ltr" inputMode="numeric" value={cust.phone1} onChange={(e) => setC('phone1', e.target.value)} placeholder="0500000000" />
            </Field>
            <Field label="טלפון 2">
              <input className={inputCls} dir="ltr" inputMode="numeric" value={cust.phone2} onChange={(e) => setC('phone2', e.target.value)} placeholder="0500000000" />
            </Field>
            {renderCustomFields('customer')}
          </div>
        </Card>

        {/* B. Device */}
        <Card>
          <SectionTitle icon={Smartphone} title="פרטי המכשיר" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="מותג" hint="בחר מהרשימה או הקלד מותג חדש">
              <ComboBox
                value={brandText}
                onChange={setBrandText}
                options={brands.map((b) => ({ value: b.id, label: b.label }))}
                placeholder="לדוגמה: Samsung"
                renderIcon={(o) => <BrandLogo brand={o.label} size={20} />}
              />
            </Field>
            <Field label="דגם" hint="בחר מהרשימה או הקלד דגם חדש">
              <ComboBox
                value={modelText}
                onChange={setModelText}
                options={modelSuggestions.map((m) => ({ value: m.id, label: m.label }))}
                placeholder="לדוגמה: Galaxy S22"
                disabled={false}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="מספר סידורי (IMEI)">
                <input className={inputCls} dir="ltr" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="••••••••••••••" />
              </Field>
            </div>
            {renderCustomFields('device')}
          </div>
        </Card>

        {/* B2. Device password / pattern */}
        <Card>
          <SectionTitle icon={Lock} title="קוד מכשיר" />
          <Field label="האם יש קוד למכשיר?" req>
            <div className="flex gap-3">
              <Segment active={hasCode === 'yes'} onClick={() => setHasCode('yes')}>כן</Segment>
              <Segment active={hasCode === 'no'} onClick={() => setHasCode('no')}>לא</Segment>
            </div>
          </Field>

          {hasCode === 'yes' && (
            <div className="mt-4 space-y-4">
              <div className="inline-flex rounded-full bg-black/5 p-1">
                <TypeTab active={codeType === 'text'} onClick={() => setCodeType('text')}>קוד טקסט</TypeTab>
                <TypeTab active={codeType === 'pattern'} onClick={() => setCodeType('pattern')}>קוד דפוס</TypeTab>
              </div>

              {codeType === 'text' ? (
                <Field label="קוד המכשיר">
                  <input className={inputCls} value={codeText} onChange={(e) => setCodeText(e.target.value)} placeholder="הזן קוד / סיסמה" />
                </Field>
              ) : (
                <div>
                  <span className="mb-2 block text-xs font-semibold text-ink-light">שרטט את התבנית (לפחות 4 נקודות)</span>
                  <PatternLock value={codePattern} onChange={setCodePattern} />
                </div>
              )}
            </div>
          )}
          {labSettings.code.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{renderCustomFields('code')}</div>
          )}
        </Card>

        {/* C. Condition on arrival */}
        <Card>
          <SectionTitle icon={ClipboardList} title="מצב בקבלה" />
          {conditionOptions.length === 0 ? (
            <p className="text-sm text-ink-light">לא הוגדרו אפשרויות. ניתן להוסיף בהגדרות.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {conditionOptions.map((opt) => (
                <CheckPill
                  key={opt.id}
                  label={opt.required ? <>{opt.label} <span className="text-red-500">*</span></> : opt.label}
                  checked={!!condition[opt.id]}
                  onChange={() => toggleCond(opt.id)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* D + E. Financials & Warranty */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <SectionTitle icon={Wallet} title="תשלום" />
            <div className="space-y-4">
              <Field label="תשלום מקדמה (₪)">
                <input className={inputCls} type="number" min="0" value={advance} onChange={(e) => setAdvance(e.target.value)} />
              </Field>
              {renderCustomFields('payment')}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={ShieldCheck} title="אחריות ומכשיר חלופי" />
            <div className="space-y-3">
              <CheckPill label="תיקון באחריות" checked={warranty} onChange={() => setWarranty((v) => !v)} block />
              {warranty && (
                <Field label="IMEI של מכשיר באחריות">
                  <input className={inputCls} dir="ltr" value={warrantyImei} onChange={(e) => setWarrantyImei(e.target.value)} />
                </Field>
              )}
              <CheckPill label="לקוח קיבל מכשיר חלופי" checked={loanerGiven} onChange={() => setLoanerGiven((v) => !v)} block />
              {loanerGiven && (
                <Field label="בחירת מכשיר חלופי" hint={loanerOptions.length === 0 ? 'אין מכשירים חלופיים זמינים' : undefined}>
                  <select className={inputCls} value={loanerId} onChange={(e) => setLoanerId(e.target.value)}>
                    <option value="">בחר מכשיר זמין</option>
                    {loanerOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.model} {l.imei ? `· ${l.imei}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <GhostBtn type="button" onClick={onDone}>ביטול</GhostBtn>
          <PrimaryBtn type="submit">
            <Check size={16} /> {isEdit ? 'שמירת שינויים' : 'פתיחת תיקון'}
          </PrimaryBtn>
        </div>
      </form>
    </div>
  )
}

// ---- small building blocks ----

function SectionTitle({ icon: Icon, title }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold text-ink">
      <Icon size={18} className="text-brand-500" /> {title}
    </h3>
  )
}

function Segment({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[80px] rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink hover:border-brand-300'
      }`}
    >
      {children}
    </button>
  )
}

function TypeTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-light hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function CheckPill({ label, checked, onChange, block }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        block ? 'w-full' : ''
      } ${checked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink hover:border-brand-300'}`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand-500" />
      {label}
    </label>
  )
}
