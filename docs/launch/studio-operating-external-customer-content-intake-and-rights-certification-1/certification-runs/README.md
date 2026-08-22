# Gate X certification runs

This directory holds **controlled certification-run evidence** for  
`STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`.

## Purpose

Each run captures a deterministic manifest of per-file certification records after a  
controlled Customer-One test. Manifests are produced by  
`buildGateXCertificationRunManifest()` in  
`src/lib/studio-customer-content-intake/certification-run-capture.ts`.

## Layout

```
certification-runs/
  README.md
  <run-id>/
    manifest.json
    manifest.sha256.txt
    notes.md            (optional human context)
```

## Status

Original sealed run (immutable):

- `gate-x-run-2026-08-22T230059190Z`
- Manifest SHA-256: `04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c`

Supplemental two-defect retest:

- `gate-x-run-2026-08-22T232853529Z`
- Manifest SHA-256: `77f1dbf62b634bc5d695476f855d2dccf8e4bcd273260078bcf39b4f4d1073ab`

Case 3 likeness-hold live proof:

- `gate-x-run-2026-08-22T235349346Z`
- Manifest SHA-256: `ebd769003e7527fd906b627390f6804d71fe6b50fef68ae36bbdbc2be433f1d2`

Do **not** overwrite, rename, or reinterpret the original sealed run. Supplemental runs are additive directories only.

Owner raw photographs never enter this Git-tracked folder. After an authorized run, this folder may hold manifests, hashes, routing records, and redacted screenshots only.

Defects from the sealed run are recorded in [DEFECT-LEDGER.md](../DEFECT-LEDGER.md).

## Procedure

See [CERTIFICATION-RUN-CAPTURE-PROCEDURE.md](../CERTIFICATION-RUN-CAPTURE-PROCEDURE.md).
