# STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS — PACKAGE CONTRACT

**Package:** `STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`  
**Status:** **OPEN** (opening commit only — no certification result stamped)  
**Base commit:** `5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88`  
**Base branch:** `operating/pre-launch-master-closeout-register-1`  
**Opened:** 2026-08-22  
**Register:** `STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1` (Gate X)  
**Room 4B:** CLOSED  
**Room 4C:** CLOSED WITH EXPLICIT LIMITS (`92f47e2`)  
**Room 4:** remains OPEN  
**Room 5:** NOT STARTED  
**Carousel:** NOT ON LAUNCH MENU  
**Merge:** No  

Config: `src/config/studio-external-customer-content-intake-and-rights-certification-v1.ts`

---

## Objective

Prove that **genuine customer files** can enter through the **actual customer journey**, receive **file-specific rights and safety decisions**, and reach production **only when cleared**.

This package closes the limitation left by Room 4C Scenario 3 (Moss & Thread), which used Studio-generated certification fixtures and did **not** prove the real external-customer content path (`externalCustomerPhotoPathProven: false`).

---

## What opening authorizes

1. Read-only discovery of existing upload, intake, attachment, storage, review, and production-routing paths.  
2. Package contract, certification matrix, controlled test plan, evidence structure, config, and synchronized board pointers.  
3. One opening commit and push.

## What opening does **not** authorize

- Uploading controlled test files  
- Using real customer files  
- Production from uploaded content  
- Changing storage providers  
- Beginning mobile certification  
- Beginning Room 5  
- Changing the Launch Now menu  
- Merging  
- Closing the package  
- Stamping any certification result

---

## Protected control point

| Control | Truth |
|---------|-------|
| Room 4B | CLOSED |
| Room 4C | CLOSED WITH EXPLICIT LIMITS |
| Room 4 | OPEN |
| Room 5 | NOT STARTED |
| Register tip | `5c22de9` protected |
| Room 4C tip | `92f47e2` protected — do not reopen casually |

---

## Certification scope (must eventually prove)

### A. Actual customer route

- Customer submits through the real customer-facing route (`MaterialsIntakePanel` → multipart PATCH `/api/campaigns/{campaignId}/materials`).  
- No hidden developer shortcut.  
- Upload state survives handoff into the customer's job.  
- Customer and Studio can see per-file status: received, pending review, cleared, quarantined, rejected, or replaced.

### B. File identity

For every file preserve: original filename, Studio-safe stored filename, MIME type, verified signature, byte size, image dimensions where applicable, SHA-256, upload timestamp, submitting customer/job identity, replacement/version relationship, storage locator without exposing credentials.

### C. File-specific authority

Do not rely on one campaign-level sentence such as "the customer owns the photos." For every file determine ownership, customer-provided status, campaign use permission, crop/adapt permission, commercial use permission, attribution requirements, platform restrictions, expiry, and whether the customer's statement is complete enough for production.

### D. People, privacy, and third-party material

Evaluate identifiable adults, minors, private individuals, likeness consent, sensitive information, third-party logos/trademarks/artwork, and customer instructions to remove, blur, crop, or exclude material. Do not claim legal certainty the Studio cannot establish. Unclear authority must block production or require targeted clarification.

### E. Technical and safety intake

Honest checks for supported types, extension vs signature, corrupt files, excessive size/dimensions, duplicates, malware handling **only if actually performed**, metadata/privacy concerns, unsupported formats, and password-protected files.

### F. Routing states

At minimum: `RECEIVED`, `RIGHTS_INFORMATION_REQUIRED`, `TECHNICAL_REVIEW_REQUIRED`, `CLEARED_FOR_PRODUCTION`, `CLEARED_WITH_LIMITS`, `QUARANTINED`, `REJECTED`, `SUPERSEDED`, `WITHDRAWN_BY_CUSTOMER`.

Production must be impossible unless the file is `CLEARED_FOR_PRODUCTION` or `CLEARED_WITH_LIMITS` and limits permit the requested use.

### G. Customer experience

Plain-language questions, conditional follow-ups, file-specific clarification only when necessary, clear block explanations, correction/replacement path, no silent rejection, no invented permission.

### H. Durable evidence

Upload manifest, rights record, technical inspection result, classification decision, clarification history, production-routing decision, replacement/version history, customer withdrawal, and final list of exact files actually used.

---

## Existing partial proof (do not re-certify as complete)

`STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1` proved Maya flyer byte storage + SHA-256 + team retrieval on the live customer route. `PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1` proved operational logo/photo clearance categories and final-delivery holds. **Neither proves Gate X.**

---

## Close condition (future)

Package closes only when the controlled Customer-One test pack passes on the **actual customer route**, durable per-file rights records exist, uncleared files are blocked before production, and evidence is sealed in `certification-runs/`.

Do not close on tests green alone. Requires BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST.

---

## Dependencies

- Required before Room 4 closes (if customer-photo-led work remains on Launch Now).  
- Required before full mobile customer-journey certification.  
- Does not block register preservation; register remains ACTIVE_REGISTER.

---

## Evidence structure

| Path | Purpose |
|------|---------|
| `EXISTING-CUSTOMER-UPLOAD-AND-ROUTING-MAP.md` | Honest route map from discovery |
| `ACCEPTANCE-AND-CERTIFICATION-MATRIX.md` | Requirement → evidence mapping |
| `CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md` | Later controlled test design |
| `OWNER-FILE-STAGING-PROCEDURE.md` | Canonical ignored staging path and Tagia transfer names |
| `controlled-test-pack/` | Scout-supplied fictional/synthetic fixtures only — never owner raw files |
| `tmp/gate-x-controlled-test-owner-staging/` | Canonical Git-ignored owner raw-file staging (not created in Git) |
| `certification-runs/` | Sealed run evidence (future) |
