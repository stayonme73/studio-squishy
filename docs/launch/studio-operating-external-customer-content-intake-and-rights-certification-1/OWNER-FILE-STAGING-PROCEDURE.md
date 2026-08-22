# Gate X — owner file staging procedure

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** ACTIVE — use before any controlled Customer-One execution

## Canonical staging path (one location only)

```
tmp/gate-x-controlled-test-owner-staging/
```

This path is Git-ignored by the existing `tmp/` rule in `.gitignore`. Config constant: `studioExternalCustomerContentIntakeAndRightsCertificationV1.ownerRawFileStagingDir`.

There is **no** alternate root-level staging folder.

**Never** place owner selfies or personal photographs under `docs/`, `controlled-test-pack/`, `certification-runs/`, or any other Git-tracked path.

## Tagia transfer (exactly five files)

Copy these five files into `tmp/gate-x-controlled-test-owner-staging/` using these exact names:

1. `gate-x-owner-neutral-scene.jpg` — owned JPEG of a neutral scene; no recognizable people; no visible brands  
2. `gate-x-owner-document-no-adapt.pdf` — any PDF you own  
3. `gate-x-owner-self-portrait.jpg` — your self-portrait  
4. `gate-x-owner-mark-v1.png` — a simple owned PNG mark  
5. `gate-x-owner-mark-v2.png` — a different simple owned PNG mark (different bytes from v1)

That is the full owner file set. Cases 4, 5, 7, 8, and 9 do not need additional Tagia files.

Do not collect these files until this checklist correction is accepted.

## What may enter Git

- Approved filenames  
- SHA-256 hashes per file  
- Routing records, certification IDs, and manifest JSON from `buildGateXCertificationRunManifest()`  
- Redacted screenshots of customer-visible status copy  
- Scout-created fictional fixtures with documented test-use permission (Case 4)  
- Synthetic corrupt bytes (Case 5)

## What must not enter Git

- Tagia’s selfie or other personal photographs  
- Original owner JPEG/PDF/PNG bytes  
- Private EXIF/GPS metadata  
- Unredacted raw uploads

## EXIF / GPS

Scout inspects every owner-supplied image for GPS/private EXIF before execution. If found, stop and sanitize or replace before upload.

## Retention

Raw owner files remain in `tmp/gate-x-controlled-test-owner-staging/` only for the certification run. Scout deletes that folder after the sealed manifest is written and Tagia reviews evidence, unless Tagia requests a short local retention window.
