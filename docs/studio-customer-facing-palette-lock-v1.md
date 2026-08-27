# Studio customer-facing palette lock v1

**Status:** ACCEPTED LOCK · NOT APPLIED  
**Visual family:** Studio Board (`/studio-board`) + Final Delivery (`/deliverables`)  
**Do not apply CSS yet.** Competing repo tokens stay until a later authorized pass.

Related (do not treat as the lock): `docs/the-studio-design-system-v1.md` · `docs/studio-board-family-crayon.md` · `src/app/board-family.css`

---

## Canonical values

| Role | Canonical hex | Job |
|------|---------------|-----|
| Cream / paper | `#EBE2D4` | Neutral **canvas** — page/background breathing room, not the whole painting |
| Ivory | `#F7F4EE` | Lifted cards / forms on the canvas |
| Denim | `#355C7D` | Navigation, titles, primary actions — strong enough to read |
| Eucalyptus | `#456B5A` | Section headings, progress, supporting structure |
| Coral | `#D94E2B` | Visible accent — not large fills |
| Yellow / Gold | `#F7C900` | Visible accent / celebration — not a default page field |
| Terracotta | `#B96D40` | Rare urgent / important only |
| Body text / charcoal | `#2E2B28` | Body copy on paper; muted = this ink at 56% |

**Out:** Conversation Room local `#2F5D4A` / gold glass as brand. Burnt orange `#CC5500` as a primary/utility action.

**Ivory is a supporting surface, not a second cream.** Mushroom paper `#E8E2D8` retires toward cream when tokens are later unified.

---

## Visual-balance rule (owner 2026-08-26)

The Studio should be warm and inviting, but **not tan-heavy or cream-heavy.**

Cream / paper `#EBE2D4` is the neutral **base**, not the dominant visual everywhere.

Required balance:

- Use Cream for page/background breathing room.
- Use Ivory `#F7F4EE` for lifted cards/forms.
- Use Denim `#355C7D` strongly enough for navigation, titles, and primary actions.
- Use Eucalyptus `#456B5A` for structure/progress.
- Use Coral `#D94E2B` and Yellow `#F7C900` as **visible** accents.
- Avoid large uninterrupted beige/tan fields.
- Preserve strong contrast so accent colors do not disappear into the neutral surfaces.
- Keep the overall experience neutral enough for a broad customer audience, but still lively and welcoming.

**Target:** warm neutral foundation, with enough Denim / Eucalyptus / Coral / Yellow that the Studio feels alive instead of oatmeal-colored.

---

## Visual-rhythm requirement (owner 2026-08-26)

Owner provided external creative-business references for visual direction. **Do not copy their colors, layouts, branding, or imagery.** Steal the lesson, not the look: a strong creative-business experience uses a neutral base, then lets a few brand colors do real work through headlines, cards, sections, buttons, and imagery. Color has hierarchy. It is not background paint.

The Studio should not rely on one large neutral or dark field. Use the approved palette to create clear visual rhythm and hierarchy.

Future visual pass should balance:

- warm Cream / Ivory breathing room
- visible Denim structure and primary actions
- Eucalyptus supporting sections / progress
- Coral and Yellow accent moments
- customer work / imagery as visual energy where appropriate

Avoid:

- black-dominant screens
- beige-on-beige monotony
- every section using the same surface color
- excessive color competing with customer tasks
- copying another brand’s pink / purple identity

Personality without making customers hunt for the next button. Calmer than loud social-media density. Workflow first.

**Goal:** Inviting, creative, neutral enough for a broad customer base, but unmistakably alive and branded.

---

## Default theme vs Light / Dark mode (owner 2026-08-26)

Light / Dark mode is **optional, not the first cure.** If the default Studio theme is balanced properly, many customers may never want to change it. A good default should already feel welcoming. Do not treat a mode toggle as a substitute for the balance and rhythm rules above.

---

## Conflicts this lock closes (not applied in CSS yet)

| Role | Canonical | Retire toward this |
|------|-----------|-------------------|
| Cream | `#EBE2D4` | `#F5F0E8`, `#EFE8DE`, `#E8E2D8` as the page canvas |
| Denim | `#355C7D` | Live Board computed `#2C3E50` (legacy navy denim) |
| Eucalyptus | `#456B5A` | Crayon button-green `#567B6D`; Board nav green `#6A8F5C` as a second progress hex |
| Coral | `#D94E2B` | V1 `#D56B4D`, globals `#FF7F50` |
| Yellow | `#F7C900` | Herb Gold `#C7A64A` as a second gold; brass `#B08D57` is not gold |
| Terracotta | `#B96D40` | Live Board alias to brass; utility `#C85A3D`; do not reuse Coral |
| Body | `#2E2B28` | `#2F3437`, `#2D2D2D`, `#2B2B2B` |

Applying this lock later must keep the **balance rule** and the **visual-rhythm requirement**: unifying cream does not mean filling every panel with `#EBE2D4`, and a mode toggle is not a substitute for a welcoming default.
