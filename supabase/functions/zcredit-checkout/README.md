# zcredit-checkout

Z-Credit (זד קרדיט) **WebCheckout** integration — the hosted payment page flow.
Used in the *approve-first, charge-after* model: the admin approves an order in the
Orders panel, opens a payment link, and sends it to the customer. The customer pays
on Z-Credit's secure page; a webhook marks the order paid.

## Flow

1. Admin clicks **קישור תשלום** on an order → frontend calls this function
   (`action=create`).
2. The function loads the order with the service role, recomputes the amount
   server-side (never trusts the client), and calls Z-Credit `CreateSession`.
3. Returns `SessionUrl`; the admin opens/sends it. The customer pays on Z-Credit.
4. Z-Credit POSTs the result to `CallbackUrl` (`action=callback`) → the function
   flips `data.paymentStatus` to `paid`/`failed` and stores the transaction
   reference. The browser `SuccessUrl` redirect (`/track/{token}?paid=1`) is
   cosmetic only and is never trusted for the paid state.

## Deploy

JWT verification must be **off** (guest customers + Z-Credit's callback carry no JWT):

```
supabase functions deploy zcredit-checkout --no-verify-jwt
```

## Secrets

```
supabase secrets set ZCREDIT_WEBCHECKOUT_KEY="<WebCheckout terminal Key>"
# optional:
supabase secrets set SITE_URL="https://drfone.co.il"        # success/cancel origin
supabase secrets set ZCREDIT_BASE="https://pci.zcredit.co.il" # override host if needed
```

`ZCREDIT_WEBCHECKOUT_KEY` is the **WebCheckout** key from the Z-Credit panel
(Settings → WebCheckout) — *not* the gateway terminal password.
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Verify against your terminal

The `CreateSession` request is built to Z-Credit's standard WebCheckout schema
(`Key`, `Local`, `UniqueId`, `SuccessUrl`, `CancelUrl`, `CallbackUrl`,
`PaymentType`, `Installments`, `Customer`, `CartItems`). The **callback field
names** vary slightly per terminal — confirm `ReturnCode` / `HasError` /
`ReferenceNumber` against a real callback sample and tighten `handleCallback` if
your terminal differs. Negative coupon lines are sent as negative `CartItems`
amounts; if your terminal rejects them, switch `buildCart` to a single
consolidated line of `data.total`.
