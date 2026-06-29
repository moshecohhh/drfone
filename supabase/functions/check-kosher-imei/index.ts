// Supabase Edge Function: check-kosher-imei
// Server-side proxy that asks the ideali CRM whether an IMEI is a "kosher"
// (כשר) device. Like the other CRM features, the login credentials live ONLY in
// this function's secrets (CRM_USER / CRM_PWD) and never reach the browser — the
// storefront sends just an IMEI.
//
// Required secrets: CRM_USER, CRM_PWD
//
// Flow (mirrors the CRM's #checkKosherImeiBtn handler in auth-phone-number.js):
//   1. GET  /login                       → capture session cookies + the _token.
//   2. POST /login (form-urlencoded)     → authenticate; refresh the cookies.
//   3. POST /features/verify-kosher-check with body `phone=<imei>` (the CRM
//      names the field `phone` even though it carries the IMEI), header
//      `X-CSRF-TOKEN: <token>` + the session cookies → JSON { status, message }.
//      status === 1 means a positive ("kosher") result; `message` is the text
//      to show either way.
//
// The authenticated session + token are cached in memory and reused while the
// instance is warm; on a non-200 / non-JSON response (session expired) we
// re-login once and retry.
//
// Request:  POST { imei: "3578…" }
// Response: { ok: boolean, status: number|null, message: string|null, raw?: object }

const BASE = 'https://crm.ideali.co.il'
const UA = 'Mozilla/5.0'
const CRM_USER = Deno.env.get('CRM_USER') ?? ''
const CRM_PWD = Deno.env.get('CRM_PWD') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// In-memory authenticated session — survives while the instance is warm.
let session: { cookies: string; token: string } = { cookies: '', token: '' }

// --- cookie jar helpers ---------------------------------------------------
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

  const r1 = await fetch(`${BASE}/login`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'manual',
  })
  capture(r1, jar)
  const html = await r1.text()
  const token = html.match(/name="_token"\s+value="([^"]+)"/)?.[1] ?? ''
  if (!token) throw new Error('CSRF token not found on /login')

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

// Run the kosher IMEI check with the current cached session.
function verify(imei: string): Promise<Response> {
  return fetch(`${BASE}/features/verify-kosher-check`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': session.token,
      Accept: 'application/json',
      Cookie: session.cookies,
    },
    body: new URLSearchParams({ phone: imei }), // CRM names the IMEI field `phone`
    redirect: 'manual',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!CRM_USER || !CRM_PWD) return json({ ok: false, error: 'CRM credentials not configured' }, 500)

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const imei = String((b as Record<string, unknown>).imei ?? '').replace(/\D/g, '')
  if (!/^\d{14,17}$/.test(imei)) return json({ ok: false, error: 'invalid imei' }, 400)

  try {
    if (!session.token || !session.cookies) await login()
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await verify(imei)
      const ct = r.headers.get('content-type') ?? ''
      if (r.status === 200 && ct.includes('application/json')) {
        const data = await r.json().catch(() => null)
        return json({
          ok: data?.status === 1,
          status: data?.status ?? null,
          message: data?.message ?? null,
          raw: data,
        })
      }
      await r.body?.cancel()
      await login()
    }
    return json({ ok: false, error: 'kosher check failed' }, 502)
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})
