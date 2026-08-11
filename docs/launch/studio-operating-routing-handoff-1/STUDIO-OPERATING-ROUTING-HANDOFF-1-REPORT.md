# STUDIO-OPERATING-ROUTING-HANDOFF-1 REPORT

**Status:** READY FOR OWNER REVIEW  
**Scout:** PARKED  
**Branch:** `operating/routing-handoff-1`  
**Git:** No commit. No push. No merge.

---

## 1. Starting control point

Post-pay activation sealed tip:

`c3c603c2d5e6f4951f2d5cfbf8c5d825f966e16b`

---

## 2. Routing trigger

Server-driven only:

1. After payment confirm → `ensurePostPayActivation` → `ensureRoutingHandoff`
2. Paid campaign sync (`/api/campaigns/current` PATCH) when intake facts arrive
3. Materials API write when payment confirmed (materials may unlock `ready_for_routing`)

`ensureRoutingHandoff` always refreshes activation first so `postPayActivation.phase` is current.

**Not authority:** File Room visit, Owner Console visit, customer page visit, manual Tagia kick.

---

## 3. Files changed

| Path | Role |
|------|------|
| `src/config/studio-routing-handoff-v1.ts` | Outcomes / package constants |
| `src/lib/studio-routing-handoff/*` | Evaluate + ensure + tests |
| `src/config/studio-board.ts` | `CampaignRecord.routingHandoff` |
| `src/lib/campaign-store/customer-sync-allowlist.ts` | Server-own routing (client cannot invent) |
| `src/lib/studio-payment/confirm.ts` | Wire routing after activation |
| `src/app/api/campaigns/current/route.ts` | Wake routing on paid sync |
| `src/app/api/campaigns/[campaignId]/materials/route.ts` | Wake routing after materials truth change |

---

## 4. Routing decision model

Durable campaign field: `routingHandoff`

Per actionable job (`JobRoutingDecision`):

- `decisionId` = `rd:{jobId}` (stable)
- `jobId`, `campaignId`, `skuId`
- `productionFamilyId` — certified method family (capability-level)
- `controlLane` — existing quick/standard/heavy map
- `capabilityReadiness` — from `resolveServiceProductionContract`
- `factFingerprint` — binds SKU, session, intake, materials, deadline, plan, readiness
- `status`, `reason`, `blocker`
- `readyForDispatch`
- `ownerActionRequired: false`

No vendor/tool selection recorded as a dispatch choice.

---

## 5. Routing outcomes

| Outcome | Meaning |
|---------|---------|
| `READY_FOR_DISPATCH` | Ordinary supported job; dispatch-eligible |
| `WAITING_FOR_PREREQUISITE` | Not `ready_for_routing`, or intake/materials incomplete |
| `ROUTING_BLOCKED` | Unknown SKU, not active-menu, or capability readiness fail-closed |
| `OWNER_POLICY_REVIEW` | Genuine pending Owner approval gate on the job |

Handoff envelope status: `evaluated` \| `deferred` \| `pending_retry`

---

## 6. Multi-SKU behavior

Verified with `v2-rtu-flyer` + `v2-rtu-business-card`:

- Separate `jobId`s
- Separate `decisionId`s
- Independent statuses
- One job cannot authorize another

---

## 7. Idempotency

Same job + same fact fingerprint → reuse decision; `alreadyEvaluated: true` on hot path.  
No duplicate decisions under activation retry / repeated observation.

---

## 8. Invalidation

`factFingerprint` includes materials/intake/scope/deadline/readiness.  
When materials become blocking again, prior `READY_FOR_DISPATCH` re-evaluates to `WAITING_FOR_PREREQUISITE`.

---

## 9. Blocked-routing behavior

Fail closed:

- unknown SKU
- not active customer-facing
- capability readiness not `contract_ready` / `contract_ready_integration_required`
- incomplete intake / blocking materials

No silent dispatch.

---

## 10. Failure recovery

| Case | Behavior |
|------|----------|
| A. Routing write fails | `pending_retry` + `lastError`; payment/activation preserved |
| B. Multi-SKU partial | Each job evaluated independently |
| C. Restart | Reconstructable from payment + activation + materials/tasks |
| D. Stale facts | Fingerprint mismatch → re-evaluate / invalidate |

---

## 11. Ready-for-dispatch handoff

Downstream contract:

```
routingHandoff.status === "evaluated"
AND decision.status === "READY_FOR_DISPATCH"
AND decision.readyForDispatch === true
```

Identity included: `decisionId`, `jobId`, `skuId`, `productionFamilyId`, `controlLane`, `factFingerprint`.

**Does not execute dispatch.**

---

## 12. Owner-independence

Routine path:

`ready_for_routing` → routing evaluation → `READY_FOR_DISPATCH`

**Owner action = NONE**

---

## 13. Tests/result

```
src/lib/studio-routing-handoff/routing-handoff.test.ts — PASS (9)
src/lib/studio-post-pay-activation/activate.test.ts — PASS (10)
src/lib/studio-payment/payment-truth.test.ts — PASS (15)
material-use + customer-sync — PASS
```

**34/34** in scoped payment→activation→routing suite.

---

## 14. Operating gap closed

**Closed:** no durable routing decision after `ready_for_routing`.

Ready jobs now expose clear dispatch eligibility without Owner/File Room.

---

## 15. Remaining operating gaps

1. **Dispatch** — consume `READY_FOR_DISPATCH`; choose certified execution path  
2. **Tool coordination** — Canva / Make / etc. only when dispatch proves need  
3. Notifications / Claim — untouched  

---

## 16. Backtrack impact

- Payment Truth: unchanged (consumer only)  
- Post-pay activation: unchanged semantics (refreshed, not redefined)  
- Kitchen / Assurance: untouched; contract lookup is read-only  
- No Canva/Make/Shotstack/ElevenLabs/Netlify/text-model invocation  

---

## 17. Git state

```
Branch: operating/routing-handoff-1
HEAD:   c3c603c2d5e6f4951f2d5cfbf8c5d825f966e16b
Commit: NONE
Push:   NONE
Merge:  NONE
```

---

## 18. Recommended next step

**Exactly one next step:**

> **STUDIO-OPERATING-DISPATCH-1** — consume `READY_FOR_DISPATCH` per job and define the durable dispatch execution record / eligibility for certified capability execution — still without wiring live vendor APIs until the dispatch contract proves which tools belong.

Do **not** start Canva/Make wiring in that package until dispatch identity is sealed.

---

**READY FOR OWNER REVIEW**

**Scout PARKED.**
