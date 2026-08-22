# Gate X certification run capture procedure

Package: `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`

## When to run

Only after:

1. Gate X completion pass is accepted
2. Controlled Customer-One test is explicitly authorized
3. Test file pack is collected per `CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md`

Do **not** record a certification run during implementation-only proof tests.

## Deterministic steps

1. Complete the controlled Customer-One test on the live upload path  
   (`MaterialsIntakePanel` → `PATCH /api/campaigns/{campaignId}/materials`).
2. Load the campaign materials envelope from the server store (not browser cache).
3. Call `buildGateXCertificationRunManifest({ campaignId, items })`.
4. Create `docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/certification-runs/<run-id>/`.
5. Write `manifest.json` (pretty-printed JSON from step 3).
6. Write `manifest.sha256.txt` containing the `manifestSha256` field verbatim.
7. Optionally add `notes.md` with run date, operator, and scenario references.

## Manifest fields

| Field | Meaning |
|-------|---------|
| `runId` | Stable run identifier (`gate-x-run-<timestamp>` unless overridden) |
| `campaignId` | Campaign under test |
| `entries[].certificationId` | Per-file certification record id |
| `entries[].routingState` | Current routing state |
| `entries[].archiveCount` | Count of archived superseded certifications |
| `entries[].productionCleared` | Whether active record clears production gate |

## Evidence rules

- Use authorized test files only — never production customer data in this folder prematurely.
- Preserve withdrawn and superseded archive entries in the source envelope before capture.
- Do not edit `manifest.json` after `manifestSha256` is written.

## Implementation reference

- `src/lib/studio-customer-content-intake/certification-run-capture.ts`
- `src/lib/studio-customer-content-intake/withdrawal.ts`
- `src/lib/studio-customer-content-intake/supersession.ts`
