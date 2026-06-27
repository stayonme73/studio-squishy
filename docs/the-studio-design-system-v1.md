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
| 🍄 Mushroom | Surfaces | Backgrounds, paper surfaces, cards | Premium stationery |
| 🧊 Ivory | Elevated surfaces | Cards, forms, pop-outs on Mushroom | Lifted paper |
| 👖 Denim Blue | Information & action | **Page titles**, **primary buttons**, navigation, links | Guidance + go |
| 🌲 Eucalyptus | Structure & success | **Section headings**, checkmarks, progress, success states | "This section." |
| 🪸 Coral | Accent only | Callouts, active badges, icons, thin left borders, list markers — **not** dominant backgrounds | Warm hierarchy |
| ✨ Herb Gold | Celebration | Premium banners, completed status, pricing highlights, milestones | "You've reached something important." |

### Documented hex values (locked palette)

| Token | Name | Hex | Role |
|-------|------|-----|------|
| Mushroom | Warm Mushroom | `#E8E2D8` | Backgrounds, paper surfaces |
| Ivory | Warm Ivory | `#F7F4EE` | Elevated cards, forms, pop-outs |
| Denim Blue | Denim | `#355C7D` | Page titles, primary buttons, nav, links |
| Eucalyptus | Eucalyptus Green | `#456B5A` | Section headings, success, checkmarks, progress |
| Coral | Coral | `#D56B4D` | Accent only — borders, markers, highlights |
| Herb Gold | Herb Gold | `#C7A64A` | Premium banners, pricing, celebration |
| Charcoal | Body text | `#2F3437` | Primary body copy on decision pages |

**CSS source:** `:root` tokens in `src/app/studio-utility-backdrop.css` (`--studio-mushroom`, `--studio-ivory`, `--studio-denim`, etc.) — consumed by Project Summary, Secure Checkout, and Discovery split panels.

**Foundation:** Mushroom / Ivory / Denim / Eucalyptus. Coral sprinkled for warmth and hierarchy — not loud.

### Legacy aliases (being phased out)

| Old token | Was used for | Replaced by |
|-----------|--------------|-------------|
| `#2e5e4e` / `#2b2b2b` | Project Summary eucalyptus / charcoal | `#456B5A` / `#2F3437` |
| `#2c3e50` (`--studio-denim` in globals) | Legacy denim | `#355C7D` on decision pages |
| `#c47a2c` warm orange | List markers | `#D56B4D` Coral |
| `#daa520` | Heritage Gold | `#C7A64A` Herb Gold |

---

## Colors

### Role map (locked)

- **Mushroom** — page-level backgrounds customers read against; warm paper base beneath cards.
- **Ivory** — elevated cards, forms, pop-outs on Mushroom or frosted lobby backdrop.
- **Denim Blue** — page titles, primary buttons, navigation, links. Guides the eye and carries primary actions.
- **Eucalyptus** — section headings, checkmarks, progress, success states. Structures content; does not replace primary buttons.
- **Coral** — accent only: thin left borders on service lists, bullet markers, subtle CTA glow, active badges. Never a dominant background fill.
- **Herb Gold** — celebration only: pricing highlights, completion badges, premium banners. Never a page background or large panel fill.

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
| Section title (Project Summary cards) | `clamp(1.05rem, 2vw, 1.2rem)`, weight 700, Eucalyptus `#456B5A`, bottom border | `project-summary.css` |
| Page title (utility top bar) | Inter, uppercase, Denim `#355C7D` | `project-summary.css`, `payment.css` |
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
| Cards (utility) | `10px` | `utility-design-system.css`, Studio Bundle cards in `project-summary.css` (tagline, includes list, billing label — see [Studio Bundles V1](studio-bundles-v1-locked.md)) |
| Split preview panel inner | `12px` | `business-discovery-studio.css` |
| Warning / note chips | `8px` | `project-summary.css` |

---

## Shadows

| Context | Value | Source |
|---------|-------|--------|
| Project Summary cards | `0 1px 2px rgba(43,43,43,0.04), 0 4px 16px rgba(43,43,43,0.08), 0 12px 32px rgba(43,43,43,0.06)` (`--utility-shadow`) | `project-summary.css` |
| Primary button | `0 2px 10px color-mix(in srgb, #355C7D 32%, transparent)` | `project-summary.css`, `payment.css` |
| Header band | `0 1px 0 rgba(255,255,255,0.85) inset, 0 6px 24px rgba(43,43,43,0.05)` | `project-summary.css` |
| Utility scene cards | `0 2px 12px rgba(46,43,40,0.1), 0 1px 0 rgba(255,255,255,0.45) inset` | `studio-utility-backdrop.css` |

**TBD:** Shared shadow tokens for Studio Board operational cards.

---

## Buttons

### Primary (Denim Blue — Action)

- Background `#355C7D`, white text
- Uppercase semibold, letter-spacing ~`0.04em`
- Padding ~`0.65rem–0.75rem` × `1.25rem`
- Radius `8px`
- Hover: denim deep mix; optional subtle coral glow on Project Summary approve
- **One primary per screen** where possible

Code: `.utility-btn--primary`, `.bds-summary-panel--proposal .bds-summary-panel__continue`, `.pay-submit`

### Secondary (Denim outline — Information)

- Ivory background, denim border `1.5px solid color-mix(in srgb, #355C7D 28%, transparent)`
- Denim text; hover lifts to Mushroom-tinted surface

Code: `.utility-btn--secondary`, `.utility-btn--ghost` in `project-summary.css`

### Text links

- Denim text; coral underline accent on hover

**TBD:** Danger/destructive pattern (legacy Terracotta `#C85A3D` in `studio-utility-design-system.md` — reconcile on next utility pass).

---

## Icons

**TBD** as a formal icon set. Current patterns:

- Checkmarks for recommended services (✓) in split preview — names only, no Why?
- List markers and service rows use coral left border (`#D56B4D`) — `project-summary.css`, split preview

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
| Success / approved / complete | Eucalyptus | Section headers, cost totals, checkmarks, progress status |
| Information / neutral | Denim + charcoal body | Page titles, nav, links, body text |
| Warning / attention | Coral + Herb Gold mix | Warning list items: gold-tint background, coral border — `project-summary.css` `.ps-warnings` |
| Revision / feedback | Coral markers | Bullet `::marker` on customize powers list |
| Celebration / milestone | Herb Gold | Pricing highlights, pin accents — Secure Checkout |

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
| `src/app/studio-utility-backdrop.css` | Shared lobby backdrop + `:root` palette tokens |
| `src/app/utility-design-system.css` | Legacy utility shell |
| `src/app/business-discovery-studio.css` | Split preview panel (proposal subset) |
| `src/app/payment.css` | Secure Checkout — utility pages palette and three-column pinboard |
| `docs/decision-page-visual-language-v1.md` | Project Summary / checkout proposal notes |

**Future:** Palette tokens live in `studio-utility-backdrop.css`; page CSS maps local aliases. Broader migration of legacy utility pages is out of scope for this pass.

---

## Agent guidance

Before making visual decisions on **new** customer-facing pages, read this doc and [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md). Match existing values; mark gaps TBD rather than inventing palette additions.
