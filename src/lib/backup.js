import { supabase } from './supabase.js'

// ---------------------------------------------------------------------------
// Backup & restore. Snapshots the admin-managed data into a dedicated `backups`
// table on the server, and restores selected collections from a chosen snapshot.
// Restore is UPSERT-only — it re-adds deleted items and overwrites changed ones,
// but never deletes data created after the backup, so a restore can't lose
// anything newer. (This matches the goal: recover things that were wiped.)
// ---------------------------------------------------------------------------

// The logical collections the admin can pick. Each maps to its raw storage.
export const COLLECTIONS = [
  { id: 'catalog', label: 'קטלוג (מוצרים וקטגוריות)' },
  { id: 'brands', label: 'מותגים' },
  { id: 'settings', label: 'הגדרות אתר (פרטים, תשלום, משלוח, פרסומות, דף ראשי)' },
  { id: 'customers', label: 'לקוחות' },
  { id: 'repairs', label: 'תיקונים' },
  { id: 'devices', label: 'מכשירים ומלאי השאלה' },
  { id: 'orders', label: 'הזמנות' },
  { id: 'inquiries', label: 'פניות' },
]

const APP_SETTINGS_KEYS = ['settings', 'payments', 'deliveries', 'orderStatuses', 'ads', 'home']
const LAB_DEVICE_KEYS = ['deviceBrands', 'deviceModels', 'loaners', 'conditions', 'repairStatuses', 'labSettings']

const stamp = () => new Date().toISOString()

async function fetchTable(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  return data || []
}
async function fetchKv(table) {
  const { data, error } = await supabase.from(table).select('key, value')
  if (error) throw error
  const out = {}
  for (const r of data || []) out[r.key] = r.value
  return out
}

// Gather a snapshot of the selected collections.
export async function gatherBackup(collections) {
  const data = {}
  const needApp = collections.includes('brands') || collections.includes('settings')
  const needLab =
    collections.includes('customers') || collections.includes('repairs') || collections.includes('devices')
  const app = needApp ? await fetchKv('app_state') : {}
  const lab = needLab ? await fetchKv('lab_state') : {}

  if (collections.includes('catalog')) {
    data.catalog = { items: await fetchTable('catalog_items'), categories: await fetchTable('catalog_categories') }
  }
  if (collections.includes('brands')) data.brands = app.brands ?? null
  if (collections.includes('settings')) {
    data.settings = {}
    for (const k of APP_SETTINGS_KEYS) if (k in app) data.settings[k] = app[k]
  }
  if (collections.includes('customers')) data.customers = lab.customers ?? null
  if (collections.includes('repairs')) data.repairs = { repairs: lab.repairs ?? null, seq: lab.seq ?? null }
  if (collections.includes('devices')) {
    data.devices = {}
    for (const k of LAB_DEVICE_KEYS) if (k in lab) data.devices[k] = lab[k]
  }
  if (collections.includes('orders')) data.orders = await fetchTable('orders')
  if (collections.includes('inquiries')) data.inquiries = await fetchTable('inquiries')
  return data
}

// Create a backup row on the server.
export async function createBackup(collections, label = '') {
  const data = await gatherBackup(collections)
  const { error } = await supabase.from('backups').insert({ label, collections, data })
  if (error) throw error
}

// List backups (lightweight — without the heavy `data` payload).
export async function listBackups() {
  const { data, error } = await supabase
    .from('backups')
    .select('id, created_at, label, collections')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getBackup(id) {
  const { data, error } = await supabase.from('backups').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function deleteBackup(id) {
  const { error } = await supabase.from('backups').delete().eq('id', id)
  if (error) throw error
}

async function upsertKv(table, key, value) {
  const { error } = await supabase.from(table).upsert({ key, value, updated_at: stamp() })
  if (error) throw error
}
async function upsertRows(table, rows) {
  if (Array.isArray(rows) && rows.length) {
    const { error } = await supabase.from(table).upsert(rows)
    if (error) throw error
  }
}

// Restore the chosen collections from a backup's `data` (upsert-only).
export async function restoreBackup(backupData, collections) {
  for (const col of collections) {
    const d = backupData?.[col]
    if (d == null) continue
    if (col === 'catalog') {
      await upsertRows('catalog_items', d.items)
      await upsertRows('catalog_categories', d.categories)
    } else if (col === 'brands') {
      await upsertKv('app_state', 'brands', d)
    } else if (col === 'settings') {
      for (const [k, v] of Object.entries(d)) await upsertKv('app_state', k, v)
    } else if (col === 'customers') {
      await upsertKv('lab_state', 'customers', d)
    } else if (col === 'repairs') {
      if (d.repairs != null) await upsertKv('lab_state', 'repairs', d.repairs)
      if (d.seq != null) await upsertKv('lab_state', 'seq', d.seq)
    } else if (col === 'devices') {
      for (const [k, v] of Object.entries(d)) await upsertKv('lab_state', k, v)
    } else if (col === 'orders') {
      await upsertRows('orders', d)
    } else if (col === 'inquiries') {
      await upsertRows('inquiries', d)
    }
  }
}

// SQL the master admin runs once to create the backups table (shown in the UI
// if the table doesn't exist yet).
export const BACKUPS_TABLE_SQL = `create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text default '',
  collections text[] default '{}',
  data jsonb not null
);
alter table public.backups enable row level security;
create policy backups_master_all on public.backups
  for all
  using  (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MASTER_ADMIN'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MASTER_ADMIN'));`

// True when the error means the `backups` table hasn't been created yet.
export const isMissingTable = (err) =>
  /relation .*backups.* does not exist|could not find the table|schema cache/i.test(err?.message || '')
