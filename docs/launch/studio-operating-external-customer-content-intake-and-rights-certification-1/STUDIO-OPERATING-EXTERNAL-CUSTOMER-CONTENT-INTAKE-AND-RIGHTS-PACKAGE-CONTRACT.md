# STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS — PACKAGE CONTRACT

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** **CLOSED WITH EXPLICIT LIMITS**  
**Owner decision:** **ACCEPTED** (2026-08-22)  
**Base commit:** `5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88`  
**Base branch:** `operating/pre-launch-master-closeout-register-1`  
**Opened:** 2026-08-22  
**Closed:** 2026-08-22  
**Register:** `STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1` (Gate X)  
**Room 4B:** CLOSED  
**Room 4C:** CLOSED WITH EXPLICIT LIMITS (`92f47e2`)  
**Room 4:** remains OPEN  
**Room 5:** NOT STARTED  
**Carousel:** NOT ON LAUNCH MENU  
**Merge:** No  
**Next package:** not opened  

Config: `src/config/studio-external-customer-content-intake-and-rights-certification-v1.ts`  
Closeout: `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md`

---

## Objective

Prove that **genuine customer files** can enter through the **actual customer journey**, receive **file-specific rights and safety decisions**, and reach production **only when cleared**.

This package closes the limitation left by Room 4C Scenario 3 (Moss & Thread), which used Studio-generated certification fixtures and did **not** prove the real external-customer content path (`externalCustomerPhotoPathProven: false`).

---

## Close classification

Owner authorized **CLOSE WITH EXPLICIT LIMITS**. All nine controlled cases have live proof when the original sealed run and both supplemental runs are read together. GX-D2 and GX-D4 were corrected and supplementally certified. Original failed outcomes remain preserved evidence.

Do not reopen this package unless new evidence proves an actual defect. Do not open the next package from this close.

---

## Protected control point

| Control | Truth |
|---------|-------|
| Room 4B | CLOSED |
| Room 4C | CLOSED WITH EXPLICIT LIMITS |
| Room 4 | OPEN |
| Room 5 | NOT STARTED |
| Register tip | `5c22de9` protected ancestor |
| Room 4C tip | `92f47e2` protected — do not reopen casually |
| Next package | not opened |

---

## Certification scope (proven)

### A. Actual customer route

- Customer submits through the real customer-facing route (`MaterialsIntakePanel` → multipart PATCH `/api/campaigns/{campaignId}/materials`).  
- No hidden developer shortcut.  
- Upload state survives handoff into the customer's job.  
- Customer and Studio can see per-file status: received, pending review, cleared, quarantined, rejected, or replaced.

### B. File identity

For every file preserve: original filename, Studio-safe stored filename, MIME type, verified signature, byte size, image dimensions where applicable, SHA-256, upload timestamp, submitting customer/job identity, replacement/version relationship, storage locator without exposing credentials.

### C. File-specific authority

Do not rely on one campaign-level sentence such as "the customer owns the photos." For every file determine ownership, customer-provided status, campaign use permission, crop/adapt permission, commercial use permission, and whether the customer's statement is complete enough for production. Uncertain rights default to blocked.

### D. People, privacy, and third-party material

Likeness and third-party holds use customer declarations and filename hints. Unclear authority quarantines the file. Technical review cannot override missing customer rights.

### E. Technical and safety intake

Honest checks for supported types, extension vs signature, corrupt files, duplicates. Malware scanning is not included or claimed.

### F. Routing states

At minimum: `RECEIVED`, `RIGHTS_INFORMATION_REQUIRED`, `TECHNICAL_REVIEW_REQUIRED`, `CLEARED_FOR_PRODUCTION`, `CLEARED_WITH_LIMITS`, `QUARANTINED`, `REJECTED`, `SUPERSEDED`, `WITHDRAWN_BY_CUSTOMER`.

Production must be impossible unless the file is `CLEARED_FOR_PRODUCTION` or `CLEARED_WITH_LIMITS` and limits permit the requested use.

### G. Customer experience

Plain-language questions, file-specific clarification, clear block explanations, correction/replacement path, no silent rejection, no invented permission. A superseded prior file is preserved internally and is not shown to the customer with a separate “Superseded” banner. The customer sees outstanding-material status rather than the internal `materials_incomplete` production-gate code.

### H. Durable evidence

Upload manifest, rights record, technical inspection result, classification decision, production-routing decision, replacement/version history, customer withdrawal. Sealed in `certification-runs/`.

---

## Existing partial proof (do not re-certify as complete)

`STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1` proved Maya flyer byte storage + SHA-256 + team retrieval on the live customer route. `PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1` proved operational logo/photo clearance categories and final-delivery holds. **Neither substitutes for Gate X.** Gate X live proof is the three sealed runs named in the closeout.

---

## Close condition (satisfied)

Package closed because the controlled Customer-One test pack passed on the **actual customer route**, durable per-file rights records exist, uncleared files are blocked before production, evidence is sealed in `certification-runs/`, and Tagia accepted **CLOSE WITH EXPLICIT LIMITS**.

Did not close on tests green alone. Followed BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST.

---

## Explicit limits

1. Likeness and third-party detection uses customer declarations and filename hints; it does not perform image-content recognition.
2. Rights certification records customer representations and Studio controls; it is not an independent legal ownership determination.
3. Malware scanning is not included or claimed.
4. A superseded prior file is preserved internally but is not displayed to the customer with a separate “Superseded” banner.
5. The customer sees outstanding-material status rather than the internal `materials_incomplete` production-gate code.

---

## Dependencies

- Required before Room 4 closes (if customer-photo-led work remains on Launch Now). Satisfied with explicit limits.  
- Required before full mobile customer-journey certification. Mobile certification is **not** started by this close.  
- Does not block register preservation; register remains ACTIVE_REGISTER.

---

## Evidence structure

| Path | Purpose |
|------|---------|
| `EXISTING-CUSTOMER-UPLOAD-AND-ROUTING-MAP.md` | Honest route map from discovery |
| `ACCEPTANCE-AND-CERTIFICATION-MATRIX.md` | Requirement → evidence mapping |
| `CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md` | Controlled test design (executed) |
| `OWNER-FILE-STAGING-PROCEDURE.md` | Canonical ignored staging path and Tagia transfer names |
| `OWNER-CX-REVIEW.md` | Owner customer-experience review and final decision |
| `DEFECT-LEDGER.md` | GX-D2 / GX-D4 original failures and certified corrections |
| `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md` | Close stamp |
| `controlled-test-pack/` | Scout-supplied fictional/synthetic fixtures only — never owner raw files |
| `tmp/gate-x-controlled-test-owner-staging/` | Canonical Git-ignored owner raw-file staging (not created in Git) |
| `certification-runs/` | Three sealed run evidence directories |
