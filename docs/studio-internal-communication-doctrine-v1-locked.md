# Studio Internal Communication Doctrine V1 — Locked

**Status:** Locked for KITCHEN-COMMS-1  
**Package tip base:** KITCHEN-FOUNDATION-1 (`c640e8c`)  
**Code:** `src/lib/studio-kitchen-comms/` · `src/config/studio-kitchen-comms-v1.ts`

---

## Motto

> **Multiple instruments. One sound.**

> If it matters, say it. If it changed, record it. If it affects someone, route it.  
> Never assume another component knows.

---

## What this is

Internal operational communication over existing production truth.

It is **not**:
- a chat product
- an AI-agent framework
- a second Campaign Record
- a second Decision Core
- Studio Voice
- live email/SMS transport

---

## Authoritative sources (reused)

| Concern | Source |
|--------|--------|
| Chronological operational ledger | `jobActivityEvents` on campaign-tasks envelope |
| Customer outbox / delivery state | `jobCommunicationRecords` |
| Handoffs | `handoffs` |
| QA | `qaRecords` |
| Exceptions / owner-held routing | `exceptionRecords` + `OWNER_HELD_EXCEPTION_KINDS` |
| Owner decision interactions | `ownerDecisionInteractions` |
| Materials blockers | materials store |
| Business rules | Decision Core + existing deterministic modules |

Kitchen Comms is a **projection**. Viewing it does not write records.

---

## Routing

Recipients are derived from existing responsibility:
- production roles on tasks/handoffs/QA routing
- manager (coordination awareness)
- owner only when existing owner-escalation rules require it
- client for customer-safe-candidate summaries (not sent in this package)

Uncertainty does **not** fall back to Tagia.

---

## Owner escalation filter

Uses existing authority:
- `resolveOwnerReviewRequired`
- `exceptionKindRequiresOwner`
- `exceptionKindProducerResolvable`
- Owner Desk interaction `waiting_owner`

Owner **not** required for routine status, assignment, QA correction (non-owner categories), materials receipt, deterministic policy notices, or authorized outbox transport.

---

## Acknowledgment / resolution

Active items = unresolved action/escalation/transport-aware outbox.  
History remains after resolution. Historical events do not appear as active work merely because they remain in the ledger.

---

## Customer-safe vs internal

| Internal only | Customer-safe candidate |
|---------------|-------------------------|
| QA details / failures | Approved status phrasing |
| Internal notes | Materials requests already client-facing |
| Team routing / escalation detail | Outbox message content |
| Manager reasoning | |

Nothing is sent to customers in this package.

---

## Outbox / `pending_owner_send`

Persisted delivery status remains unchanged.

Projection classifies `pending_owner_send` using **existing** authorities only:

| When | Disposition | Pre-existing authority |
|------|-------------|------------------------|
| `eventType` is a key of `JOB_COMMUNICATION_TEMPLATES` | `awaiting_authorized_transport` | job-control templates + sync rules; Decision Core outgoing evaluator (`humanReviewRequired: false`; effect ≠ decision); Owner Console map: template outcomes are not Owner Desk decisions |
| `eventType` not in job-control templates | `unknown` | no established authority — does **not** become owner_required or transport-cleared |

Kitchen Comms does **not** maintain a separate authorized-template policy list.

---

## Future connection points (deferred)

- Studio Voice: consume customer-safe summaries only after this spine is trusted
- Make / transport: deliver `awaiting_authorized_transport` items without Owner Console redesign
- Studio Manager: consume active ledger + uncertainty for coordination
- Owner Console: continue as decision desk fed by existing exception/Owner Desk authorities

---

## Intentionally deferred

See `studioKitchenComms.deferred` in `src/config/studio-kitchen-comms-v1.ts`.
