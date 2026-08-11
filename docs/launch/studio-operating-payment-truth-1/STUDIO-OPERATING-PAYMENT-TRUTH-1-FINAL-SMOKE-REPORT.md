# STUDIO-OPERATING-PAYMENT-TRUTH-1 — FINAL SMOKE REPORT

**Package:** STUDIO-OPERATING-PAYMENT-TRUTH-1  
**Branch:** `operating/payment-truth-1`  
**Base tip (branch start):** `2988341`  
**Inspection:** Live Stripe **test-mode** hosted Checkout → webhook → durable paid record  
**Money:** No live charges (Stripe test mode)  
**Status:** **READY FOR OWNER REVIEW**  
**Scout:** PARKED  
**Git:** No commit · No push · No merge  

---

## 1. Stripe sandbox checkout result

| Item | Result |
|------|--------|
| Path | Studio Complete Checkout → Stripe-hosted Checkout → test card once |
| Checkout Session | `cs_test_a1t1C2ZWa1WCQNDawG0oZJUKpgvZENNs8I9Hf6pATZ4o0z8UhpwfyRDW1w` |
| Campaign / project | `992e635b-77a5-44d5-a414-492e7076fc6c` |
| Session create | `POST /api/payments/checkout-session` **200** |
| Hosted Checkout | Opened (Owner completed test payment) |

---

## 2. Webhook event / result

| Item | Result |
|------|--------|
| Event | `checkout.session.completed` |
| Event id | `evt_1U34mBDg0y2sWyeqPgiWuymo` |
| Forward | Stripe CLI → `POST http://localhost:3000/api/payments/webhook` |
| HTTP | **200** |
| Processed kind | `stripe_webhook` |
| Processed at | `2026-08-11T01:46:48.267Z` |
| Durable event file | `data/payment-events/evt_1U34mBDg0y2sWyeqPgiWuymo.json` **exists (1)** |

---

## 3. Durable payment record

Server campaign file: `data/campaigns/992e635b-77a5-44d5-a414-492e7076fc6c.json`

| Field | Value |
|-------|--------|
| `paymentReceivedAt` | `2026-08-11T01:46:48.263Z` |
| `campaignStatus` | `PAYMENT_RECEIVED` |
| `paymentTruth.processor` | `stripe` |
| `paymentTruth.status` | `confirmed` |
| `paymentTruth.currency` | `usd` |
| `paymentTruth.expectedAmountCents` | `11800` |
| `paymentTruth.confirmedAmountCents` | `11800` (**match**) |
| `paymentTruth.checkoutSessionId` | matches smoke session |
| `paymentTruth.paymentIntentId` | present (`pi_…`, redacted in chat) |
| `paymentTruth.stripeEventId` | `evt_1U34mBDg0y2sWyeqPgiWuymo` |
| `paymentTruth.selectedServiceIds` | `v2-rtu-business-card`, `v2-rtu-flyer` |
| `paymentTruth.decisionId` | `pa-9da625e9-c3cb-4913-8d0a-c361b88dd84e` |
| `paymentTruth.factFingerprint` | `pa:8e2ef1b2` |
| `paymentTruth.draftRevision` | `27` |
| `paymentTruth.sandbox` | `false` (Stripe test Checkout — **not** local sandbox-confirm fixture) |
| Studio note | single “Payment confirmed by Stripe.” |

Session binding (`data/payment-sessions/…`) matches campaign id, amount `11800`, SKUs, decision id, fingerprint, revision.

---

## 4. Amount / currency / SKU / project binding

| Check | Pass |
|-------|------|
| Expected = confirmed amount | Yes (`11800` / `11800`) |
| Currency `usd` | Yes |
| SKUs = binding = `paymentTruth` | Yes (business card + flyer) |
| Campaign id bound on session + event + campaign | Yes (`992e635b-…`) |
| One campaign file for this id | Yes |

---

## 5. CLEAR decision binding

| Check | Pass |
|-------|------|
| Session `decisionId` | `pa-9da625e9-…` |
| Campaign `preAcceptancePaymentAuthorization.decisionId` | same |
| Outcome | `CLEAR_TO_ACCEPT` |
| `paymentAuthorized` | `true` |
| Fingerprint | `pa:8e2ef1b2` (session + auth + paymentTruth) |

---

## 6. Duplicate / idempotency

| Check | Result |
|-------|--------|
| Event files for smoke evt | **1** |
| Session files for smoke cs | **1** |
| Campaign files for smoke id | **1** |
| Payment-confirmed notes | **1** |
| Code path | Re-process returns `alreadyPaid: true` without duplicating paid mutation (covered in payment-truth suite) |

No duplicate jobs/records observed for this smoke.

---

## 7. Browser-return authority

| Observation | Evidence |
|-------------|----------|
| Webhook wrote paid first | `paymentReceivedAt` ≈ event `processedAt` (same second) |
| Return URL after webhook | Dev log: webhook **200**, then `?payment=return&session_id=…` |
| Reconcile | `GET /api/payments/reconcile?session_id=…` **200** — reads already-paid campaign when `paymentReceivedAt` set; does not invent authority from the page alone |
| Conclusion | Durable paid state from **webhook confirm path**; browser return is non-authoritative |

---

## 8. Client-sync lockdown

| Check | Result |
|-------|--------|
| Allowlist | Client sync cannot invent/upgrade `paymentReceivedAt`, `paymentTruth`, or `preAcceptancePaymentAuthorization` |
| Smoke log | `PATCH /api/campaigns/current` **401** (unsigned-in) → sync skipped — client could not push paid truth |
| Unit proof | `payment-truth` + `customer-sync-allowlist` tests green |

---

## 9. Routine Owner action

**Tagia action after credential/setup: NONE**

No manual mark-paid. Successful path is automatic: hosted Checkout → webhook → durable `paymentTruth`.

---

## 10. Regressions re-run

```text
npx vitest run \
  src/lib/studio-payment/payment-truth.test.ts \
  src/lib/studio-payment/hosted-checkout-ui.test.ts \
  src/lib/studio-pre-acceptance/pre-acceptance.test.ts \
  src/lib/refund-request-route.test.ts \
  src/lib/campaign-tasks/refund-request-actions.test.ts \
  src/lib/campaign-tasks/refund-request-routing.test.ts \
  src/lib/conversation-room-operating-smoke.test.ts \
  src/lib/studio-approved-delivery/approved-delivery.test.ts \
  src/lib/job-control/final-delivery.test.ts \
  src/lib/campaign-store/customer-sync-allowlist.test.ts
```

**Result:** all selected suites green (**74** in the primary payment/refund/CR batch; Assurance-adjacent suites also passed in the follow-up run).

Includes: payment-truth, hosted single-entry (no Studio card fields), pre-acceptance CLEAR gate, refund routes/actions, CR operating smoke.

---

## 11. Remaining payment blockers (non-seal-breakers for this package)

| Item | Notes |
|------|--------|
| Unsigned-in campaign sync 401 | Expected in anonymous smoke; server webhook still wrote durable paid truth. Signed-in sync / Board handoff is a later operating concern, not missing paid authority. |
| Uncommitted package work | Branch has large uncommitted payment-truth + CR regression set — Owner seal/commit when accepted. |
| Live (sk_live) money | Not exercised — correctly out of scope. |

No remaining blocker to **accepting that Stripe test Checkout → webhook → durable paymentTruth works**.

---

## 12. Git state

| Item | Value |
|------|--------|
| Branch | `operating/payment-truth-1` |
| HEAD | `2988341` (package work **uncommitted**) |
| Commit / push / merge | **None** (per Owner) |

---

## 13. Seal recommendation

**Recommend Owner accept STUDIO-OPERATING-PAYMENT-TRUTH-1** on the strength of:

1. Live Stripe test hosted Checkout completion  
2. Verified `checkout.session.completed` → webhook **200**  
3. Durable server `paymentReceivedAt` + `paymentTruth` bound to campaign, amount, SKUs, CLEAR decision  
4. Idempotent event processing; browser return non-authority; client sync lockdown  
5. Regression suites green  

Suggested seal action (Owner only): commit the payment-truth package on `operating/payment-truth-1` when ready — Scout did not commit.

---

## Return

**READY FOR OWNER REVIEW**

Scout PARKED.
