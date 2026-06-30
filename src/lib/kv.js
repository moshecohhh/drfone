import { supabase } from './supabase.js'

// Tiny key/value persistence over a Supabase table shaped { key, value(jsonb),
// updated_at }. Used to migrate the app's localStorage "blob" collections to a
// shared backend with minimal change to the contexts that own them.

// Load every key -> value for a table into a plain object.
export async function kvLoadAll(table) {
  const { data, error } = await supabase.from(table).select('key, value')
  if (error || !data) return {}
  const out = {}
  for (const row of data) out[row.key] = row.value
  return out
}

// Load a single key's value (null if missing / unreadable).
export async function kvLoad(table, key) {
  const { data, error } = await supabase.from(table).select('value').eq('key', key).maybeSingle()
  if (error) return null
  return data?.value ?? null
}

// Upsert one key. Fire-and-forget; logs (but never throws) on failure so a
// blocked write (e.g. a non-admin) can't crash the app.
export function kvSave(table, key, value) {
  return supabase
    .from(table)
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.warn(`[kv] save ${table}/${key} failed:`, error.message)
    })
}
