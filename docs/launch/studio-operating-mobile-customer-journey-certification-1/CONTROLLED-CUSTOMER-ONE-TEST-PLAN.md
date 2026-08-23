# CONTROLLED CUSTOMER-ONE TEST PLAN

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`

**Status:** READINESS PREPARED — real-phone walk not started

**Date:** 2026-08-22

Owner script: `OWNER-PHONE-RUN-GUIDE.md`.  
Access: `PHONE-ACCESS-METHOD.md`.  
Empty evidence: `certification-runs/_template/`.

Desktop-width emulation and Room 4C responsive notes remain forbidden as the sole proof.

Canonical customer names and routes: `docs/customer-journey-v1-locked.md`.

---

## Test customer fixture

| Field | Value |
|-------|-------|
| Fictional customer | Mira Chen |
| Business | Pine & Petal Market |
| Account | pinepetal.cert@local.dev / studio-cert-phone (create on the phone) |
| Device | Tagia’s real phone, portrait |
| Hire path | Lobby → Conversation Room |
| Service | Make My Campaign Graphics (`v2-rtu-promotion-graphics`) if recommended |
| Payment | Sandbox confirm only — no real charge |
| Rights path | Live Gate X per-file certification on the phone |
| Materials | Synthetic / Studio-owned fixtures in `/mobile-customer-journey-cert-1/` |
| Owner labor during Tagia’s walk | NONE except Scout HTTPS start and the documented review-state seed after Board |
| Carousel | Not on Launch Now menu; do not sell |

Do not send `campaign-creative` as a catalog checkout `ServiceId`.

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

## Owner actions

| # | Action | Owner |
|---|--------|-------|
| 1 | Review Scout readiness return | Tagia |
| 2 | Wait until Scout says the Studio is awake | Tagia |
| 3 | Walk `OWNER-PHONE-RUN-GUIDE.md` on the real phone | Tagia |
| 4 | Stop after Board communication for the honest review seed | Tagia + Scout |
| 5 | Do not use real outside-customer files | Tagia |

---

## Execution sequence (tomorrow — not claimed done)

1. Tagia creates the certification campaign through the live hire/pay path on the phone.  
2. Tagia completes intake, upload, rights, and one Board message.  
3. Scout seeds honest production review state.  
4. Tagia reviews, leaves feedback, approves, and downloads delivery.  
5. Error cases in the owner guide are part of the same walk.  
6. Seal evidence from `_template/` into a timestamped run.  
7. Tagia review before any close stamp.

---

## Pass criteria (future close)

- All 8 proofs pass on a real phone.  
- Device bar holds at every step.  
- Room 4C responsive notes are not the close stamp.  
- Evidence manifest is sealed.  
- Room 5 remains NOT_STARTED. No merge.
