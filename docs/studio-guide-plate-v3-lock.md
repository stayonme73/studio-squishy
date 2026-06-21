# Studio Guide Plate V3 — Current Truth

**Status:** Awaiting **new** composition-correct V3 from Scout  
**Browser / prototype:** **V2 only** — `studio-guide-plate-prototype-v2.png`  
**Rejected interim (do not wire, do not iterate):** `public/studio-guide/studio-guide-plate-v3.png`

---

## Current truth (locked)

| Fact | Detail |
| ---- | ------ |
| **What the browser shows** | V2 — banner reads *Plate V2 (composition reference)* |
| **What code loads** | `public/studio-guide/studio-guide-plate-prototype-v2.png` |
| **Existing `studio-guide-plate-v3.png`** | Rejected interim (revision daylight). **Closed.** |
| **Next real deliverable** | A **new** composition-correct V3 PNG that matches the brief |

True V3 still needs:

- Visible table lip
- Better book spacing (`SPARK · MOMENTUM · GROWTH`)
- Pens on table, **not** on covers
- **Review Concepts** sticky note preserved
- Clean approval-card landing zones (empty in art)
- Title protection zones

**Code cannot add these** — they must be illustrated into the plate PNG.

---

## Scout — one-time comparison, then move on

Before building the **new** V3, Scout may show **V2** and the **rejected** `studio-guide-plate-v3.png` **side by side once** so the gap is obvious.

After that comparison: **stop debating the rejected file.** Do not revise it, re-wire it, or treat it as the deliverable. The next submission is a **fresh** composition-correct PNG.

| Compare once | Then discard as deliverable |
| ------------ | --------------------------- |
| `studio-guide-plate-prototype-v2.png` | `studio-guide-plate-v3.png` (rejected interim) |

---

## Mission (unchanged)

Composition refinement pass — **not** a redesign. Rebuild drafting-table composition around the approval workflow while preserving the Studio room.

**Reference:** owner composition mockup (V2 plate + tuned code overlays) — see [scout-studio-guide-plate-v3.md](./scout-studio-guide-plate-v3.md)

---

## Prototype wiring (current)

| Item | Value |
| ---- | ----- |
| Plate | `studio-guide-plate-prototype-v2.png` |
| Hit rects | V2 calibrated (owner-approved tuning) |
| Approval slips | Code overlays — `deskApproval` config |

### Hit rects (1536 × 1024, V2)

| Booklet | x | y | width | height |
| ------- | - | - | ----- | ------ |
| SPARK | 588 | 552 | 145 | 162 |
| MOMENTUM | 735 | 508 | 135 | 200 |
| GROWTH | 872 | 512 | 112 | 118 |

---

## True V3 deliverable (Scout)

**New file** (replace rejected interim on founder sign-off):

`public/studio-guide/studio-guide-plate-v3.png`

Must match [scout-studio-guide-plate-v3.md](./scout-studio-guide-plate-v3.md).

**Wire only after founder sign-off** on the new PNG:

1. Swap plate in `src/config/studio-guide-prototype.ts`
2. Recalibrate `bookletHits` + `deskApproval`
3. Verify `/studio-guide-prototype?debug=1`

---

*V2 stays live until Scout delivers and Tagia approves composition-correct V3.*
