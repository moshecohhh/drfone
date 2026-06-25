// Supabase Edge Function: notify-admin
// Emails the shop owner whenever a new contact inquiry or order is created.
// Triggered by a Supabase Database Webhook (on INSERT) which POSTs the new row.
//
// Required secrets (set via `supabase secrets set ...`):
//   RESEND_API_KEY  - your Resend API key (secret)
//   NOTIFY_TO       - the email address to notify (e.g. moshecohh@gmail.com)
//   WEBHOOK_SECRET  - a random string; the webhook must send it in x-webhook-secret
// Optional:
//   NOTIFY_FROM     - sender; defaults to Resend's onboarding address

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const NOTIFY_TO = Deno.env.get('NOTIFY_TO') ?? ''
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? 'ד״ר פון <onboarding@resend.dev>'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

const esc = (s: unknown) =>
  String(s ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

Deno.serve(async (req) => {
  // Simple shared-secret check so only our webhook can invoke this.
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  let subject = 'התראה חדשה מהאתר'
  let html = ''
  try {
    const payload = await req.json()
    const table = payload.table
    const record = payload.record ?? {}
    const data = record.data ?? {}

    if (table === 'inquiries') {
      subject = `📨 פנייה חדשה מ${data.name ?? 'לקוח'}`
      html = `<div dir="rtl" style="font-family:Arial,sans-serif">
        <h2>פנייה חדשה מהאתר</h2>
        <p><b>שם:</b> ${esc(data.name)}</p>
        <p><b>טלפון:</b> ${esc(data.phone)}</p>
        <p><b>הודעה:</b><br>${esc(data.message).replace(/\n/g, '<br>')}</p>
      </div>`
    } else if (table === 'orders') {
      subject = `🛒 הזמנה חדשה ${record.number ?? ''}`
      html = `<div dir="rtl" style="font-family:Arial,sans-serif">
        <h2>הזמנה חדשה</h2>
        <p><b>מספר:</b> ${esc(record.number)}</p>
        <p><b>לקוח:</b> ${esc(data.customer?.name)} (${esc(data.customer?.phone)})</p>
        <p><b>סה"כ:</b> ₪${esc(data.total)}</p>
      </div>`
    } else {
      html = `<pre dir="ltr">${esc(JSON.stringify(data, null, 2))}</pre>`
    }
  } catch (_e) {
    return new Response('bad payload', { status: 400 })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: NOTIFY_FROM, to: NOTIFY_TO, subject, html }),
  })
  const body = await res.json().catch(() => ({}))
  return new Response(JSON.stringify({ ok: res.ok, body }), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
