// Supabase Edge Function: kosherplay
// Thin proxy between the browser and the external KosherPlay Selenium service.
// The browser calls this with `supabase.functions.invoke('kosherplay', …)`; the
// service URL and the shared secret stay in this function's secrets and never
// reach the browser — matching the other CRM features' security model.
//
// Required secrets: KP_SERVICE_URL (e.g. https://kosherplay-xxxx.onrender.com)
//                   KP_SHARED_SECRET (same value as the service's env)
//
// Request body: { op, ... }
//   { op: 'action', device, phone, action }  action ∈ suspend|activate|gp_open|gp_block
//   { op: 'code', type }                     type ∈ free|chrome|magen|pc|combined
//   { op: 'balance' }
// Response: passed through from the service.

const SERVICE_URL = (Deno.env.get('KP_SERVICE_URL') ?? '').replace(/\/$/, '')
const SECRET = Deno.env.get('KP_SHARED_SECRET') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Forward a request to the Selenium service with the shared-secret header and a
// generous timeout (CRM operations take several seconds via Selenium).
async function forward(path: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 150_000)
  try {
    const res = await fetch(`${SERVICE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { ...(init.headers ?? {}), 'X-KP-Secret': SECRET },
    })
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } finally {
    clearTimeout(timer)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!SERVICE_URL) return json({ ok: false, msg: 'KosherPlay service not configured' }, 500)

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const op = String((b as Record<string, unknown>).op ?? '')

  try {
    if (op === 'action') {
      const { device, phone, action } = b as Record<string, unknown>
      return await forward('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, phone, action }),
      })
    }
    if (op === 'code') {
      const type = encodeURIComponent(String((b as Record<string, unknown>).type ?? ''))
      return await forward(`/api/code?type=${type}`)
    }
    if (op === 'balance') {
      return await forward('/api/balance')
    }
    return json({ ok: false, msg: 'unknown op' }, 400)
  } catch (e) {
    return json({ ok: false, msg: `proxy error: ${String(e)}` }, 502)
  }
})
