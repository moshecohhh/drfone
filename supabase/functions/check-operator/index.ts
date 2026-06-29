// Supabase Edge Function: check-operator
// Server-side proxy that asks the ideali CRM which cellular operator a phone
// number belongs to. The CRM login credentials live ONLY in this function's
// secrets (CRM_USER / CRM_PWD) and never reach the browser — the storefront
// calls this function with just a phone number and gets back the operator name.
//
// Required secrets: CRM_USER, CRM_PWD
//   supabase secrets set CRM_USER=214382566 CRM_PWD=767676
//
// Flow (mirrors the already-verified CRM API):
//   1. GET  /login                    → capture the session cookies + _token
//      (regex: name="_token" value="…").
//   2. POST /login (form-urlencoded)  → authenticate (token,email,password,
//      remember=on); refresh the session cookies.
//   3. POST /features/verify-phoneNumber with body `phone=…`, header
//      `X-CSRF-TOKEN: <token>` + the session cookies → JSON
//      { status, message, company_id }. `message` is the operator name.
//
// Optimisation: the token from /login is valid directly for the check, so we log
// in once and cache the authenticated session + token in memory (reused across
// invocations while the instance stays warm). If a check comes back non-200 /
// non-JSON (session expired) we re-login once and retry.
//
// Request:  POST { phone: "05XXXXXXXX" }  — or  GET ?phone=05XXXXXXXX
// Response: { operator: string|null, company_id?: number|null, raw?: object }

const BASE = 'https://crm.ideali.co.il'
const UA = 'Mozilla/5.0'
const CRM_USER = Deno.env.get('CRM_USER') ?? ''
const CRM_PWD = Deno.env.get('CRM_PWD') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// In-memory authenticated session — survives while the instance is warm.
let session: { cookies: string; token: string } = { cookies: '', token: '' }

// --- cookie jar helpers ---------------------------------------------------
// Merge a response's Set-Cookie headers into the jar (keyed by cookie name).
function capture(res: Response, jar: Map<string, string>) {
  const list = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
  for (const c of list) {
    const pair = c.split(';', 1)[0]
    const i = pair.indexOf('=')
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
  }
}
const cookieHeader = (jar: Map<string, string>) =>
  [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

// Authenticate against the CRM and cache the session + CSRF token.
async function login(): Promise<void> {
  const jar = new Map<string, string>()

  // 1. GET the login page → session cookie + CSRF token.
  const r1 = await fetch(`${BASE}/login`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'manual',
  })
  capture(r1, jar)
  const html = await r1.text()
  const token = html.match(/name="_token"\s+value="([^"]+)"/)?.[1] ?? ''
  if (!token) throw new Error('CSRF token not found on /login')

  // 2. POST the credentials (form-urlencoded). The response refreshes cookies.
  const r2 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({ _token: token, email: CRM_USER, password: CRM_PWD, remember: 'on' }),
    redirect: 'manual',
  })
  capture(r2, jar)

  session = { cookies: cookieHeader(jar), token }
}

// Run the operator lookup with the current cached session.
function verify(phone: string): Promise<Response> {
  return fetch(`${BASE}/features/verify-phoneNumber`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': session.token,
      Accept: 'application/json',
      Cookie: session.cookies,
    },
    body: new URLSearchParams({ phone }),
    redirect: 'manual',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!CRM_USER || !CRM_PWD) return json({ operator: null, error: 'CRM credentials not configured' }, 500)

  // Phone from the JSON body (preferred) or the ?phone= query string.
  let phone = ''
  if (req.method === 'POST') {
    const b = await req.json().catch(() => ({} as Record<string, unknown>))
    phone = String((b as Record<string, unknown>).phone ?? '').trim()
  }
  if (!phone) phone = (new URL(req.url).searchParams.get('phone') ?? '').trim()
  phone = phone.replace(/\D/g, '') // digits only
  if (!/^0\d{8,9}$/.test(phone)) return json({ operator: null, error: 'invalid phone' }, 400)

  try {
    if (!session.token || !session.cookies) await login()
    // Try with the cached session; on expiry (non-200/JSON) re-login once.
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await verify(phone)
      const ct = r.headers.get('content-type') ?? ''
      if (r.status === 200 && ct.includes('application/json')) {
        const data = await r.json().catch(() => null)
        return json({
          operator: data?.message ?? null,
          company_id: data?.company_id ?? null,
          raw: data,
        })
      }
      await r.body?.cancel()
      await login()
    }
    return json({ operator: null, error: 'CRM check failed' }, 502)
  } catch (e) {
    return json({ operator: null, error: String(e) }, 500)
  }
})
