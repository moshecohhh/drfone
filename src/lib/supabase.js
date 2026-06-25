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

// "Remember me" storage. When the flag is on (default) the session is kept in
// localStorage so the user stays logged in across browser restarts; when off it
// lives in sessionStorage and clears when the tab/browser closes. The auth UI
// sets `drfone_remember` *before* the sign-in/up call, so tokens land in the
// right place. Reads prefer whichever store currently holds the session.
const REMEMBER_KEY = 'drfone_remember'
const rememberStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      const remember = localStorage.getItem(REMEMBER_KEY) !== 'false'
      if (remember) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key)
      }
    } catch {
      /* storage unavailable — ignore */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Persist the session (localStorage or sessionStorage per "remember me") and
    // refresh tokens automatically so users stay logged in across reloads.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: rememberStorage,
  },
})
