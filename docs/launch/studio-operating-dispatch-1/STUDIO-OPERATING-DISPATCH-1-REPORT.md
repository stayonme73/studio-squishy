# STUDIO-OPERATING-DISPATCH-1 REPORT

**Status:** READY FOR OWNER REVIEW  
**Scout:** PARKED  
**Branch:** `operating/dispatch-1`  
**Git:** No commit. No push. No merge.

---

## 1. Starting control point

Routing Handoff sealed tip:

`3ba6d9ef22443ddcf13d17b34bb92a6360408e38`

---

## 2. Dispatch trigger

Server-driven chain:

`ensureDispatchExecution` → `ensureRoutingHandoff` → `ensurePostPayActivation`

Wired from:

- payment confirm (`activateAfterPayment`)
- paid campaign sync (`/api/campaigns/current`)
- materials API writes

No File Room / Owner Console / Tagia kick required.

---

## 3. Files changed

| Path | Role |
|------|------|
| `src/config/studio-dispatch-v1.ts` | Outcomes / package constants |
| `src/lib/studio-dispatch/*` | Evaluate + ensure + tests |
| `src/config/studio-board.ts` | `CampaignRecord.dispatchExecution` |
| `src/lib/campaign-store/customer-sync-allowlist.ts` | Server-own dispatch |
| `src/lib/studio-payment/confirm.ts` | Wire dispatch after payment |
| `src/app/api/campaigns/current/route.ts` | Wake on paid sync |
| `src/app/api/campaigns/[campaignId]/materials/route.ts` | Wake on materials change |

---

## 4. Execution identity model

Durable campaign field: `dispatchExecution`

Per job (`JobDispatchRecord`):

- `dispatchId` = `dd:{jobId}`
- `routingDecisionId` = `rd:{jobId}`
- `jobId`, `campaignId`, `skuId`
- `productionFamilyId`, `controlLane`
- `routingFactFingerprint` (invalidation bind)
- `requirements` — production requirements snapshot
- `status`, `reason`, `blocker`
- `executionIdentityReady`
- `ownerActionRequired: false`

---

## 5. Outcomes

| Outcome | Meaning |
|---------|---------|
| `EXECUTION_IDENTITY_READY` | Durable identity + requirements exposed |
| `WAITING_FOR_ROUTING` | Upstream not ready |
| `WAITING_FOR_PREREQUISITE` | Intake/materials/activation blocking |
| `DISPATCH_BLOCKED` | Capability fail-closed |
| `OWNER_POLICY_REVIEW` | Genuine Owner gate only |

Envelope: `evaluated` \| `deferred` \| `pending_retry`

---

## 6. Production requirements exposed

From `resolveServiceProductionContract` (read-only snapshot):

- family / producer role / supporting roles
- required customer + studio inputs
- production steps (id/label/phase/role)
- QA item ids
- deliverables / format exports / limitations
- **primary + optional tool refs** (`toolId`, label, integrationState, toolReadiness)

Tool refs are **evidence for Tool Coordination** — not invocations.

---

## 7. Multi-SKU / idempotency / invalidation

- Flyer + business card → independent `dd:{jobId}` records  
- Duplicate ensure → `alreadyEvaluated: true`  
- Materials become blocking → identity invalidated to `WAITING_FOR_PREREQUISITE`

---

## 8. No producer / tool invocation

Confirmed: no Canva, Make, Shotstack, ElevenLabs, Netlify, or text-model API calls.  
No spine transition to production start. No work-packet assignment.

---

## 9. Owner-independence

Routine path:

`READY_FOR_DISPATCH` → `EXECUTION_IDENTITY_READY`

**Owner action = NONE**

---

## 10. Downstream Tool Coordination contract

Next package may consume:

```
dispatchExecution.records[]
  where executionIdentityReady === true
```

and inspect `requirements.primaryTool` / `optionalTools` / `productionFamilyId` across the active menu to decide which tools genuinely belong on the spine.

---

## 11. Tests/result

```
Dispatch 8/8 PASS
Routing 9/9 PASS
Activation 10/10 PASS
Payment Truth 15/15 PASS
```

**42/42** in scoped payment→…→dispatch suite.

---

## 12. Operating gap closed

**Closed:** no durable execution identity after `READY_FOR_DISPATCH`.

Ready jobs now expose certified method family + production requirements without running tools.

---

## 13. Remaining operating gaps

1. **Tool Coordination** — evidence-driven Canva/Make/etc. placement from requirements snapshots  
2. Actual producer wake / work-packet start — after tool path is chosen  
3. Notifications / Claim — untouched  

---

## 14. Backtrack impact

Payment Truth / Activation / Routing / Kitchen / Assurance: protected.  
No vendor wiring.

---

## 15. Git state

```
Branch: operating/dispatch-1
HEAD:   3ba6d9ef22443ddcf13d17b34bb92a6360408e38
Commit: NONE
Push:   NONE
Merge:  NONE
```

---

## 16. Recommended next step

**Exactly one next step:**

> **STUDIO-OPERATING-TOOL-COORDINATION-1** — inspect durable `dispatchExecution.requirements` across the active customer-facing menu and produce evidence for which jobs need a direct path, which need Canva, whether Make is required for orchestration, or whether the Machine already covers coordination without Make.

Do **not** sign up for or wire Canva/Make until that evidence report returns.

---

**READY FOR OWNER REVIEW**

**Scout PARKED.**
