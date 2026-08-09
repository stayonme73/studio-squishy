# Studio Production Capability Doctrine V1 — Locked

**Status:** Locked for KITCHEN-PRODUCTION-CAPABILITY-1  
**Package tip base:** KITCHEN-COMMS-1 (`d926a23`)  
**Code:** `src/lib/studio-kitchen-production/` · `src/config/studio-kitchen-production-capability-v1.ts`

---

## Motto

> **The Studio sells only what its approved AI/tool team can truthfully produce.**

> Every service must have a producer, production method, QA standard, deliverable contract, and truthful limitation.

> A catalog promise is not proof of production capability.

> Tool availability is not proof of integration.

> Generic output is not acceptable production proof.

---

## What this is

Service-specific **production contracts** over existing Kitchen / job-control / campaign-tasks infrastructure.

It is **not**:
- a second Service Catalog;
- live Canva / CapCut / Make integration;
- Studio Voice wiring;
- Owner Console redesign;
- real production certification runs (those come after contracts).

---

## Active service set (this package)

### Discovery green (8)

`bf-001`, `sm-001`, `sm-001-monthly`, `em-001`, `em-001-monthly`, `cc-001`, `ma-001`, `ap-001`

### Route Map V1 shelf (4)

`rm-j002`, `rm-j005`, `rm-j007`, `rm-j008`

### Route Map V2 RTU shelf (10)

`v2-rtu-flyer`, `v2-rtu-menu`, `v2-rtu-service-sheet`, `v2-rtu-social-posts`, `v2-rtu-promotion-graphics`, `v2-rtu-business-card`, `v2-rtu-email-kit`, `v2-rtu-sms-kit`, `v2-rtu-voice`, `v2-rtu-short-video`

Retired / held / yellow / red Discovery SKUs are **out of launch production-contract scope** and must not masquerade as launch-ready.

---

## Role mapping

Uses existing `ProductionRole` architecture only:

| Role | Typical ownership |
|------|-------------------|
| `strategy` | Brand direction, campaign strategy |
| `copy` | Email, SMS kits, marketing copy, landing content |
| `creative_production` | Social/visual assets, voice/video production |
| `qa` | QA attestation |
| `producer_dispatcher` | Kickoff, packaging, review-ready handoff |
| `client_input` | Customer materials / approvals (input role) |

Engineering roles (Codey / Claude / Scout) are **not** routine customer producers unless a service genuinely requires software implementation — and that case must be flagged honestly (see landing page).

---

## Tool mapping honesty

| Tool | Integration claim allowed |
|------|---------------------------|
| Canva | Named + **manual/operational path** — no live API |
| CapCut | Named — **not integrated**; no autonomous CapCut claim |
| AI voice tool | Named — **Kitchen chain not wired**; no invented vendor |
| Text model / copy workflow | Manual/operational — not a vendor API claim |
| Studio landing structure | Required — productized publication still partial |
| Manual platform admin | Customer-controlled access only — no OAuth |

---

## QA ownership

- Catalog `qaChecklist` (normalized) is referenced, not duplicated as a second catalog.
- Existing phase QA checklists (`campaign-tasks/qa-checklists`) remain the runtime attestation spine.
- SKU contracts add service-specific checks derived from promises, exclusions, and format requirements.
- Resolving a contract does **not** invent new business policy.

---

## Deliverable contract

Deliverables and exclusions come from **catalog authority**. Contracts must not expand customer promises (including source-file promises).

---

## Revision / escalation

- Revision rules come from catalog `revisionRule` + existing correction ledger / Review Room gates.
- Within-allowance revisions go to the producer role — **not** Tagia.
- Exhausted revisions escalate via existing Owner Desk `revision_limit_reached` path.
- Contract lookup never creates owner work.

---

## Readiness classification

**Hard distinction (locked):**

> **CONTRACT READY does NOT mean CUSTOMER READY or LAUNCH READY.**

CONTRACT READY means only that The Studio has a defined production contract sufficient to begin **real production-quality testing**. Customer readiness requires later production testing/certification and any required tool/integration work.

| Status | Meaning |
|--------|---------|
| CONTRACT READY | Method defined; sufficient to begin production-quality testing — not customer/launch certified |
| CONTRACT READY — INTEGRATION REQUIRED | Method defined; production-quality testing may proceed with honesty about missing integration — not customer/launch certified |
| PARTIAL | Significant element still missing (e.g. account admin / page publish productization) |
| UNSUPPORTED | Cannot truthfully deliver at required quality |
| CONTRADICTORY | Promise conflicts with capability/policy |

---

## Deferred integrations

See `studioKitchenProductionCapability.deferred` in config. Do not treat deferred items as present.

---

## Related

- Kitchen Foundation: `docs/studio-kitchen-foundation-v1-locked.md`
- Kitchen Comms: `docs/studio-internal-communication-doctrine-v1-locked.md`
- Inventory gate: KITCHEN-INVENTORY-GATE-1 (READY)
