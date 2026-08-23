# ACCEPTANCE AND CERTIFICATION MATRIX

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** CLOSED WITH EXPLICIT LIMITS — owner decision ACCEPTED 2026-08-22  
**Date:** 2026-08-22

Each row maps a Gate X requirement to current truth, evidence, and close condition.

Legend: ✅ proven · ⚠️ partial / explicit limit · ❌ missing · 🚫 not in scope / not claimed

Final evidence (read together; do not overwrite):

1. `certification-runs/gate-x-run-2026-08-22T230059190Z/` SHA-256 `04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c`
2. `certification-runs/gate-x-run-2026-08-22T232853529Z/` SHA-256 `77f1dbf62b634bc5d695476f855d2dccf8e4bcd273260078bcf39b4f4d1073ab`
3. `certification-runs/gate-x-run-2026-08-22T235349346Z/` SHA-256 `ebd769003e7527fd906b627390f6804d71fe6b50fef68ae36bbdbc2be433f1d2`

---

## A. Actual customer route

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| A1 | Files enter via real customer route | ✅ | Live hire/pay + `MaterialsIntakePanel` multipart PATCH | Controlled test uses same route; no dev shortcut |
| A2 | No hidden developer shortcut | ✅ | Live materials API only | Test proves only live path used |
| A3 | Upload survives job handoff | ✅ | Three live campaigns; Board materials persist | Re-proven in Gate X runs |
| A4 | Customer sees per-file status | ✅ | Routing labels and explanations on the materials panel | UI shows cleared / limits / quarantined / withdrawn |
| A5 | Studio sees per-file status | ✅ | Durable rights + routing records on campaign materials | Gate X states stored with the file |

---

## B. File identity

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| B1 | Original customer filename | ✅ | Materials ledger + sealed manifests | Preserved in Gate X runs |
| B2 | Studio-safe stored filename | ✅ | File Room path layout | Preserved |
| B3 | MIME type | ✅ | Stored on upload | Preserved |
| B4 | Verified file signature/type | ✅ | Inspection + Case 4 JPEG fixture; signature mismatch no longer diverts rights | Magic-byte inspection recorded |
| B5 | Byte size | ✅ | Stored | Preserved |
| B6 | Image dimensions | ✅ | Inspection records dimensions where applicable | Captured where applicable |
| B7 | SHA-256 | ✅ | Checksum on store + run manifests | Preserved + bound to rights record |
| B8 | Upload timestamp | ✅ | Ledger timestamps | Preserved |
| B9 | Customer/job identity | ✅ | Campaign-scoped ledger | Preserved |
| B10 | Replacement/version relationship | ✅ | Case 6 v1 `SUPERSEDED` internally, v2 active | Explicit SUPERSEDED chain |
| B11 | Storage locator (no creds) | ✅ | `storageRef` private; owner files not in Git | Preserved |

---

## C. File-specific authority

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| C1 | Per-file ownership (not campaign sentence) | ✅ ⚠️ | Per-file attestation; not an independent legal determination (explicit limit 2) | File-specific rights capture |
| C2 | Customer-provided flag | ✅ | Per-file rights record | Explicit per file |
| C3 | Campaign use permitted | ✅ | Per-file Yes/No | Per-file decision record |
| C4 | Crop/adapt permitted | ✅ | Case 2 supplemental: `CLEARED_WITH_LIMITS` + `no_crop_adapt` (GX-D2 corrected) | Blocks adaptation when denied |
| C5 | Commercial/promotional use | ✅ | Per-file Yes/No | Per-file decision |
| C6 | Attribution required | ⚠️ | Not a separate captured field in the nine-case pack | Not independently certified |
| C7 | Platform restrictions | ⚠️ | Not a separate captured field in the nine-case pack | Not independently certified |
| C8 | Permission expiry | ⚠️ | Not a separate captured field in the nine-case pack | Not independently certified |
| C9 | Statement complete enough | ✅ | Uncertain rights quarantine / block | Automated hold |

---

## D. People, privacy, third-party material

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| D1 | Identifiable adult likeness | ✅ ⚠️ | Case 3 supplemental likeness-hold; declarations + filename hints, not image recognition (explicit limit 1) | Quarantine without confirmed consent |
| D2 | Minor likeness | ⚠️ | Same declaration path; no dedicated minor-likeness live case | Hold via unconfirmed consent |
| D3 | Sensitive/private information | ⚠️ | Regex text scans only | Honest capability statement |
| D4 | Third-party logos/trademarks | ✅ ⚠️ | Case 4 supplemental quarantine via declaration; not image recognition (explicit limit 1) | Test case 4 |
| D5 | Embedded artwork/packaging | ✅ ⚠️ | Case 4 fictional-labels fixture + customer third-party=yes | Test case 4 |
| D6 | Customer remove/blur/crop instructions | ⚠️ | Crop/adapt No is enforced; freeform remove/blur instructions are not a separate field | Crop/adapt denial proven |
| D7 | No false legal certainty | ✅ | Attestation copy + explicit limit 2 | Preserved in copy |

---

## E. Technical and safety intake

| # | Requirement | Current | Evidence | Close condition |
|---|-------------|---------|----------|-----------------|
| E1 | Supported file types | ✅ | `studioMaterialsUploadV1` | Preserved |
| E2 | Extension vs signature | ✅ | Inspection; GX-D4 fixture re-encoded as real JPEG | Signature mismatch recorded |
| E3 | Corrupt/unreadable files | ✅ | Case 5 reject; prior valid file unchanged | Test case 5 |
| E4 | Excessive size/dimensions | ✅ size / ⚠️ dimensions | 5 MB cap | Size proven; dimension cap not a Gate X live case |
| E5 | Duplicate files | ✅ | Case 7 duplicate kept | Test case 7 |
| E6 | Malware scanning | 🚫 | Not performed (explicit limit 3) | Do not claim |
| E7 | Metadata/privacy scrub | ⚠️ | Not performed | Honest statement |
| E8 | Password-protected files | ⚠️ | Not a dedicated live case | Not independently certified |

---

## F. Routing states

| State | Current | Close condition |
|-------|---------|-----------------|
| RECEIVED | ✅ | Explicit state on upload |
| RIGHTS_INFORMATION_REQUIRED | ✅ | Triggered when authority incomplete |
| TECHNICAL_REVIEW_REQUIRED | ✅ | Technical flags; cannot override missing rights |
| CLEARED_FOR_PRODUCTION | ✅ | Case 1 |
| CLEARED_WITH_LIMITS | ✅ | Case 2 supplemental; `no_crop_adapt` enforced |
| QUARANTINED | ✅ | Cases 3 and 4 supplementals |
| REJECTED | ✅ | Case 5 |
| SUPERSEDED | ✅ | Case 6 internal archive (explicit limit 4: no customer banner) |
| WITHDRAWN_BY_CUSTOMER | ✅ | Case 8 |

**Production gate:** ✅ — Case 9 original + supplemental recheck. Customer sees outstanding materials, not the internal `materials_incomplete` code (explicit limit 5).

---

## G. Customer experience

| # | Requirement | Current | Close condition |
|---|-------------|---------|-----------------|
| G1 | Plain-language questions | ✅ | Per-file rights fields; no preselects | Conditional follow-ups |
| G2 | File-specific clarification only when needed | ✅ | Per-file holds | Per-file triggers |
| G3 | Clear block explanations | ✅ | Content-routing sentences | Per-file reasons |
| G4 | Correction/replacement path | ✅ | Case 6; superseded file not shown with a customer banner (explicit limit 4) | SUPERSEDED chain |
| G5 | No silent rejection | ✅ | Case 5 alert copy | Preserved |
| G6 | No invented permission | ✅ | Doctrine + explicit limit 2 | Preserved |

---

## H. Durable evidence

| Artifact | Current | Close condition |
|----------|---------|-----------------|
| Upload manifest | ✅ | Three sealed run manifests | Sealed run manifest |
| Rights record | ✅ | Per-file durable record | Per-file durable record |
| Technical inspection result | ✅ | Per-file inspection | Per-file result |
| Classification decision | ✅ | Routing state + explanation | Gate X decision log |
| Clarification history | ⚠️ | Activity / attribution partial | Full thread not a close blocker |
| Production-routing decision | ✅ | Case 9 | Per-file clearance check |
| Replacement/version history | ✅ | Case 6 | SUPERSEDED chain |
| Customer withdrawal | ✅ | Case 8 | Test case 8 |
| Final files-used list | ✅ | Cleared vs uncleared recorded on the campaign | Exact cleared files only |

---

## Package close gate summary

Package closed because:

1. In-scope ❌ rows for Launch Now photo-led work are resolved or recorded as explicit limits.  
2. Controlled Customer-One test pack (9 cases) has live proof on the live route.  
3. Evidence sealed in `certification-runs/` (three immutable runs).  
4. Mobile certification remains **not started**; Gate X no longer blocks it as an unproven path.  
5. Owner accepted **CLOSE WITH EXPLICIT LIMITS**.
