# STUDIO-OPERATING-POST-PAY-ACTIVATION-CONSUMER-1 REPORT

**Status:** READY FOR OWNER REVIEW  
**Scout:** PARKED  
**Branch:** `operating/post-pay-activation-consumer-1`  
**Git:** No commit. No push. No merge.

---

## 1. Starting control point

Payment Truth sealed tip:

`438f6e137e427113f461eda7ce0c1be1d8cb78ef`

Accepted inspection: **STUDIO-OPERATING-POST-PAY-ACTIVATION-1**  
Verdict carried forward: **POST-PAY ACTIVATION NOT READY — MATERIAL GAP**

---

## 2. Root cause

Confirmed payment wrote durable `paymentTruth` / `paymentReceivedAt`, but job/task materialization remained **lazy** (`getOrGenerateTasks` / `syncJobRecordsFromCampaign` on File Room, Owner Console, and task APIs).

So:

- `paid = durable`
- `paid ≠ automatically operationally awake`

Browser close after Stripe confirm could leave work asleep until a staff/customer surface visited.

---

## 3. Files changed

| Path | Role |
|------|------|
| `src/config/studio-post-pay-activation-v1.ts` | Activation package config / phase vocabulary |
| `src/lib/studio-post-pay-activation/*` | Eager idempotent activation module + tests |
| `src/lib/studio-payment/confirm.ts` | Wire activation after authoritative paid write + already-paid recovery |
| `src/config/studio-board.ts` | `CampaignRecord.postPayActivation` field |
| `src/lib/campaign-store/customer-sync-allowlist.ts` | Server-own activation (client cannot invent) |
| `src/lib/campaign-tasks/readiness.ts` | Intake truth includes Route Map / vision submit |
| `src/lib/studio-payment/payment-truth.test.ts` | Regression: sandbox confirm → activated |
| `docs/launch/studio-operating-post-pay-activation-1/` | Prior inspection report (uncommitted carry) |

---

## 4. Activation trigger

**Authority:** `paymentTruth.status = confirmed` via `confirmPaymentFromProcessor` (webhook / reconcile / sandbox).

**Not authority:** browser return, UI mount, customer navigation, File Room, Owner Console.

After successful paid write (and on already-paid re-observe), server calls `ensurePostPayActivation`.

---

## 5. Durable activation state

Campaign field: `postPayActivation`

```ts
status: "activated" | "pending_retry"
phase: "awaiting_intake" | "awaiting_materials" | "ready_for_routing"
activatedAt, checkoutSessionId, jobIds, taskCount,
intakeComplete, blockingRequiredMaterialsCount,
ownerActionRequired: false
```

Kept distinct from payment confirmed and from production started. Reuses existing campaign statuses (`PAYMENT_RECEIVED` / `BUILDING_CONCEPTS`) from Payment Truth — no new campaignStatus enum invented.

---

## 6. Job/task materialization

On activation:

1. Ensure production plan line items from payment-confirmed SKUs when empty  
2. `getOrInitializeMaterials`  
3. `getOrGenerateTasks`  
4. `syncJobRecordsFromCampaign`  
5. Persist `jobRecords` on the tasks envelope  
6. Write `postPayActivation` on the campaign

Jobs are **work identities** only — `productionStartedAt` stays unset; no producer dispatch.

---

## 7. Idempotency

Safe under duplicate webhook, reconcile, retry, restart:

- Same `checkoutSessionId` + same job ID set → no duplicate jobs/campaigns  
- Job IDs remain `buildJobId(campaignId, skuId)`  
- `activatedAt` preserved across retries  
- Hot path skips rewrite when activation facts unchanged  

---

## 8. Intake/material handoff

Phase resolution uses existing truth:

- `isJobIntakeComplete` (Route Map intake or project details)  
- `countBlockingRequiredMaterials` (`approved_for_use` / clarification controls preserved)

Missing intake → `awaiting_intake`  
Intake ok + blocking materials → `awaiting_materials`  
Neither → `ready_for_routing`

Does **not** become in-production from activation alone.

---

## 9. Ready-for-routing handoff

Clear downstream signal:

`postPayActivation.status === "activated"`  
**and**  
`postPayActivation.phase === "ready_for_routing"`

Routing package may consume this without reading UI state. No producer selection here.

---

## 10. Board behavior

Board continues to hydrate from server campaign. After confirm:

- payment recognized (`paymentTruth` / `paymentReceivedAt`)  
- activation durable (`postPayActivation`)  
- phase states what is still needed vs ready for next internal step  

Client sync **cannot** invent `postPayActivation`. Success-page local state is not required.

---

## 11. Browser-closed scenario

Primary test proves:

Stripe/sandbox confirm → activation written → jobs/tasks on disk → **no** File Room / Owner Console visit.

Customer browser closure cannot strand paid work at the activation layer.

---

## 12. Failure recovery

| Case | Behavior |
|------|----------|
| A. Paid, activation write fails | Payment remains confirmed; `pending_retry` + `lastError` when writable; next confirm/reconcile retries |
| B. Partial job creation | Retry reconstructs via idempotent generate + jobId sync |
| C. Duplicate payment event | Idempotent; same jobIds |
| D. Restart mid-activation | Reconstructable from durable payment truth |
| E. Board before retry completes | Shows paid + pending/awaiting — not production started |

---

## 13. Owner-independence

Routine payment → activation:

**Owner action = NONE**

`ownerActionRequired: false` always for this path. Tagia does not create jobs, change status, open a screen, or kick a queue for successful activation.

---

## 14. Tests/result

```
src/lib/studio-post-pay-activation/activate.test.ts — PASS (10)
src/lib/studio-payment/payment-truth.test.ts — PASS (15)
src/lib/studio-material-use/material-use.test.ts — PASS
src/lib/campaign-tasks + job-control + materials-view — PASS (346)
```

Covered: eager confirm wake, browser-closed (no staff visit), durability, duplicate/retry idempotency, SKU job identities, awaiting materials vs ready-for-routing, no production start, client cannot forge activation, Payment Truth regressions green.

---

## 15. Operating blocker closed

**Closed:** visit-dependent post-pay wake.

Paid projects now become operationally visible from server payment authority alone.

---

## 16. Remaining operating gaps

1. **Routing evaluation** — consume `ready_for_routing`; do not dispatch yet  
2. **Producer selection / dispatch** — Make / Canva / Shotstack / ElevenLabs / Netlify / text-model — still out of scope  
3. **Notifications** — not in this package  
4. **Claim / cross-device** — untouched  
5. Job spine may still map incomplete intake to `building_concepts` (legacy map); **activation phase** is the clear waiting signal — routing should prefer `postPayActivation.phase`

---

## 17. Backtrack impact

- Payment Truth semantics: **unchanged** (consumer only)  
- Kitchen: **untouched**  
- Production Assurance / material use gates: **preserved**  
- Canva / Make: **not wired**

---

## 18. Git state

```
Branch: operating/post-pay-activation-consumer-1
HEAD:   438f6e137e427113f461eda7ce0c1be1d8cb78ef
Commit: NONE (per Owner instruction)
Push:   NONE
Merge:  NONE
```

Working tree has implementation + tests + this report path pending Owner review.

---

## 19. Recommended next step

**Exactly one next step:**

> **STUDIO-OPERATING-ROUTING-HANDOFF-1** — inspect/implement routing evaluation that consumes `postPayActivation.phase === "ready_for_routing"` only, without selecting producers or dispatching tools.

Do **not** start Make/Canva/Shotstack/etc. until routing proves what role each tool needs.

---

## SUCCESS CRITERIA CHECK

| Criterion | Result |
|-----------|--------|
| Paid project wakes automatically | YES |
| Server-driven durable activation | YES |
| Eager idempotent jobs/tasks | YES |
| Missing materials ≠ production | YES |
| Ready projects expose routing handoff | YES (`ready_for_routing`) |
| Browser closure cannot strand | YES |
| Tagia not routine activation machinery | YES (`Owner action = NONE`) |

---

**READY FOR OWNER REVIEW**

**Scout PARKED.**
