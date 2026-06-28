// Supabase Edge Function: service-reply
// Emails a customer the shop's reply to their service ticket. Invoked directly
// from the admin panel (not a webhook), so it verifies the caller is the master
// admin before sending — nobody else can send mail through it.
//
// Required secrets:
//   RESEND_API_KEY  - your Resend API key
// Optional:
//   NOTIFY_FROM     - sender; defaults to ד״ר פון <orders@drfone.co.il>
//   SITE_URL        - public site URL for the "open account" button
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? 'ד״ר פון <orders@drfone.co.il>'
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
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const looksLikeEmail = (s: unknown) => typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

async function isMasterAdmin(token: string): Promise<boolean> {
  if (!token || !SUPABASE_URL || !SERVICE_KEY) return false
  try {
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    })
    if (!ures.ok) return false
    const u = await ures.json()
    if (!u?.id) return false
    const pres = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}&select=role`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    })
    const rows = await pres.json().catch(() => [])
    return Array.isArray(rows) && rows[0]?.role === 'MASTER_ADMIN'
  } catch {
    return false
  }
}

function replyHtml(name: string, orderNumber: string, message: string): string {
  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f6;padding:20px;margin:0">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${BRAND};color:#fff;padding:22px">
        <div style="font-size:20px;font-weight:bold">תשובה מהחנות 💬</div>
        <div style="font-size:14px;opacity:.92;margin-top:4px">${esc(BIZ_NAME)}${orderNumber ? ` · הזמנה ${esc(orderNumber)}` : ''}</div>
      </div>
      <div style="padding:22px">
        <p style="font-size:16px;color:#111;margin:0 0 6px">שלום ${esc(name)},</p>
        <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px">קיבלת תשובה לפנייתך:</p>
        <div style="background:#f9fbfb;border-right:4px solid ${BRAND};border-radius:8px;padding:14px 16px;font-size:15px;color:#222;line-height:1.7">${esc(message).replace(/\n/g, '<br>')}</div>
        <div style="text-align:center;margin-top:20px">
          <a href="${SITE_URL}/account?tab=tickets" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 28px;border-radius:10px">צפייה בהתכתבות ומענה ←</a>
        </div>
        <p style="font-size:13px;color:#999;text-align:center;margin:22px 0 0">תודה שבחרת ב${esc(BIZ_NAME)} 🙏</p>
      </div>
    </div>
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!(await isMasterAdmin(token))) return json({ ok: false, error: 'forbidden' }, 403)
  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not configured' }, 500)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'bad payload' }, 400)
  }

  const to = String(body.to ?? '')
  if (!looksLikeEmail(to)) return json({ ok: false, error: 'no valid customer email' }, 200)
  const name = String(body.name ?? 'לקוח')
  const orderNumber = String(body.orderNumber ?? '')
  const message = String(body.message ?? '')

  // Same subject for opening + replies, so Gmail groups them into one thread.
  const subject = `פנייה לשירות${orderNumber ? ` · הזמנה ${orderNumber}` : ''} · ${BIZ_NAME}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html: replyHtml(name, orderNumber, message) }),
  })
  const out = await res.json().catch(() => ({}))
  return json({ ok: res.ok, result: out }, res.ok ? 200 : 500)
})
