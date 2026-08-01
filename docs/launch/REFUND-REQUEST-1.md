# REFUND-REQUEST-1

**Status:** DEFINED · **CONSTRUCTION NOT AUTHORIZED**  
**Type:** Construction package definition (docs only until separately authorized)  
**Definition base / protected tip:** `9730bef6bb82c7def113b01ec069987134073a17`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Payment room (customer Refund Request intake)  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior inspection:** REFUND-UI-INSPECT-1 — **COMPLETE · CLOSED**  
**Prior sealed room:** Unified Review / Final / Delivery — **UR-ROOM-CERT-1 SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

---

## Objective

Deliver the smallest truthful **customer refund-request intake** for Customer-One: a post-payment surface that submits **reason** and **requested outcome** to the **existing** refund-request API, with honest confirmation and blocked/duplicate states — **without** claiming money movement, amounts, settlement, or a full customer refund status machine.

**This definition does not authorize construction.** After this definition is sealed, Tagia must separately authorize construction.

---

## Locked truth from REFUND-UI-INSPECT-1

| Finding | Lock |
|---|---|
| Customer refund-request API | **Exists** — reuse; do not invent a parallel endpoint |
| Customer Refund UI | **Did not exist** — this package adds intake only |
| Owner approve / deny | **Exists** — Owner Desk; not rebuilt here |
| Provider-side refund execution | **Absent** — out of this package |
| Amount / partial / provider ref / provider-failure | **Absent** — out of this package |
| “Approved” / internal `refund_issued` | Must **never** be presented as “money returned” |
| Authorities | Prefer existing job activity · communication · decision records — **no second refund ledger** |
| Dirty checkout / payment files | **Collision risk** — first construction must **avoid** them |

---

## In scope (when construction is later authorized)

1. **Post-payment customer Refund Request surface** placed outside dirty checkout/payment WIP paths (do not edit `src/app/checkout/page.tsx`, `SecureCheckoutPageScene.tsx`, `PaymentCheckoutScene.tsx` for this slice unless Tagia later re-authorizes collision handling).
2. **Authenticated submission** to existing `POST /api/campaigns/[campaignId]/jobs/[jobId]/refund-request`.
3. Intake fields supported by existing authority: **reason** and **requested outcome** (plus optional supporting details only if the existing API/snapshot already accepts them — do not invent new required fields).
4. Truthful **submission confirmation**: e.g. “Your request was submitted for review.”
5. Honest handling for outcomes returned or inferable from existing authority without inventing a persistent status panel:
   - **unavailable**
   - **already submitted** / duplicate
   - **pending owner review**
   - **already decided**
   - **non-refundable** or otherwise **blocked** by existing authority (e.g. production-started / `nonRefundable` responses)
6. Preserve locked Help Center / policy wording: **“may be eligible”** / **“may be approved”** — do not harden to guarantees.
7. **Desktop and phone** certification required before seal (when construction is authorized).
8. Extend existing refund-request / interaction / activity authorities only as needed for intake UI — **no** parallel refund ledger.

---

## Mandatory truth language

### May say (when supported)

- “Your request was submitted for review.”
- “The owner is reviewing your request.”
- “Your request was approved” — **only** when the owner-decision record supports that statement.
- “Your request was denied” — **only** when supported.

### Must not say

- “Your refund has been processed.”
- “Your money has been returned.”
- “Funds will arrive in X days.”
- Any **amount**, **provider**, **settlement**, **timeline**, or **partial-refund** claim.

---

## Explicitly out of this slice

| Out | Why |
|---|---|
| Persistent customer refund-**status panel** | Separate possible package after this slice seals — avoid inventing a full state machine from interaction flags + job spine |
| Customer-safe refund **history** | Later package |
| Provider execution · amounts · failures · partial refunds | Separate future payment-provider program |
| Unified Room reopen / correction / review-room edits | Sealed; out of Payment intake |
| PAGE-TABS-1 · Materials dual UX · project-wide Gate #17 | Out of scope |

### Honest sequence after this package

1. **REFUND-REQUEST-1** (this package) — intake  
2. Inspect sealed result → decide whether a separate customer status readout is still needed  
3. Customer-safe refund history later  
4. Provider execution / amounts / failures / partials only in a separate payment-provider program  

---

## Hard exclusions

- No provider calls or provider dependency changes  
- No invented eligibility, amounts, approvals, timelines, provider success, or money-returned claims  
- No second refund ledger  
- Do not reopen UR-ROOM-CERT-1 or sealed Review siblings without contradictory evidence  
- No PAGE-TABS-1 · no Board Materials · no project-wide Gate #17 work  
- Leave all **113** unrelated dirty WIP entries untouched  
- Do not absorb dirty checkout/payment quarantine WIP into this package  

---

## Certification (when construction is authorized)

| Layer | Required |
|---|---|
| Unit | Intake validation · API success/error mapping · no amount/provider invention in copy |
| Integration | Authenticated POST creates owner-review interaction · duplicate/decided/blocked paths honest |
| Browser | Desktop + phone · submit confirmation · blocked/duplicate states · Help Center “may…” preserved |
| Evidence | Screenshots · test pass list · **limits appendix** (no provider · no amount · no money returned · no persistent status panel) |

Intended outcome class when sealed: **BROWSER-CERTIFIED WITH EXPLICIT LIMITS** (or equivalent honest class Tagia accepts).

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation that defines **REFUND-REQUEST-1**. After this definition is sealed, **construction remains blocked**.

### Construction

Scout remains parked for construction until Tagia explicitly authorizes **REFUND-REQUEST-1**.

Until then: definition may be sealed · open construction package **none** · product tip holds at protected control point `9730bef6bb82c7def113b01ec069987134073a17`.

---

*End of REFUND-REQUEST-1 definition. Construction not authorized.*
