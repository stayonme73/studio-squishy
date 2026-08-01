# REFUND-REQUEST-1

**Status:** SEALED · **BROWSER-CERTIFIED WITH LIMITS**  
**Type:** Construction package (sealed)  
**Sealed tip / protected implementation commit:** `f60ee4911a2e6c076e8f00a632401257aee7be86`  
**Subject:** `feat: add customer refund request intake on studio board`  
**Definition tip:** `eb03a74f971dc171278ce023d1528425437a818f`  
**Accepted:** 2026-08-01 · Tagia  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Payment room (customer Refund Request intake)  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior inspection:** REFUND-UI-INSPECT-1 — **COMPLETE · CLOSED**  
**Prior sealed room:** Unified Review / Final / Delivery — **UR-ROOM-CERT-1 SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

---

## Accepted result

| Field | Value |
|---|---|
| Outcome | **BROWSER-CERTIFIED WITH LIMITS** |
| Unit | **18 PASS / 0 FAIL** (mapping + refund route/actions/intake + owner-decision focused set) |
| Browser | **10 PASS / 0 FAIL** (temp harness removed after run) |
| Desktop | 1440 × 900 |
| Phone | 390 × 844 |
| Product construction | Intake UI only — no provider / amount / status panel |
| Launch-blocking defect | **None** |

**Carried truth boundary (LOCKED):**

> The customer can submit a refund request for owner review. The system does not execute, settle, or confirm completion of a financial refund.

---

## Delivered behavior

| Element | Truth |
|---|---|
| Customer entry | Studio Board — **REFUND REQUEST** section below Project Communication |
| Visibility | Post-payment only (`paymentReceivedAt`) |
| API | Existing `POST /api/campaigns/[campaignId]/jobs/[jobId]/refund-request` |
| Channel | `studio_board_help` |
| Intake fields | Reason · requested outcome · optional supporting details |
| Success copy | “Your request was submitted for review.” |
| Policy language | Help Center “may be eligible” / “may be approved” preserved |
| Checkout/payment dirty files | **Untouched** (collision avoided) |
| Temp cert harness | **Removed** before product seal |

### Honest state handling (intake slice)

| State | Behavior |
|---|---|
| Unavailable | No campaign / not paid / no selectable jobs |
| Submitted | Confirmation for owner review |
| Already submitted / pending | 409 → already submitted + owner reviewing |
| Already decided | 422 → “A refund decision has already been recorded for this job.” (no invented approved/denied) |
| Production started | Warning: cannot be approved under current project status; submit still allowed under existing API |

---

## Explicit certified limits (LOCKED on seal)

1. **No** provider-side refund execution  
2. **No** refund amount · partial refund · settlement · card/bank · return timeline  
3. **Must not** claim money was returned or refund was “processed”  
4. **No** persistent customer refund-status panel  
5. **No** customer refund-history package  
6. Approved / denied wording only when a decision record truthfully supports it (this slice does not add a customer decision readout)  
7. Production-started requests may still be submitted; **approval remains blocked** by existing Owner Desk / job authority  
8. Dirty checkout/payment quarantine WIP left untouched  
9. Unified Room · PAGE-TABS-1 · Board Materials · project-wide Gate #17 — out of scope  

---

## Payment room sequence (after this seal)

1. **REFUND-UI-INSPECT-1** — **COMPLETE · CLOSED**  
2. **REFUND-REQUEST-1** — **SEALED · BROWSER-CERTIFIED WITH LIMITS** ← this package  
3. **REFUND-STATUS-INSPECT-1** — **DEFINED · NOT AUTHORIZED FOR INSPECTION** (`docs/launch/REFUND-STATUS-INSPECT-1.md`)  
4. Status readout construction — **only if** sealed inspection proves required and supportable  
5. Payment/refund customer experience certification with explicit limits  
6. Then leave Payment room for the next room  

Do **not** invent “refund processed,” money returned, amounts, provider settlement, or delivery timelines in any later status package.

---

## Hard exclusions retained

- No payment-provider calls or dependency changes from this seal  
- No second refund ledger  
- Do not reopen UR-ROOM-CERT-1 without contradictory evidence  
- Leave all **113** unrelated dirty WIP entries untouched  

---

*End of REFUND-REQUEST-1. Sealed with limits — intake for owner review, not financial completion. Next: REFUND-STATUS-INSPECT-1 (defined; inspection waits).*
