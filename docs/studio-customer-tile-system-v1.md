# Studio Customer Tile System V1

**Status:** APPROVED 2026-09-05. Applying through the customer journey, section by section. First Samsung checkpoint: Conversation Room.  
**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1` · Mobile remains OPEN. Do not merge.  
**Authority for paint:** `MOBILE_VISUAL_MASTER` · Voice Choice Samsung light glass.  
**Code:** `src/config/studio-customer-tile-system-v1.ts`

This is a visual-system contract. It is **not** permission to redesign the customer journey, change copy, pricing, Voice, payment, rights, Board behavior, or navigation.

Same visual language. Not every object identical. A selected service stays selected. A primary CTA stays an action. A quiet instruction stays quieter.

---

## Source of truth

The real-Samsung Voice Choice panel is the lightness reference for ordinary customer tiles:

- Very light ivory/cream glass
- Lounge softly visible
- No espresso / charcoal / olive / smoky fill
- Thin glass edge
- Readable type

Match what the eye sees. Do not invent a new percentage on the next page.

Exact recipe (already locked as `MOBILE_VISUAL_MASTER`):

| Token | Value |
|-------|--------|
| Ivory | `#F7F4EE` |
| Cream | `#EBE2D4` |
| Mix | Ivory 68% / Cream 32% |
| Fill opacity | **46%** |
| Frost | `blur(14px) saturate(1.04) brightness(1.1)` written literally |
| Border | `1px solid` Denim 32% + Ivory |
| Inset highlight | `inset 0 1px 0 rgba(255, 255, 255, 0.35)` |
| Denim (mobile spine) | `#547C92` |
| Eucalyptus | `#456B5A` |
| Ink | `#2E2B28` |
| Lounge crop | `16% / 42%` |
| Veil | Ink 18% |

CSS fill:

```css
background: color-mix(in srgb, color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 46%, transparent);
backdrop-filter: blur(14px) saturate(1.04) brightness(1.1);
```

Frost belongs on a clipped plate or `::before` with `pointer-events: none`. Never on Fill / CTA nodes.

---

## The five treatments

### 1. Standard light tile — `studio-tile--standard`

Default information / plan / summary / status card.

- Fill + frost + border + inset highlight as above
- Radius `0.85rem` (stage panels may keep `1.35rem`)
- Label: eucalyptus, uppercase, 0.78rem / 700
- Title: ink, 1.2rem / 700
- Value: ink, 1.12rem / 700; investment may use Denim 1.22rem
- Helper: ink 88%
- Stage/gate panels already owner-accepted with ivory type (Welcome, Voice Choice) **keep ivory type**. Child reading tiles use ink.

### 2. Selected / active tile — `studio-tile--selected`

Only when selection hierarchy requires emphasis.

- Fill: `color-mix(in srgb, #547C92 22%, #F7F4EE)`
- Border: `1px solid #547C92`
- Do not use this on ordinary reading cards

### 3. Supporting / quiet tile — `studio-tile--quiet`

Before Checkout and similar secondary instruction.

- Fill: Ivory **40%**, **no** frost
- Border quieter than standard (`Denim 18% + Ivory`)
- Heading quieter than plan labels
- Stays quieter than primary content

### 4. Primary action — `.lobby-entry-film__cta`

Reuse Welcome. Do not invent a second filled Denim.

- Fill / border `#547C92`
- Type Ivory
- Radius `0.55rem`
- Disabled opacity `0.55`
- One page-level CTA where possible
- Voice Choice “Use Voice guidance” / “Fill it out myself” reuse this Welcome CTA class. Do not invent a third button family for that gate.

### 5. Secondary action — `studio-action--secondary`

Edit / Change / Back / Remove.

- Fill: Ivory 50% transparent
- Border: `1.5px solid #547C92`
- Type Denim
- **Locked exception:** Coral `#D94E2B` “Correct something” stays. It is not secondary.

Dense forms (Help, Auth, Project Record, long intake) may use **standard-dense** (`--mc-glass-strong` 58% + the same frost). Same family, not a sixth cousin.

---

## What is not a tile

- Lounge environment
- Route Map / highway artwork
- Studio Review tab
- Presence / halo / Voice Activity Bar
- Device chrome retired on name-question / plan stages

---

## Frozen Step 2

Choose Your Services is an approved reference. Do **not** casually redesign it.

Approved appearance today:

- Unselected job card: Ivory **32%** + inset highlight, sitting on the Step 2 frost plate (Ivory 36% + `blur(28px) saturate(1.06) brightness(1.18)`)
- Selected job card: selected/active Denim mix
- Add CTA: primary Denim

If shared classes can represent that output without changing what the owner sees, consolidate later. Otherwise leave the visual output intact and keep this as an approved selectable-idle state.

---

## Cousins to retire after owner review

These are why rooms currently mismatch:

| Cousin | Where it shows up | Problem |
|--------|--------------------|---------|
| `--mc-card` Ivory 55%, no frost | Plan (desktop default), checkout route card, job-card default, intake status | Reads charcoal / brown over Lounge |
| `--mc-chip` used as a card | Several Conversation Room lists | Chip token, not a reading tile |
| Opaque `#ffffff` / `#faf6ef` utility cards | Board, Help, Auth, Delivery on Lounge | Paper slab, not light glass |
| Local `rgba(247,244,238,0.07–0.25)` | Driver / assist / discovery leftovers | Charcoal-leaning |
| Page-local 32 / 40 / 78 / 92% ivory | Step 3 experiments | Magic numbers |
| `blur(4px)`–`blur(16px)` not the master filter | Board, checkout, Host Route Map, file room | Different glass every room |

`--mc-card` is the main accidental dark tile. After review it should stop being the default customer card.

---

## Journey inventory

| # | Screen | Owner status | Proposed tile | Normalize after review? |
|---|---------|--------------|---------------|--------------------------|
| 1 | Lounge / Welcome | OWNER ACCEPTED | Standard light (stage) | No |
| 2 | Voice Choice | OWNER ACCEPTED — source of truth | Standard light (stage) + primary actions | No |
| 3 | Name / need / business-name | OWNER ACCEPTED | Standard light + chips | No |
| 4 | Materials + confirmation | OWNER ACCEPTED | Standard light + primary / coral exception | No |
| 5 | Review Together | System accepted; `--mc-card` rows | Standard light | Yes |
| 6 | Choose Your Route | OWNER ACCEPTED | Selectable + selected/active | No |
| 7 | Choose Your Services (Step 2) | FROZEN | Locked exception | No |
| 8 | Review Studio Plan (Step 3) | OPEN | Standard light children; quiet Before Checkout; primary/secondary actions | Yes |
| 9 | Checkout / Payment | Not certified | Standard light + primary | Yes |
| 10 | Project Intake | Not certified | Standard dense | Yes |
| 11 | Account Handoff / Auth | Not visually certified | Standard dense + primary/secondary | Yes |
| 12 | Studio Board | Not phone-certified | Standard light; selected only when selected | Yes |
| 13 | Materials Upload & Rights | Rights closed with limits; visual open | Standard light | Yes |
| 14 | Communication / Status | Not phone-certified | Standard light | Yes |
| 15 | Unified Review / Feedback | Not visually certified | Standard light | Yes |
| 16 | Final Approval | Not visually certified | Standard light + primary | Yes |
| 17 | Delivery / Download | Not visually certified | Standard light | Yes |
| 18 | Help Center | Content locked | Standard dense | Yes |

Error, empty, and recovery cards in those stages use **standard light** (or dense if they are forms). They do not get a new style.

---

## Samsung checkpoints (after implementation)

Not after every tile. After these sections:

1. **Conversation Room** — Review Together, Step 3, Checkout, Intake. Compare frozen Step 2; do not restyle it.
2. **Account** — Handoff / Sign In / Sign Up
3. **Board** — Board, materials, communication
4. **Review + Delivery** — Review, approval, download

If HTML paints and a control is dead, diagnose hydration / chunk-load first. Do not rewrite Fill or other handlers speculatively.

---

## What implementation must not do

- Change copy, pricing, services, routes, Voice, payment, rights, Board, review, or delivery behavior
- Expand Launch Now
- Restyle frozen Step 2 unless the shared class is pixel-equivalent
- Restyle owner-accepted Welcome / Voice Choice / name questions / materials / route
- Put frost on interactive Fill / CTA nodes
- Merge until this audit and owner review are complete

---

## After owner review

Approved 2026-09-05. Conversation Room is the first apply section (Review Together, Step 3, Checkout, Intake). Frozen Step 2 and owner-accepted screens stay. Later sections: Account → Board → Review/Delivery.

1. Add shared CSS classes that emit **only** these recipes.
2. Point mismatched screens at those classes. Delete local cousins.
3. Run `mobile-conversation-coherence` + `mobile-customer-spine-palette` plus any screen tests touched.
4. Samsung-check by section.

Until then: this document is the standard. Pages must not invent tile #38.
