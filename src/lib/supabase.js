import { createClient } from '@supabase/supabase-js'

// Single shared Supabase client for the whole app.
//
// Prefer `.env` (VITE_-prefixed) but fall back to the project's PUBLIC values so
// a deploy works even without env config. These two values are public by design
// — they ship in the browser bundle and the publishable key only grants what
// Row Level Security allows. The secret/service_role key must NEVER appear here.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ticfdidkigskxnpycvzd.supabase.co'
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_miG44mm-4i_SLMK30O7yuw_D8t8MIQT'

export const supabase = createClient(url, anonKey, {
  auth: {
    // Persist the session in localStorage and refresh tokens automatically so
    // users stay logged in across reloads.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
