# EXISTING CUSTOMER UPLOAD AND ROUTING MAP

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** OPEN — discovery record only  
**Date:** 2026-08-22  
**Base:** `5c22de9`

This map records **honest current truth** from code and sealed evidence. It does not claim Gate X is complete.

---

## Live customer file upload path (the route Gate X must certify)

| Step | Path | Classification |
|------|------|----------------|
| Customer UI | `src/components/materials/MaterialsIntakePanel.tsx` | **LIVE** |
| Customer surfaces | `/studio-board` (`StudioBoardScene.tsx`), `/campaign-details` (`MaterialsUpdateBranch.tsx`) | **LIVE** |
| API | `PATCH /api/campaigns/{campaignId}/materials` (multipart FormData) | **LIVE** |
| API handler | `src/app/api/campaigns/[campaignId]/materials/route.ts` | **LIVE** |
| Byte storage | `src/lib/materials/client-file-store.ts` | **PROVEN_WITH_LIMITS** |
| Storage adapter | `src/lib/file-storage/server.ts` → Supabase prod / FS fallback non-prod | **PROVEN_WITH_LIMITS** |
| Materials ledger | `src/lib/materials/store.ts` → `data/campaign-materials/{campaignId}.json` | **LIVE** |
| Team download | `GET /api/campaigns/{campaignId}/materials/{itemId}/content` | **PROVEN_WITH_LIMITS** |
| Upload policy | `src/config/studio-materials-upload-v1.ts` | **LIVE** |
| Prior cert | `docs/launch/studio-operating-materials-upload-and-receipt-1/` (Maya flyer) | **PROVEN_WITH_LIMITS** |

**Gate X entry point:** multipart PATCH via `MaterialsIntakePanel` only.

---

## Intake paths (text — not file upload)

| Path | Classification | Notes |
|------|----------------|-------|
| `src/lib/route-map-intake-materials.ts` | **LIVE** (text-only) | Availability descriptions; files deferred to Board |
| `src/components/studio-conversation-room/guide/ProjectIntakeMultiServiceForm.tsx` | **LIVE** (text-only) | Describe/links; not bytes |
| `src/lib/studio-intake-handoff.ts` | **LIVE** | Auth/passport handoff only |
| `/route-map?step=intake` | **LIVE** (text-only) | No file picker |

---

## Rights and clearance (partial — not Gate X)

| Path | Classification | Notes |
|------|----------------|-------|
| `src/config/studio-material-use-v1.ts` | **PROVEN_WITH_LIMITS** | `logo-brand`, `photo-video` require clearance |
| `src/lib/studio-material-use/evaluate.ts` | **PROVEN_WITH_LIMITS** | Text pattern scans; operational not legal |
| `src/lib/studio-pre-acceptance/evaluate-material-use.ts` | **PROVEN_WITH_LIMITS** | Pre-payment ambiguity bridge only |
| `src/lib/job-control/final-delivery-gates.ts` | **PROVEN_WITH_LIMITS** | Material holds block delivery (Scenario I sealed) |
| Per-file routing states (RECEIVED → CLEARED/QUARANTINED/…) | **MISSING** | Required by Gate X |
| Per-file durable rights records | **MISSING** | Beyond `useAuthorization` checkbox |
| Quarantine workflow | **MISSING** | No dedicated state machine |
| Automated likeness/IP inspection | **MISSING** | Regex text scans only |

---

## Storage and authentication

| Component | Classification | Notes |
|-----------|----------------|-------|
| Supabase storage (`src/lib/file-storage/supabase.ts`) | **PROVEN_WITH_LIMITS** | Required in production |
| FS fallback (`src/lib/file-storage/fs-adapter.ts`) | **PROVEN_WITH_LIMITS** | Non-prod when Supabase unset |
| Mock adapter (`src/lib/file-storage/mock.ts`) | **PREVIEW_ONLY** | Tests only |
| Staff File Room upload (`/api/file-room/.../files`) | **LIVE** | Internal; no customer MIME/size parity |
| Job file registry (`src/lib/file-registry/job-files.ts`) | **LIVE** | Links stored files to jobs |
| Campaign auth / ownership | **LIVE** | Session-scoped campaign access on API routes |

---

## Studio Board and material requests

| Component | Classification | Notes |
|-----------|----------------|-------|
| `StudioBoardMaterialsWorkflow.tsx` | **LIVE** (text-only) | Social-goal JSON; no file picker |
| `MaterialsIntakePanel` on same Board page | **LIVE** | Actual file upload |
| `src/lib/materials/actions.ts` | **LIVE** | Blocks filename-only receipt |
| `src/lib/materials/promotion.ts` | **LIVE** | Owner-approved exception slots |
| `missing_material_request` activity | **LIVE** | `src/lib/job-control/activity-log.ts` |

---

## Review Room and attachments

| Component | Classification | Notes |
|-----------|----------------|-------|
| Review feedback (`review-feedback-types.ts`) | **LIVE** | Sticky notes, voice notes, highlights — structured data |
| Customer file attachments in Review | **MISSING** | Customers cannot attach reference files |
| Review proofs | **LIVE** | Studio-uploaded `review_proof` via File Room |
| `/feedback-studio` · `/review-room` | **LIVE** | No customer upload |

---

## Production routing

| Component | Classification | Notes |
|-----------|----------------|-------|
| `src/lib/studio-routing-handoff/evaluate.ts` | **PROVEN_WITH_LIMITS** | Sealed routing handoff |
| `src/lib/studio-routing-handoff/ensure.ts` | **PROVEN_WITH_LIMITS** | Triggered after pay/intake/materials |
| Materials API → routing wake | **LIVE** | `recoverPaidOperatingChain` / `ensureDispatchExecution` |
| Per-file cleared-to-production gate | **MISSING** | Gate X requirement |
| `src/app/api/campaigns/[campaignId]/production/route.ts` | **LIVE** | Staff Kitchen production |

---

## Final delivery

| Component | Classification | Notes |
|-----------|----------------|-------|
| `/deliverables` | **LIVE** | Final Delivery page |
| `src/app/api/campaigns/[campaignId]/delivery/route.ts` | **LIVE** | Released CDF only |
| `src/lib/studio-approved-delivery/` | **PROVEN_WITH_LIMITS** | Approved identity + release authorization |
| Material holds → delivery block | **PROVEN_WITH_LIMITS** | Scenario I sealed |

---

## Paths that must NOT be called for live customer upload

| Path | Why unsafe |
|------|------------|
| `src/lib/project-details-upload.ts` | **IN_MEMORY_ONLY** — localStorage base64 |
| `ProjectDetailsFileUpload.tsx` | Legacy preview path |
| JSON PATCH `{ fileName, mimeType }` on file-metadata | Rejected unless `not_available_yet` |
| `createReferenceOnlyStorageRef` / `google_shared_drive` hints | Metadata without bytes |
| `src/lib/studio-room-4c-scenario-3/photo-pack-ingest.ts` | **PREVIEW_ONLY** — Studio fixtures |
| `studio-room-4c-scenario-3-photo-pack-v1.ts` | `externalCustomerPhotoPathProven: false` |
| Intake text fields | Not an upload endpoint |
| `createMockFileRoomStorageAdapter()` | Test harness only |

---

## MIME and size limits (customer materials)

From `studioMaterialsUploadV1`:

- **Max size:** 5 MB  
- **Allowed MIME:** `image/png`, `image/jpeg`, `application/pdf`, Word docs, `text/plain`, `audio/mpeg`, `audio/wav`, `audio/wave`, `video/mp4`  
- **Allowed extensions:** `.png`, `.jpg`, `.jpeg`, `.pdf`, `.doc`, `.docx`, `.txt`, `.mp3`, `.wav`, `.mp4`

**Policy tension (OWNERSHIP_UNCLEAR):** `studioMaterialUseV1` states customer music/audio files are **NOT_ACCEPTED_NOT_USED** as materials categories, yet MP3/WAV/MP4 appear in the upload allowlist. Gate X must not claim audio intake is certified without resolving this.

---

## Red flags for Gate X execution

1. **Byte receipt ≠ rights certification** — Maya cert proved storage; Gate X requires per-file authority.  
2. **No per-file routing state machine** — current ledger has review statuses, not Gate X states.  
3. **No quarantine path** — suspicious uploads have no dedicated workflow.  
4. **Review Room cannot receive customer reference files** — may affect photo-led clarification loops.  
5. **Staff upload has no customer-parity validation** — separate from Gate X but worth noting.  
6. **Room 4C Scenario 3 fixtures must not substitute** — register and Scenario 3 brief both record `externalCustomerPhotoPathProven: false`.

---

## Recommended implementation seam (first execution step)

Extend the live path:

`MaterialsIntakePanel` → multipart PATCH `/api/campaigns/{id}/materials` → `client-file-store.ts` → materials ledger

…with per-file routing states, file-specific rights capture, technical inspection results, durable rights records, and a production-routing gate that blocks uncleared files before dispatch.

Do not build a parallel developer upload path.
