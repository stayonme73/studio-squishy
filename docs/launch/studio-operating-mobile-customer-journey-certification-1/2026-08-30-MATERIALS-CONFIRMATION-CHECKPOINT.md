# Materials + confirmation checkpoint (2026-08-30)

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Branch:** `operating/mobile-customer-journey-certification-1`  
**Status:** OPEN / IN PROGRESS. Not closed. Live-phone certification is **not** stamped.  
**Supervision:** not started. **Merge:** no. **Room 5:** do not start.

Owner accepted the Samsung state for the materials question and the “Here’s what I understood” confirmation screen. This checkpoint freezes that accepted state before tapping **Yes, this is correct**.

---

## Owner accepted (do not restyle)

- Materials question
- Materials selection behavior (chip is the confirmation; no duplicated “The Studio recorded…” line)
- Mobile scaffolding removal (no STUDIO TABLET / presence rail / notch on these surfaces)
- Studio Review overlay behavior (Lounge plate behind the tab so question text does not show through)
- Confirmation screen on the 46% Welcome / Voice Choice glass
- Transparent summary cards
- Denim `#547C92` **Yes, this is correct** CTA (`<a role="button" class="lobby-entry-film__cta">`)
- Coral `#D94E2B` **Correct something** CTA
- Deadline warning and Unconfirmed status (copy unchanged)

Welcome, Voice Choice, Name, Project Need, Business Name, and the Studio Review tab visual remain the locked 2026-08-29 system (`MOBILE-VISUAL-SYSTEM-CHECKPOINT.md`). This checkpoint **reuses** that identity. It does not invent a new Studio.

---

## Verification (360×780)

| Check | Result |
|-------|--------|
| Materials layout; helper kept; placeholder “Add extra details” | PASS |
| No customer-visible “The Studio recorded…” line | PASS |
| Summary on 46% glass; cards transparent | PASS |
| Yes, this is correct = jean Denim `#547C92` on `<a>` | PASS |
| Correct something = Coral `#D94E2B` | PASS |
| Studio Review still the bottom utility; no second tab | PASS |
| Welcome / Voice Choice / earlier CR screens unchanged | PASS |
| Tablet scaffolding stays gone on materials + summary | PASS |

---

## Proofs

Locked five-screen set **not overwritten:** 26–34.

This checkpoint:

- `lounge-glass-proofs/45-welcome-360.png`
- `lounge-glass-proofs/45-voice-choice-360.png`
- `lounge-glass-proofs/45-name-360.png`
- `lounge-glass-proofs/45-project-need-360.png`
- `lounge-glass-proofs/45-business-name-360.png`
- `lounge-glass-proofs/45-deadline-360.png`
- `lounge-glass-proofs/45-materials-360.png`
- `lounge-glass-proofs/45-summary-top-360.png`
- `lounge-glass-proofs/45-summary-bottom-360.png`
- `lounge-glass-proofs/45-checkpoint-metrics.json`

Working proofs from the pass (not locks): 35–44.

---

## Next action

Tap **Yes, this is correct**. Next Conversation Room screen: **route**. Reuse locked components. Do not invent a new Studio.

---

## What this does not claim

- Mobile package is **not** closed.
- Real-phone certification is **not** PASS.
- This is not a merge.
- Supervision is not started.
- Do not tap Yes in this checkpoint commit. Resume from the accepted summary.
