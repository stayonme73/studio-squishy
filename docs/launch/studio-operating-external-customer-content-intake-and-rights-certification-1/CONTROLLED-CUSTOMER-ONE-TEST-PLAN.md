# CONTROLLED CUSTOMER-ONE TEST PLAN

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`

**Status:** PREPARATION — Owner File Collection Checklist correction. Do not execute.

**Date:** 2026-08-22

This plan designs a later controlled test using the **actual customer route** (`MaterialsIntakePanel` → multipart PATCH `/api/campaigns/{campaignId}/materials`). Studio-generated Room 4C fixtures and developer shortcuts are forbidden.

Canonical owner raw-file staging (Git-ignored, one path only): `tmp/gate-x-controlled-test-owner-staging/`

Procedure: `OWNER-FILE-STAGING-PROCEDURE.md`

---

## Test customer fixture

Use a dedicated certification campaign (not Moss & Thread, Cedar Lane, or Harbor Roast). Suggested identity:

| Field | Value |
|-------|-------|
| Customer name | Gate X Certification Customer (fictional) |
| Business | Northwind Pantry Co-op (fictional) |
| Launch Now capability ID | `campaign-creative` |
| Customer-facing shelf / checkout SKU | `v2-rtu-promotion-graphics` (“Make My Campaign Graphics”) |
| Case 9 production-gate identifier | purchased `job.skuId` = `v2-rtu-promotion-graphics` |
| Frozen classification | READY WITH EXPLICIT LIMITS |
| Route | Hire → pay → Studio Board materials upload |
| Owner labor | NONE during test execution |

Do **not** send `campaign-creative` into catalog checkout, `getServiceById()`, `relatedServiceIds`, or `canTransitionToBuildingConcepts(job.skuId)`. That id is the Launch Now capability / Room 4C routing SKU only.

Sources: capability `campaign-creative` in `src/lib/studio-room-4c-scenario-1/routing.ts` (and scenarios 2–3) plus `src/lib/studio-room-4b-launch-toolbox/admission.ts`. Shelf SKU `v2-rtu-promotion-graphics` in `src/catalog/v2/batch1-ready-to-use.ts` and `src/catalog/types.ts` (`RouteMapV2ShelfServiceId`). Job-level gate uses `job.skuId` from the purchased plan (`src/lib/job-control/resolve-jobs.ts`, `src/lib/job-control/production-workspace-gates.ts`) matched to `relatedServiceIds` from `src/lib/materials/requirements.ts`. Config: `launchNowCampaignCreativeSku` and `customerFacingCampaignGraphicsShelfSku`.

Tagia approves the fixture before execution. Do not substitute real customer data without explicit authorization.

---

## Test pack (9 required cases)

### Case 1 — Ordinary customer-owned file (fully cleared)

| Field | Proposed file |
|-------|---------------|
| Filename | `gate-x-owner-neutral-scene.jpg` |
| Description | Neutral scene JPEG Tagia owns; no recognizable people; no visible brands |
| Expected | RECEIVED → CLEARED_FOR_PRODUCTION |
| Rights statement | Customer owns file, campaign use permitted, crop/adapt permitted, no recognizable people, no third-party material |

**Tagia supply:** One owned JPEG. Exact name `gate-x-owner-neutral-scene.jpg`. Place only in `tmp/gate-x-controlled-test-owner-staging/`.

---

### Case 2 — Missing crop/adaptation permission (must block)

| Field | Proposed file |
|-------|---------------|
| Filename | `gate-x-owner-document-no-adapt.pdf` |
| Description | Customer-owned PDF; customer denies cropping/resizing/editing |
| Expected | CLEARED_WITH_LIMITS with `no_crop_adapt`; production gate blocks adaptation |

**Tagia supply:** One owned PDF. Exact name `gate-x-owner-document-no-adapt.pdf`. Place only in `tmp/gate-x-controlled-test-owner-staging/`. During upload, answer crop/adapt = **No**.

---

### Case 3 — Identifiable person requiring likeness decision

| Field | Proposed file |
|-------|---------------|
| Filename | `gate-x-owner-self-portrait.jpg` |
| Description | Tagia self-portrait JPEG; one clearly identifiable adult |
| Expected | QUARANTINED until likeness consent is confirmed; cleared only with explicit consent |

**Tagia supply:** One self-portrait JPEG. Exact name `gate-x-owner-self-portrait.jpg`. Place only in `tmp/gate-x-controlled-test-owner-staging/`. Filename contains `portrait` (intended likeness hint).

---

### Case 4 — Third-party material requiring inspection (Scout-supplied)

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-shelf-with-fictional-labels.jpg` |
| Description | Scout-created illustrated shelf with **entirely fictional** product names — no real companies, no real trademarks, no copied commercial packaging, no Tagia photography |
| Expected | `QUARANTINED` |
| Variant | **Rights-missing** |

**Tagia supply:** None. Do not use Tagia photography.

**Scout supply:** Fixture lives in `controlled-test-pack/04-third-party-fictional/`. Source and test-use permission: `controlled-test-pack/04-third-party-fictional/FIXTURE-SOURCE-AND-TEST-USE-PERMISSION.md`. Filename contains `shelf` (intended third-party hint).

**Certification answers (exact):**

| Field | Answer |
|-------|--------|
| Upload authority | Yes — `customer_has_permission` |
| Commercial use permitted | Yes |
| Crop/adapt permitted | Yes |
| Recognizable people present | No |
| Likeness consent | Not shown / not confirmed |
| Third-party material present | **Yes** |
| Third-party commercial-use authority | **Not confirmed** (leave `thirdPartyRightsConfirmed` unchecked / false) |

**Expected routing:** `QUARANTINED` because `thirdPartyMaterialPresent === true` and `thirdPartyRightsConfirmed` is not true (`src/lib/studio-customer-content-intake/routing.ts`). Production not cleared. Customer-visible explanation: third-party protected material appears, but commercial-use authority is not confirmed.

Live form: `validateFileRightsDraft()` must allow this honest state. Unconfirmed third-party authority is not a submit blocker; the Machine quarantines after submit and production stays blocked.

---

### Case 5 — Technically unsupported or corrupt file (must reject)

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-corrupt.png` |
| Description | PNG extension with invalid/corrupt bytes |
| Expected | REJECTED with clear customer message |

**Tagia supply:** None. Scout generates a truncated PNG in `controlled-test-pack/05-corrupt/` during the later execution package (synthetic bytes — not a customer asset).

---

### Case 6 — Replacement file supersedes earlier version

| Field | Proposed files |
|-------|----------------|
| First | `gate-x-owner-mark-v1.png` |
| Second | `gate-x-owner-mark-v2.png` (different bytes, same slot) |
| Expected | First → SUPERSEDED; second → active; only v2 eligible for production |

**Tagia supply:** Two different simple owned PNG marks. Exact names `gate-x-owner-mark-v1.png` and `gate-x-owner-mark-v2.png`. Place only in `tmp/gate-x-controlled-test-owner-staging/`. Do not use the word `logo` in the filename (that token is a third-party filename hint).

---

### Case 7 — Duplicate file

| Field | Proposed file |
|-------|---------------|
| Filename | Re-upload exact bytes of `gate-x-owner-neutral-scene.jpg` |
| Expected | Duplicate detected; `duplicateKept` or equivalent; no duplicate ledger pollution |

**Tagia supply:** None. Scout re-uses Case 1 bytes already staged. No additional owner file.

---

### Case 8 — Customer-withdrawn file

| Field | Proposed file |
|-------|---------------|
| Filename | An already-uploaded file from an earlier case |
| Expected | WITHDRAWN_BY_CUSTOMER; removed from production eligibility |

**Tagia supply:** None. Scout performs the withdrawal action through the customer UI. No additional owner file.

---

### Case 9 — Production-routing gate (cleared only)

| Field | Proposed action |
|-------|-----------------|
| Setup | Cases 1–8 complete; only cleared files remain eligible |
| Per-file gate | `isCustomerContentClearedForProduction` / `materialBlocksProductionUse` — SKU-agnostic; only `CLEARED_FOR_PRODUCTION` or `CLEARED_WITH_LIMITS` may pass |
| Job-level gate | `canTransitionToBuildingConcepts` → `blockingMaterialsForSku(materials, job.skuId)` where `job.skuId` is the purchased shelf SKU `v2-rtu-promotion-graphics` |
| Expected | Production start remains blocked while any related file is uncleared; capability id `campaign-creative` is not used as `job.skuId` |

**Tagia supply:** None. Scout verification step only. No additional owner file.

---

## Owner files required (exactly five)

| # | Exact filename | Case |
|---|----------------|------|
| 1 | `gate-x-owner-neutral-scene.jpg` | 1 (and reused by 7) |
| 2 | `gate-x-owner-document-no-adapt.pdf` | 2 |
| 3 | `gate-x-owner-self-portrait.jpg` | 3 |
| 4 | `gate-x-owner-mark-v1.png` | 6 first |
| 5 | `gate-x-owner-mark-v2.png` | 6 second |

Place all five in `tmp/gate-x-controlled-test-owner-staging/` only. Do not collect them until owner review of this correction.

---

## Owner actions required before execution

| # | Action | Owner |
|---|--------|-------|
| 1 | Approve fictional test customer fixture | Tagia |
| 2 | After review, place the five named files in `tmp/gate-x-controlled-test-owner-staging/` | Tagia |
| 3 | Authorize Scout to generate the Case 5 synthetic corrupt PNG | Tagia |
| 4 | Do not use real outside-customer files without separate authorization | Tagia |

Identifiers already resolved from the repository: Launch Now capability `campaign-creative`; live hire/pay shelf SKU `v2-rtu-promotion-graphics`. Case 9 uses the shelf SKU as `job.skuId`.

---

## Safe file handling rules

1. Store Scout fixtures only in `controlled-test-pack/` inside the package evidence tree. Store owner raw files only in `tmp/gate-x-controlled-test-owner-staging/` (Git-ignored by existing `tmp/`).
2. Record SHA-256 of every file in the run manifest before upload.
3. Git may retain only approved filenames, SHA-256 hashes, routing/certification results, manifest records, redacted screenshots, and non-personal synthetic/fictional fixtures.
4. Never commit Tagia’s selfie, other personal photographs, original owner JPEG/PDF/PNG bytes, private EXIF/GPS, or unredacted raw uploads.
5. Use the fictional business name throughout.
6. Do not upload until execution is explicitly authorized.

---

## Execution sequence (future — not this turn)

1. Create certification campaign through live hire/pay path.  
2. Upload Case 1; verify identity fields and CLEARED state.  
3. Proceed Cases 2–8 in order; record state transitions.  
4. Run Case 9 production-routing simulation.  
5. Seal evidence in `certification-runs/{date}-gate-x/`.  
6. Tagia review before close stamp.

---

## Pass criteria

- All 9 cases behave as specified on the **live customer route**.  
- No uncleared file reaches production routing.  
- Durable per-file rights records exist for every uploaded file.  
- Customer sees honest status for every file.  
- Evidence manifest matches on-disk SHA-256 values.
