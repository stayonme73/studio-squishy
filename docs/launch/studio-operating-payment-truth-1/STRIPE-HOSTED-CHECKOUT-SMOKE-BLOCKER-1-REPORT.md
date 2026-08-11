# STRIPE HOSTED CHECKOUT SMOKE BLOCKER — REPORT

**Package:** COMPLETE CHECKOUT does not open Stripe  
**Branch:** `operating/payment-truth-1`  
**Status:** STRIPE HOSTED CHECKOUT SMOKE UNBLOCKED (wiring)  
**Scout:** PARKED  
**Git:** No commit · No push · No merge  

---

## Root cause

1. **Invalid Stripe secret in `.env.local`:** `STRIPE_SECRET_KEY` (and publishable) were set to a value starting with `mk_…`, not a Stripe secret key (`sk_test_…` / `sk_live_…`). Stripe rejected session create with **Invalid API Key** (401).
2. **Uncaught Stripe error → HTTP 500** with no reliable customer message in the checkout panel.
3. **UI failure silence:** `onPaymentComplete` failures did not throw → SecureCheckoutGrid stayed busy and often showed no alert.
4. **Path confusion:** Complete Checkout and “Test pay with sandbox confirm” shared one handler; without a usable Stripe key the primary path could fall into local sandbox confirm (not hosted Checkout). Sandbox is a fixture, not Stripe smoke proof.

Trace stop point: **server `stripe.checkout.sessions.create` (auth failure)** — never returned a Checkout URL, so no browser redirect and no CLI `checkout.session.completed`.

---

## Fixes

| Area | Change |
|------|--------|
| Credential gate | `inspectStripeSecretKey` / `looksLikeStripeSecretKey` — only `sk_test_` / `sk_live_` count as configured |
| Session create | Stripe path required for Complete Checkout; sandbox only when `preferSandbox: true` |
| Errors | Catch Stripe failures → `processor_session_failed` / invalid format → `processor_credentials_invalid` with truthful copy |
| Complete Checkout | Redirects only on `mode: "stripe"` + URL; throws so UI shows the message |
| Sandbox button | Separate handler → `preferSandbox` + sandbox-confirm; labeled as fixture-only |
| `.env.example` | Documents required `sk_test_` / `sk_live_` prefix |

---

## Stripe Session creation / redirect

| Check | Result |
|-------|--------|
| Env loaded by Next | Yes (`.env.local`) — but secret was wrong shape |
| Test mode detection | Now requires `sk_test_` / `sk_live_` prefix |
| Session create route | `/api/payments/checkout-session` |
| With invalid `mk_` key | Fail closed: `processor_credentials_invalid` (no Stripe call) |
| With mocked `sk_test_` | Unit test returns hosted `checkout.stripe.com` URL |
| Browser redirect | `window.location.assign(url)` when Stripe mode succeeds |
| Return page paid truth | Unchanged — webhook/reconcile only |

**Owner action required before live smoke:** replace `.env.local` `STRIPE_SECRET_KEY` with a real **`sk_test_…`** from Stripe Dashboard → Developers → API keys, set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to matching **`pk_test_…`**, restart Next, then click **Complete Checkout** (not sandbox).

---

## Sandbox-confirm classification

| Item | Class |
|------|--------|
| Test pay with sandbox confirm | **Local test fixture only** |
| Opens Stripe hosted Checkout? | **No** |
| Emits `checkout.session.completed`? | **No** |
| May stand in for Stripe certification? | **No** |

---

## Files changed

- `src/lib/studio-payment/env.ts`
- `src/lib/studio-payment/create-session.ts`
- `src/lib/studio-payment/client.ts`
- `src/lib/studio-payment/types.ts`
- `src/lib/studio-payment/index.ts`
- `src/lib/studio-payment/payment-truth.test.ts`
- `src/config/studio-payment-v1.ts`
- `src/app/api/payments/checkout-session/route.ts`
- `src/components/payment/SecureCheckoutGrid.tsx`
- `src/components/studio-conversation-room/ConversationRoomRuntime.tsx`
- `src/components/studio-conversation-room/guide/ConversationCheckoutPanel.tsx`
- `src/components/studio-conversation-room/guide/ConversationActivityPanel.tsx`
- `.env.example`
- this report

---

## Tests

```text
npx vitest run src/lib/studio-payment/payment-truth.test.ts
```

Includes: no sandbox fallback on Complete Checkout, reject `mk_` keys, Stripe API failure mapping, mocked hosted URL, sandbox only with `preferSandbox`, payment-truth gates unchanged.

---

## Return

**STRIPE HOSTED CHECKOUT SMOKE UNBLOCKED**

Scout PARKED.

Owner: put a real `sk_test_…` in `.env.local`, restart the server, resume at the payment form, click **Complete Checkout** only.
