# Mobile Customer Journey — 2026-08-25 stopping-point checkpoint

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Branch:** `operating/mobile-customer-journey-certification-1`  
**Worktree:** `C:\Users\tagia\studio-squishy-mobile-customer-journey-certification-1`  
**Date:** 2026-08-25  
**This is not a close.** Real-phone certification is **not** stamped. Room 4 remains OPEN. Room 5 remains NOT STARTED. No merge.

Tagia unparked this package and authorized a live Samsung phone run. Scout stopped here after the Choose-your-services clipping fix so the next phone tap is one exact recovery action.

---

## Next phone action (exact)

Close and reopen Choose your services → scroll → Add to Project on **Make My Social Media Posts**.

Do not restart the hire. Do not change the selected route. Do not tap Start New, Close conversation, or Continue on a blank name. Carousel is still not on the Launch Now menu.

---

## Live run preserved on the phone

Fictional customer for this run (do not overwrite):

| Field | Value |
|-------|--------|
| Preferred name | Maya |
| Project need | Social media graphics |
| Business | Maya’s Mobile Boutique |
| Deadline | Within 2 weeks (unconfirmed pending availability) |
| Materials | Nothing yet |
| Selected route | Promote Something Now (I-20) |
| Screen at stop | Choose your services was open; cards were clipped |

---

## Completed Mobile fixes in this checkpoint

| ID | Defect | Status |
|----|--------|--------|
| MJ-D3 | Close conversation / Return to Lobby no-op on Samsung | Fixed (`window.location.assign`) |
| MJ-D4 | Studio Review floating pill covered Session | Fixed (in-flow Studio Controls) |
| MJ-D5 | Review Answers / Change an answer no-op; gold was not proof | Fixed (hash + native pointerup; hydrate from storage; gold only when summary cards show) |
| MJ-D6 | Duplicate Continue on typed questions | Fixed (tablet Continue only when chips exist) |
| MJ-D7 | Choose your services popup opened with no visible options | Fixed (explicit phone sheet height + scrollable job list) |

MJ-D7 is included. The list still offers Launch Now services including **Make My Social Media Posts** (`v2-rtu-social-posts`) and does not offer carousel.

Defect detail: `DEFECT-LEDGER.md`.

---

## What this checkpoint does not claim

- Mobile package is **not closed**.  
- Live-phone certification is **not** PASS.  
- Supervision / Netlify / SQL / env were not touched.  
- HTTPS is stopped **after** this commit is pushed (local LAN fixture only).

---

## Resume

Keep the same phone tab and storage. After HTTPS is started again on a later day, Tagia performs the next phone action above. Do not retype Maya’s answers.
