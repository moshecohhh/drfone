# zcredit-checkout

Z-Credit (זד קרדיט) integration — **tokenize the card, charge it later** model.
The customer saves their card on Z-Credit's secure page (WebCheckout in Token
mode); once the shop approves the order (and may adjust the amount) the admin
charges the saved token for the final total via the Gateway API.

## Flow

1. A card-save session is opened (`action=create`) — by the customer at checkout
   or via a link the admin sends. The function loads the order with the service
   role and calls Z-Credit `CreateSession` with `PaymentType: 'Token'`.
2. Returns `SessionUrl`; the customer enters their card on Z-Credit's secure page.
3. Z-Credit POSTs to `CallbackUrl` (`action=callback`) → the function stores the
   returned **card token** on the order and sets `paymentStatus = 'card_saved'`.
4. After approval, the admin clicks **חיוב כרטיס** → `action=charge` → the
   function charges the saved token for the order's current total via
   `CommitFullTransaction` (J=4) and sets `paymentStatus = 'paid'`.

`paymentStatus`: `null → pending → card_saved → paid` (or `failed`). The browser
`SuccessUrl` redirect is cosmetic; the token/paid state comes only from the
server-to-server calls.

## Deploy

JWT verification must be **off** (guest customers + Z-Credit's callback carry no JWT):

```
supabase functions deploy zcredit-checkout --no-verify-jwt
```

## Secrets

```
# card-save session (WebCheckout, Token mode):
supabase secrets set ZCREDIT_WEBCHECKOUT_KEY="<WebCheckout terminal Key>"
# charging the saved token (Gateway API) — REQUIRED for `action=charge`:
supabase secrets set ZCREDIT_TERMINAL_NUMBER="<terminal number>"
supabase secrets set ZCREDIT_PASSWORD="<gateway API password>"
# optional:
supabase secrets set SITE_URL="https://drfone.co.il"        # success/cancel origin
supabase secrets set ZCREDIT_BASE="https://pci.zcredit.co.il" # override host if needed
```

`ZCREDIT_WEBCHECKOUT_KEY` is the **WebCheckout** key (Settings → WebCheckout).
`ZCREDIT_TERMINAL_NUMBER` + `ZCREDIT_PASSWORD` are the **Gateway API** credentials
used to charge the token — different from the WebCheckout key. **Tokenization must
be enabled on the terminal** (ask Z-Credit support).
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
