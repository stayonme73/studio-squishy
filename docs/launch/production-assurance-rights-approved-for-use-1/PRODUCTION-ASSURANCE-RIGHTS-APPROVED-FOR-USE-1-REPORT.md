# PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1 REPORT

**Package:** Materials must be cleared for use before production/release where required  
**Branch:** `assurance/rights-approved-for-use-1`  
**Starting tip:** `d4280c360417d8e01fa0088662fe0f18dda80c73` (approved-delivered sealed)  
**Status:** SEALED  
**Final verdict:** RIGHTS / APPROVED-FOR-USE CONTROL IS COMPLETE FOR CURRENT ACTIVE MENU  
**Scout:** PARKED  
**Git:** See SEAL report · No merge  
**Doctrine:** Operational safeguard — not legal certainty

---

## 1. Starting control point

| Item | Value |
|------|--------|
| Sealed approved-delivered tip | `d4280c360417d8e01fa0088662fe0f18dda80c73` |
| Branch | `assurance/rights-approved-for-use-1` @ that tip |
| Gap closed | `submitted` ≠ `approved_for_use` for rights-sensitive materials |

---

## 2. Files changed

**New**
- `src/config/studio-material-use-v1.ts`
- `src/lib/studio-material-use/` (evaluate, types, index, tests)
- `src/lib/studio-pre-acceptance/evaluate-material-use.ts`
- `docs/launch/production-assurance-rights-approved-for-use-1/PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1-REPORT.md`

**Modified**
- `src/lib/materials/types.ts` — useAuthorization, useHold, useDecision; statuses `owner_policy_review` / `blocked_from_use`
- `src/lib/materials/materials-view.ts` — production blocker uses material-use decision
- `src/lib/materials/actions.ts` — stamp decision on submit/review; attestation basis
- `src/lib/materials/payload-validation.ts` — optional `useAuthorizationBasis`
- `src/config/materials.ts` — status labels
- `src/lib/job-control/resolve-jobs.ts` / `final-delivery-gates.ts` / `final-delivery-actions.ts` — material use hold blocks system release
- `src/lib/studio-pre-acceptance/evaluate.ts` / `types.ts` / `fingerprint.ts` / `index.ts` — narrow known-rights bridge
- Related materials tests

**Not redesigned:** Conversation Room, Review Room, QA-before-review, approved-delivered binding semantics, Kitchen certs, Owner Console, Campaign Record architecture.

---

## 3. Existing material state inventory

| Item | Finding |
|------|---------|
| Authoritative ledger | `CampaignMaterialItem` in `data/campaign-materials/{campaignId}.json` |
| Prior statuses | `missing` → `requested` → `submitted` → `approved_for_use` / `needs_clarification` / `not_needed` |
| Prior production choke | `isBlockingMaterialItem` — **`submitted` was non-blocking** |
| Provenance | None on the item before this package |
| Release | No material-rights check (Owner/spine / approved-delivery only) |
| Inspection finding | Confirmed: production could start from `submitted` before `approved_for_use` |

---

## 4. Material decision model

`evaluateMaterialUseDecision` →

| Outcome | Meaning |
|---------|---------|
| `APPROVED_FOR_USE` | Operationally cleared for Studio use |
| `CLARIFICATION_REQUIRED` | Targeted customer fact needed |
| `OWNER_POLICY_REVIEW` | Genuine gray area |
| `BLOCKED_FROM_USE` | Hard stop |

Durable stamp: `CampaignMaterialItem.useDecision` (+ optional `useAuthorization` / `useHold`).

---

## 5. Submitted vs approved_for_use behavior

- **Clearance-required categories:** `logo-brand`, `photo-video`
- For those: `submitted` alone → **not** production-ready (`CLARIFICATION_REQUIRED` until attestation / team approve / Studio source)
- Routine clear attestation (`customer_owns` / `customer_has_permission`) auto-promotes to `approved_for_use` without Owner
- Non-clearance categories stay low-friction (submission can clear operationally)

---

## 6. Clarification behavior

Targeted prompts only (logo ownership / photo permission / brand permission). No rights wizard. Draft materials ledger preserved while waiting.

---

## 7. Hard-block behavior

- Explicit `blocked_from_use` status / hold
- Bounded text signals (e.g. “I do not have permission…”)
- Cannot become `APPROVED_FOR_USE`

---

## 8. Owner/policy review behavior

- Status/hold `owner_policy_review` or gray-area text patterns
- `escalationTarget: "owner_policy"`
- Ordinary missing attestation → clarification, **not** Tagia

---

## 9. Production-blocking behavior

`isBlockingMaterialItem` / `blockingMaterialsForSku` / Building Concepts / task blockers now fail closed unless use decision is `APPROVED_FOR_USE` (or `not_needed`). Uncleared assets cannot be authoritative production input. Optional materials and unrelated SKUs remain independent.

---

## 10. QA / Review / Delivery interaction

- Customer creative approval cannot waive unresolved material use holds
- `canSystemAuthorizeFinalDelivery(..., materials)` blocks when job SKU still has uncleared required materials
- QA-before-review and approved-delivered identity matching unchanged

---

## 11. Pre-acceptance interaction

Narrow bridge via `materialRightsSignals` on project facts:

- known hard block → `DECLINE`
- acceptance-blocking ambiguity → `CLARIFICATION_REQUIRED`
- Owner/policy material hold → `OWNER_POLICY_REVIEW`
- Absent signals → no new friction

Distinct from post-payment per-material clearance.

---

## 12. Provenance/authorization evidence

Recorded bases: `customer_owns` | `customer_has_permission` | `studio_generated` | `studio_controlled_licensed` | `provider_licensed`  
Operational evidence only — not legal ownership proof.

---

## 13. Material-category behavior (pre-seal verified)

Active-22 menu + materials taxonomy (`logo-brand` | `photo-video` | `document-reference` | `url-link` | `access-instructions` | `factual-confirmation` | `other`).

| Material category (owner list) | Treatment |
|--------------------------------|-----------|
| customer-written text/copy | CLEARANCE NOT REQUIRED — EXPLAIN EXISTING SAFEGUARD — intake as factual-confirmation / document-reference; customer-authored text; Acceptance Review ownership attestation |
| logos / trademarks / brand assets | CLEARANCE REQUIRED — `logo-brand` |
| customer photos | CLEARANCE REQUIRED — `photo-video` |
| customer video clips | CLEARANCE REQUIRED — `photo-video` |
| customer music/audio | NOT ACCEPTED / NOT USED BY CURRENT ACTIVE SKU — no materials category; short-video `musicAllowed=false` / omit until rights certain; voice SKUs produce Studio TTS audio, not customer music inputs |
| customer fonts | NOT ACCEPTED / NOT USED BY CURRENT ACTIVE SKU — no font-file category; “font” in responsibilities maps to `logo-brand` keyword or document-reference / intake text notes only |
| customer documents/data | CLEARANCE NOT REQUIRED — EXPLAIN EXISTING SAFEGUARD — document-reference / factual-confirmation; scripts/menus/facts; Acceptance Review + team review path |
| Studio-generated copy/assets | CLEARANCE NOT REQUIRED — EXPLAIN EXISTING SAFEGUARD — `studio_generated` / `studio_controlled_licensed` / `provider_licensed` basis; no customer ownership attestation |

Low-friction ≠ unexamined. Clearance not invented for theoretical risk outside current contracts.

---

## 14. Studio-generated material behavior

Staff/owner submission or studio/provider basis → `APPROVED_FOR_USE` without customer ownership attestation. Provider/tool sealed limits unchanged.

---

## 15. Auditability

`useDecision` on `CampaignMaterialItem` (durable materials ledger — survives session/browser loss with campaign materials record) preserves:

| Field | Purpose |
|-------|---------|
| material `id` | Material identity |
| `useDecision.decisionId` | Decision identity |
| `useDecision.outcome` | e.g. `APPROVED_FOR_USE` |
| `useAuthorization.basis` / `useDecision.authorizationBasis` | Provenance/authorization basis |
| `useDecision.contentFingerprint` | Bound content identity (fileName/url/text/size/mime/storage) |
| `useDecision.evaluatedAt` | When cleared |
| `useDecision.reasons` / customerPrompt / escalation | Policy/risk reason where applicable |
| packageId / schemaVersion | Policy package |

Replacement invalidation: if content fingerprint changes while a prior `APPROVED_FOR_USE` remains, evaluator returns `CLARIFICATION_REQUIRED` (`content_replaced`) — photo A’s decision does not authorize photo B.

---

## 16. Customer friction assessment

- Ordinary authorized upload → quiet clear
- Unclear → one targeted question
- No giant questionnaire / scary legal wizard

---

## 17. Owner-independence

`routineClearanceAuthorization: "owner_independent"`  
Routine clear cases: Owner action **NONE**. Owner only for gray-area / blocked judgment paths.

---

## 18. Tests/result

`npx vitest run` on material-use + materials + pre-acceptance + approved-delivery + review-eligibility + final-delivery + review-room:

**123 PASS** (22 material-use package tests, including pre-seal category/durability/replacement coverage)

---

## 19. P1 gaps closed

- submitted ≠ approved_for_use where clearance required
- uncleared material blocked from production input
- targeted clarification / hard block / Owner gray-area
- customer approval cannot waive material use holds on release
- routine clearance Owner-independent
- downstream assurance gates intact

---

## 20. Remaining assurance gaps

Reassess the assurance layer as a whole rather than inventing the next package automatically. Residual future work (deferred): external plagiarism/trademark tools, legal AI, vendor moderation — not required for this P1 close.

---

## 21. Backtrack impact

Low–moderate at materials choke point only. Logo/photo submits without attestation now correctly block production until cleared. Existing approved_for_use / team review paths preserved.

---

## 22. Git state

| Item | Value |
|------|--------|
| Branch | `assurance/rights-approved-for-use-1` |
| Base | `d4280c360417d8e01fa0088662fe0f18dda80c73` |
| Commit / push / merge | **none** |

---

## 23. Recommended next package

**One recommendation only — do not start:**

`ASSURANCE-LAYER-REASSESSMENT-1`

Owner/Manager review of the sealed assurance spine (pre-acceptance → QA-before-review → approved-delivered → rights-approved-for-use) to decide whether remaining work is polish, ops runbook, or a new P1 — rather than auto-starting another package.

---

## 24. Pre-seal category + durability verification

Owner/Manager pre-seal check (no package broadening; no new vendors/scanners/legal AI).

**Music/audio:** No active SKU accepts customer-supplied music/audio as a materials production input. Short-video contracts preserve `musicAllowed: false` / music capability `unresolved` (omit until rights certain). Voice SKUs deliver Studio TTS audio; client distributes — not customer music intake.

**Fonts:** Customer font *files* are not routine materials inputs. Intake accepts brand colors/fonts/style *references* as text; responsibility keyword `font` maps into `logo-brand` or document notes — not a font-license verifier.

**Durable record:** `CampaignMaterialItem.useDecision` (+ `useAuthorization`) on the materials ledger.

**Replacement:** `contentFingerprint` binds approval to payload identity; mismatch → `content_replaced` / reevaluation required.

**Corrections this pass:** content fingerprint invalidation + active-menu category policy + narrow tests.

**Final verdict:** RIGHTS / APPROVED-FOR-USE CONTROL IS COMPLETE FOR CURRENT ACTIVE MENU

---

## READY FOR OWNER REVIEW

Scout PARKED.
