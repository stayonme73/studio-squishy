# Mobile visual system checkpoint (2026-08-29)

**Status:** OWNER ACCEPTED AND LOCKED (five-screen sequence reviewed together).  
**Package:** OPEN. No Supervision. No merge.

These screens establish the Mobile customer visual system. **Do not redesign them.** Later Conversation Room screens **reuse these locked components**. They do not invent a new Studio.

| Screen | Status | Proof |
|--------|--------|-------|
| Welcome | OWNER ACCEPTED · `MOBILE_VISUAL_MASTER` | live Welcome / `lounge-glass-proofs/01-welcome-360.png` |
| Voice Choice | OWNER ACCEPTED | `lounge-glass-proofs/26-voice-choice-owner-accepted-360.png` |
| Name question | OWNER ACCEPTED | `lounge-glass-proofs/27-before-we-begin-360.png` |
| What are you working on? | OWNER ACCEPTED | `lounge-glass-proofs/28-project-need-360.png` |
| Business-name question | OWNER ACCEPTED | `lounge-glass-proofs/30-business-name-360.png` |

Also locked with this system: Denim button treatment, Voice On/Off treatment, unselected-chip treatment, glass treatment, Lounge background/crop, unified Studio Review visual treatment.

## Identity (must inherit)

- Lounge background and phone crop (`16% / 42%`)
- Transparent glass (Ivory/Cream 68/32 @ 46%, blur 14px)
- Denim primary actions (`#547C92`, `.lobby-entry-film__cta`)
- Eucalyptus guidance
- Ivory/white primary readable text
- Shared glass border treatment
- Voice On/Off (selected Denim CTA, unselected Ink outline)
- Unselected chips (Ink type, 2px Denim border, transparent fill)
- Same Studio Review bottom utility tab (Welcome master in `src/app/studio-review-mobile-tab.css`)
- Studio Controls inside Studio Review on phone — never a second bottom tab

Layout may adapt to the job of each screen. **The visual identity may not.**

Do not change Welcome, Voice Choice, routing, copy, services, pricing, Samsung interaction fixes, or certified behavior while propagating.

Do not individually beautify each later screen. Inherit this language, one screen at a time.

**Safe-area (applied, layout-only):** the unified Studio Review tab in `src/app/studio-review-mobile-tab.css` uses `env(safe-area-inset-bottom)` so the same component stays clear of Samsung/browser chrome on long Conversation Room screens. Color, glass, typography, and function are unchanged. Studio Controls stays inside this drawer. Tonight’s tap/scroll/safe-area verification: `2026-08-29-TONIGHT-MOBILE-VISUAL-CHECKPOINT.md`.

**Next screen:** `ask_deadline`. Reuse the locked components. Do not reinvent the Studio.

Mobile remains OPEN. No Supervision. No merge.
