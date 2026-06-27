# The Studio Design System V1

**Status:** Locked design language — documentation only (no shared code tokens yet).

**Scope:** Customer-facing pages across the journey — Project Summary, Secure Checkout, Help Center, Studio Board, Review Room, Final Delivery, Account (future), and utility surfaces that share the proposal/operational aesthetic.

**Related:** [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md) (Project Summary proposal tokens) · [studio-utility-design-system.md](studio-utility-design-system.md) (legacy utility-page guide — superseded for new work by this doc where they differ on color roles)

---

## The Studio Rule

**Every color has one job. No color used simply because it looks nice.**

---

## The Studio Design Language (v1)

| Token | Purpose | Use for | Think |
|-------|---------|---------|-------|
| 🍄 Mushroom | Surfaces | Forms, cards, utility pages, paper, background panels | Premium stationery |
| 👖 Denim Blue | Information | Page titles, section headings, nav, secondary buttons, downloads, links | Guidance |
| 🌲 Eucalyptus | Action | Primary buttons, Continue, Confirm, Approve, Success | "Go." |
| 🪸 Coral | Attention | Feedback, notes, warnings, revisions | "Notice this." |
| ✨ Heritage Gold | Celebration | Milestones, completion, premium touches, highlights — **never** large background fills | "You've reached something important." |

### Documented hex values (from existing CSS)

Where values exist in code today, document them here. Gaps are **TBD** until a page ships — do not invent random values.

| Token | Name | Documented value | Source |
|-------|------|------------------|--------|
| Mushroom | Paper / card surfaces | `#FFFFFF`, `#F8F9FA` on decision pages; `#EFE8DE` (`--utility-paper-cream` / `--studio-paper`) on legacy utility pages; **`#E8E2D8` Soft Mushroom** and **`#F7F4EE` Warm Ivory** cards on Secure Checkout | `project-summary.css`, `utility-design-system.css`, `payment.css` |
| Denim Blue | Information text & nav | `#2c3e50` (`--studio-denim`); **`#355C7D`** on Secure Checkout | `globals.css`, `payment.css` |
| Denim Blue | Primary body text (decision pages) | `#2b2b2b` (`--ps-charcoal`); **`#2F3437` Charcoal** on Secure Checkout | `project-summary.css`, `payment.css` |
| Eucalyptus | Action & section headers | `#2e5e4e` (`--ps-eucalyptus`); **`#456B5A`** on Secure Checkout | `project-summary.css`, `decision-page-visual-language-v1.md`, `payment.css` |
| Eucalyptus deep | Primary hover | `color-mix(in srgb, #2e5e4e 88%, #000 12%)`; **`color-mix(in srgb, #456B5A 88%, #000 12%)`** on Secure Checkout | `project-summary.css`, `payment.css` |
| Coral | Attention / list markers | `#e07a5f` (`--ps-accent-coral`); `#ff7f50` (`--studio-coral` in globals); **`#D56B4D`** on Secure Checkout | `project-summary.css`, `globals.css`, `payment.css` |
| Heritage Gold | Celebration / warm accent | `#daa520` (`--ps-accent-gold`, `--studio-golden-yellow`); warm orange `#c47a2c` (`--ps-accent-warm`) for list markers; **`#C7A64A` Herb Gold** (status / pin accent) on Secure Checkout | `project-summary.css`, `globals.css`, `payment.css` |
| Mushroom (nav active) | Progress / current location | `#6a8f5c` (`--utility-nav-accent-active`) | `utility-design-system.css` |

**Note:** Mushroom naming in product language maps to *surfaces* — white/elevated cards on decision pages, cream paper on older utility shells. Consolidate into one token set in code later.

---

## Colors

### Role map (locked)

- **Mushroom** — backgrounds customers read against: cards, forms, paper panels. Not decorative fills.
- **Denim Blue** — titles, subtitles, navigation, secondary actions, links, downloads. Guides the eye; does not mean "click here" unless styled as a control.
- **Eucalyptus** — the one "go" color: primary buttons, approve, confirm, success states, section titles on decision pages.
- **Coral** — feedback that needs attention: warnings, revision notes, bullet markers for "notice this" lists.
- **Heritage Gold** — celebration only: milestones, completion badges, subtle highlights. Never a page background or large panel fill.

### Backdrop (decision / utility pages)

From `studio-utility-backdrop.css`:

- Lobby image with `blur(20px) brightness(0.72) saturate(0.9)`
- Light charcoal tint: `color-mix(in srgb, #2e2d2b 25%, transparent)`
- Fallback: `#3a3937`

Cards carry elevation; backdrop stays visible below header band on decision pages.

---

## Typography

### Documented today

| Role | Spec | Source |
|------|------|--------|
| Primary font | Inter — `--utility-font` / `--font-studio-board-sans` stack | `utility-design-system.css` |
| Page title (utility top bar) | Inter, uppercase, `clamp(1.85rem, 3.1vw, 2.35rem)`, weight 700, letter-spacing `0.04em` | `utility-design-system.css` |
| Section title (Project Summary cards) | `clamp(1.05rem, 2vw, 1.2rem)`, weight 700, Eucalyptus `#2e5e4e`, bottom border | `project-summary.css` |
| Body (decision pages) | ~`1rem` / `1.02rem`, line-height `1.55`–`1.6`, charcoal `#2b2b2b` | `project-summary.css` |
| Muted secondary | `color-mix(in srgb, #2b2b2b 72%, #6b6b6b)` | `project-summary.css` |
| Eyebrow / small label | `0.75rem`, uppercase, semibold, letter-spacing `0.06em` | `business-discovery-studio.css` (split preview) |
| Accent script | Caveat — quotes/inspiration only, never headings or buttons | `studio-utility-design-system.md` |

**TBD:** Studio Board, Review Room, Final Delivery heading scale when migrated to this system.

---

## Border radius

| Element | Value | Source |
|---------|-------|--------|
| Utility / primary buttons | `8px` | `project-summary.css`, `utility-design-system.css` |
| Cards (utility) | `10px` | `utility-design-system.css`, package cards in `project-summary.css` |
| Split preview panel inner | `12px` | `business-discovery-studio.css` |
| Warning / note chips | `8px` | `project-summary.css` |

---

## Shadows

| Context | Value | Source |
|---------|-------|--------|
| Project Summary cards | `0 1px 2px rgba(43,43,43,0.04), 0 4px 16px rgba(43,43,43,0.08), 0 12px 32px rgba(43,43,43,0.06)` (`--utility-shadow`) | `project-summary.css` |
| Primary button | `0 2px 10px color-mix(in srgb, #2e5e4e 32%, transparent)` | `project-summary.css` |
| Header band | `0 1px 0 rgba(255,255,255,0.85) inset, 0 6px 24px rgba(43,43,43,0.05)` | `project-summary.css` |
| Utility scene cards | `0 2px 12px rgba(46,43,40,0.1), 0 1px 0 rgba(255,255,255,0.45) inset` | `studio-utility-backdrop.css` |

**TBD:** Shared shadow tokens for Studio Board operational cards.

---

## Buttons

### Primary (Eucalyptus — Action)

- Background `#2e5e4e`, white text
- Uppercase semibold, letter-spacing ~`0.04em`
- Padding ~`0.65rem–0.75rem` × `1.25rem`
- Radius `8px`
- Hover: eucalyptus deep mix
- **One primary per screen** where possible

Code: `.utility-btn--primary`, `.bds-summary-panel--proposal .bds-summary-panel__continue`

### Secondary (Denim / charcoal outline — Information)

- White background, charcoal border `1.5px solid color-mix(in srgb, #2b2b2b 28%, transparent)`
- Charcoal text; hover lifts to `#f8f9fa` surface

Code: `.utility-btn--secondary`, `.utility-btn--ghost` in `project-summary.css`

### Text links

- Denim/charcoal text; warm underline accent on hover (`--ps-accent-warm`)

**TBD:** Danger/destructive pattern (legacy Terracotta `#C85A3D` in `studio-utility-design-system.md` — reconcile on next utility pass).

---

## Icons

**TBD** as a formal icon set. Current patterns:

- Checkmarks for recommended services (✓) in split preview — names only, no Why?
- List markers use warm accent border-left (`#c47a2c`) on service rows — `project-summary.css`, split preview

Do not introduce ad-hoc emoji in production UI beyond locked copy patterns.

---

## Card spacing

| Token | Value | Source |
|-------|-------|--------|
| Card gap (Project Summary) | `1.35rem` (`--utility-card-gap`) | `project-summary.css` |
| Card padding | `clamp(1.35rem, 2.5vw, 1.75rem)` | `project-summary.css` |
| Legacy utility card pad | `1.25rem` | `utility-design-system.css` |
| Section title bottom margin | `1rem` + `0.65rem` padding-bottom | `project-summary.css` |

---

## Page spacing

| Token | Value | Source |
|-------|-------|--------|
| Page horizontal pad | `clamp(1rem, 2.5vw, 1.75rem)` (`--utility-page-pad`) | `utility-design-system.css` |
| Content max width | `56rem` (`--utility-content-max`) | `utility-design-system.css` |
| Narrow shell max | `28rem` (`--utility-narrow-max`) | `utility-design-system.css` |
| Project Summary top pad | `clamp(1rem, 2vw, 1.35rem)` | `project-summary.css` |

---

## Header styles

**Reference implementation:** Project Summary header band.

- Solid or lightly translucent white surface — title, subtitle, Back, Help Center always readable
- Blurred Studio Lobby begins **below** the band (not behind header copy)
- Subtitle: two lines — context + review CTA

Classes: `studio-utility-scene--header-band` · `studio-utility-header-band` · `project-summary-header-band`

Apply the same pattern to future slide-out Secure Checkout — see [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md).

---

## Navigation

### Top bar (utility / decision pages)

```
[ ← Back ]          PAGE TITLE          Help Center →
```

- Grid: `minmax(6rem, 1fr) auto minmax(6rem, 1fr)` — `utility-design-system.css`
- Back: secondary outline, top left
- Title: uppercase H1, centered (Denim / charcoal on decision pages)
- Help Center: text link, top right

### Secondary nav (optional)

Studio Board · Project Record · Review Room · Final Delivery · Help Center — see `studio-utility-design-system.md`.

Active/progress accent: Mushroom green `#6a8f5c` (`--utility-nav-accent-active`).

---

## Status colors

| Status | Role | Documented treatment |
|--------|------|-------------------|
| Success / approved / complete | Eucalyptus | Primary buttons, cost totals, section headers |
| Information / neutral | Denim + charcoal body | Default text and nav |
| Warning / attention | Coral + Heritage Gold mix | Warning list items: gold-tint background, warm border — `project-summary.css` `.ps-warnings` |
| Revision / feedback | Coral markers | Bullet `::marker` on customize powers list |
| Celebration / milestone | Heritage Gold | Subtle highlights only — **TBD** for Final Delivery completion UI |

---

## Page-type aesthetic (from decision-page visual language)

| Page type | Aesthetic | Examples |
|-----------|-----------|----------|
| Creative workspace | Warm, textured, artistic | Project Discovery, Review Room |
| Professional proposal | Clean, high contrast, readable | Project Summary, Secure Checkout |
| Operational dashboard | Structured, scannable | Studio Board |

Discovery board keeps corkboard/warm styling; split preview uses proposal tokens inside the right column only.

---

## Implementation files (today)

| File | Role |
|------|------|
| `src/app/project-summary.css` | Decision-page tokens and components |
| `src/app/studio-utility-backdrop.css` | Shared lobby backdrop |
| `src/app/utility-design-system.css` | Legacy utility shell |
| `src/app/business-discovery-studio.css` | Split preview panel (proposal subset) |
| `src/app/payment.css` | Secure Checkout — utility pages palette and three-column pinboard |
| `docs/decision-page-visual-language-v1.md` | Project Summary / checkout proposal notes |

**Future:** Extract locked tokens from this doc into shared CSS custom properties — not in scope for v1 documentation pass.

---

## Agent guidance

Before making visual decisions on **new** customer-facing pages, read this doc and [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md). Match existing values; mark gaps TBD rather than inventing palette additions.
