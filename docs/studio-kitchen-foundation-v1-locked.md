# Studio Kitchen Foundation V1 — Locked Doctrine

**Status:** Locked for KITCHEN-FOUNDATION-1  
**Package:** `KITCHEN-FOUNDATION-1`  
**Code:** `src/lib/studio-kitchen/` · `src/config/studio-kitchen-foundation-v1.ts`  
**Route:** `/studio-kitchen` (staff/owner only)

---

## Motto

> **One production truth.**  
> The Kitchen projects existing Studio production state.  
> It does not maintain a parallel production reality.

---

## Authoritative systems

| Concern | Authoritative source |
|--------|----------------------|
| Customer journey / plan / payment / intake | Campaign Record (`data/campaigns`) |
| Production tasks, handoffs, QA, exceptions | Campaign task envelope (`data/campaign-tasks`) |
| Purchased job spine / lanes / owner gates | job-control records on the task envelope |
| Materials / blockers | materials store (`data/campaign-materials`) |
| Customer-safe messages | project-communication + job communication outbox |
| Business-rule decisions | Decision Core + existing deterministic modules |

Kitchen does **not** rewrite these systems into a mega-store.

---

## Projection / read layer

Introduced in `@/lib/studio-kitchen`:

- `loadKitchenProjectionBoard` / `loadKitchenProjectionDetail` — read-only loaders
- `buildKitchenProductionFolderFromLive` — pure projection from existing records
- `projectKitchenBucketFromSpine` — presentation-only bucket mapping from `JobSpineStatus`
- Live UI scenes under `src/components/studio-kitchen/StudioKitchenLive*`

**Read-only rule:** Kitchen loaders use `readTasksEnvelope` / `readMaterialsEnvelope`.  
They do **not** call `getOrGenerateTasks` or material initialization.  
Viewing Kitchen must not create production records.

---

## Fixture / demo boundary

- Seeded `KitchenCampaign` data remains in `src/config/studio-kitchen-campaigns.ts` for staff demo only.
- Explicit export: `kitchenFixtureCampaignSeed`.
- Demo activation: `/studio-kitchen?demo=1` **and only when no live campaigns exist**.
- Board and detail share the same gate (`isKitchenFixtureDemoActive`). When any live campaign exists, fixture IDs with `?demo=1` return unavailable/not-found — fixtures never sit beside live production.
- Fixture folders are labeled `fixture_demo` and never `live_production`.
- Legacy builders (`buildKitchenFileRoomView`, `buildKitchenDashboardView`) default to **empty** so seed cannot silently appear as live truth.

---

## Status ownership

| Kitchen concept | Authoritative status |
|-----------------|----------------------|
| Project / campaign state | `CampaignRecord.campaignStatus` |
| Production job state | `PurchasedJobRecord.spineStatus` (job-control) |
| Task state | task `effectiveStatus` / `workflowState` |
| Blockers | materials blockers + task blocked reasons + open exceptions |
| QA state | QA records on the task envelope |
| Handoff state | handoff records on the task envelope |
| Review / release gates | job-control ownerApprovalPending + review/delivery gates |
| Kitchen bucket placement | **Projection only** from job spine / waiting-client signals — not a write ledger |

Multiple layers may legitimately coexist. Do not force one oversimplified status enum.

---

## Customer / internal visibility

- `/studio-kitchen` remains staff/owner only (`isStaffOrOwner`).
- Kitchen surfaces internal production state for operators.
- Customer-facing rooms are not modified by this foundation.
- Customer-safe communication stays in existing customer channels; Kitchen does not expose a new customer API.

---

## Intentionally deferred

- Studio Voice live production connection
- Owner Console refinement
- Make integration
- Canva integration
- CapCut integration
- Service-specific production testing / certification (contracts defined in KITCHEN-PRODUCTION-CAPABILITY-1)
- Supabase production system-of-record migration
- Broad Squishy cleanup

Internal operational communication over this foundation is introduced separately in **KITCHEN-COMMS-1** (`docs/studio-internal-communication-doctrine-v1-locked.md`) — projection only; not a second production truth.

Service production contracts over this foundation are introduced in **KITCHEN-PRODUCTION-CAPABILITY-1** (`docs/studio-production-capability-doctrine-v1-locked.md`) — contracts and readiness honesty only; not live tool integration.

---

## Related

- Baseline inspection: `KITCHEN-BASELINE-INSPECT-1`
- Decision Core: `docs/studio-decision-core-foundation-v1-locked.md`
- Owner Console responsibility map: `docs/owner-console-responsibility-map-v1-planned.md`
- Production capability: `docs/studio-production-capability-doctrine-v1-locked.md`
