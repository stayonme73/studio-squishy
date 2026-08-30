# Tonight’s mobile visual checkpoint (2026-08-29)

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Branch:** `operating/mobile-customer-journey-certification-1`  
**Status:** OPEN / IN PROGRESS. Not closed. Live-phone certification is **not** stamped.  
**Supervision:** not started. **Merge:** no. **Room 5:** do not start.

Owner visually accepted the Conversation Room treatment on the business-name screen. Scout verified tap, scroll, and safe-area behavior at the certified 360×780 phone viewport and **did not restyle**.

---

## Owner lock (do not redesign)

Welcome · Voice Choice · Name · What are you working on? · Business-name visual system · Denim buttons · Voice On/Off · chips · glass · Lounge crop · unified Studio Review.

The empty space under Continue on the business-name screen is accepted. Do not collapse it.

Later Conversation Room screens **reuse these locked components**. They do not invent a new Studio. Next screen when work resumes: `ask_deadline`.

---

## Verification (360×780, PASS)

| Check | Result |
|-------|--------|
| Studio Review fully in viewport and hittable | PASS |
| Review label stays above a 48px Samsung-chrome simulation (`env(safe-area-inset-bottom)` in source) | PASS |
| Continue not hidden behind Review; independently tappable | PASS |
| Voice On / Voice Off separated and independently tappable | PASS |
| Choice chips and Skip for now independently tappable | PASS |
| Single-page document scroll; Review stays fixed at the bottom | PASS |
| Welcome / Voice Choice / CR glass and Denim treatments unchanged | PASS |
| Studio Controls remains inside Review (no second tab) | PASS |

Playwright `env(safe-area-inset-bottom)` is `0`. Samsung clearance is the CSS `env()` on the same Review component, proven with a 48px inset simulation. No copy, color, glass, spacing, Lounge crop, button, Voice, Review, or customer-logic change was made for this checkpoint.

---

## Proofs

- `lounge-glass-proofs/34-tonight-welcome-360.png`
- `lounge-glass-proofs/34-tonight-voice-choice-360.png`
- `lounge-glass-proofs/34-tonight-business-name-360.png`
- `lounge-glass-proofs/34-tonight-business-name-scrolled-360.png`
- `lounge-glass-proofs/34-tonight-business-name-safe-area-sim-360.png`
- `lounge-glass-proofs/34-tonight-checkpoint-metrics.json`

Authority for the five-screen visual system: `MOBILE-VISUAL-SYSTEM-CHECKPOINT.md`.

---

## What this does not claim

- Mobile package is **not** closed.  
- Real-phone certification is **not** PASS.  
- This is not a merge.  
- Supervision is not started.
