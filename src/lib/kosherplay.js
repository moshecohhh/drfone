// Thin client for the KosherPlay tools. Everything goes through the `kosherplay`
// edge function (which proxies to the Selenium service); the browser never talks
// to the CRM or the service directly.
import { supabase } from './supabase.js'

async function call(body) {
  const { data, error } = await supabase.functions.invoke('kosherplay', { body })
  if (error) throw error
  return data
}

// action ∈ 'suspend' | 'activate' | 'gp_open' | 'gp_block'
export const kpAction = (device, phone, action) => call({ op: 'action', device, phone, action })
// type ∈ 'free' | 'chrome' | 'magen' | 'pc' | 'combined'
export const kpCode = (type) => call({ op: 'code', type })
export const kpBalance = () => call({ op: 'balance' })
