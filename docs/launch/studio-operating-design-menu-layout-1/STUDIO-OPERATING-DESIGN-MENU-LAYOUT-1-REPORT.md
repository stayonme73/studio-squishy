# STUDIO-OPERATING-DESIGN-MENU-LAYOUT-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MENU-LAYOUT-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict (technical)

# MENU LAYOUT TECHNICAL REPAIR PASS

Narrow layout repair only. Contract maximum still **5 sections / 30 items TOTAL**. Same min type floors. Fail-closed overflow preserved. **No Canva remap. No dispatch hook.**

**MAX-LOAD VISUAL ACCEPTANCE: PASS WITH LIMITS** — Owner accepted `renders/v6/menu.png` (2026-08-12).

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Prior control | MENU TECHNICAL PROOF PASS · MAX-LOAD VISUAL **FAIL** · overall NOT ACCEPTED |
| HEAD (unchanged tip) | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Locks | primaryTool Canva · no dispatch · flyer/card untouched · Make NOT REQUIRED |

---

## 2. What changed (layout only)

| Change | Detail |
|--------|--------|
| Layout mode | **`two_column`** section flow (≥10 items); `single_column` with tight prices for sparse menus |
| Item–price pairing | Price gutter **58px inside each column** — not full-page right edge |
| Column balance | Assign each section to the currently **shorter** column |
| Typography | Same floors; two-column unlocks **`comfortable`** at max load (was `minimum`) |
| Descriptions | Full wrap height — **no silent 2-line truncate**; overflow fails closed |
| Footer | Light rule + muted text (removed heavy solid bar) |
| Spec version | `menu-design-spec-1.1.0` |
| Renderer version | `design-renderer-menu-layout-1.0.0` |

---

## 3. Files touched

| File | Role |
|------|------|
| `menu-reason.ts` | Two-column packer + tight pairing + balance |
| `menu-types.ts` | `layoutMode`; spec/renderer versions |
| `menu-validate.ts` | Accept `layoutMode` |
| `menu-bind.ts` | Fingerprint + identity `layoutMode` |
| `menu-contracts.ts` | Layout package note |
| `menu-proof.test.ts` | Assert `two_column` on max load |

Flyer/card code: **untouched**.

---

## 4. Max-load artifact (Owner visual gate)

| Field | Value |
|-------|--------|
| **PNG (review)** | `docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu/renders/v6/menu.png` |
| PDF | `.../renders/v6/menu.pdf` |
| renderVersion | **6** |
| layoutMode | **two_column** |
| typographyMode | **comfortable** |
| sections / items | **5 / 30 TOTAL** |
| pngContentSha256 | `897ed461ae25636712ea57372164efbf9f20f340435708b732d7735081a73ba0` |
| pdfContentSha256 | `527e3f78eac4609a911d412360d7e27f353cfba5e063118198932c10630263e3` |
| overflow | `issues=none` |

Prior failed visual (`v1`, one-column / minimum) remains on disk for comparison — not the gate artifact.

---

## 5. Tests

```
src/lib/studio-design-renderer/menu-proof.test.ts — 18/18 PASS
```

Includes max-load, small/medium, density overflow fail-closed, flyer + card regressions.

---

## 6. Status locks (unchanged)

| Gate | Status |
|------|--------|
| MENU LAYOUT TECHNICAL | **PASS** |
| MAX-LOAD VISUAL | **PENDING OWNER** |
| MENU RENDERER OVERALL | **NOT ACCEPTED until visual** |
| primaryTool | **Canva** |
| MENU DISPATCH HOOK | **NOT AUTHORIZED** |
| Flyer / Card | Protected |
| Make | NOT REQUIRED NOW |

---

## 7. Exactly one recommended next step

**Owner visual review of v6 max-load PNG.**  

- If **PASS** (or PASS WITH LIMITS) → authorize `STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1`  
- If **FAIL** → further bounded layout remediation (still no Canva remap)

---

## Final status

**READY FOR OWNER VISUAL REVIEW**

**Scout PARKED**
