# Studio Utility Page Design System Guide

**Status:** Approved implementation standard  
**Scope:** All utility pages (not environment rooms)

Environment rooms remain separate: Welcome Hall, Draft Room, Studio Guide, Creative Room.

---

## 1. Typography (use this only)

| Role | Spec |
|------|------|
| **Primary font** | **Inter** — all text, labels, buttons, navigation, content |
| **H1 page title** | Inter, uppercase, `clamp(1.85rem, 3.1vw, 2.35rem)`, Eucalyptus Deep `#2E5E4E`, letter-spacing `0.04em` |
| **H2 section title** | Inter, uppercase, semibold, `0.95rem`, Eucalyptus Deep, letter-spacing `0.04em` |
| **Body** | Inter `1rem`; primary text Eucalyptus Deep; secondary Eucalyptus Muted |
| **Accent font** | **Caveat** — quotes/inspiration only. Never headings, buttons, or navigation |

---

## 2. Color palette (use these only)

| Token | Hex | Use |
|-------|-----|-----|
| Eucalyptus | `#2E5E4E` | Primary actions, links, headings |
| Paper Cream | `#EFE8DE` | Page and card backgrounds |
| Sage | `#A7B89A` | Accent |
| Terracotta | `#C85A3D` | Danger only (cancel/delete) |
| Charcoal | `#2B2B2B` | Rare emphasis text |

Do not use other colors for buttons, text, or backgrounds on utility pages.

---

## 3. Button system

| Variant | Style |
|---------|--------|
| **Primary** | Eucalyptus fill, white text, Inter semibold `0.82rem` uppercase, padding `0.75rem 1.25rem`, radius `8px` |
| **Secondary outline** | Eucalyptus border and text (e.g. Back) |
| **Text link** | Eucalyptus, arrow suffix, underline on hover |
| **Danger** | Terracotta border/text — cancel/delete only |

**Rules:** Max one primary button per page. No bulky buttons. No bright/harsh colors. Text links for navigation where appropriate.

---

## 4. Navigation pattern

**Top bar (every utility page):**

```
[ ← Back ]          PAGE TITLE          Help Center →
```

- **Back:** outline secondary button, top left
- **Title:** uppercase H1, centered
- **Help Center:** text link, top right (contextual when already on Help Center)

**Optional secondary nav** (pages with related sections):

Studio Board · Campaign Details · Review Room · Final Delivery · Help Center

---

## 5. Card style

| Property | Value |
|----------|--------|
| Background | Paper Cream `#EFE8DE` |
| Border | Soft eucalyptus |
| Radius | `10px` |
| Shadow | Soft |
| Padding | `1.25rem` |

Use for all containers, sections, and content blocks.

---

## 6. Layout rules

- Content max width: `56rem`
- Use screen real estate efficiently; minimize unnecessary scrolling
- One font, one system, one family feel across utility pages

---

## Implementation files

- `src/app/utility-design-system.css` — tokens and components
- `src/config/studio-utility-standards.ts` — approved values
- `src/components/shared/UtilityPageHeader.tsx` — top bar pattern
- `src/components/shared/UtilityNav.tsx` — optional secondary nav
