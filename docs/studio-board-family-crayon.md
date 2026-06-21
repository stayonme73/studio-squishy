# Studio Board Family — Crayon Version

**For:** Scout  
**From:** Tagia  
**Status:** Direction lock — build from this, do not reinterpret  
**Date:** June 2026

---

## DO NOT TOUCH

| Surface | Route |
|---------|-------|
| Welcome Hall | `/` |
| Studio Guide | `/studio-guide` |
| Draft Room | `/draft-room` |

Approved directions. No Board Family styling bleed into these.

---

## Board Family pages (sisters, not clones)

These four belong together:

1. **Studio Board** — `/studio-board` — Mission Control  
2. **Campaign Details** — `/campaign-details` — The Brief  
3. **Review Room** — `/review-room` — Decision Space  
4. **Final Delivery** — `/deliverables` — The Reveal  

**Goal:** User thinks *"I am still inside The Studio."*  
**Not:** *"Did I accidentally open another website?"*

**Starting-point feeling:** Draft Room *vibe* (polished, clean, modern, welcoming, professional, slightly elevated) — **not** the photo, not scrapbook, not corporate SaaS.

Reference mood: **Canva + Apple + Notion** with warm earth tones.  
**Not:** Pinterest, Salesforce, Etsy.

---

## KEEP

- **Fonts:** Inter (UI), Caveat (quotes only)
- **Studio Board hero:** Skyline banner — **exactly as-is. Do not redesign.**
- **Rotating quote card:** Keep quotes, Caveat, encouragement — evolve (see Quote Card)

---

## REMOVE (Board Family only)

- Tape  
- Polaroids  
- Sparkles  
- Gift icons  
- Pink accent graphics  
- Craft / scrapbook decorations  
- Random decorative systems that don’t appear elsewhere  

---

## Color direction — Earthy Innovative

| Role | Hex |
|------|-----|
| Background cream (everywhere — one cream, no variants) | `#F5F0E8` |
| Deep eucalyptus (primary) | `#567B6D` |
| Muted terracotta (important notifications) | `#B96D40` |
| Golden mustard (warnings / badges) | `#D8A73D` |
| Charcoal text | `#2D2D2D` |

**Avoid:** bright corporate blues, old saturated teal (`#006d73`).

**Buttons:** Primary = eucalyptus · Warnings = mustard · Important = terracotta.

---

## Board materials (tiles / cards)

**Not:** flat white SaaS boxes, rustic scrapbook, boutique stationery overload.

**Use on every tile/card:**

```css
background: #FFFBF5;
border: 1px solid #E7DDCF;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
border-radius: /* match existing ~10px unless noted */;
```

**Texture:** Subtle paper grain on **tiles only** — max **5% opacity**.  
**Not** on full page background. Do not invent heavy textures.

---

## Page differences (content focus — same shell)

Same colors, materials, buttons, card styling across all four.  
Difference = **what’s on the page**, not a new product skin.

### Studio Board — Mission Control

- Skyline hero (locked)  
- Campaign overview · Status timeline · Studio notes  
- Membership snapshot · What happens next  
- More visual richness, less flatness — stay informative  

### Campaign Details — The Brief

- **No** skyline hero  
- Campaign summary · Objectives · Audience · Timeline · Deliverables  
- More focused than Board  

### Review Room — Decision Space

- **No** skyline hero  
- Campaign A · B · C — **side-by-side comparison**  
- Cleaner, less clutter than Board  

### Final Delivery — The Reveal

- **No** skyline hero  
- Download assets · Final files · Campaign summary · Next steps  
- Celebratory, rewarding  
- **No dark sidebar** — same cream family shell as Studio Board  

---

## Quote card (“Studio philosophy card”)

**Keep:** rotating quotes, Caveat, clean layout, encouragement.

**Remove:** tape.

**Add:** small uppercase Inter label — e.g. `TODAY'S INSPIRATION` or `STUDIO THOUGHTS`.

**Upgrade:** soft `#FFFBF5` surface + delicate border (tile material above) — not floating flat white.

**Contextual quotes** (tie to journey status when possible):

| Status | Example |
|--------|---------|
| Draft Received | Every great campaign starts with a single idea. |
| Building Concepts | Progress often begins before confidence arrives. |
| Review & Approval | Clarity comes through refinement. |
| Final Delivery | Finished and shared beats perfect and hidden. |

**Heart icon:** TBD — keep if warm/human; replace with Studio mark or nothing if going more modern.

---

## Implementation notes (engineering)

- Shared CSS tokens: one `--board-family-*` source for sb / cd / rr / fd  
- Final Delivery: replace charcoal sidebar with Board-family cream sidebar + contextual nav  
- Update `docs/studio-v1-lock.md` when Tagia approves built result (supersedes old teal palette lock)  
- Placeholder routes (account, help, past campaigns) — out of scope for v1 crayon pass  

---

## Out of scope tonight

No proofreading pass on 27 screens. No new color debates. Build direction from this sheet; Tagia reviews with fresh eyes tomorrow.
