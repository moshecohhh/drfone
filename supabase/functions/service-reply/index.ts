// Supabase Edge Function: service-reply
// Sends the ticket-conversation emails in BOTH directions, resolving the
// recipient server-side from the inquiry row (so the client can't address mail
// to an arbitrary email — no open relay):
//   direction 'to-customer' (admin reply)  → emails the ticket's customer.
//                                              Caller must be the master admin.
//   direction 'to-admin'    (customer note) → emails the shop's address.
//                                              Caller must own the inquiry.
//
// Required secrets: RESEND_API_KEY
// Optional: NOTIFY_FROM, NOTIFY_TO, SITE_URL
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? 'ד״ר פון <orders@drfone.co.il>'
const NOTIFY_TO = Deno.env.get('NOTIFY_TO') ?? 'drfone4949@gmail.com'
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://drfone.co.il').replace(/\/$/, '')
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const BRAND = '#108c8b'
const BIZ_NAME = 'ד״ר פון'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const looksLikeEmail = (s: unknown) => typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

async function getCallerId(token: string): Promise<string | null> {
  if (!token || !SUPABASE_URL || !SERVICE_KEY) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY } })
    if (!r.ok) return null
    const u = await r.json()
    return u?.id || null
  } catch { return null }
}
async function getRole(userId: string): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } })
    const rows = await r.json().catch(() => [])
    return Array.isArray(rows) ? rows[0]?.role ?? null : null
  } catch { return null }
}
async function getInquiry(id: string): Promise<{ user_id: string | null; data: Record<string, unknown> } | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}&select=user_id,data`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } })
    const rows = await r.json().catch(() => [])
    return Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch { return null }
}

const shell = (headTitle: string, headSub: string, inner: string) => `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f6;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:${BRAND};color:#fff;padding:22px">
      <div style="font-size:20px;font-weight:bold">${headTitle}</div>
      <div style="font-size:14px;opacity:.92;margin-top:4px">${headSub}</div>
    </div>
    <div style="padding:22px">${inner}</div>
  </div>
</div>`

const quote = (message: string) =>
  `<div style="background:#f9fbfb;border-right:4px solid ${BRAND};border-radius:8px;padding:14px 16px;font-size:15px;color:#222;line-height:1.7">${esc(message).replace(/\n/g, '<br>')}</div>`

const btn = (href: string, label: string) =>
  `<div style="text-align:center;margin-top:20px"><a href="${href}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 28px;border-radius:10px">${label}</a></div>`

const replyHtml = (name: string, orderNumber: string, message: string) =>
  shell('תשובה מהחנות 💬', `${esc(BIZ_NAME)}${orderNumber ? ` · הזמנה ${esc(orderNumber)}` : ''}`,
    `<p style="font-size:16px;color:#111;margin:0 0 6px">שלום ${esc(name)},</p>
     <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px">קיבלת תשובה לפנייתך:</p>
     ${quote(message)}
     ${btn(`${SITE_URL}/account?tab=tickets`, 'צפייה בהתכתבות ומענה ←')}
     <p style="font-size:13px;color:#999;text-align:center;margin:22px 0 0">תודה שבחרת ב${esc(BIZ_NAME)} 🙏</p>`)

const adminHtml = (name: string, orderNumber: string, message: string) =>
  shell('💬 הודעה חדשה בפנייה', `${esc(name)}${orderNumber ? ` · הזמנה ${esc(orderNumber)}` : ''}`,
    `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px">הלקוח הוסיף הודעה לפנייה קיימת:</p>
     ${quote(message)}
     ${btn(`${SITE_URL}/admin?section=inquiries`, 'מעבר לפניות כדי להגיב ←')}`)

async function send(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
  })
  const out = await res.json().catch(() => ({}))
  return { ok: res.ok, out }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not configured' }, 500)

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const callerId = await getCallerId(token)
  if (!callerId) return json({ ok: false, error: 'forbidden' }, 403)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ ok: false, error: 'bad payload' }, 400) }

  const inquiryId = String(body.inquiryId ?? '')
  const direction = String(body.direction ?? 'to-customer')
  const message = String(body.message ?? '')
  const inq = await getInquiry(inquiryId)
  if (!inq) return json({ ok: false, error: 'inquiry not found' }, 200)
  const d = inq.data ?? {}
  const name = String(d.name ?? 'לקוח')
  const orderNumber = String(d.orderNumber ?? '')
  const subject = `פנייה לשירות${orderNumber ? ` · הזמנה ${orderNumber}` : ''} · ${BIZ_NAME}`

  if (direction === 'to-admin') {
    // The customer notifies the shop — caller must own the ticket.
    if (inq.user_id && callerId !== inq.user_id) return json({ ok: false, error: 'forbidden' }, 403)
    const { ok, out } = await send(NOTIFY_TO, subject, adminHtml(name, orderNumber, message))
    return json({ ok, result: out }, ok ? 200 : 500)
  }

  // The shop replies to the customer — caller must be the master admin.
  if ((await getRole(callerId)) !== 'MASTER_ADMIN') return json({ ok: false, error: 'forbidden' }, 403)
  const to = String(d.email ?? '')
  if (!looksLikeEmail(to)) return json({ ok: false, error: 'no customer email on file' }, 200)
  const { ok, out } = await send(to, subject, replyHtml(name, orderNumber, message))
  return json({ ok, result: out }, ok ? 200 : 500)
})
