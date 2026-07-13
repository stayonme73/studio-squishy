# Build Your Project — Production Pattern LOCKED

| Field | Value |
|---|---|
| Room | Build Your Project |
| Status | **LOCKED** |
| Owner | Tagia |
| Date | 2026-07-11 |
| Route | `/project-builder` |

**Scope:** Pre-purchase workspace pattern — service cards, Learn More drawer, Project Summary, Studio Conversation (Squishy). This is the **production template** for every remaining pre-purchase page unless a page has a fundamentally different purpose.

**North star:** *One Workspace. One Project. Squishy Guides. You Decide.*

**Scout / agent instruction (verbatim):**

> Do not redesign subsequent pre-purchase pages. Reuse this exact layout, spacing, visual hierarchy, card system, summary card, Learn More drawer, and Squishy placement throughout the pre-purchase experience. Future pages should feel like different activities within the same Studio workspace, not different applications.

No layout, interaction-model, or copy-structure changes without explicit Tagia approval.

## Change policy

No visual redesigns, new interaction patterns, alternate detail layouts, or Squishy placement moves unless:

- verified technical defect
- verified accessibility issue
- verified navigation failure at **100% browser zoom**

**Do not:** invent new page layouts for pre-purchase steps; move Learn More to a separate route; make Remove a primary CTA; let Squishy narrate UI controls; or drift card/drawer section order.

**Polish deferral:** Tiny spacing, font tweaks, shadows, and button radii are polish — journey correctness comes first.

---

## 1. Service card pattern (locked)

Every service card contains **exactly these elements, in this order**. No exceptions.

| # | Element | Notes |
|---|---------|-------|
| 1 | Service icon | Emoji cue per intake type |
| 2 | Service name | Customer-facing catalog name |
| 3 | Price | `priceDisplay` from catalog |
| 4 | One-sentence description | Catalog `purpose` — one line preferred |
| 5 | Status | `✓ In Project` when selected; absent when not |
| 6 | Learn More | Quiet text link — opens in-workspace drawer |
| 7 | Add to Project / Remove | See button behavior (§3) |

**Component:** `ProjectBuilderDeliverableTile`  
**Styles:** `.pb-card*` in `src/app/project-builder/project-builder.css`

---

## 2. Learn More drawer structure (locked)

Learn More **never leaves the page**. Customer opens a drawer in the Studio — not documentation.

Every service uses the **exact same sections, in this order**. Only content changes.

| # | Section | Format |
|---|---------|--------|
| Header | Learn More eyebrow · title · **Best For** · price | See §7 |
| Note | Scope clarification | *Scope and timing below apply to this service only — not your full project timeline.* |
| 1 | Purpose | One sentence (card) |
| 2 | ✅ Included | Bullets |
| 3 | ❌ Not Included | Bullets (comma-lists split to one item each) |
| 4 | 🔄 Revisions | Short paragraph |
| 5 | ⏱ Timeline | Bullets (estimated delivery · materials · confirmed before payment) |
| 6 | 👤 What You'll Need To Provide | Bullets |
| Footer | CTA | See button behavior (§3) |

**Components:** `ProjectBuilderServiceDrawer`, `ProjectBuilderJobDetailBlocks`  
**Copy helpers:** `src/lib/project-builder-scannable-copy.ts`, `project-builder-drawer-timing.ts`, `project-builder-drawer-tagline.ts`

---

## 3. Button behavior (locked)

**Remove is never the primary action.**

| State | Primary | Secondary |
|-------|---------|-----------|
| Not selected | `+ Add to Project` | — |
| Selected | `✓ In Project` (status — not a destructive action) | `Remove` (underlined text link) |

Applies to **both** service cards and drawer footer.

---

## 4. Project Summary card (locked)

**Placement:** Integrated into workspace header (`ProjectBuilderSummaryRail` inside `pb-header`).

Summary always answers three questions — nothing else:

| Question | Label (locked) |
|----------|----------------|
| How many? | **Deliverables** + count |
| How much? | **Estimated Investment** + total |
| What happens next? | **Review Your Studio Plan** CTA |

**Planned (not yet live):** **Estimated Timeline** row — *After feasibility review* — add when feasibility flow exists. Until then, honest timing note only.

**Component:** `ProjectBuilderSummaryRail`

---

## 5. Squishy's job (locked)

Squishy owns the **Studio Conversation** column (right). Bubble above figure. Never paste-on-top overlay.

Every message does **one** of:

- **explain** — what a service is for
- **compare** — help choose between services (esp. Not Included)
- **reassure** — confidence during building
- **suggest** — thoughtful next step

**Never narrate the UI.** Do not say *Click Add to Project*, *Open the panel*, or *check your Project Summary*.

**Good:** *This option works best if you need customers to scan everything you offer in one page.*

**Bad:** *Click Add to Project when you're ready.*

**Drawer open:** consultative copy from `resolveProjectBuilderDrawerSquishyMessage` — reference *the Not Included section below*.

**Drawer closed:** workspace copy from `resolveProjectBuilderSquishyMessage`.

---

## 6. Learning philosophy (locked)

- Learn More = in-workspace drawer with backdrop dim (~36% charcoal)
- Customer never feels like they left the Studio
- Browse → Learn → Add → Review → Checkout without page hops (checkout excepted when explicitly entered)

---

## 7. Best For line (locked)

Every drawer panel header includes:

```
Best For
[One sentence — who / when this service fits]
```

Purpose card below may repeat catalog purpose; Best For is the **fast filter** so customers self-select out before reading paragraphs.

**Helper:** `resolveProjectBuilderDrawerTagline(job)` — sentence only; label is UI.

---

## 8. One-screen workspace (locked)

```
pb-scene (100dvh)
  pb-layout (main | Studio Conversation)
    pb-header (intro + Project Summary)
    deliverables grid OR studio plan view
    Learn More drawer (overlay, main column only)
    Squishy (sticky right column)
```

Main column scrolls; page shell does not. Drawer body scrolls with visible thin scrollbar.

---

## 9. Pre-purchase template (locked)

| Route Map | Front door — choose a route |
| Build Your Project | Design table — browse, learn, decide, add |
| Project Summary / Studio Plan | Review assembled plan |
| Secure Checkout | Payment |

Progression: Route Map felt like the front door. Build Your Project is the design table. Same workspace DNA throughout.

**Implementation map**

| Area | Path |
|------|------|
| Scene | `src/components/project-builder/ProjectBuilderScene.tsx` |
| Cards | `ProjectBuilderDeliverableTile.tsx` |
| Drawer | `ProjectBuilderServiceDrawer.tsx` |
| Detail blocks | `ProjectBuilderJobDetailBlocks.tsx` |
| Summary | `ProjectBuilderSummaryRail.tsx` |
| Squishy | `ProjectBuilderSquishyCompanion.tsx` |
| Config copy | `src/config/project-builder-v1.ts` |
| Styles | `src/app/project-builder/project-builder.css` |

---

## Related docs

- `docs/customer-journey-v1-locked.md` — room names and routes
- `docs/the-studio-design-system-v1.md` — color roles
- `docs/decision-page-visual-language-v1.md` — decision surfaces
