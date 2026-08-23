# CONTROLLED CUSTOMER-ONE TEST PLAN

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`

**Status:** PREPARATION — opening only. Do not execute.

**Date:** 2026-08-22

This plan designs a later controlled test on a **real phone** along the locked customer spine. Desktop-width emulation and Room 4C responsive notes are forbidden as the sole proof.

Canonical customer names and routes: `docs/customer-journey-v1-locked.md`.

---

## Test customer fixture

Use a dedicated certification campaign (not Moss & Thread, Cedar Lane, Harbor Roast, or Gate X live campaigns). Suggested identity is recorded at execution, not in opening.

| Field | Value |
|-------|-------|
| Device | Real phone (not desktop-only) |
| Hire path | Live customer spine |
| Payment | Sandbox |
| Rights path | Live Gate X per-file certification on the phone |
| Owner labor | NONE during test execution |
| Carousel | Not on Launch Now menu; do not sell |

Do not send `campaign-creative` as a catalog checkout `ServiceId`. Use the live shelf SKU actually hired, as Gate X did for campaign graphics (`v2-rtu-promotion-graphics`) if that is the hired service.

---

## Required proofs (8)

| # | Proof | Expected |
|---|-------|----------|
| 1 | Hire and sandbox payment | Customer can hire and finish sandbox pay by touch |
| 2 | Intake and upload | Intake completes; files upload on the phone |
| 3 | Rights certification | Per-file rights questions and routing are usable on the phone |
| 4 | Communicate and track | Customer can send and read status on the phone |
| 5 | Review and usable feedback | Customer can review work and submit usable feedback by touch |
| 6 | Approve final work | Customer can approve on the phone |
| 7 | Receive and download delivery | Customer can receive and download delivery on the phone |
| 8 | Recover from errors or blocked actions | A blocked or failed step explains itself and offers a clear next action |

Device bar: readable text, usable forms, clear status, no desktop-only dependency, no required browser zoom.

---

## Owner actions required before execution

| # | Action | Owner |
|---|--------|-------|
| 1 | Authorize the live real-phone run after opening review | Tagia |
| 2 | Confirm the phone used is a real device, not desktop-only proof | Tagia |
| 3 | Do not use real outside-customer files without separate authorization | Tagia |

---

## Execution sequence (future — not this turn)

1. Create the certification campaign through the live hire/pay path on the phone.  
2. Complete intake, upload, and rights certification on the phone.  
3. Communicate, track, review, feedback, approve, and download delivery on the phone.  
4. Force at least one blocked or failed action and record the recovery path.  
5. Seal evidence in `certification-runs/`.  
6. Tagia review before close stamp.

---

## Pass criteria

- All 8 proofs pass on a real phone.  
- Device bar holds at every step.  
- Room 4C responsive notes are not the close stamp.  
- Evidence manifest is sealed.  
- Room 5 remains NOT_STARTED. No merge.
