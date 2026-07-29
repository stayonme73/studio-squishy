# C8b — Review handoff receipts + locked feedback submissions

**Status:** Local commit approved · awaiting Tagia push authorization
**Protected starting tip:** `04bd9bafbbdecaee36fc5803497b97795f95c70c`
**Contract:** `docs/launch/UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md`
**Prior package:** C8a (`docs/launch/C8A-REVIEW-ROOM-PANEL-CHROME.md`)

## Objective

Close the customer-visible handoff cycle on the existing Job Review spine:

Studio submitted → Customer received → Customer reviewing → Feedback returned

After formal submission, show an immutable customer-visible receipt for the
persisted package.

## Reused submission spine

No new Review Room, stage system, or communication model.

Reused:

- `production-workspace-actions` (`submit_for_owner_approval`, `owner_approve_for_review`)
- `ready_for_review` spine access
- existing activity records + proof `versionLabel`
- `save_feedback` / `request_revision` / `approve_for_delivery`
- `submittedAt` / `submissionType` / `JobReviewFeedback`
- sticky notes, voice notes, drawing sections, section statuses
- existing double-submit gates
- C8a handoff presentation labels
- authoritative Package **7A** `deriveJobCustomerStage` (unchanged)

## Receipt authority

| Receipt | Authority |
|---------|-----------|
| Studio submission | Latest non-client `status_change` → `ready_for_review` (or Review Room `approval` event) + proof `versionLabel` |
| Received by customer | Durable `client_review_received` activity, scoped by `messageRef = release:{releaseActivityId}` |
| Customer reviewing | Presentation over receipt + `hasUnsubmittedReviewDraft(feedback)` |
| Feedback returned / Approved | Persisted `feedback.submittedAt` + `submissionType` |
| Locked package | Persisted submitted `JobReviewFeedback` inventory only |

Missing evidence uses truthful fallbacks (for example “Version label not provided”). No fabricated names, timestamps, or version numbers.

## Authorized-open rule

`Received by customer` is **not** stamped by GET, middleware, prefetch, metadata,
or staff/owner access.

Preferred path implemented:

1. Authorized customer loads Job Review workspace (client component mount).
2. Authenticated `PATCH` `acknowledge_review_received` runs after open.
3. Server requires `isClientOnly(user)`, campaign ownership via `requireReadableCampaign`,
   and `canClientAccessJobReview`.
4. Actor identity comes from the authenticated session — never from the browser body.

## Idempotency rule

- One `client_review_received` per job + Studio release (`messageRef`).
- Refresh / multi-tab re-calls return the existing receipt without appending duplicates
  (`appendJobActivityEvent` id keyed by kind + messageRef).
- Receipt is never silently reset.

## Handoff presentation logic

`resolveC8bHandoffStep` is presentation over records — not a second stage machine.

- Submitted, no receipt → Submitted to customer
- Receipt, no draft → Received by customer
- Receipt + draft activity → Customer reviewing
- `submittedAt` + revision → Feedback returned
- `submittedAt` + approval → Approved

7A derivation remains authoritative for stage IDs; C8b only overlays customer-visible
chain wording and receive evidence.

## Pre-submit summary

Before formal Request Changes / Approve, a confirmation dialog inventories the
current payload (sticky notes, drawings, voice notes, section decisions, version,
action). Empty payloads are stated honestly — not claimed as feedback.

## Immutable submitted-package receipt

After successful `request_revision` / `approve_for_delivery`:

- Shows locked package receipt from persisted feedback
- Editing / resubmit remain blocked by existing `submittedAt` gates
- Project Communication stays available and does not rewrite the package

Read-only view of a submitted package remains available when spine leaves
`ready_for_review` (`canClientViewJobReview`) so the receipt can be reopened.

## Authentication and ownership

- Session required
- Campaign read ownership enforced server-side
- Staff/owner cannot create customer receipt
- Wrong customer cannot read foreign campaign review APIs

## Automated proof

Focused C8b + regression suite (see return packet for exact commands/totals).

## Browser / viewport proof

**Automated behavior is proven.** Full Customer-One browser certification is
**not** claimed.

**Live environment check (2026-07-28):** authenticated browser reached Review
Room only as **No Active Project** for `client-a@local.dev` on
`http://127.0.0.1:3000/feedback-studio`. A prepared ready-for-review job was
not available. Scenarios A–F therefore remain **pending Tagia Customer-One
certification** — an explicit package limit, not hidden evidence of browser
proof.

Automated proof covers receipt authority, authorized-open, idempotency,
handoff steps, inventory, locked package, double-submit, staff rejection, and
unchanged 7A derivation.

When a prepared Job Review release exists, Tagia Customer-One cert of
Scenarios A–F should verify:

- ~1440px desktop and ~390px phone
- work remains central; handoff chain readable; receipt does not bury preview
- confirmation usable; no horizontal overflow; PROJECT COMMUNICATION usable
- signed-out / wrong-customer / staff-open checks for receipt stamping

## Explicit exclusions (honored)

- Correction-entitlement counting / revision payment / additional-scope
- Highlighter / version comparison
- Delivery route merge / Lobby reconstruction
- New Project Communication model / new Review Room shell
- Second stage system / Materials / Project Claim
- Timeout / sign-out / Auth changes
- Master Launch List update
- Replacement of 7A / changes to protected C8a COMM behavior

## Remaining limits

- Concurrent multi-tab races rely on messageRef idempotency after both reads;
  durable store write ordering is not a distributed lock.
- Prefetch of the workspace JS alone does not stamp receipt; only the mounted
  client PATCH path does. GET remains read-only.
- Full browser Scenarios A–F remain uncertified pending a prepared
  ready-for-review Customer-One job. Do not treat this package as
  browser-proven.

## Customer-One impact

Customers can see and prove the full handoff cycle and keep an immutable record
of what they formally submitted, without inventing a second review system.
