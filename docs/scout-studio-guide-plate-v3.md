# Scout — Studio Guide Plate V3

**Project:** studio-squishy  
**Date:** June 20, 2026  
**Status:** **Awaiting new composition-correct deliverable**  
**For:** Scout / illustration → Tagia approval  
**Route:** `/studio-guide-prototype` · future `/draft-room` plate  
**Deliverable:** `public/studio-guide/studio-guide-plate-v3.png` (1536 × 1024) — **new PNG, not the rejected interim**  
**Reference image:** [review-captures/studio-guide-v3-scout-reference.png](./review-captures/studio-guide-v3-scout-reference.png)  
**Prototype (live):** `studio-guide-plate-prototype-v2.png` — browser shows V2 until new V3 is approved

---

## Current truth (read first)

- **Browser is still showing V2.**
- **Existing `studio-guide-plate-v3.png` is rejected/interim** — revision daylight, wrong composition. **Closed. Do not revise or re-submit this file.**
- **Next real deliverable:** a **new** composition-correct V3 PNG that matches this brief.

True V3 still needs:

- Visible table lip
- Better book spacing
- Pens on table, not covers
- Review Concepts note preserved
- Clean approval-card landing zones (empty — code adds cards)
- Title protection zones

### One-time comparison — then stop debating the rejected file

Show **V2** and the **rejected** `studio-guide-plate-v3.png` **side by side once** if helpful. After that, move on. The rejected file is not the deliverable.

| V2 (baseline) | Rejected interim (closed) |
| ------------- | ------------------------- |
| `public/studio-guide/studio-guide-plate-prototype-v2.png` | `public/studio-guide/studio-guide-plate-v3.png` |

---

## One sentence

> Use the reference image for **drafting-table composition only**. Keep the existing Studio room background. Rebuild book placement, lip, pens, sticky note, and approval landing zones on the table.

---

## Reference rules

| Use reference for | Do **not** copy from reference |
| ------------------- | ------------------------------ |
| Book spacing / placement on table | Room background (window, mural, notes board) |
| Table lip visibility | Approval cards painted into art (code adds those) |
| 3 pens on table surface | Expanded proposal form (HTML overlay — code) |
| Review Concepts sticky position | SaaS dashboard styling |

**The background stays the same.** Camera angle, lighting, skyline, notes board, mural, atmosphere — unchanged.

---

## Founder direction (June 20)

### Table lip
- **Must be visible** — front edge reads as a physical shelf that holds objects
- Baked into plate art (no CSS lip overlay)

### Books — SPARK · MOMENTUM · GROWTH
- **Placed differently** on the table vs current V2 (see reference)
- More intentional spacing — individually selectable, still a grouped set
- **Title protection zones** — nothing overlaps package titles or icons
- **Empty lower-cover landing zones** for code approval slips (do not paint cards)

### Pens — 3 on table
- **Exactly 3 pens** as supporting props on the **drafting-table surface**
- **Remove pen from SPARK cover** — no pen on any booklet
- Pens must not block approval zones, sticky note, or package interactions
- Scout chooses exact placement; workflow objects take priority

### Sticky note
- Keep **Review concepts.** note
- Reposition so it does **not** compete with GROWTH approval landing zone

### Everything else unchanged
- Room design, window, mural, notes board, lighting, book cover designs, color system

---

## Art vs code

| **Scout (plate PNG)** | **Code (already on V2)** |
| --------------------- | ------------------------ |
| Table lip | Approval card overlays |
| Book placement & spacing | Proposal form (bottom shelf, readable) |
| 3 pens on table | Hit zones + animations |
| Sticky note position | Studio Yellow in SPARK proposal |
| Empty approval landing zones | Payment / intake transitions |

---

## Questions for Scout (ask Tagia if unclear)

1. **Book angle** — Keep current fanned step, or more parallel like reference spacing mockup?
2. **Pen style** — Match existing black pen in V2 reference, or cup-of-pens on left only?
3. **Sticky note** — Exact copy “Review concepts.” with period? Placement: right of GROWTH, below cover, or on table lip?
4. **Table lip** — How many pixels / how prominent vs V2? Reference shows lip + optional “THE STUDIO” nameplate — include nameplate?
5. **Growth book size** — Same physical size as Spark/Momentum, or slightly smaller (as in some mocks)?
6. **Deliverable format** — 1536×1024 PNG + separate grid-proof overlay with hit-zone rectangles?

---

## Do not wire until sign-off

`public/studio-guide/studio-guide-plate-v3.png` on disk today is the **rejected interim** — wrong composition (no lip, pens on cover, missing sticky, wrong spacing). **Do not wire it. Do not iterate on it.**

After Tagia approves Scout’s **new** PNG:

1. Save as `public/studio-guide/studio-guide-plate-v3.png` (replaces rejected interim)
2. Engineering recalibrates `bookletHits` + `deskApproval`
3. Verify `/studio-guide-prototype?debug=1`

---

## Paste instruction for Scout

```text
CURRENT TRUTH:
- Browser shows V2 only (studio-guide-plate-prototype-v2.png).
- Existing studio-guide-plate-v3.png is REJECTED INTERIM — closed. Do not revise it.
- Show V2 vs rejected V3 side by side ONCE if needed, then stop debating that file.
- Next deliverable: NEW composition-correct V3 PNG per brief.

Reference: docs/review-captures/studio-guide-v3-scout-reference.png
Use for drafting-table composition ONLY. Background (room, window,
mural, notes board) stays the same as current Studio plate.

True V3 must include:
- Visible table lip
- Better SPARK / MOMENTUM / GROWTH spacing
- 3 pens ON TABLE only (none on covers)
- Review Concepts sticky preserved
- Empty approval landing zones + title protection zones

Do NOT paint approval cards into the art.
```

---

*End of Scout brief.*
