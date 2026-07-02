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
//   1. GET  /login                    → capture the session cookies + _token.
//   2. POST /login (form-urlencoded)  → authenticate (token,email,password,
//      remember=on); refresh the session cookies. A response that is not a
//      redirect away from /login means the login was REJECTED (bad credentials,
//      rate-limit, expired token) and we fail loudly instead of continuing with
//      an anonymous session.
//   3. GET the post-login page        → Laravel may regenerate the CSRF token
//      when the session is regenerated on login, so pick up the fresh token
//      (falling back to the pre-login one when the page has none).
//   4. POST /features/verify-phoneNumber with body `phone=…`, header
//      `X-CSRF-TOKEN: <token>` + the session cookies → JSON
//      { status, message, company_id }. `message` is the operator name.
//
// The authenticated session (cookie jar + token) is cached in memory and reused
// while the instance is warm; cookies are re-captured from every CRM response
// so Laravel's rolling session stays fresh. If a check comes back non-200 /
// non-JSON (session expired) we re-login once and retry. Failures return the
// CRM's HTTP status + a body snippet in `detail` so the admin panel can show
// the real cause instead of a generic error.
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
let session: { jar: Map<string, string>; token: string } | null = null

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

// Pull the CSRF token out of a CRM page — the hidden `_token` input in either
// attribute order, or the `csrf-token` meta tag Laravel renders on app pages.
function extractToken(html: string): string {
  return (
    html.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/)?.[1] ??
    html.match(/value=["']([^"']+)["'][^>]*name=["']_token["']/)?.[1] ??
    html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']csrf-token["']/)?.[1] ??
    ''
  )
}

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
  const preToken = extractToken(html)
  if (!preToken) {
    throw new Error(`CSRF token not found on /login (HTTP ${r1.status}) — CRM may be down or blocking this server`)
  }

  // 2. POST the credentials (form-urlencoded). Laravel answers a successful
  //    login with a redirect away from /login; anything else (200 re-rendered
  //    form, 302 back to /login, 419, 429) means we are NOT authenticated.
  const r2 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({ _token: preToken, email: CRM_USER, password: CRM_PWD, remember: 'on' }),
    redirect: 'manual',
  })
  capture(r2, jar)
  await r2.body?.cancel()
  const location = r2.headers.get('location') ?? ''
  const loggedIn = (r2.status === 301 || r2.status === 302) && !location.includes('/login')
  if (!loggedIn) {
    throw new Error(`CRM login failed (HTTP ${r2.status}${location ? ` -> ${location}` : ''}) — check CRM_USER/CRM_PWD`)
  }

  // 3. Laravel can regenerate the CSRF token together with the session on
  //    login; fetch the page we were redirected to and use its fresh token
  //    (keeping the pre-login token when none is found).
  let token = preToken
  try {
    const r3 = await fetch(new URL(location || '/', BASE).href, {
      headers: { 'User-Agent': UA, Accept: 'text/html', Cookie: cookieHeader(jar) },
      redirect: 'manual',
    })
    capture(r3, jar)
    token = extractToken(await r3.text()) || preToken
  } catch {
    /* keep the pre-login token */
  }

  session = { jar, token }
}

// Run the operator lookup with the current cached session.
function verify(phone: string): Promise<Response> {
  const s = session!
  return fetch(`${BASE}/features/verify-phoneNumber`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': s.token,
      Accept: 'application/json',
      Cookie: cookieHeader(s.jar),
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
    if (!session) await login()
    // Try with the cached session; on expiry (non-200/JSON) re-login once.
    let last = { status: 0, body: '' }
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await verify(phone)
      capture(r, session!.jar) // keep Laravel's rolling session cookies fresh
      const ct = r.headers.get('content-type') ?? ''
      if (r.status === 200 && ct.includes('application/json')) {
        const data = await r.json().catch(() => null)
        return json({
          operator: data?.message ?? null,
          company_id: data?.company_id ?? null,
          raw: data,
        })
      }
      last = { status: r.status, body: (await r.text().catch(() => '')).slice(0, 200) }
      if (attempt === 0) await login()
    }
    return json(
      { operator: null, error: 'CRM check failed', detail: `CRM answered HTTP ${last.status}: ${last.body}` },
      502,
    )
  } catch (e) {
    session = null // never keep a half-built session around after a failure
    return json({ operator: null, error: String(e) }, 500)
  }
})
