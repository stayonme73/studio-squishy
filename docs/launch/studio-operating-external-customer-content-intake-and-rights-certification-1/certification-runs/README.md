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

**Structure and capture procedure are ready.**

No controlled-test manifest has been recorded yet.

Owner raw photographs never enter this Git-tracked folder. After an authorized run, this folder may hold manifests, hashes, routing records, and redacted screenshots only.

## Procedure

See [CERTIFICATION-RUN-CAPTURE-PROCEDURE.md](../CERTIFICATION-RUN-CAPTURE-PROCEDURE.md).
