# STUDIO-OPERATING-PAYMENT-TRUTH-1 REPORT

**Package:** Make money truth authoritative before controlled paid-project testing  
**Branch:** `operating/payment-truth-1`  
**Starting tip:** `2988341962a8c0f186e187dbf78c28a23a0c75f0`  
**Inspection base:** STUDIO-OPERATING-LAUNCH-READINESS-INSPECTION-1 (VERDICT B accepted)  
**Owner processor decision:** **Stripe Checkout (hosted)**  
**Status:** READY FOR OWNER REVIEW  
**Scout:** PARKED  
**Git:** No commit · No push · No merge  
**Kitchen / Assurance:** Frozen (untouched)

---

## 1. Starting control point

| Item | Value |
|------|--------|
| Base tip | `2988341962a8c0f186e187dbf78c28a23a0c75f0` |
| Branch | `operating/payment-truth-1` |
| Accepted blockers | No live processor · client sync invents paid · legacy mark-paid without CLEAR |
| Provider decision | Stripe · Checkout hosted |

---

## 2. Existing payment inventory

| Path / artifact | Class | Disposition |
|-----------------|-------|-------------|
| Conversation Room checkout | LIVE UI | Now starts Stripe Checkout / sandbox-confirm |
| `markPaymentReceived` | LIVE mutation | Gated — `processor` or `test_fixture` only |
| Pre-acceptance CLEAR gate | LIVE (sealed) | Required before session create (server re-eval) |
| `payment-sandbox` local mark-paid | SANDBOX | Removed — server `/api/payments/sandbox-confirm` only |
| `/checkout` redirect | LEGACY | Still redirects to CR |
| `CheckoutScene` bare mark-paid | LEGACY | Quarantined — cannot invent paid; returns to CR checkout |
| Customer sync `paymentReceivedAt` | LIVE fail-open | **Locked down** — ignored from client |
| Stripe SDK / webhooks | Was ABSENT | **Added** |

---

## 3. Processor/provider finding

| Item | Value |
|------|--------|
| Selected | **Stripe** |
| Integration | **Checkout Session (hosted)** — not Payment Intents / Elements |
| Authority | Verified webhook + server session retrieve (reconcile) |
| Construction charges | **None** — tests use mocks / sandbox confirm; live keys forbidden in `NODE_ENV=test` |

---

## 4. Files changed

**Config / types**
- `src/config/studio-payment-v1.ts` (new)
- `src/config/studio-board.ts` — `paymentTruth` field
- `src/config/payment.ts` — honest Stripe copy
- `.env.example` — Stripe env names + webhook setup
- `package.json` / lock — `stripe` dependency

**Payment core**
- `src/lib/studio-payment/*` — amount, create-session, confirm, webhook, reconcile, sandbox-confirm, events-store, client, tests

**API**
- `POST /api/payments/checkout-session`
- `POST /api/payments/webhook`
- `GET /api/payments/reconcile?session_id=`
- `POST /api/payments/sandbox-confirm`

**Lockdown / UI**
- `src/lib/campaign-store/customer-sync-allowlist.ts` (+ tests)
- `src/lib/studio-board-campaign.ts` — authority gate + `applyServerPaymentTruthToLocalCampaign`
- `src/lib/payment-sandbox.ts`
- `ConversationRoomRuntime.tsx`, `SecureCheckoutGrid.tsx`, `CheckoutScene.tsx`, `ConversationCheckoutPanel.tsx`

**Report**
- `docs/launch/studio-operating-payment-truth-1/STUDIO-OPERATING-PAYMENT-TRUTH-1-REPORT.md`

---

## 5. Authoritative payment model

```
CLEAR_TO_ACCEPT (server re-evaluates posted facts)
→ POST /api/payments/checkout-session
   · server derives amount/currency/SKUs
   · binds Checkout Session metadata + local session binding file
→ customer pays on Stripe hosted page
→ Stripe webhook checkout.session.completed (signature verified)
   OR GET /api/payments/reconcile (delayed webhook)
→ confirmPaymentFromProcessor → durable Campaign Record paid truth
→ client may applyServerPaymentTruthToLocalCampaign only from that response
```

Invariant preserved: **UI success page ≠ proof of payment.**

---

## 6. CLEAR binding

- Session create calls `evaluatePreAcceptance(facts)` on the server (not browser sessionStorage).
- Non-CLEAR → `403 clear_required`.
- Binding stores `decisionId`, `factFingerprint`, `draftRevision`, SKUs, amount.
- Stripe metadata carries the same ids (short values).
- Durable `preAcceptancePaymentAuthorization` written at confirmation.

---

## 7. Amount/currency truth

- Server: `deriveCheckoutAmountCents` → `computePlanPricingTotals` → `amountDueTodayCents`.
- Stripe `line_items.price_data.unit_amount` set from that value.
- Confirmation requires `confirmedAmountCents === expectedAmountCents` and currency `usd`.
- Client-posted amounts are not trusted.

---

## 8. Project/SKU binding

- Session binding file: `data/payment-sessions/{sessionId}.json` → `campaignId` + SKUs + decision.
- Confirmation fails on campaign mismatch, SKU mismatch, decision mismatch, or session reuse on another project.
- Local apply refuses a different `campaignId` than the browser campaign.

---

## 9. Client-sync lockdown

`mergeCustomerOwnedCampaignSync` **never** accepts from client:
- `paymentReceivedAt`
- `paymentTruth`
- `preAcceptancePaymentAuthorization`

Tests cover bootstrap forge + merge forge.

---

## 10. Legacy checkout disposition

| Path | Disposition |
|------|-------------|
| `markPaymentReceived` without authority | Returns `null` (blocked) |
| `SecureCheckoutGrid` without `onPaymentComplete` | Fail-closed message — no paid mutation |
| `CheckoutScene` | Routes back to CR checkout — no mark-paid |
| Sandbox simulate | Stub returns `null`; must use sandbox-confirm API |
| Dual brains | When Stripe keys present, sandbox-confirm is disabled |

---

## 11. Idempotency

- Processed events stored in `data/payment-events/{eventId}.json`.
- Duplicate webhook / sandbox confirm → `alreadyPaid: true`, no second activation side effects from this package.
- Same confirmed session is safe to re-process.

---

## 12. Successful-payment durable record

On confirm, Campaign Record holds:
- `paymentReceivedAt`
- `paymentTruth` — processor, status, amounts, currency, session/intent ids, event id, SKUs, decision id, fingerprint, sandbox flag
- `preAcceptancePaymentAuthorization`
- status `PAYMENT_RECEIVED` (or `BUILDING_CONCEPTS` if intake already complete)

No card details or secret keys stored.

---

## 13. Failure/cancel behavior

- Cancel return (`payment=cancel`) → unpaid, project preserved, retry allowed.
- Failed/expired Stripe session via reconcile → unpaid.
- Amount/SKU/project/signature failures → reject, unpaid.

---

## 14. Success-route behavior

- Return URL: `/studio-conversation-room?stage=checkout&payment=return&session_id=…`
- Shows pending copy; polls **reconcile** (server Stripe retrieve).
- Advances to Intake only after server paid truth applied locally.
- Reaching the URL without payment keeps the project unpaid.

---

## 15. Post-pay activation trigger

Clean trigger for the next operating layer:

**`paymentReceivedAt` + `paymentTruth.status === "confirmed"`** on the Campaign Record (server SoR).

No Machine dispatch / producer automation in this package.

---

## 16. Refund compatibility

- Existing Owner refund judgment path unchanged (regressions green).
- New `paymentTruth.checkoutSessionId` / `paymentIntentId` are sufficient identity for later provider refund handling.
- Routine capture ≠ Owner refund decision.

---

## 17. Owner-independence

Routine path after credentials are configured:

CLEAR → open checkout → customer pays on Stripe → webhook/reconcile → paid record  

**Tagia action: NONE**

Owner setup (account + env vars + webhook endpoint) is acceptable one-time configuration — not routine “mark paid.”

---

## 18. Failure-recovery result

| Scenario | Handling |
|----------|----------|
| A Webhook delayed | Reconcile retrieves session and confirms |
| B Duplicate webhook | Idempotent event store |
| C Invalid signature | 400 reject |
| D Amount mismatch | Fail closed |
| E Wrong project/SKU | Fail closed |
| F Client forges payment field | Sync ignore + local mark blocked |
| G Browser closed after pay | Webhook still confirms server record |
| H Success route without pay | Remains unpaid |

---

## 19. Security / credentials

**Exact variable names (do not paste values; do not screenshot secrets):**

| Variable | Side |
|----------|------|
| `STRIPE_SECRET_KEY` | Server only |
| `STRIPE_WEBHOOK_SECRET` | Server only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable client key only |
| `STRIPE_MODE` | Optional `test` \| `live` (else inferred from `sk_` prefix) |

### Owner setup steps (no secrets in chat)

1. Create / open Stripe account.  
2. Developers → API keys → copy **test** secret + publishable keys into `.env.local`.  
3. Developers → Webhooks → Add endpoint:  
   `https://<your-host>/api/payments/webhook`  
   Event: `checkout.session.completed`  
   Copy signing secret → `STRIPE_WEBHOOK_SECRET`.  
4. For local webhook testing: Stripe CLI `stripe listen --forward-to localhost:3000/api/payments/webhook`.  
5. Keep live keys out of CI/tests. Construction uses test keys or keyless sandbox-confirm.

---

## 20. Test vs live mode

| Mode | How |
|------|-----|
| Unit tests | No network charge; mocked Stripe create; sandbox-confirm when keys unset; live `sk_live_` throws in `NODE_ENV=test` |
| Local without Stripe keys | Sandbox session + `/api/payments/sandbox-confirm` (same confirm path, `sandbox: true`) |
| Stripe test mode | `sk_test_…` + test webhook secret — cards from Stripe test docs |
| Live mode | `sk_live_…` — real money; not used in this package |

Accidental live charging in tests: blocked by `assertStripeSafeForTests`.

---

## 21. Tests/result

```
src/lib/studio-payment/payment-truth.test.ts — 11 passed
src/lib/campaign-store/customer-sync-allowlist.test.ts — 4 passed
src/lib/studio-board-campaign.test.ts — 9 passed
src/lib/studio-pre-acceptance/pre-acceptance.test.ts — 25 passed
src/lib/campaign-store/dual-write.test.ts — 1 passed
Assurance regressions (pre-acceptance, material-use, approved-delivery, review-eligibility, rights-release, refund) — 101 passed
```

Covered: CLEAR required · amount server-derived · mismatch reject · reuse reject · invalid signature · sync forge reject · legacy mark blocked · idempotent sandbox confirm · Stripe metadata bind (mock) · live mode forbidden in tests.

---

## 22. Operating blockers closed

1. No live payment processor → **Stripe Checkout authority present** (credentials Owner-configured).  
2. Client sync invents `paymentReceivedAt` → **closed**.  
3. Legacy local paid mutation bypass → **closed / quarantined**.

---

## 23. Remaining operating blockers

From Operating Inspection (parked — not this package):
- Staff File Room not auto-cook / Machine dispatch
- ElevenLabs / Shotstack / Netlify not job-API wired
- Board-only notify (`pending_owner_send`)
- Project Claim unfinished
- Voice not post-pay status desk

Payment credentials must still be installed by Owner before controlled external paid testing.

---

## 24. Launch limits

- No real charges performed in this construction package.  
- Without Stripe keys, only sandbox-confirm (dev/test/preview) can establish paid truth — never production live money.  
- Hosted Checkout UI replaces fake card fields as the payment authority path; decorative card inputs remain presentation-only until removed in a later UX pass.

---

## 25. Backtrack impact

Low–medium: payment confirm path changed; Assurance / Kitchen not reopened. Local `markPaymentReceived` callers must pass authority (tests updated). Client sync can no longer bootstrap paid campaigns — unpaid server create until webhook/reconcile.

---

## 26. Git state

| Item | Value |
|------|--------|
| Branch | `operating/payment-truth-1` |
| Commit / push / merge | **none** (per order) |
| Working tree | payment-truth implementation + report uncommitted |

---

## 27. Recommended next step

**Exactly one — do not start until Owner authorizes:**

### Owner installs Stripe test credentials + webhook, then seals this package

1. Add test keys to `.env.local` (names in §19).  
2. Forward webhook with Stripe CLI.  
3. Smoke one Stripe test-card Checkout (still test mode).  
4. Owner/Manager authorize commit/seal of `STUDIO-OPERATING-PAYMENT-TRUTH-1`.

Do **not** open dispatch/notify/Claim until money truth is sealed and credential smoke is green.

---

## READY FOR OWNER REVIEW

Scout PARKED.
