# Gate X defect ledger

Package: `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
Status: **OPEN** — corrections recorded; package is not closed.

Original sealed run (immutable; do not overwrite, rename, or reinterpret):

- Directory: `certification-runs/gate-x-run-2026-08-22T230059190Z/`
- Manifest SHA-256: `04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c`

Owner decision on that sealed run: Cases 1, 3, 5, 6, 7, 8, and 9 matched. Cases 2 and 4 did not. Gate X remains OPEN.

## GX-D2 — Case 2 crop/adapt denial cleared without limits

| Field | Record |
|-------|--------|
| Sealed run | `gate-x-run-2026-08-22T230059190Z` |
| Expected | `CLEARED_WITH_LIMITS` with explicit `no_crop_adapt` |
| Actual (sealed) | `CLEARED_FOR_PRODUCTION` on the PDF |
| Stored rights (sealed) | `cropAdaptPermitted=true` on the superseded PDF record |
| Classification | Genuine control defect |

Root cause:

1. `document-reference` was not treated as a Gate X per-file rights category. Live Case 2 uploaded onto `document-reference:file-metadata`.
2. `buildCustomerContentRightsRecord()` forced `cropAdaptPermitted: true` when the category was not a clearance category.
3. Routing then took the non-clearance branch and issued unrestricted `CLEARED_FOR_PRODUCTION`.
4. Shared radio `name`s across slots also made crop=No clicks unreliable on the live form.

Required correction: honor crop/adapt denial on document-reference file uploads; route to `CLEARED_WITH_LIMITS`; store `no_crop_adapt`; keep as-is production clearance; forbid downstream crop/adapt.

## GX-D4 — Case 4 diverted to technical review instead of rights quarantine

| Field | Record |
|-------|--------|
| Sealed run | `gate-x-run-2026-08-22T230059190Z` |
| Expected | `QUARANTINED` (unresolved third-party rights) |
| Actual (sealed) | `TECHNICAL_REVIEW_REQUIRED` |
| Stored rights (sealed) | `thirdPartyMaterialPresent=false` on the shelf file |
| Classification | Control + fixture defect; production stayed blocked |

Root cause:

1. Scout fixture `northwind-shelf-with-fictional-labels.jpg` was PNG magic bytes with a `.jpg` name, so inspection recorded a signature mismatch and `technicalNeedsReview`.
2. Routing evaluated technical review **before** unresolved third-party rights.
3. Document-reference forced `thirdPartyMaterialPresent: false`, so the live Case 4 never stored the intended third-party-yes / authority-unchecked answers.

Required correction: a valid technical fixture must not accidentally divert this rights test; unresolved third-party rights must route to `QUARANTINED` even if concurrent technical findings are recorded; team technical approval must never clear unresolved third-party rights.

## Supplemental retest

Directory: `certification-runs/gate-x-run-2026-08-22T232853529Z/`  
Manifest SHA-256: `77f1dbf62b634bc5d695476f855d2dccf8e4bcd273260078bcf39b4f4d1073ab`  
Campaign: `2d6ea4d7-230d-42b4-94a1-6b0fa8f1f46a`

Actual supplemental outcomes:

- Case 2: `CLEARED_WITH_LIMITS` with `cropAdaptPermitted=false` and `limits=["no_crop_adapt"]`
- Case 4: `QUARANTINED` with `thirdPartyMaterialPresent=true`, authority unconfirmed, and no technical-review diversion
- Case 9 recheck: `canTransitionToBuildingConcepts.allowed=false` (`materials_incomplete`); uncleared certified file is the Case 4 logo-brand slot

## Case 3 likeness-hold live proof

Directory: `certification-runs/gate-x-run-2026-08-22T235349346Z/`  
Manifest SHA-256: `ebd769003e7527fd906b627390f6804d71fe6b50fef68ae36bbdbc2be433f1d2`  
Campaign: `cd09adb6-18a8-4015-884d-2b42eaefb8dd`

Actual:

- `recognizablePeoplePresent=true`
- `likenessConsentConfirmed=false`
- `rightsAnswersContradictFilenameHints=false`
- Routing: `QUARANTINED`
- Customer-visible explanation: Recognizable people appear in this file, but likeness consent is not confirmed yet.

## Package recommendation

Gate X remains **OPEN**. No close. No merge. Room 5 remains `NOT_STARTED`. Register tip `5c22de9` remains untouched.
