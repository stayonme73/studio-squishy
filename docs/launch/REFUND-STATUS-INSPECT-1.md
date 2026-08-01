# REFUND-STATUS-INSPECT-1

**Status:** DEFINED · **INSPECTION NOT AUTHORIZED**  
**Type:** Inspection package definition (docs only until separately authorized)  
**Definition base / protected tip:** `b2941db1f1dbbe03580b3c6173aa2e79af0039fc`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Payment room (customer refund-request status return path)  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior sealed package:** REFUND-REQUEST-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `f60ee491…`  
**Prior inspection:** REFUND-UI-INSPECT-1 — **COMPLETE · CLOSED**

---

## Objective

Inspect whether Customer-One needs a **persistent refund-request status surface** after intake — and what existing authorities can **truthfully** support when a customer returns later.

Intake is sealed: a customer can submit a request for owner review. This package asks whether they can return and understand what happened without inventing money movement, amounts, settlement, or a second refund ledger.

**Avoid a “message in a bottle”** — but do **not** invent a status machine the records cannot support.

**This definition does not authorize the inspection run.** After the definition is sealed, Tagia must separately authorize inspection. Status UI construction remains blocked until sealed inspection evidence plus separate construction authorization.

---

## Why inspect before status UI

REFUND-REQUEST-1 proves submission for owner review. It does **not** prove a durable customer-visible status path. Building a status panel first risks:

- Inventing request → pending → approved → “processed” states the API cannot expose  
- Surfacing owner-internal notes as customer copy  
- Treating `refund_issued` / spine `refunded_cancelled` as “money returned”  
- Creating a parallel refund status store  

**Inspect the return path before installing a status dashboard.**

---

## Locked inspection questions (when authorized)

Scout must answer from the repo and sealed Help Center / Payment / refund authorities — **without inventing eligibility, amounts, approvals, timelines, provider success, money-returned, or completion claims**, and **without calling payment providers**:

1. **Where** the customer could revisit a submitted refund request (Studio Board Refund Request card · Help Center · elsewhere).  
2. Whether any **existing API** exposes enough data for a customer-safe readout (GET vs POST-only; tasks envelope fields redacted from customers).  
3. How to distinguish, using **existing authorities only**:  
   - request received  
   - pending owner review  
   - additional information requested  
   - decision recorded  
   - unavailable or blocked  
4. Whether **approved** and **denied** can be exposed without revealing internal notes / Owner Desk internals.  
5. Whether generic **“already decided”** (intake 422) can be replaced with a more useful truthful result when records support it.  
6. Whether a **new customer-safe read endpoint** is required (prefer extending existing authorities if a read path is justified).  
7. Which records remain authoritative:  
   - `OwnerDecisionInteractionRecord` / refund snapshot  
   - owner decision timestamps / outcomes  
   - job spine (`refunded_cancelled`, production / non-refundable flags)  
   - `JobActivityEvent` / communication records  
8. Whether status belongs **inside the existing Studio Board Refund Request card** vs a separate surface.  
9. Whether **refund history** is necessary for Customer-One now, or remains deferred.  
10. Dirty-WIP overlap (checkout/payment and related) — report only; do not touch.  
11. Smallest truthful construction package or package sequence (or **no construction** if status is not required / not supportable).  
12. Required unit · integration · browser · evidence certification if construction is warranted.  
13. Classification of each gap as **launch blocker**, **acceptable certified limit**, or **later enhancement**.

---

## Hard locks for this definition

| Lock | Rule |
|---|---|
| Inspection first | No status UI construction from this definition |
| Existing authorities only | Prefer interaction · owner decision · job spine · activity · communication — **no new refund ledger** |
| No invention | No money-returned · amount · partial · settlement · timeline · provider success claims |
| No provider calls | No payment-provider API calls · no dependency installs |
| Placement preference | Evaluate reuse of Studio Board Refund Request card before inventing a new room |
| Sealed siblings | Do **not** reopen REFUND-REQUEST-1, REFUND-UI-INSPECT-1, or UR-ROOM-CERT-1 without contradictory evidence |
| Out of scope | No PAGE-TABS-1 · no Board Materials · no project-wide Gate #17 · no checkout/payment-file edits |
| Dirty WIP | Leave all **113** unrelated entries untouched |
| Construction combination | Undecided until inspection evidence |

---

## Authorities to consult (read-only when inspection is authorized)

| Authority | Why |
|---|---|
| `POST …/refund-request` + `applyClientSubmitRefundRequest` | What write path creates today |
| `OwnerDecisionInteractionRecord` / refund snapshot / statuses | Pending · ask-client · resolved |
| Owner approve / deny / hold / ask-client actions | Decision outcomes and timestamps |
| Job spine + `refundOwnerDecisionAt` / `nonRefundable` / `productionStartedAt` | Terminal and blocked signals |
| `JobActivityEvent` / communication outbox | Audit trail — customer-safe filter? |
| Studio Board Refund Request card (`REFUND-REQUEST-1`) | Natural return-path candidate |
| Customer Update History (excludes `kind: "refund"` today) | Whether history can host status later |
| Dirty tree | Overlap report only |

---

## Required inspection output (when authorized)

1. Repo verification (tip · sync · staging · dirty count)  
2. Customer return-path map  
3. Existing read/write API truth (what customers can load today)  
4. State matrix for: received · pending · additional info requested · decision recorded · unavailable/blocked — EXISTS / PARTIAL / ABSENT with evidence  
5. Approved / denied exposure safety (internal-note leakage risk)  
6. Read-endpoint recommendation: reuse · extend · new · or none  
7. Authoritative record map (no second ledger)  
8. Placement recommendation (Board refund card vs other)  
9. Refund history: now vs deferred  
10. Dirty-WIP overlap assessment  
11. Smallest construction package sequence **or** honest “no status UI for Customer-One” limit  
12. Certification plan if construction is warranted  
13. Blocker vs acceptable limit vs later enhancement register  
14. Explicit non-claims (especially no financial completion)

---

## Hard exclusions

- No status UI construction or visual design package  
- No payment-provider calls or provider dependency changes  
- No invented eligibility, refund amounts, approval authority, timelines, provider success, or money-returned claims  
- No new refund ledger  
- No checkout/payment-file edits  
- Do not reopen sealed Unified Room or sealed refund siblings without contradictory evidence  
- No PAGE-TABS-1 · no Board Materials · no project-wide Gate #17 work  
- No staging, commit, push, cleanup, restore, or format of dirty WIP during inspection  
- Leave all **113** unrelated dirty WIP entries untouched  

---

## Room sequence context

| Step | Status |
|---|---|
| Unified Review / Final / Delivery | **SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS** · UR-ROOM-CERT-1 |
| REFUND-UI-INSPECT-1 | **COMPLETE · CLOSED** |
| REFUND-REQUEST-1 | **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `f60ee491…` |
| **REFUND-STATUS-INSPECT-1** | **This package** — defined; inspection waits |
| Status UI construction | **Not authorized** until inspection seals + Tagia authorizes |
| Payment-room certification | Later, with explicit limits |
| Project-wide Gate #17 | **Not** claimed by this package |

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation that defines **REFUND-STATUS-INSPECT-1**. After this definition is sealed, **inspection remains blocked**.

### Inspection

Scout remains parked for inspection until Tagia explicitly authorizes **REFUND-STATUS-INSPECT-1**.

### Construction

No refund-status UI is opened by this definition. Any later UI requires:

1. Sealed inspection evidence  
2. Explicit Tagia construction authorization  
3. Honest blocker vs limit classification from that evidence  

Until then: definition may be sealed · open construction package **none** · open inspection package **none** · product tip holds at protected control point `b2941db1f1dbbe03580b3c6173aa2e79af0039fc`.

---

*End of REFUND-STATUS-INSPECT-1 definition. Inspection not authorized.*
