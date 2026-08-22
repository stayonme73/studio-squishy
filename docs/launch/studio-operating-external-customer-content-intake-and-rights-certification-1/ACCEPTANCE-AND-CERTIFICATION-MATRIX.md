# ACCEPTANCE AND CERTIFICATION MATRIX

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** OPEN — matrix only; no results stamped  
**Date:** 2026-08-22

Each row maps a Gate X requirement to current truth, evidence, and close condition.

Legend: ✅ proven · ⚠️ partial · ❌ missing · 🚫 not in scope

---

## A. Actual customer route

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| A1 | Files enter via real customer route | ⚠️ | Maya materials upload cert; `MaterialsIntakePanel` | Controlled test uses same route; no dev shortcut |
| A2 | No hidden developer shortcut | ⚠️ | Legacy `project-details-upload.ts` quarantined in route map | Test proves only live path used |
| A3 | Upload survives job handoff | ✅ | Maya fresh-browser re-login proof | Re-proven in Gate X run |
| A4 | Customer sees per-file status | ❌ | Ledger exists; Gate X states not surfaced | UI shows RECEIVED/CLEARED/QUARANTINED/etc. |
| A5 | Studio sees per-file status | ⚠️ | Team review statuses exist | Gate X states on Board/File Room |

---

## B. File identity

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| B1 | Original customer filename | ✅ | Materials ledger + client-file-store | Preserved in Gate X run |
| B2 | Studio-safe stored filename | ✅ | File Room path layout | Preserved |
| B3 | MIME type | ✅ | Stored on upload | Preserved |
| B4 | Verified file signature/type | ❌ | Extension/MIME check only | Magic-byte or signature verification |
| B5 | Byte size | ✅ | Stored | Preserved |
| B6 | Image dimensions | ❌ | Not recorded today | Captured where applicable |
| B7 | SHA-256 | ✅ | Checksum on store | Preserved + bound to rights record |
| B8 | Upload timestamp | ✅ | Ledger timestamps | Preserved |
| B9 | Customer/job identity | ✅ | Campaign-scoped ledger | Preserved |
| B10 | Replacement/version relationship | ⚠️ | Duplicate-byte detection | Explicit SUPERSEDED chain |
| B11 | Storage locator (no creds) | ✅ | `storageRef` private | Preserved |

---

## C. File-specific authority

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| C1 | Per-file ownership (not campaign sentence) | ❌ | Category checkbox attestation only | File-specific rights capture |
| C2 | Customer-provided flag | ⚠️ | Implicit on upload | Explicit per file |
| C3 | Campaign use permitted | ⚠️ | `useAuthorization` on logo/photo | Per-file decision record |
| C4 | Crop/adapt permitted | ❌ | Not captured per file | Blocks when missing (test case 2) |
| C5 | Commercial/promotional use | ❌ | Not captured per file | Per-file decision |
| C6 | Attribution required | ❌ | Not captured | Per-file when applicable |
| C7 | Platform restrictions | ❌ | Not captured | Per-file when applicable |
| C8 | Permission expiry | ❌ | Not captured | Per-file when applicable |
| C9 | Statement complete enough | ⚠️ | Team review path | Automated hold + clarification |

---

## D. People, privacy, third-party material

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| D1 | Identifiable adult likeness | ❌ | No inspection | Test case 3 + targeted follow-up |
| D2 | Minor likeness | ❌ | No inspection | Block or clarification path |
| D3 | Sensitive/private information | ⚠️ | Regex text scans only | Honest capability statement |
| D4 | Third-party logos/trademarks | ❌ | No image inspection | Test case 4 |
| D5 | Embedded artwork/packaging | ❌ | No inspection | Test case 4 |
| D6 | Customer remove/blur/crop instructions | ❌ | Not structured | Captured when stated |
| D7 | No false legal certainty | ✅ | Material-use doctrine | Preserved in copy |

---

## E. Technical and safety intake

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| E1 | Supported file types | ✅ | `studioMaterialsUploadV1` | Preserved |
| E2 | Extension vs signature | ❌ | MIME/extension only | Signature mismatch rejects |
| E3 | Corrupt/unreadable files | ⚠️ | Store read-back check | Test case 5 |
| E4 | Excessive size/dimensions | ✅ size / ❌ dimensions | 5 MB cap | Dimension limits if added |
| E5 | Duplicate files | ✅ | Checksum dedupe | Test case 7 |
| E6 | Malware scanning | 🚫 | Not performed | Do not claim unless built |
| E7 | Metadata/privacy scrub | ❌ | Not performed | Honest statement |
| E8 | Password-protected files | ❌ | Not detected | Reject with clear message |

---

## F. Routing states

| State | Current | Close condition |
|-------|---------|-----------------|
| RECEIVED | ⚠️ (`stored` approximates) | Explicit state on upload |
| RIGHTS_INFORMATION_REQUIRED | ❌ | Triggered when authority incomplete |
| TECHNICAL_REVIEW_REQUIRED | ❌ | Triggered on technical flags |
| CLEARED_FOR_PRODUCTION | ⚠️ (`approved_for_use` partial) | Only after full file-specific clearance |
| CLEARED_WITH_LIMITS | ❌ | Limits recorded and enforced |
| QUARANTINED | ❌ | Suspicious/unclear files isolated |
| REJECTED | ⚠️ (`blocked_from_use` partial) | With customer-visible reason |
| SUPERSEDED | ❌ | Replacement chain |
| WITHDRAWN_BY_CUSTOMER | ❌ | Test case 8 |

**Production gate:** ❌ — routing handoff does not check per-file Gate X clearance today.

---

## G. Customer experience

| # | Requirement | Current | Close condition |
|---|-------------|---------|-----------------|
| G1 | Plain-language questions | ⚠️ | Ownership checkbox exists | Conditional follow-ups |
| G2 | File-specific clarification only when needed | ❌ | Category-level today | Per-file triggers |
| G3 | Clear block explanations | ⚠️ | Some copy in material-use | Per-file reasons |
| G4 | Correction/replacement path | ⚠️ | Re-upload possible | SUPERSEDED chain |
| G5 | No silent rejection | ✅ | Explicit error copy | Preserved |
| G6 | No invented permission | ✅ | Doctrine | Preserved |

---

## H. Durable evidence

| Artifact | Current | Close condition |
|----------|---------|-----------------|
| Upload manifest | ⚠️ | Ledger items | Sealed run manifest |
| Rights record | ❌ | | Per-file durable record |
| Technical inspection result | ❌ | | Per-file result |
| Classification decision | ⚠️ | Team review | Gate X decision log |
| Clarification history | ⚠️ | Activity log partial | Full thread per file |
| Production-routing decision | ⚠️ | Routing handoff | Per-file clearance check |
| Replacement/version history | ❌ | | SUPERSEDED chain |
| Customer withdrawal | ❌ | | Test case 8 |
| Final files-used list | ⚠️ | Job registry partial | Exact cleared files only |

---

## Package close gate summary

Package may close only when:

1. All ❌ rows above that are in scope for Launch Now photo-led work are resolved or explicitly accepted as truthful limits.  
2. Controlled Customer-One test pack (9 cases) passes on the live route.  
3. Evidence sealed in `certification-runs/`.  
4. Mobile certification dependency satisfied (Gate X complete first).  
5. No certification result stamped during opening.
