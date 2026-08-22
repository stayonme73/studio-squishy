# Gate X supplemental certification run gate-x-run-2026-08-22T232853529Z

Package: STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1
Kind: SUPPLEMENTAL (Cases 2 and 4 retest after two-defect correction)
Operator: Scout
Captured: 2026-08-22T23:28:53.529Z
Campaign: 2d6ea4d7-230d-42b4-94a1-6b0fa8f1f46a
Shelf SKU used as job.skuId: v2-rtu-promotion-graphics
Launch Now capability id not used as job.skuId: campaign-creative

This directory does **not** replace the original sealed run.

- Original sealed run: `gate-x-run-2026-08-22T230059190Z`
- Original manifest SHA-256: `04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c`

## Live path

- Hire: Conversation Room → Promote Something Now → Make My Campaign Graphics ($79)
- Pay: sandbox confirm API (`preferSandbox: true`). Stripe hosted Checkout was not used.
- Uploads used the live multipart PATCH path with existing verified owner PDF and the corrected Scout Case 4 JPEG.

## Slots actually exercised

- Case 2: `document-reference:file-metadata` — owner PDF `gate-x-owner-document-no-adapt.pdf`
- Case 4: `logo-brand:file-metadata` — Scout JPEG `northwind-shelf-with-fictional-labels.jpg`

## Case results (actual, not rewritten)

| Case | Expected | Actual |
|------|----------|--------|
| 2 | CLEARED_WITH_LIMITS + `no_crop_adapt` | CLEARED_WITH_LIMITS; cropAdaptPermitted=false; limits=["no_crop_adapt"]; cropAdaptAllowed=false; productionCleared=true; verifiedMimeType=application/pdf |
| 4 | QUARANTINED | QUARANTINED; thirdPartyMaterialPresent=true; thirdPartyRightsConfirmed=false; technicalIssues=[]; signatureMatch=true; verifiedMimeType=image/jpeg |
| 9 recheck | production blocked while uncleared | canTransitionToBuildingConcepts.allowed=false; reason=materials_incomplete; uncleared=1 (`logo-brand` Case 4); also blocking empty factual-confirmation. Case 2 did not count as uncleared. |

See `tmp/gate-x-supplemental-run/outcomes.json` for client GET snapshots. Owner JPEG/PDF/PNG bytes were not copied here.

## Package recommendation

Gate X remains OPEN. No close stamp. No merge. Room 5 remains NOT_STARTED. Register tip 5c22de9 remains untouched.
