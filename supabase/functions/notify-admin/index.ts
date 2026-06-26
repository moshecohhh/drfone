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

const BRAND = '#108c8b'
const money = (n: unknown) => '₪' + Number(n ?? 0).toLocaleString('he-IL')
const PAY: Record<string, string> = { credit: 'כרטיס אשראי', bit: 'ביט', representative: 'תשלום מול נציג', cash: 'מזומן' }
const DEL: Record<string, string> = { pickup: 'איסוף עצמי', delivery: 'משלוח עד הבית' }

// Build the rich, admin-style order email body.
function orderHtml(record: Record<string, unknown>, data: Record<string, unknown>): string {
  const cust = (data.customer ?? {}) as Record<string, unknown>
  const items = Array.isArray(data.items) ? data.items : []
  const qtyTotal = items.reduce((n: number, it: Record<string, unknown>) => n + (Number(it.qty) || 0), 0)
  const dateStr = record.created_at ? new Date(String(record.created_at)).toLocaleString('he-IL') : ''

  const rows = items.map((it: Record<string, unknown>) => {
    const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 0)
    const sels = Array.isArray(it.selections) ? it.selections : []
    const selHtml = sels
      .map((s: Record<string, unknown>) =>
        `<div style="font-size:13px;color:#333;margin-top:2px">• <b>${esc(s.groupTitle)}:</b> ${esc(s.optionLabel)}${s.priceDelta ? ` <span style="color:${BRAND}">(+₪${esc(s.priceDelta)})</span>` : ''}</div>`)
      .join('')
    const colorHtml = it.color
      ? `<div style="font-size:13px;color:#666;margin-top:2px">צבע נבחר: <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(it.color)};border:1px solid #ccc;vertical-align:middle"></span></div>`
      : ''
    const img = it.image
      ? `<img src="${esc(it.image)}" width="56" height="56" style="border-radius:8px;object-fit:cover;border:1px solid #eee" alt="" />`
      : `<div style="width:56px;height:56px;border-radius:8px;background:#f0f5f5;text-align:center;line-height:56px;font-size:22px">📦</div>`
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;width:56px">${img}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top">
        <div style="font-weight:bold;color:#111">${esc(it.name)}</div>
        <div style="font-size:13px;color:#666;margin-top:2px">כמות: ${esc(it.qty)} · מחיר מוצר: ${money(it.listPrice ?? it.price)}</div>
        ${colorHtml}${selHtml}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;text-align:left;font-weight:bold;white-space:nowrap">${money(lineTotal)}</td>
    </tr>`
  }).join('')

  const line = (label: string, value: string) =>
    `<tr><td style="padding:3px 0;font-size:14px;color:#111"><b>${label}:</b> ${value}</td></tr>`

  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f6;padding:20px;margin:0">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${BRAND};color:#fff;padding:18px 22px">
        <div style="font-size:20px;font-weight:bold">🛒 הזמנה חדשה</div>
        <div style="font-size:14px;opacity:.92;margin-top:2px">${esc(record.number)}${dateStr ? ' · ' + esc(dateStr) : ''}</div>
      </div>
      <div style="padding:20px 22px">
        <table width="100%" style="border-collapse:collapse;margin-bottom:16px;background:#f9fbfb;border-radius:10px">
          <tr><td style="padding:12px 14px">
            <table width="100%" style="border-collapse:collapse">
              ${line('לקוח', esc(cust.name))}
              ${line('טלפון', esc(cust.phone))}
              ${cust.email ? line('אימייל', esc(cust.email)) : ''}
              ${line('כתובת', cust.address ? esc(cust.address) : 'איסוף עצמי')}
              ${line('תשלום ומשלוח', `${esc(PAY[String(data.payment)] ?? data.payment)} · ${esc(DEL[String(data.delivery)] ?? data.delivery)}`)}
            </table>
          </td></tr>
        </table>
        <div style="font-size:13px;color:#666;font-weight:bold;border-bottom:2px solid #eee;padding-bottom:6px;margin-bottom:4px">פריטים (${qtyTotal})</div>
        <table width="100%" style="border-collapse:collapse">${rows}</table>
        <div style="text-align:left;margin-top:16px;padding-top:12px;border-top:2px solid #eee;font-size:18px;font-weight:bold;color:#111">סה"כ לתשלום: ${money(data.total)}</div>
      </div>
    </div>
  </div>`
}

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
      const name = data.customer?.name ?? 'לקוח'
      subject = `🛒 הזמנה חדשה ${record.number ?? ''} · ${name} · ₪${data.total ?? ''}`
      html = orderHtml(record, data)
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
