// Supabase Edge Function: sumit-invoice
// Creates a real tax document (invoice) in SUMIT for a given order, and returns
// the document id/number and a public PDF download URL.
//
// Called from the admin panel via supabase.functions.invoke('sumit-invoice'),
// which forwards the caller's auth token — we verify the caller is the master
// admin before talking to SUMIT, so nobody else can issue documents.
//
// Required secrets:
//   SUMIT_API_KEY     - SUMIT private API key (secret!)
//   SUMIT_COMPANY_ID  - SUMIT CompanyID (e.g. 1903310902)
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)

const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY') ?? ''
const SUMIT_COMPANY_ID = Number(Deno.env.get('SUMIT_COMPANY_ID') ?? '0')
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUMIT_BASE = 'https://api.sumit.co.il'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Verify the caller's JWT belongs to the master admin (role in `profiles`).
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!(await isMasterAdmin(token))) return json({ ok: false, error: 'forbidden' }, 403)
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) return json({ ok: false, error: 'SUMIT credentials not configured' }, 500)

  let order: Record<string, unknown>
  try {
    order = await req.json()
  } catch {
    return json({ ok: false, error: 'bad payload' }, 400)
  }

  const cust = (order.customer ?? {}) as Record<string, unknown>
  const rawItems = Array.isArray(order.items) ? order.items : []
  // Each order line → a SUMIT document item. Prices include VAT (VATIncluded).
  const Items = rawItems.map((it: Record<string, unknown>) => ({
    Quantity: Number(it.qty) || 1,
    UnitPrice: Number(it.price) || 0,
    Item: { Name: String(it.name ?? 'פריט'), Price: Number(it.price) || 0 },
  }))
  if (Number(order.deliveryPrice) > 0) {
    Items.push({ Quantity: 1, UnitPrice: Number(order.deliveryPrice), Item: { Name: 'משלוח', Price: Number(order.deliveryPrice) } })
  }

  // DocumentType: 0 = Invoice (חשבונית מס). Admin may override via documentType.
  const docType = typeof order.documentType === 'number' ? order.documentType : 0

  const payload = {
    Credentials: { CompanyID: SUMIT_COMPANY_ID, APIKey: SUMIT_API_KEY },
    Details: {
      // The admin chooses: a draft (preview, deletable, not a tax document) or a
      // real finalized tax invoice. Controlled per request via `draft`.
      IsDraft: order.draft === true,
      Customer: {
        Name: String(cust.name ?? 'לקוח'),
        Phone: String(cust.phone ?? ''),
        EmailAddress: String(cust.email ?? ''),
        City: String(cust.city ?? ''),
        Address: String(cust.address ?? ''),
        SearchMode: 0, // Automatic — match or create the customer
      },
      Type: docType,
      Language: 0, // Hebrew
      Currency: 0, // ILS
      Description: `הזמנה ${order.number ?? ''}`,
      ExternalReference: String(order.number ?? ''),
    },
    Items,
    VATIncluded: true, // unit prices already include VAT; SUMIT back-computes it
  }

  try {
    const res = await fetch(`${SUMIT_BASE}/accounting/documents/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    const ok = res.ok && (body?.Status === 0 || String(body?.Status).toLowerCase().includes('success'))
    if (!ok) {
      return json({ ok: false, error: body?.UserErrorMessage || body?.TechnicalErrorDetails || `SUMIT error (${res.status})` }, 200)
    }
    const d = body.Data ?? {}
    return json({
      ok: true,
      invoice: {
        id: d.DocumentID ?? null,
        number: d.DocumentNumber ?? null,
        url: d.DocumentDownloadURL ?? null,
        paymentUrl: d.DocumentPaymentURL ?? null,
      },
    })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200)
  }
})
