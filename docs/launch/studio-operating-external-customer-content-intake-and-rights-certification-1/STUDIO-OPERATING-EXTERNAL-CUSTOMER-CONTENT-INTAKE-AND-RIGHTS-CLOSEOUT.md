# STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS — CLOSEOUT

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Owner close:** 2026-08-22 — Tagia  
**Owner decision:** **ACCEPTED**  
**Status:** **CLOSED**  
**Classification:** **CLOSE WITH EXPLICIT LIMITS**  
**sectionClosed:** true  
**Tagia final review authority:** exercised  
**Room 4B:** CLOSED (frozen)  
**Room 4C:** CLOSED WITH EXPLICIT LIMITS (`92f47e2`) — not reopened  
**Room 4 (full business rehearsal):** remains **OPEN**  
**Room 5:** NOT_STARTED  
**Carousel:** NOT ON LAUNCH MENU  
**Merge:** none  
**Next package:** not opened  

Config: `src/config/studio-external-customer-content-intake-and-rights-certification-v1.ts`  
Contract: `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-PACKAGE-CONTRACT.md`  
Defect ledger: `DEFECT-LEDGER.md`  
Owner review: `OWNER-CX-REVIEW.md`

---

## Close stamp

| Field | Value |
|-------|-------|
| External Customer Content Intake and Rights Certification | CLOSED |
| Classification | CLOSE WITH EXPLICIT LIMITS |
| Owner decision | ACCEPTED |
| sectionClosed | true |
| Room 4 | OPEN |
| Room 4B | CLOSED |
| Room 4C | CLOSED WITH EXPLICIT LIMITS |
| Room 5 | NOT_STARTED |
| Carousel | NOT ON LAUNCH MENU |
| Register tip | `5c22de9` untouched ancestor |
| Merge | none |
| Next package | not opened |

---

## Final certification evidence

Read the original run and both supplemental runs together. Do not overwrite, rename, or reinterpret any sealed directory.

| Run | Directory | Manifest SHA-256 |
|-----|-----------|------------------|
| 1. Original immutable run | `certification-runs/gate-x-run-2026-08-22T230059190Z/` | `04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c` |
| 2. Cases 2/4 supplemental run | `certification-runs/gate-x-run-2026-08-22T232853529Z/` | `77f1dbf62b634bc5d695476f855d2dccf8e4bcd273260078bcf39b4f4d1073ab` |
| 3. Case 3 likeness supplemental run | `certification-runs/gate-x-run-2026-08-22T235349346Z/` | `ebd769003e7527fd906b627390f6804d71fe6b50fef68ae36bbdbc2be433f1d2` |

Original failed outcomes for Cases 2 and 4 remain in run 1. They are preserved evidence, not current failures. GX-D2 and GX-D4 were corrected, regression-tested, and proven in run 2.

---

## Nine-case live proof

| Case | Intended | Live proof |
|------|----------|------------|
| 1 | `CLEARED_FOR_PRODUCTION` | Original |
| 2 | `CLEARED_WITH_LIMITS` + `no_crop_adapt` | Supplemental 2/4 (original failed GX-D2; corrected) |
| 3 | `QUARANTINED` likeness-hold explanation | Case 3 supplemental (original quarantined on filename mismatch; not rewritten) |
| 4 | `QUARANTINED` unresolved third-party rights | Supplemental 2/4 (original failed GX-D4; corrected) |
| 5 | `REJECTED`; prior valid file unchanged | Original |
| 6 | Replacement: v2 active; v1 `SUPERSEDED` internally | Original |
| 7 | Duplicate kept | Original |
| 8 | `WITHDRAWN_BY_CUSTOMER` | Original |
| 9 | Production blocked while uncleared required material remains | Original + supplemental 2/4 recheck |

---

## Final truth

- All nine controlled cases have the required live proof.
- GX-D2 and GX-D4 were corrected and supplementally certified.
- The original failed outcomes remain preserved.
- Per-file rights certification is operational.
- Uncertain rights default to blocked.
- Crop/adapt denial is enforced as `no_crop_adapt`.
- Likeness without confirmed consent is quarantined.
- Unresolved third-party rights are quarantined.
- Technical review cannot override missing customer rights.
- Corrupt files are rejected without replacing the valid stored file.
- Replacement preserves supersession history.
- Customer withdrawal revokes production clearance.
- Uncleared required material blocks production.
- Owner files and secrets remain outside Git.

---

## Explicit limits

1. Likeness and third-party detection uses customer declarations and filename hints; it does not perform image-content recognition.
2. Rights certification records customer representations and Studio controls; it is not an independent legal ownership determination.
3. Malware scanning is not included or claimed.
4. A superseded prior file is preserved internally but is not displayed to the customer with a separate “Superseded” banner.
5. The customer sees outstanding-material status rather than the internal `materials_incomplete` production-gate code.

---

## Defect disposition

| Defect | Original sealed actual | Disposition |
|--------|------------------------|-------------|
| GX-D2 | Case 2 `CLEARED_FOR_PRODUCTION` without `no_crop_adapt` | **CORRECTED AND CERTIFIED** in supplemental run 2. Original failure preserved. |
| GX-D4 | Case 4 `TECHNICAL_REVIEW_REQUIRED` instead of third-party `QUARANTINED` | **CORRECTED AND CERTIFIED** in supplemental run 2. Original failure preserved. |

---

## Protection

- Do not merge.
- Do not start Room 5.
- Do not start mobile certification.
- Do not open the next package from this closeout.
- Do not reopen Room 4B or Room 4C unless new evidence proves an actual defect.
- Do not expand the Launch Now menu. Carousel remains NOT ON LAUNCH MENU.
- Do not rewrite the three sealed certification runs.
- Do not commit raw owner files, portraits, secrets, or unsafe screenshots.
- Register tip `5c22de9` remains an untouched ancestor.
- Room 4 remains OPEN.
