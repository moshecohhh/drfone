// Supabase Edge Function: zcredit-checkout
// Z-Credit (זד קרדיט) WebCheckout integration — the *hosted payment page* flow.
//
// Two responsibilities:
//   action=create  → called by the storefront after an order row exists. It loads
//                     the order with the service role (so the charged amount is
//                     computed server-side and can't be tampered with by the
//                     client), opens a Z-Credit WebCheckout session and returns the
//                     SessionUrl to redirect the customer to.
//   action=callback → the server-to-server webhook Z-Credit POSTs once the customer
//                     finishes paying. This is the source of truth: it flips the
//                     order's paymentStatus to 'paid' (or 'failed') and records the
//                     transaction reference. The browser SuccessUrl redirect is only
//                     cosmetic and is never trusted for the paid state.
//
// Deploy WITHOUT JWT verification (the customer may be a guest and Z-Credit's
// callback can't carry a JWT):
//   supabase functions deploy zcredit-checkout --no-verify-jwt
//
// Required secrets:
//   ZCREDIT_WEBCHECKOUT_KEY - the WebCheckout terminal Key from the Z-Credit panel
//                             (Settings → WebCheckout). NOT the gateway password.
// Optional secrets:
//   ZCREDIT_BASE  - override the WebCheckout base (defaults to the production host)
//   SITE_URL      - public site origin for the success/cancel redirects
//                   (defaults to https://drfone.co.il). The client may also pass
//                   `origin` per-request, which takes precedence.
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)

const ZCREDIT_KEY = Deno.env.get('ZCREDIT_WEBCHECKOUT_KEY') ?? ''
const ZCREDIT_BASE = (Deno.env.get('ZCREDIT_BASE') ?? 'https://pci.zcredit.co.il').replace(/\/$/, '')
// Gateway API credentials — needed to CHARGE a saved card token later. These are
// the terminal number + API password from Z-Credit, NOT the WebCheckout key.
const ZCREDIT_TERMINAL = Deno.env.get('ZCREDIT_TERMINAL_NUMBER') ?? ''
const ZCREDIT_PASSWORD = Deno.env.get('ZCREDIT_PASSWORD') ?? ''
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://drfone.co.il').replace(/\/$/, '')
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// WebCheckout endpoint that creates a hosted-payment session (used here in
// tokenize mode: the customer enters their card and we get back a token).
const CREATE_SESSION_URL = `${ZCREDIT_BASE}/webcheckout/api/WebCheckout/CreateSession`
// Gateway endpoint that charges a transaction — including by saved Token.
const COMMIT_TXN_URL = `${ZCREDIT_BASE}/ZCreditWS/api/Transaction/CommitFullTransaction`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// --- order persistence (service role) -------------------------------------

async function loadOrder(id: string): Promise<Record<string, unknown> | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  })
  const rows = await res.json().catch(() => [])
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

// Merge a patch into the order's jsonb `data` (and optionally its status).
async function patchOrder(id: string, data: Record<string, unknown>, status?: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false
  const body: Record<string, unknown> = { data }
  if (status) body.status = status
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  return res.ok
}

// --- cart construction -----------------------------------------------------

// Build Z-Credit CartItems from the order's `data` and return them alongside the
// authoritative total we recomputed (so we can sanity-check it against the
// stored order total and never charge a different number than the customer saw).
function buildCart(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : []
  const cart: Array<Record<string, string>> = items.map((it) => ({
    Amount: (Number(it.price) || 0).toFixed(2),
    Currency: 'ILS',
    Name: String(it.name ?? 'פריט'),
    Description: String(it.color ? `צבע: ${it.color}` : ''),
    Quantity: String(Number(it.qty) || 1),
    Image: String(it.image ?? ''),
    IsTaxFree: 'false',
  }))

  const deliveryPrice = Number(data.deliveryPrice) || 0
  if (deliveryPrice > 0) {
    cart.push({ Amount: deliveryPrice.toFixed(2), Currency: 'ILS', Name: 'משלוח', Description: '', Quantity: '1', Image: '', IsTaxFree: 'false' })
  }

  // A redeemed coupon becomes a negative line so the session total equals what
  // the customer actually pays. (Z-Credit WebCheckout accepts negative cart
  // amounts; if a given terminal rejects them, switch to a single consolidated
  // line of `data.total`.)
  const coupon = (data.coupon ?? {}) as Record<string, unknown>
  const discount = Number(coupon.discountAmount) || 0
  if (discount > 0) {
    const label = coupon.code ? `הנחת קופון (${coupon.code})` : 'הנחת קופון'
    cart.push({ Amount: (-discount).toFixed(2), Currency: 'ILS', Name: label, Description: '', Quantity: '1', Image: '', IsTaxFree: 'false' })
  }

  const computed = cart.reduce((sum, l) => sum + Number(l.Amount) * Number(l.Quantity), 0)
  return { cart, computed: Math.round(computed * 100) / 100 }
}

// --- actions ---------------------------------------------------------------

async function handleCreate(payload: Record<string, unknown>) {
  if (!ZCREDIT_KEY) return json({ ok: false, error: 'ZCREDIT_WEBCHECKOUT_KEY not configured' }, 500)

  const orderId = String(payload.orderId ?? '')
  const trackToken = String(payload.trackToken ?? '')
  if (!orderId) return json({ ok: false, error: 'missing orderId' }, 400)

  const row = await loadOrder(orderId)
  if (!row) return json({ ok: false, error: 'order not found' }, 404)
  const data = (row.data ?? {}) as Record<string, unknown>

  // Authorize: the caller must know the order's unguessable track token. This
  // stops a stranger from spinning up payment sessions for arbitrary order ids.
  if (!data.trackToken || data.trackToken !== trackToken) {
    return json({ ok: false, error: 'forbidden' }, 403)
  }
  if (data.paymentStatus === 'paid') return json({ ok: false, error: 'order already paid' }, 409)

  const { cart, computed } = buildCart(data)
  const total = Number(data.total) || 0
  // Refuse to proceed if our recomputed cart doesn't match the stored total —
  // better to fail loudly than charge a surprising amount.
  if (Math.abs(computed - total) > 0.01) {
    return json({ ok: false, error: `cart/total mismatch (cart=${computed}, total=${total})` }, 500)
  }

  const cust = (data.customer ?? {}) as Record<string, unknown>
  const origin = (String(payload.origin ?? '') || SITE_URL).replace(/\/$/, '')
  const callbackUrl = `${SUPABASE_URL}/functions/v1/zcredit-checkout?action=callback&order=${encodeURIComponent(orderId)}`

  const body = {
    Key: ZCREDIT_KEY,
    Local: 'He',
    UniqueId: String(row.number ?? orderId), // shown on the Z-Credit side / our reference
    SuccessUrl: `${origin}/track/${trackToken}?paid=1`,
    CancelUrl: `${origin}/checkout?canceled=1`,
    CallbackUrl: callbackUrl,
    // Tokenize the card instead of charging now: the customer enters their card
    // at checkout, we store the returned token, and charge it for the final
    // amount once the shop approves the order (the approve-then-charge model).
    PaymentType: 'Token',
    CreateInvoice: 'false', // we issue the tax invoice ourselves via SUMIT
    AdditionalText: `הזמנה ${row.number ?? ''}`,
    ShowCart: 'true',
    Installments: { Type: 'regular', MinQuantity: '1', MaxQuantity: '1' },
    Customer: {
      Email: String(cust.email ?? ''),
      Name: String(cust.name ?? ''),
      PhoneNumber: String(cust.phone ?? ''),
      Attributes: { HolderId: 'none', Name: 'required', PhoneNumber: 'required', Email: 'optional' },
    },
    CartItems: cart,
  }

  let resp: Response
  try {
    resp = await fetch(CREATE_SESSION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    return json({ ok: false, error: `Z-Credit unreachable: ${e}` }, 502)
  }

  const out = await resp.json().catch(() => ({}))
  // WebCheckout signals success with HasError=false and returns Data.SessionUrl.
  const sessionUrl = out?.Data?.SessionUrl ?? out?.SessionUrl ?? null
  if (out?.HasError || !sessionUrl) {
    return json({ ok: false, error: out?.ReturnMessage || out?.Message || `Z-Credit error (${resp.status})` }, 200)
  }

  const sessionId = out?.Data?.SessionId ?? out?.SessionId ?? null
  await patchOrder(orderId, {
    ...data,
    paymentStatus: 'pending',
    zcredit: { sessionId, sessionUrl, createdAt: new Date().toISOString() },
  })

  return json({ ok: true, sessionUrl, sessionId })
}

// Charge a previously-saved card token for the order's CURRENT total (the admin
// may have adjusted it before approving). Uses the Gateway CommitFullTransaction
// with the token in place of the card number (J=4, a real charge).
async function handleCharge(payload: Record<string, unknown>) {
  if (!ZCREDIT_TERMINAL || !ZCREDIT_PASSWORD) {
    return json({ ok: false, error: 'ZCREDIT_TERMINAL_NUMBER / ZCREDIT_PASSWORD not configured' }, 500)
  }
  const orderId = String(payload.orderId ?? '')
  const trackToken = String(payload.trackToken ?? '')
  if (!orderId) return json({ ok: false, error: 'missing orderId' }, 400)

  const row = await loadOrder(orderId)
  if (!row) return json({ ok: false, error: 'order not found' }, 404)
  const data = (row.data ?? {}) as Record<string, unknown>
  if (!data.trackToken || data.trackToken !== trackToken) return json({ ok: false, error: 'forbidden' }, 403)
  if (data.paymentStatus === 'paid') return json({ ok: false, error: 'order already paid' }, 409)

  const zc = (typeof data.zcredit === 'object' && data.zcredit ? data.zcredit : {}) as Record<string, unknown>
  const cardToken = zc.token
  if (!cardToken) return json({ ok: false, error: 'no saved card token for this order' }, 400)

  // The amount to charge: the admin may pass an explicit amount, else the order
  // total (which itself reflects any admin edits). Always a positive number.
  const amount = Number(payload.amount) || Number(data.total) || 0
  if (!(amount > 0)) return json({ ok: false, error: 'invalid amount' }, 400)

  const cust = (data.customer ?? {}) as Record<string, unknown>
  const body = {
    TerminalNumber: ZCREDIT_TERMINAL,
    Password: ZCREDIT_PASSWORD,
    Token: String(cardToken), // charge the saved card
    CardNumber: String(cardToken), // some terminals expect the token here instead
    TransactionSum: amount.toFixed(2),
    CurrencyType: '1', // 1 = ILS
    CreditType: '1', // 1 = regular (not installments)
    NumOfPayments: '1',
    J: '4', // 4 = charge (vs 5 = authorize-only / hold)
    TransactionType: '01',
    IsCustomerPresent: 'false',
    CustomerName: String(cust.name ?? ''),
    PhoneNumber: String(cust.phone ?? ''),
    ExtraData: String(row.number ?? orderId),
  }

  let resp: Response
  try {
    resp = await fetch(COMMIT_TXN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    return json({ ok: false, error: `Z-Credit unreachable: ${e}` }, 502)
  }

  const out = await resp.json().catch(() => ({}))
  // CommitFullTransaction returns ReturnCode 0 on success. Confirm against your
  // terminal's response shape and tighten if needed.
  const approved =
    Number(out?.ReturnCode) === 0 ||
    (out?.ReturnCode == null && String(out?.HasError).toLowerCase() === 'false')
  if (!approved) {
    return json({ ok: false, error: out?.ReturnMessage || out?.CardReaderErrorMessage || `Z-Credit declined (${resp.status})` }, 200)
  }

  const reference = out?.ReferenceNumber ?? out?.Reference ?? out?.ApprovalNumber ?? null
  await patchOrder(orderId, {
    ...data,
    paymentStatus: 'paid',
    zcredit: { ...zc, reference, chargedAmount: amount, paidAt: new Date().toISOString(), chargeRaw: out },
  })

  return json({ ok: true, reference, amount })
}

// Parse a callback body that may arrive as JSON or as form-urlencoded.
async function readCallback(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) return await req.json()
    const form = await req.formData()
    const obj: Record<string, unknown> = {}
    for (const [k, v] of form.entries()) obj[k] = typeof v === 'string' ? v : ''
    return obj
  } catch {
    return {}
  }
}

async function handleCallback(req: Request, orderId: string) {
  const payload = await readCallback(req)

  // Z-Credit posts the transaction outcome. Field names vary slightly by terminal
  // configuration, so we read the result defensively. Confirm these against your
  // terminal's callback sample and tighten if needed.
  const codeRaw = payload.ReturnCode ?? payload.ReturnValue ?? payload.CardAcquirerResponse ?? payload.ResultCode
  const approved =
    String(payload.HasError).toLowerCase() === 'false' ||
    Number(codeRaw) === 0 ||
    String(payload.Approved ?? '').toLowerCase() === 'true'

  if (!orderId) return json({ ok: false, error: 'missing order' }, 400)
  const row = await loadOrder(orderId)
  if (!row) return json({ ok: false, error: 'order not found' }, 404)
  const data = (row.data ?? {}) as Record<string, unknown>

  const reference =
    payload.ReferenceNumber ?? payload.Reference ?? payload.TransactionID ?? payload.ApprovalNumber ?? null
  // The card token Z-Credit returns after the customer enters their card. Field
  // name varies by terminal — confirm against a real callback sample.
  const token = payload.Token ?? payload.CardToken ?? payload.UniqueTransactionId ?? null

  await patchOrder(orderId, {
    ...data,
    // Tokenize flow: a successful callback means the card was saved (not yet
    // charged). The actual charge happens later via the 'charge' action.
    paymentStatus: approved ? 'card_saved' : 'failed',
    zcredit: {
      ...(typeof data.zcredit === 'object' && data.zcredit ? data.zcredit : {}),
      token: token ?? (typeof data.zcredit === 'object' && data.zcredit ? (data.zcredit as Record<string, unknown>).token : null),
      reference,
      cardSavedAt: approved ? new Date().toISOString() : null,
      raw: payload, // kept for the admin to reconcile / audit
    },
  })

  // Always 200 so Z-Credit doesn't keep retrying a delivered callback.
  return json({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''

  // Server-to-server callback (no JSON body guarantees).
  if (action === 'callback') {
    return handleCallback(req, url.searchParams.get('order') ?? '')
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ ok: false, error: 'bad payload' }, 400)
  }

  const act = payload.action ?? 'create'
  if (act === 'create') return handleCreate(payload)
  if (act === 'charge') return handleCharge(payload)
  return json({ ok: false, error: 'unknown action' }, 400)
})
