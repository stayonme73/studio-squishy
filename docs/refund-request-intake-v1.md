# Refund request intake — V1 (locked intake gate)

**Status:** Intake gate — 2026-07-06  
**Scope:** How client refund requests reach Tagia's Owner Desk — not refund policy wording (see [`docs/help-center-v1-locked.md`](help-center-v1-locked.md)).

---

## Principle

**No blank Owner Desk refund folders.** A refund folder appears only after the client completes structured text intake. The 14-day `refundEligibleAt` signal is internal eligibility only — it does **not** create an Owner Desk folder by itself.

**Complaint ≠ refund.** A complaint never auto-converts to a refund folder.

---

## Client refund request channels (V1)

All channels use the **same intake gate** (`evaluateClientRefundChannelRequest` → `applyClientSubmitRefundRequest`).

| Channel ID | Customer surface | Default event |
|------------|------------------|---------------|
| `squishy_chat_post_payment` | Squishy chat after Secure Checkout | `refund_request` |
| `studio_board_help` | Studio Board — help and project update area | `payment_question` |
| `review_room_message` | Review Room — client message to The Studio | `revision_message` |
| `final_delivery_help` | Final Delivery — help and support area | `general_inquiry` |
| `structured_customer_form` | Any structured customer interaction form | `refund_request` |

**Registry:** `src/config/refund-request-channels.ts`

---

## Text in, voice out (V1)

- **Client input:** typed text only for refund requests. Voice notes and voice input are **rejected** for refund intake on every channel.
- **Squishy output:** Squishy may respond with visible chat text **and** spoken voice/audio — but the client's refund request must be captured as structured text fields before anything routes to Tagia.

Rejected voice prompt (verbatim):

> Refund requests must be typed in text. Please type your refund reason and what outcome you want — voice notes cannot start a refund review.

---

## Required structured fields

| Field | Required | Notes |
|-------|----------|-------|
| Refund reason | Yes | Why the client is asking |
| Requested outcome | Yes | What they want (e.g. full refund, partial, close job) |
| Supporting details | No | Optional context |

**Casual message** (e.g. "I want a refund") without a reason triggers structured intake. Squishy prompt (verbatim):

> I can help start a refund review. I need the reason for the request before I can place it on Tagia's desk.

Intake is incomplete until **both** reason and requested outcome are present.

---

## Routing behavior

1. Any channel message that mentions a refund casually is routed through refund intake — even if the underlying event type is `revision_message`, `payment_question`, etc.
2. Incomplete intake → `respond` (Squishy asks for missing fields); **no** Owner Desk folder.
3. Complete intake → `submit_refund_request` effect → `refund_request` interaction with `refundSnapshot` → Owner Desk folder.
4. Voice input on a refund path → reject with text-only prompt; **no** folder.

**Decision Core:** `src/decision-core/evaluators/incoming-interaction.ts`  
**Channel router:** `src/lib/campaign-tasks/refund-request-routing.ts`  
**Snapshot builder:** `src/lib/campaign-tasks/refund-request-intake.ts`  
**Client API:** `POST /api/campaigns/[campaignId]/jobs/[jobId]/refund-request`

---

## Owner Desk snapshot

Owner sees client reason, requested outcome, policy/production read-only facts, timeline, and **request channel** when recorded.

**Do not modify** Help Center refund eligibility wording or production-started non-refundable enforcement without Tagia approval.

---

## Proof

```bash
npx vitest run src/lib/campaign-tasks/refund-request-routing.test.ts \
  src/lib/campaign-tasks/refund-request-intake.test.ts \
  src/lib/campaign-tasks/refund-request-actions.test.ts \
  src/lib/job-control/owner-desk.test.ts
node scripts/prove-owner-folder-3-remaining.mjs
```

See also [`docs/owner-folder-workflow-needs-my-decision-v1-proof.md`](owner-folder-workflow-needs-my-decision-v1-proof.md).
