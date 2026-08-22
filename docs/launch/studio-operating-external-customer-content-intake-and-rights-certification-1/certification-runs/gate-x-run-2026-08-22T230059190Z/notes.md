# Gate X certification run gate-x-run-2026-08-22T230059190Z

Package: STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1
Operator: Scout
Captured: 2026-08-22T23:00:59.190Z
Campaign: 89e5f493-8c07-4fc9-a25d-2e3c0adfe335
Shelf SKU used as job.skuId: v2-rtu-promotion-graphics
Launch Now capability id not used as job.skuId: campaign-creative

## Live path

- Hire: Conversation Room → Promote Something Now → Make My Campaign Graphics ($79)
- Pay: sandbox confirm API (`preferSandbox: true`, mode=sandbox, paid=true). Board copy: "Payment confirmed (sandbox — not live money)". Stripe hosted Checkout was not used. The developer sandbox button was not present in the DOM even with `?studioPaymentSandbox=1`.
- Intake: Campaign Graphics intake fields were filled in Conversation Room; Studio Board still showed Waiting on Project Intake after arrival. MaterialsIntakePanel was available because payment had been received. Uploads used the live multipart PATCH path.
- Upload slot actually exercised: `document-reference:file-metadata` (first file input).

## Case results (actual, not rewritten)

See `tmp/gate-x-run/outcomes.json` for per-case client GET snapshots.

| Case | Expected | Actual routing after action |
|------|----------|------------------------------|
| 1 | CLEARED_FOR_PRODUCTION | CLEARED_FOR_PRODUCTION |
| 7 | duplicate kept | Same stored Case 1 file remained CLEARED_FOR_PRODUCTION (no new filename) |
| 5 | REJECTED, slot unchanged | PATCH 400; slot remained Case 1 JPEG CLEARED_FOR_PRODUCTION |
| 2 | CLEARED_WITH_LIMITS | CLEARED_FOR_PRODUCTION on the PDF |
| 3 | QUARANTINED | QUARANTINED |
| 4 | QUARANTINED | TECHNICAL_REVIEW_REQUIRED |
| 6a | CLEARED then SUPERSEDED | v1 CLEARED_FOR_PRODUCTION |
| 6b | active CLEARED | v2 CLEARED_FOR_PRODUCTION |
| 8 | WITHDRAWN_BY_CUSTOMER | WITHDRAWN_BY_CUSTOMER |
| 9 | production blocked while uncleared | `canTransitionToBuildingConcepts.allowed=false` for `job.skuId=v2-rtu-promotion-graphics`; reason `materials_incomplete`. Uncleared certified file: withdrawn document-reference slot. Also blocking: empty required logo-brand slot and factual-confirmation slot. Capability id `campaign-creative` was not used as `job.skuId`. |

Durable archive on the document-reference slot (5 superseded certifications, then withdrawn v2): Case 1 JPEG, Case 2 PDF, Case 3 self-portrait, Case 4 shelf JPEG, Case 6 v1 mark. Case 7 did not add an archive row. Case 5 did not store.

Rights answers actually stored on those superseded records: cropAdaptPermitted=true on the PDF; recognizablePeoplePresent=false on the self-portrait (quarantine came from a filename contradiction, not an unchecked likeness box); thirdPartyMaterialPresent=false on the shelf file. The runner’s rights-form clicks did not capture crop=No / third-party Yes as intended.

## Evidence rules

- Manifest records hashes and routing only. Owner JPEG/PDF/PNG bytes were not copied here.
- Case screenshots in `tmp/gate-x-run/` are Git-ignored and may include file thumbnails; they are not copied into this folder.
- Package remains OPEN. No close stamp. No merge. Room 5 remains NOT_STARTED.
