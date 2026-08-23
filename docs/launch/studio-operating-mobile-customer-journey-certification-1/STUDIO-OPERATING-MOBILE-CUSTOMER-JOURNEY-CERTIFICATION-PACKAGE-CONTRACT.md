# STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION — PACKAGE CONTRACT

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Status:** **PARKED — BLOCKED BY MISSING INDEPENDENT SUPERVISION AND INCIDENT ESCALATION** (not closed; real-phone certification **not** stamped)  
**Base commit:** `15ee699c7d16331b3f410871f02555841fddd4d6` (Gate X close)  
**Base branch:** `operating/external-customer-content-intake-and-rights-certification-1`  
**Opened:** 2026-08-22  
**Register:** `STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1` (area 2)  
**Sequence:** **A — before Room 4 closes**, after Gate X  
**Label:** descriptive package ID only. Do **not** assign Room 4D or Room 4E.  
**Room 4B:** CLOSED  
**Room 4C:** CLOSED WITH EXPLICIT LIMITS (`92f47e2`)  
**Gate X:** CLOSED WITH EXPLICIT LIMITS (`15ee699c`)  
**Room 4:** remains OPEN  
**Room 5:** NOT STARTED  
**Carousel:** NOT ON LAUNCH MENU  
**Merge:** No  

Config: `src/config/studio-mobile-customer-journey-certification-v1.ts`

---

## Objective

Prove that a customer can use The Studio from a **real phone** through the complete customer journey: hire, pay, intake, upload, rights certification, communication, status, review, feedback, approval, delivery, and clear recovery from errors or blocked actions.

This is **not** a check that pages shrink to fit a phone. Room 4C `MOBILE-RESPONSIVE-OBSERVATIONS.md` files are responsive coverage only and do **not** prove this package.

---

## What opening authorizes

1. Read-only discovery of existing mobile / phone-390 / responsive coverage and its limits.  
2. Package contract, coverage map, certification matrix, controlled test plan, config, and synchronized board pointers.  
3. One opening commit and push from Gate X close tip `15ee699c`.

## What opening does **not** authorize

- Executing the live real-phone Customer-One journey  
- Stamping any certification result  
- Treating desktop emulation as the sole proof  
- Reopening Room 4B, Room 4C, or Gate X without a genuine defect  
- Changing the Launch Now menu  
- Beginning Room 5  
- Merging  
- Assigning a Room 4D or Room 4E label  

---

## Protected control point

| Control | Truth |
|---------|-------|
| Room 4B | CLOSED |
| Room 4C | CLOSED WITH EXPLICIT LIMITS |
| Gate X | CLOSED WITH EXPLICIT LIMITS at `15ee699c` |
| Room 4 | OPEN |
| Room 5 | NOT STARTED |
| Register tip | `5c22de9` protected ancestor |
| Room 4C tip | `92f47e2` protected |
| Carousel | NOT ON LAUNCH MENU |
| Package label | not Room 4D / 4E |

---

## Certification scope (must eventually prove on a real phone)

A customer using **touch controls** must be able to:

1. Hire and complete sandbox payment.  
2. Finish intake and upload files.  
3. Complete rights certification.  
4. Communicate and track status.  
5. Review work and submit usable feedback.  
6. Approve the final work.  
7. Receive and download delivery.  
8. Recover clearly from errors or blocked actions.

Device bar for every step: readable text, usable forms, clear status messages, no desktop-only dependency, and no required browser zoom. If a customer has to change browser zoom to use The Studio, it is a bug.

Customer spine (locked names): Studio Lobby → Studio Conversation Room → Review and Confirm → Project Intake → Studio Board → Review Room → Final Delivery.

---

## Existing partial proof (do not re-certify as complete)

Room 4C scenario mobile notes are **responsive coverage only**. Customer-One E2E phone-390 walks and Unified Review phone coverage are not this dedicated mobile journey certification. Gate X proved per-file rights on the live customer route; that proof was not a real-phone journey cert.

---

## Close condition (future)

Package closes only when the eight proofs pass on a **real phone**, along the actual customer spine, with sealed evidence in `certification-runs/`.

Do not close on tests green alone. Requires BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST.

---

## Dependencies

- Gate X must remain closed and available as the rights path. Do not reopen it unless new evidence proves a defect.  
- Required before Room 4 can close.  
- Does not start Room 5.  
- Register remains ACTIVE_REGISTER / NOT_AN_EXECUTION_PACKAGE.

---

## Readiness pass (2026-08-22)

Authorized after opening. Prepares the live journey so Tagia can test on her actual phone without touching code.

| Artifact | Path |
|----------|------|
| Owner guide | `OWNER-PHONE-RUN-GUIDE.md` |
| Park and resume | `PARK-AND-RESUME.md` |
| Supervision audit | `SUPERVISION-DEPENDENCY-AUDIT.md` |
| Temporary HTTPS stop | `TEMPORARY-HTTPS-STOP-RECORD.md` |
| Phone access | `PHONE-ACCESS-METHOD.md` |
| Route / control map | `JOURNEY-ROUTE-AND-CONTROL-MAP.md` |
| Defect ledger | `DEFECT-LEDGER.md` |
| Empty run template | `certification-runs/_template/` |

Real-phone certification still requires Tagia’s walk tomorrow. Preflight tests are not that walk.

## Evidence structure

| Path | Purpose |
|------|---------|
| `EXISTING-MOBILE-COVERAGE-MAP.md` | Honest map of prior phone/responsive coverage and why it is not this cert |
| `ACCEPTANCE-AND-CERTIFICATION-MATRIX.md` | Requirement → evidence mapping |
| `CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md` | Real-phone test design + owner guide pointer |
| `OWNER-PHONE-RUN-GUIDE.md` | One link, one action at a time |
| `certification-runs/_template/` | Empty timestamp-ready run |
| `certification-runs/` | Sealed run evidence (future, after the phone walk) |
