# REFUND-STATUS-INSPECT-1 · Payment room refund status return path

**Status:** **COMPLETE · CLOSED** · Payment/refund Customer-One slice **BROWSER-CERTIFIED WITH EXPLICIT LIMITS**  
**Type:** Inspection → narrow construction → certification (Payment room bundle)  
**Product commit:** `0555c580f7cfd6968c02313dd316f484e78750be` — `feat: add customer-safe refund request status on studio board`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Payment room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior sealed package:** REFUND-REQUEST-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `f60ee491…`  
**Prior inspection:** REFUND-UI-INSPECT-1 — **COMPLETE · CLOSED**

Certification evidence for this Payment room slice is folded into this document. A separate `PAYMENT-ROOM-CERT-1.md` was **not** required.

---

## Inspection verdict

**Persistent return-path gap confirmed.** After REFUND-REQUEST-1 intake, a customer could submit a refund-request for owner review, but could **not** return later and truthfully see what happened:

- Refund route was **POST-only** (no customer-safe GET)
- Customer GET `/tasks` does **not** expose `ownerDecisionInteractions`
- Studio Board Refund Request card kept only **session-ephemeral** success/error
- Customer Update History **excludes** `kind: "refund"`

**Construction was required** and completed on the existing Board card + existing records. **No second refund ledger.**

---

## Construction completed

| Item | Evidence |
|---|---|
| Product tip | `0555c580f7cfd6968c02313dd316f484e78750be` |
| Placement | Existing Studio Board **REFUND REQUEST** card |
| Read API | `GET /api/campaigns/[campaignId]/jobs/[jobId]/refund-request` |
| Mapper | `refund-request-status-view.ts` (customer-safe; no internal notes) |
| Job sync | `withSyncedJobRecordsForRefund` — same plan-sync authority as Board / project-status |
| Authorities reused | `OwnerDecisionInteractionRecord` · job spine · existing POST intake |

---

## Customer-safe status contract

| Customer state | Source | Notes |
|---|---|---|
| Received and pending owner review | `waiting_owner` · `waiting_internal` | No stronger “under review / assigned” claim |
| Additional information requested | `waiting_client` | |
| Approved for the job | `resolved` + spine `refunded_cancelled` | Explicitly **does not confirm money returned** |
| Not approved for the job | `resolved` + other spine | No internal denial notes |
| Unavailable or blocked | No request / load failure / production note | Existing production-started note retained |

Internal `resolutionNotes`, `clientMessage`, and snapshot internals remain **hidden**.  
**Refund history remains deferred.**

---

## Validation

| Suite | Result |
|---|---|
| Focused unit (status + customer UI + intake + route) | **25/25 PASS** |
| Regression (refund actions · owner-decision jobs · problem-report status) | **11/11 PASS** |
| Browser certification (`scripts/cert-refund-status-1.mjs`, untracked) | **14/14 PASS** |
| Viewports | Desktop ~1440 · phone **390px** |
| Production build | **Not run** — narrow Board/API surface; not required for this slice |

---

## Payment/refund Customer-One slice status

**BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

Gate **#13** (Customer can request a refund) remains **COMPLETE WITH LIMITS**. The prior **persistent-status / return-path** limitation is **closed**. Financial/provider limits remain.

### Remaining certified limits

- No provider execution  
- No money movement or money-returned confirmation  
- No amounts or partial refunds  
- No settlement or bank timeline  
- No provider reference  
- No automatic approval  
- No refund history  

---

## Hard non-claims (locked)

Do not invent or imply: provider refund success · funds returned · amounts · partials · settlement · bank/card timelines · Stripe/provider refs · automatic eligibility · ticketing/SLA.

Do not reopen REFUND-REQUEST-1, REFUND-UI-INSPECT-1, or UR-ROOM-CERT-1 without contradictory evidence.

---

## Room sequence context

| Step | Status |
|---|---|
| Unified Review / Final / Delivery | **SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS** · UR-ROOM-CERT-1 |
| REFUND-UI-INSPECT-1 | **COMPLETE · CLOSED** |
| REFUND-REQUEST-1 | **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `f60ee491…` |
| **REFUND-STATUS-INSPECT-1 + status construction + Payment cert** | **COMPLETE · CLOSED** @ product `0555c58…` |
| Project-wide Gate #17 | **Not** claimed by this package |
| PAGE-TABS-1 · Board Materials | Out of scope / deferred / waiting |

---

*End of REFUND-STATUS-INSPECT-1. Inspection complete · construction sealed · Payment room slice certified with explicit limits.*
