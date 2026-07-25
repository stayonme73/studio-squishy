# Review & Delivery Stage Truth Contract v1

**Package:** Package 7A — Review & Delivery Stage Truth Contract  
**Config:** `src/config/review-delivery-stage-v1.ts`  
**Library:** `src/lib/review-delivery-stage/`  
**Authority spine:** `JobSpineStatus` (`src/lib/job-control/types.ts`)

---

## Purpose

Define a single customer-facing stage vocabulary for post-purchase Review & Delivery work, derived from the existing job status spine.

Per-job stage truth is authoritative. Campaign summaries are secondary and must never erase individual job stages.

Package 7A delivers the contract, pure derivation functions, and unit tests only. It is not wired into customer UI.

---

## Scope

### In scope

- Customer stage IDs and labels
- Short truthful explanations
- Pure job-stage derivation from `JobSpineStatus` and evidence-backed facts
- Treatment of saved but unsubmitted review feedback
- Treatment of prior revision-cycle evidence when supplied by the caller
- Deterministic multi-job campaign summary rules
- Unit tests for every spine status and required mixed-job scenarios
- This contract document

### Explicit exclusions

- Studio Board CTAs, layout, copy, or journey unlocking
- `/feedback-studio`, `/deliverables`, `/campaign-details` behavior
- Route merges or redirects
- Changes to `project-record-status.ts`
- Legacy concept A/B/C review path
- File Room, Voice/narration, uploads, version comparison
- Complaints, billing, email notifications
- Absorbing unrelated dirty WIP

---

## Stage definitions

| Stage ID | Label | Action owner | Terminal |
|----------|-------|--------------|----------|
| `studio-working` | Studio Working | Studio | No |
| `work-ready-for-review` | Work Ready for Review | Customer | No |
| `customer-reviewing` | Customer Reviewing | Customer | No |
| `revision-submitted` | Revision Submitted | Studio | No |
| `revised-work-ready` | Revised Work Ready | Customer | No |
| `approved-for-final-delivery` | Approved for Final Delivery | Studio | No |
| `final-delivery` | Final Delivery | Complete | Yes |
| `waiting-on-you` | Waiting on You | Customer | No |
| `cancelled` | Cancelled | None | Yes |

Campaign-summary-only aggregates:

| Summary ID | Label |
|------------|-------|
| `project-in-progress` | Project in Progress |
| `no-active-jobs` | No Active Work |

**Rule:** Waiting on You remains separate from Studio Working. Studio Working means the Studio owns the next move. Waiting on You means the customer must complete a blocking action.

---

## Job status mapping

| `JobSpineStatus` | Default stage ID |
|------------------|------------------|
| `ready_for_queue` | `studio-working` |
| `building_concepts` | `studio-working` |
| `ready_for_review` | `work-ready-for-review` (see overlays) |
| `revision_requested` | `revision-submitted` |
| `approved` | `approved-for-final-delivery` |
| `ready_for_delivery` | `approved-for-final-delivery` |
| `delivered` | `final-delivery` |
| `waiting_on_client` | `waiting-on-you` |
| `refunded_cancelled` | `cancelled` |

### Overlays on `ready_for_review`

Applied in order:

1. **Owner gate before review** — If `ownerApprovalPending === "before_review"`, stage is `studio-working`.  
   **Source:** existing field `PurchasedJobRecord.ownerApprovalPending`, aligned with `canClientAccessJobReview` in `src/lib/job-control/review-room-access.ts`. No new persisted field.

2. **Customer Reviewing** — If `hasUnsubmittedReviewDraft` is true, stage is `customer-reviewing`.

3. **Revised Work Ready** — If `hasPriorRevisionCycle` is true, stage is `revised-work-ready`.

4. Otherwise — `work-ready-for-review`.

When prior revision evidence is unavailable, fall back to Work Ready for Review. Never invent revised-work truth.

---

## Review draft progress

Helper: `hasUnsubmittedReviewDraft(feedback)` in `draft-progress.ts`.

Material unsubmitted progress includes any of:

- non-neutral section status
- sticky notes
- voice-note metadata
- drawing sections

Rules:

- Empty all-neutral shells are not Customer Reviewing (`updatedAt` alone is insufficient — empty create sets it).
- Formally submitted feedback (`submittedAt` set) is not Customer Reviewing.

---

## Prior revision cycle

`hasPriorRevisionCycle` is caller-supplied. Package 7A does not invent a persisted field.

Acceptable durable per-job evidence for future callers includes job-scoped communication event `revision_ready_again` or activity showing a completed client revision cycle for that job.

Campaign-level `revisionRoundsUsed` is not safe for per-job Revised Work Ready in multi-job campaigns.

---

## Campaign aggregation rules

Inputs: already-derived per-job stages. Output always includes the full `jobStages` array.

**Active jobs** exclude `cancelled`.

Algorithm:

1. No jobs → `no-active-jobs` / No Active Work  
2. Active empty (all cancelled) → `cancelled`  
3. Every active job `final-delivery` → Final Delivery  
4. Any active `waiting-on-you` → Waiting on You  
5. All active jobs share one stage family → that family’s summary (within reviewing family: Customer Reviewing > Revised Work Ready > Work Ready for Review)  
6. Otherwise → Project in Progress — “Your project has work in multiple stages.”

Stage families:

| Family | Stage IDs |
|--------|-----------|
| waiting | `waiting-on-you` |
| reviewing | `work-ready-for-review`, `customer-reviewing`, `revised-work-ready` |
| studio-revision | `revision-submitted` |
| studio-production | `studio-working` |
| pre-delivery | `approved-for-final-delivery` |
| delivered | `final-delivery` |
| cancelled | `cancelled` |

Final Delivery as a campaign summary applies only when all active jobs are delivered.

Cancelled jobs do not hide active work.

---

## Limitations

- Not wired into Board, Review Room, Final Delivery, or Project Record UI.
- Materials blocking without spine `waiting_on_client` does not produce Waiting on You in this contract.
- Revised Work Ready depends on caller-supplied durable evidence.
- Existing Project Record labels in `project-record-status.ts` remain unchanged and may differ until a later wiring package reconciles copy.
- Legacy concept review sessions are outside this contract.

---

## Future wiring boundary

Later packages may import this library to:

- display per-job stages in the Review & Delivery Room
- show campaign summaries without collapsing job truth
- align Board copy after a separate owner-approved Board package

Wiring requires an explicit package boundary. Package 7A does not perform that wiring.
