# Choose Your Route checkpoint (2026-08-30)

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Branch:** `operating/mobile-customer-journey-certification-1`  
**Status:** OPEN / IN PROGRESS. Not closed. Live-phone certification is **not** stamped.  
**Supervision:** not started. **Merge:** no. **Room 5:** do not start.

Owner accepted the Mobile Choose Your Route screen and the four-route interaction. Do not redesign this screen.

---

## Owner accepted (do not restyle)

- Voice On / Voice Off at the top (one Voice control)
- Conversation Room / Choose Your Route hierarchy
- Explanation copy
- Route map
- Four selectable route cards
- **Suggested Starting Point** stays on the recommendation (Promote Something Now for this proof path)
- **Denim** selection follows the customer tap
- Dynamic Continue label follows the selected route
- Cards select only — they do not advance
- One Continue CTA advances
- Studio Review remains the bottom utility tab
- No duplicate tablet / mic / Send / dots / notch scaffolding

Suggestion and selection are two states. Do not paint the recommended card Denim just because it is suggested.

Reuses `MOBILE_VISUAL_MASTER`. Does not invent a new Studio.

---

## Four-route verification (360×780)

Tapping each card: blue selection + Continue label follow the tap. Suggested Starting Point stays on Promote Something Now. Journey does not advance.

| Tap | Continue label | Suggested stays | Result |
|-----|----------------|-----------------|--------|
| Promote Something Now | Continue with Promote Something Now | yes | PASS |
| Get My Business Started | Continue with Get My Business Started | yes | PASS |
| Update What I Already Have | Continue with Update What I Already Have | yes | PASS |
| I Know What I Need | Continue with I Know What I Need | yes | PASS |

---

## Proofs

Locked five-screen set **not overwritten:** 26–34. Materials + confirmation checkpoint **not overwritten:** 45.

- `lounge-glass-proofs/46-route-top-360.png`
- `lounge-glass-proofs/46-route-bottom-360.png`
- `lounge-glass-proofs/46-route-selected-started-360.png`
- `lounge-glass-proofs/46-route-metrics.json`
- `lounge-glass-proofs/47-route-select-promote-360.png`
- `lounge-glass-proofs/47-route-select-started-360.png`
- `lounge-glass-proofs/47-route-select-update-360.png`
- `lounge-glass-proofs/47-route-select-direct-360.png`
- `lounge-glass-proofs/47-route-four-card-metrics.json`

---

## Next action

**Choose Your Services.** Reuse locked components. Do not invent a new Studio. Do not tap Continue in this checkpoint commit.

---

## What this does not claim

- Mobile package is **not** closed.
- Real-phone certification is **not** PASS.
- This is not a merge.
- Supervision is not started.
