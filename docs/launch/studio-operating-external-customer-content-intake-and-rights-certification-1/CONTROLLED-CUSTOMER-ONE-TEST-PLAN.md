# CONTROLLED CUSTOMER-ONE TEST PLAN

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** PROPOSAL ONLY — do not execute in opening package  
**Date:** 2026-08-22

This plan designs a later controlled test using the **actual customer route** (`MaterialsIntakePanel` → multipart PATCH `/api/campaigns/{campaignId}/materials`). Studio-generated Room 4C fixtures and developer shortcuts are forbidden.

---

## Test customer fixture

Use a dedicated certification campaign (not Moss & Thread, Cedar Lane, or Harbor Roast). Suggested identity:

| Field | Value |
|-------|-------|
| Customer name | Gate X Certification Customer (fictional) |
| Business | Northwind Pantry Co-op (fictional) |
| Service | Social graphics or campaign creative (Launch Now with limits) |
| Route | Hire → pay → Studio Board materials upload |
| Owner labor | NONE during test execution |

Tagia approves the fixture before execution. Do not substitute real customer data without explicit authorization.

---

## Test pack (9 required cases)

### Case 1 — Ordinary customer-owned file (fully cleared)

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-storefront-own-photo.jpg` |
| Description | Simple storefront photo Tagia owns or created; no identifiable strangers, no third-party marks |
| Expected | RECEIVED → CLEARED_FOR_PRODUCTION |
| Rights statement | Customer confirms own photo, campaign use permitted, crop/adapt permitted |

**Tagia supply:** Provide a JPEG you own (phone photo of a neutral scene or Studio-owned test image). Place in `controlled-test-pack/01-own-photo/` before execution. Record SHA-256 in the run manifest.

---

### Case 2 — Missing crop/adaptation permission (must block)

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-menu-scan-no-adapt.pdf` |
| Description | Customer-owned scan but customer denies cropping/resizing/editing |
| Expected | RIGHTS_INFORMATION_REQUIRED or CLEARED_WITH_LIMITS that blocks adaptation; production gate blocks if adaptation required |

**Tagia supply:** Any PDF you own. During upload, answer rights questions to deny crop/adapt permission.

---

### Case 3 — Identifiable person requiring likeness decision

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-team-member-portrait.jpg` |
| Description | Photo with one clearly identifiable adult (Tagia or consenting volunteer) |
| Expected | RIGHTS_INFORMATION_REQUIRED → likeness follow-up → cleared only with explicit consent |

**Tagia supply:** Portrait where the subject is Tagia or a consenting adult who approves Studio test use. Document consent in run notes (not in customer-facing copy).

---

### Case 4 — Third-party material requiring inspection

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-shelf-with-brand-labels.jpg` |
| Description | Photo containing visible third-party logos, packaging, or signage |
| Expected | TECHNICAL_REVIEW_REQUIRED or QUARANTINED until third-party material decision; may become CLEARED_WITH_LIMITS (blur/crop) or REJECTED |

**Tagia supply:** Shelf/product photo with obvious brand labels (grocery items, book spines, etc.). No need for real trademark conflict — test is inspection routing, not legal opinion.

---

### Case 5 — Technically unsupported or corrupt file (must reject)

| Field | Proposed file |
|-------|---------------|
| Filename | `northwind-corrupt.png` |
| Description | PNG extension with invalid/corrupt bytes, or disallowed type |
| Expected | REJECTED with clear customer message |

**Tagia supply:** Scout generates a zero-byte or truncated PNG in `controlled-test-pack/05-corrupt/` during execution package (synthetic corrupt file — not a real customer asset).

---

### Case 6 — Replacement file supersedes earlier version

| Field | Proposed files |
|-------|----------------|
| First | `northwind-logo-v1.png` |
| Second | `northwind-logo-v2.png` (different bytes, same slot) |
| Expected | First → SUPERSEDED; second → active; only v2 eligible for production |

**Tagia supply:** Two distinct PNGs you own (any simple shapes/colors).

---

### Case 7 — Duplicate file

| Field | Proposed file |
|-------|---------------|
| Filename | Re-upload exact bytes from Case 1 |
| Expected | Duplicate detected; `duplicateKept` or equivalent; no duplicate ledger pollution |

**Tagia supply:** Re-use Case 1 file bytes.

---

### Case 8 — Customer-withdrawn file

| Field | Proposed file |
|-------|---------------|
| Filename | Any uploaded file from earlier case |
| Expected | WITHDRAWN_BY_CUSTOMER; removed from production eligibility |

**Tagia supply:** Perform withdrawal action through customer UI once built; no new file needed.

---

### Case 9 — Production-routing gate (cleared only)

| Field | Proposed action |
|-------|-----------------|
| Setup | Cases 1–8 complete; only cleared files remain eligible |
| Expected | Simulated production-routing gate receives only CLEARED_FOR_PRODUCTION / CLEARED_WITH_LIMITS files; all others blocked with auditable reason |

**Tagia supply:** None — verification step only.

---

## Owner actions required before execution

| # | Action | Owner |
|---|--------|-------|
| 1 | Approve fictional test customer fixture | Tagia |
| 2 | Supply Cases 1–4 and 6 image/PDF files to `controlled-test-pack/` | Tagia |
| 3 | Approve likeness subject for Case 3 | Tagia (or consenting volunteer) |
| 4 | Authorize corrupt file generation for Case 5 | Tagia (synthetic only) |
| 5 | Confirm test campaign service SKU on Launch Now | Tagia |
| 6 | Do not use real outside-customer files without separate authorization | Tagia |

---

## Safe file handling rules

1. Store test pack only in `controlled-test-pack/` inside the package evidence tree.  
2. Record SHA-256 of every file in the run manifest before upload.  
3. Do not commit real customer PII or unpaid third-party commercial assets.  
4. Use fictional business name throughout.  
5. Delete local copies from personal devices after SHA-256 is recorded if desired.  
6. Do not upload until execution package is explicitly authorized.

---

## Execution sequence (future — not opening)

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
