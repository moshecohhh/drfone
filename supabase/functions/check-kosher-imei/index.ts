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
//      A response that is not a redirect away from /login means the login was
//      REJECTED (bad credentials, rate-limit, expired token) and we fail loudly.
//   3. GET the post-login page           → pick up the fresh CSRF token in case
//      Laravel regenerated it on login (fall back to the pre-login token).
//   4. POST /features/verify-kosher-check with body `phone=<imei>` (the CRM
//      names the field `phone` even though it carries the IMEI), header
//      `X-CSRF-TOKEN: <token>` + the session cookies → JSON { status, message }.
//      status === 1 means a positive ("kosher") result; `message` is the text
//      to show either way.
//
// The authenticated session (cookie jar + token) is cached in memory and reused
// while the instance is warm; cookies are re-captured from every CRM response
// so Laravel's rolling session stays fresh. On a non-200 / non-JSON response
// (session expired) we re-login once and retry. Failures return the CRM's HTTP
// status + a body snippet in `detail` so the admin panel can show the cause.
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
let session: { jar: Map<string, string>; token: string } | null = null

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

// Run the kosher IMEI check with the current cached session.
function verify(imei: string): Promise<Response> {
  const s = session!
  return fetch(`${BASE}/features/verify-kosher-check`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': s.token,
      Accept: 'application/json',
      Cookie: cookieHeader(s.jar),
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
    if (!session) await login()
    let last = { status: 0, body: '' }
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await verify(imei)
      capture(r, session!.jar) // keep Laravel's rolling session cookies fresh
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
      last = { status: r.status, body: (await r.text().catch(() => '')).slice(0, 200) }
      if (attempt === 0) await login()
    }
    return json(
      { ok: false, error: 'kosher check failed', detail: `CRM answered HTTP ${last.status}: ${last.body}` },
      502,
    )
  } catch (e) {
    session = null // never keep a half-built session around after a failure
    return json({ ok: false, error: String(e) }, 500)
  }
})
