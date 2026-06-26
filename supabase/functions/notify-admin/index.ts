// Supabase Edge Function: notify-admin
// Emails the shop owner whenever a new contact inquiry or order is created.
// For orders, it ALSO sends the customer a "we received your order" confirmation
// email (when they supplied a valid email address).
// Triggered by a Supabase Database Webhook (on INSERT) which POSTs the new row.
//
// Required secrets (set via `supabase secrets set ...`):
//   RESEND_API_KEY  - your Resend API key (secret)
//   WEBHOOK_SECRET  - a random string; the webhook must send it in x-webhook-secret
// Optional:
//   NOTIFY_TO       - the admin address to notify; defaults to drfone4949@gmail.com.
//                     A NOTIFY_TO secret, if set, overrides this default.
// Optional:
//   NOTIFY_FROM     - sender; defaults to orders@drfone.co.il (the verified domain).
//                     Until the domain is verified in Resend, override this with a
//                     secret set to Resend's onboarding address to keep emails flowing.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const NOTIFY_TO = Deno.env.get('NOTIFY_TO') ?? 'drfone4949@gmail.com'
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? 'ד״ר פון <orders@drfone.co.il>'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
// Public site URL for the "open order in admin" button (override via secret).
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://drfone.vercel.app').replace(/\/$/, '')

// Supabase Storage — used to host product images so the email references real
// URLs (email clients can't render embedded base64 `data:` images, and they
// bloat the email past Gmail's clip limit). These two vars are injected into
// every edge function by Supabase automatically.
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const IMG_BUCKET = 'order-images'

// Create the public bucket if it doesn't exist yet (idempotent).
async function ensureBucket(): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: IMG_BUCKET, name: IMG_BUCKET, public: true }),
    })
    return res.ok || res.status === 400 || res.status === 409 // created OR already exists
  } catch {
    return false
  }
}

// Upload a base64 data-URL image to Storage and return its public URL (or null).
async function uploadImage(dataUrl: string): Promise<string | null> {
  try {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl)
    if (!m) return null
    const contentType = m[1]
    const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
    const digest = await crypto.subtle.digest('SHA-1', bytes)
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
    const path = `${hash}.${ext}`
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${IMG_BUCKET}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: bytes,
    })
    if (!up.ok && up.status !== 409) return null // 409 = already uploaded
    return `${SUPABASE_URL}/storage/v1/object/public/${IMG_BUCKET}/${path}`
  } catch {
    return null
  }
}

// Resolve each order item's image to a public URL (uploading base64 ones).
async function resolveItemImages(items: Record<string, unknown>[]): Promise<void> {
  if (!items.length) return
  await ensureBucket()
  for (const it of items) {
    const src = it.image
    if (typeof src === 'string' && /^https?:\/\//i.test(src)) it._imgUrl = src
    else if (typeof src === 'string' && src.startsWith('data:')) it._imgUrl = await uploadImage(src)
    else it._imgUrl = null
  }
}

const esc = (s: unknown) =>
  String(s ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const BRAND = '#108c8b'
const money = (n: unknown) => '₪' + Number(n ?? 0).toLocaleString('he-IL')
const PAY: Record<string, string> = { credit: 'כרטיס אשראי', bit: 'ביט', representative: 'תשלום מול נציג', cash: 'מזומן' }
const DEL: Record<string, string> = { pickup: 'איסוף עצמי', delivery: 'משלוח עד הבית' }

// Build the <tr> rows for the order items table — shared by the admin email
// and the customer confirmation email so both show the same rich line items.
function itemRows(items: Record<string, unknown>[]): string {
  return items.map((it: Record<string, unknown>) => {
    const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 0)
    const sels = Array.isArray(it.selections) ? it.selections : []
    const selHtml = sels.length
      ? `<div style="margin-top:6px;background:#f0f6f6;border:1px solid #e2eded;border-radius:8px;padding:8px 10px">
          <div style="font-size:11px;font-weight:bold;color:#7a8a8a;margin-bottom:3px">בחירות הלקוח</div>
          ${sels.map((s: Record<string, unknown>) =>
            `<div style="font-size:13px;color:#222;margin:2px 0">▪ <b>${esc(s.groupTitle)}:</b> ${esc(s.optionLabel)}${s.priceDelta ? ` <span style="color:${BRAND};font-weight:bold">(+₪${esc(s.priceDelta)})</span>` : ''}</div>`).join('')}
        </div>`
      : ''
    const colorHtml = it.color
      ? `<div style="font-size:13px;color:#666;margin-top:2px">צבע נבחר: <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(it.color)};border:1px solid #ccc;vertical-align:middle"></span></div>`
      : ''
    // Use the resolved public URL (never inline base64 — Gmail blocks it).
    const imgUrl = typeof it._imgUrl === 'string' ? it._imgUrl : ''
    const img = imgUrl
      ? `<img src="${esc(imgUrl)}" width="56" height="56" style="border-radius:8px;object-fit:cover;border:1px solid #eee" alt="" />`
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
}

// Build the rich, admin-style order email body.
function orderHtml(record: Record<string, unknown>, data: Record<string, unknown>): string {
  const cust = (data.customer ?? {}) as Record<string, unknown>
  const items = Array.isArray(data.items) ? data.items : []
  const qtyTotal = items.reduce((n: number, it: Record<string, unknown>) => n + (Number(it.qty) || 0), 0)
  const dateStr = record.created_at ? new Date(String(record.created_at)).toLocaleString('he-IL') : ''

  const rows = itemRows(items)

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
        <div style="text-align:center;margin-top:20px">
          <a href="${SITE_URL}/admin?order=${esc(record.id)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 28px;border-radius:10px">📦 מעבר להזמנה בניהול ←</a>
        </div>
      </div>
    </div>
  </div>`
}

// Business contact details shown to the customer in the confirmation email.
const BIZ_NAME = 'ד״ר פון'
const BIZ_ADDRESS = 'רשבי 49, מודיעין עילית'
const BIZ_WHATSAPP = '055-680-2800'

// Build the customer-facing "we received your order" confirmation email.
// Friendly tone, same line items, but NO admin link — and a contact block.
function customerHtml(record: Record<string, unknown>, data: Record<string, unknown>): string {
  const cust = (data.customer ?? {}) as Record<string, unknown>
  const items = Array.isArray(data.items) ? data.items : []
  const qtyTotal = items.reduce((n: number, it: Record<string, unknown>) => n + (Number(it.qty) || 0), 0)
  const dateStr = record.created_at ? new Date(String(record.created_at)).toLocaleString('he-IL') : ''
  const rows = itemRows(items)
  const isPickup = String(data.delivery) === 'pickup'

  // A short "what happens next" line tailored to pickup vs. delivery.
  const nextStep = isPickup
    ? `נעדכן אותך כשההזמנה מוכנה לאיסוף מהכתובת: <b>${esc(BIZ_ADDRESS)}</b>.`
    : `ההזמנה תישלח לכתובת: <b>${esc(cust.address ?? '')}</b>. נעדכן אותך עם פרטי המשלוח.`

  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f6;padding:20px;margin:0">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${BRAND};color:#fff;padding:22px">
        <div style="font-size:22px;font-weight:bold">תודה על הזמנתך! 🎉</div>
        <div style="font-size:14px;opacity:.92;margin-top:4px">${esc(BIZ_NAME)} · הזמנה ${esc(record.number)}${dateStr ? ' · ' + esc(dateStr) : ''}</div>
      </div>
      <div style="padding:22px">
        <p style="font-size:16px;color:#111;margin:0 0 6px">שלום ${esc(cust.name)},</p>
        <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 18px">קיבלנו את הזמנתך והיא בטיפול. ${nextStep}</p>
        <div style="font-size:13px;color:#666;font-weight:bold;border-bottom:2px solid #eee;padding-bottom:6px;margin-bottom:4px">סיכום ההזמנה (${qtyTotal})</div>
        <table width="100%" style="border-collapse:collapse">${rows}</table>
        <div style="text-align:left;margin-top:16px;padding-top:12px;border-top:2px solid #eee;font-size:18px;font-weight:bold;color:#111">סה"כ: ${money(data.total)}</div>
        <table width="100%" style="border-collapse:collapse;margin-top:18px;background:#f9fbfb;border-radius:10px">
          <tr><td style="padding:14px 16px">
            <div style="font-size:14px;font-weight:bold;color:#111;margin-bottom:6px">צריך עזרה או רוצה לעדכן משהו?</div>
            <div style="font-size:14px;color:#444;line-height:1.7">
              📞 וואטסאפ: <b>${esc(BIZ_WHATSAPP)}</b><br>
              📍 כתובת: ${esc(BIZ_ADDRESS)}
            </div>
          </td></tr>
        </table>
        <p style="font-size:13px;color:#999;text-align:center;margin:22px 0 0">תודה שבחרת ב${esc(BIZ_NAME)} 🙏</p>
      </div>
    </div>
  </div>`
}

// Send a single email through Resend. Returns the parsed response + ok flag.
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, body }
}

// Lenient email check — only send to the customer if the address looks valid.
const looksLikeEmail = (s: unknown) => typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

Deno.serve(async (req) => {
  // Simple shared-secret check so only our webhook can invoke this.
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  let subject = 'התראה חדשה מהאתר'
  let html = ''
  // When the event is an order with a valid customer email, we also send the
  // customer a confirmation. Built inside the try, sent after it.
  let customerMail: { to: string; subject: string; html: string } | null = null
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
      // Host the product images (so the email shows real images, not base64).
      await resolveItemImages(Array.isArray(data.items) ? data.items : [])
      html = orderHtml(record, data)
      // Customer confirmation — only if they supplied a valid email address.
      const custEmail = data.customer?.email
      if (looksLikeEmail(custEmail)) {
        customerMail = {
          to: custEmail,
          subject: `תודה על הזמנתך! ${record.number ?? ''} · ${BIZ_NAME}`,
          html: customerHtml(record, data),
        }
      }
    } else {
      html = `<pre dir="ltr">${esc(JSON.stringify(data, null, 2))}</pre>`
    }
  } catch (_e) {
    return new Response('bad payload', { status: 400 })
  }

  // Admin notification is the primary email; the customer confirmation is
  // best-effort (a failure there must not fail the admin notification).
  const admin = await sendEmail(NOTIFY_TO, subject, html)
  const customer = customerMail
    ? await sendEmail(customerMail.to, customerMail.subject, customerMail.html)
    : null

  return new Response(JSON.stringify({ ok: admin.ok, admin: admin.body, customer: customer?.body ?? null }), {
    status: admin.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
