import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  SEED_DEVICE_BRANDS,
  SEED_DEVICE_MODELS,
  SEED_LOANERS,
  SEED_CUSTOMERS,
  SEED_CONDITION_OPTIONS,
  REPAIR_STATUSES,
} from '../data/repairMeta.js'
import { kvLoadAll, kvSave } from '../lib/kv.js'
import { useAuth } from './AuthContext.jsx'

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// ---------------------------------------------------------------------------
// Lab CRM/ERP state: customers, device registry (brands + models), loaner
// phones, and repair tickets — backed by Supabase (lab_state kv table). This is
// back-office data: master admin OR lab staff only (read AND write, via RLS).
// Same synchronous API as before — mutations update local state, and a guarded
// effect persists each collection to Supabase.
// ---------------------------------------------------------------------------

const LAB_SETTING_SECTIONS = ['customer', 'device', 'code', 'payment']
const SECTION_FIELD_TYPE = { customer: 'text', device: 'text', code: 'text', payment: 'number' }
const EMPTY_LAB_SETTINGS = { customer: [], device: [], code: [], payment: [] }

const LabContext = createContext(null)

export function LabProvider({ children }) {
  const { isMaster, isStaff } = useAuth()
  const canWrite = isMaster || isStaff

  const [customers, setCustomers] = useState(SEED_CUSTOMERS)
  const [brands, setBrands] = useState(SEED_DEVICE_BRANDS)
  const [models, setModels] = useState(SEED_DEVICE_MODELS)
  const [loaners, setLoaners] = useState(SEED_LOANERS)
  const [repairs, setRepairs] = useState([])
  const [seq, setSeq] = useState(1000)
  const [conditionOptions, setConditionOptions] = useState(SEED_CONDITION_OPTIONS)
  const [repairStatuses, setRepairStatuses] = useState(REPAIR_STATUSES)
  const [labSettings, setLabSettings] = useState(EMPTY_LAB_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load all lab collections from Supabase (falls back to seeds until saved).
  useEffect(() => {
    let active = true
    kvLoadAll('lab_state').then((m) => {
      if (!active) return
      if (Array.isArray(m.customers)) setCustomers(m.customers)
      if (Array.isArray(m.deviceBrands)) setBrands(m.deviceBrands)
      if (Array.isArray(m.deviceModels)) setModels(m.deviceModels)
      if (Array.isArray(m.loaners)) setLoaners(m.loaners)
      if (Array.isArray(m.repairs)) setRepairs(m.repairs)
      if (typeof m.seq === 'number') setSeq(m.seq)
      if (Array.isArray(m.conditions)) setConditionOptions(m.conditions)
      if (Array.isArray(m.repairStatuses)) setRepairStatuses(m.repairStatuses)
      if (m.labSettings) setLabSettings({ ...EMPTY_LAB_SETTINGS, ...m.labSettings })
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  // Persist each collection — only staff/admin write (RLS). Also seeds on first
  // load. (`seq` rides along with `repairs` since they change together.)
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'customers', customers) }, [customers, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'deviceBrands', brands) }, [brands, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'deviceModels', models) }, [models, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'loaners', loaners) }, [loaners, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'repairs', repairs) }, [repairs, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'seq', seq) }, [seq, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'conditions', conditionOptions) }, [conditionOptions, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'repairStatuses', repairStatuses) }, [repairStatuses, loaded, canWrite])
  useEffect(() => { if (loaded && canWrite) kvSave('lab_state', 'labSettings', labSettings) }, [labSettings, loaded, canWrite])

  // ---- Customers (CRM) ----
  const addCustomer = useCallback((data) => {
    const customer = { id: `cust-${Date.now()}`, createdAt: new Date().toISOString(), ...data }
    setCustomers((prev) => [customer, ...prev])
    return customer
  }, [])
  const updateCustomer = useCallback((id, patch) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])
  const deleteCustomer = useCallback((id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // ---- Device registry ----
  const addBrand = useCallback((label) => {
    const clean = label.trim()
    if (!clean) return null
    const brand = { id: `brand-${Date.now()}`, label: clean }
    setBrands((prev) => [...prev, brand])
    return brand
  }, [])
  const addModel = useCallback((brandId, label) => {
    const clean = label.trim()
    if (!clean || !brandId) return null
    const model = { id: `model-${Date.now()}`, brandId, label: clean }
    setModels((prev) => [...prev, model])
    return model
  }, [])
  const updateBrand = useCallback((id, label) => {
    if (!label.trim()) return
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, label: label.trim() } : b)))
  }, [])
  const updateModel = useCallback((id, label) => {
    if (!label.trim()) return
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, label: label.trim() } : m)))
  }, [])
  const deleteBrand = useCallback((id) => {
    setBrands((prev) => prev.filter((b) => b.id !== id))
    setModels((prev) => prev.filter((m) => m.brandId !== id))
  }, [])
  const deleteModel = useCallback((id) => {
    setModels((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ---- Condition-on-arrival options (customizable) ----
  const addConditionOption = useCallback((label) => {
    const clean = label.trim()
    if (!clean) return
    setConditionOptions((prev) => [...prev, { id: `cond-${Date.now()}`, label: clean }])
  }, [])
  const updateConditionOption = useCallback((id, label) => {
    if (!label.trim()) return
    setConditionOptions((prev) => prev.map((c) => (c.id === id ? { ...c, label: label.trim() } : c)))
  }, [])
  const deleteConditionOption = useCallback((id) => {
    setConditionOptions((prev) => prev.filter((c) => c.id !== id))
  }, [])
  const toggleConditionRequired = useCallback((id) => {
    setConditionOptions((prev) => prev.map((c) => (c.id === id ? { ...c, required: !c.required } : c)))
  }, [])

  // ---- Repair statuses (customizable) ----
  const addRepairStatus = useCallback((label) => {
    if (!label.trim()) return
    setRepairStatuses((prev) => [...prev, { id: uid('rstat'), label: label.trim(), color: 'bg-slate-100 text-slate-700' }])
  }, [])
  const updateRepairStatus_ = useCallback((id, label) => {
    if (!label.trim()) return
    setRepairStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, label: label.trim() } : s)))
  }, [])
  const deleteRepairStatus = useCallback((id) => {
    setRepairStatuses((prev) => prev.filter((s) => s.id !== id))
  }, [])
  const repairStatusMeta = useCallback(
    (id) => repairStatuses.find((s) => s.id === id) || repairStatuses[0] || { label: id, color: 'bg-black/10 text-ink' },
    [repairStatuses],
  )

  // ---- Lab settings: custom fields per repair-form section ----
  const addLabField = useCallback((section, label) => {
    if (!LAB_SETTING_SECTIONS.includes(section) || !label.trim()) return
    setLabSettings((prev) => ({
      ...prev,
      [section]: [
        ...prev[section],
        { id: uid('fld'), label: label.trim(), required: false, type: SECTION_FIELD_TYPE[section] || 'text' },
      ],
    }))
  }, [])
  const updateLabField = useCallback((section, id, label) => {
    if (!label.trim()) return
    setLabSettings((prev) => ({
      ...prev,
      [section]: prev[section].map((f) => (f.id === id ? { ...f, label: label.trim() } : f)),
    }))
  }, [])
  const deleteLabField = useCallback((section, id) => {
    setLabSettings((prev) => ({ ...prev, [section]: prev[section].filter((f) => f.id !== id) }))
  }, [])
  const toggleLabFieldRequired = useCallback((section, id) => {
    setLabSettings((prev) => ({
      ...prev,
      [section]: prev[section].map((f) => (f.id === id ? { ...f, required: !f.required } : f)),
    }))
  }, [])
  const requiredLabFields = useCallback(
    () => LAB_SETTING_SECTIONS.flatMap((s) => labSettings[s].filter((f) => f.required)),
    [labSettings],
  )
  const modelsForBrand = useCallback(
    (brandId) => models.filter((m) => m.brandId === brandId),
    [models],
  )

  // ---- Loaner phones ----
  const addLoaner = useCallback((data) => {
    setLoaners((prev) => [
      { id: `loaner-${Date.now()}`, status: 'available', assignedRepairId: null, ...data },
      ...prev,
    ])
  }, [])
  const updateLoaner = useCallback((id, patch) => {
    setLoaners((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }, [])
  const deleteLoaner = useCallback((id) => {
    setLoaners((prev) => prev.filter((l) => l.id !== id))
  }, [])

  // ---- Repairs ----
  const addRepair = useCallback(
    (data) => {
      const repairNo = seq + 1
      setSeq(repairNo)
      const repair = {
        id: `rep-${Date.now()}`,
        repairNo,
        status: repairStatuses[0]?.id || 'waiting-check',
        createdAt: new Date().toISOString(),
        ...data,
      }
      setRepairs((prev) => [repair, ...prev])
      if (data.loanerGiven && data.loanerId) {
        setLoaners((prev) =>
          prev.map((l) =>
            l.id === data.loanerId
              ? { ...l, status: 'assigned', assignedRepairId: repair.id }
              : l,
          ),
        )
      }
      return repair
    },
    [seq, repairStatuses],
  )
  const updateRepairStatus = useCallback((id, status) => {
    setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }, [])

  const addRepairLog = useCallback((id, text, author) => {
    if (!text.trim()) return
    const entry = { id: `log-${Date.now()}`, text: text.trim(), at: new Date().toISOString(), author }
    setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, log: [...(r.log || []), entry] } : r)))
  }, [])

  const updateRepair = useCallback((id, data) => {
    setRepairs((prev) => {
      const old = prev.find((r) => r.id === id)
      if (!old) return prev
      const newLoanerId = data.loanerGiven ? data.loanerId : null
      if ((old.loanerId || null) !== (newLoanerId || null)) {
        setLoaners((ls) =>
          ls.map((l) => {
            if (l.id === old.loanerId) return { ...l, status: 'available', assignedRepairId: null }
            if (l.id === newLoanerId) return { ...l, status: 'assigned', assignedRepairId: id }
            return l
          }),
        )
      }
      return prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    })
  }, [])
  const deleteRepair = useCallback((id) => {
    setRepairs((prev) => {
      const target = prev.find((r) => r.id === id)
      if (target?.loanerId) {
        setLoaners((ls) =>
          ls.map((l) =>
            l.id === target.loanerId ? { ...l, status: 'available', assignedRepairId: null } : l,
          ),
        )
      }
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const value = {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    brands,
    models,
    modelsForBrand,
    addBrand,
    addModel,
    updateBrand,
    updateModel,
    deleteBrand,
    deleteModel,
    conditionOptions,
    addConditionOption,
    updateConditionOption,
    deleteConditionOption,
    toggleConditionRequired,
    repairStatuses,
    addRepairStatus,
    updateRepairStatusLabel: updateRepairStatus_,
    deleteRepairStatus,
    repairStatusMeta,
    labSettings,
    addLabField,
    updateLabField,
    deleteLabField,
    toggleLabFieldRequired,
    requiredLabFields,
    loaners,
    addLoaner,
    updateLoaner,
    deleteLoaner,
    updateRepair,
    repairs,
    addRepair,
    updateRepairStatus,
    addRepairLog,
    deleteRepair,
  }

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>
}

export function useLab() {
  const ctx = useContext(LabContext)
  if (!ctx) throw new Error('useLab must be used within a <LabProvider>')
  return ctx
}
