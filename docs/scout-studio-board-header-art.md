# Scout — Studio Board Header Art Spec

**Project:** studio-squishy  
**Date:** June 14, 2026  
**Author:** Scout (Cursor Agent)  
**For:** Chad / illustration → Tagia approval

---

## ⚠️ Two different surfaces — do not swap art

| Surface | Route | Header art | Size |
|---------|-------|--------------|------|
| **Studio Board** | `/studio-board` | **City skyline outline** (cream, sketch) | 2220 × 340 |
| **Studio Guide — Spark** | `/studio-guide` | Desk / workspace (package-specific) | 2220 × **340** |
| **Studio Guide — Momentum** | `/studio-guide` | Desk / calendar workspace | 2220 × **340** |
| **Studio Guide — Growth** | `/studio-guide` | Partnership mural / workspace | 2220 × **280** |

**IDEAS + ACTION = IMPACT banner (Spark):** Export at **2220 × 340**. Source aspect ~**6.4:1** (e.g. 1024×160). **Never stretch** — use proportional crop (`object-fit: cover`). Stretching makes bulbs/text/city look wide and cheap.

---

- Board: `src/config/studio-board.ts` → `assets.headerBanner`
- Guide: `src/config/studio-guide.ts` → `assets.heroes.spark | momentum | growth`

---

## Artist brief — Studio Board Header

### Master canvas

Create a new master at exactly **4440 × 680 px** (@2x).

Use the existing approved Studio Board artwork (desk, chalkboard city, lamp, window sunset, notebooks) as the starting point.

Extend the scene **horizontally** using outpainting or generative expansion so the environment feels natural and intentional — not a squashed or stretched resize of a tall panorama.

### Composition requirements

1. **Safe area (critical content)**  
   Keep all important elements inside the **center 2220 × 680 ÷ 2 = center 2220 × 340** region:
   - **Horizontal inset:** 1110 px from each left/right edge of the 4440 master  
   - **Vertical inset:** 170 px from top and bottom of the 680 master  

2. **Negative space**  
   - Generous empty/environment padding on the **far left and far right** (outside safe area).  
   - The live UI overlays title + greeting on the **left ~35%** — keep that zone softer/cleaner (desk edge, wall tone, no critical text in the art).

3. **Crop boundaries**  
   - Do not place critical objects (faces, notebook headlines, lamp bulb, window horizon) within **170 px** of the top or bottom master edge.  
   - Do not place must-read art within **1110 px** of left/right master edges.

4. **Aesthetic (preserve)**  
   - Warm cinematic lighting (lamp + sunset)  
   - Studio Board desk / workspace concept  
   - Chalkboard city + real city through window  
   - Approved palette: dark wall, warm wood, teal UI sits on cream overlay left

### Do not

- Export at 1024 px width “for web”  
- Use 16:9, 2:1, or tall panoramic canvases  
- Add white letterbox bars above/below the art  
- Stretch a single composition to fit 2220 × 340 in CSS — the file must **be** that ratio

---

## Deliverables

| # | File | Dimensions | Purpose |
|---|------|------------|---------|
| 1 | `studio-board-header-master-v1.png` | **4440 × 680** | Master / source (keep layered if possible) |
| 2 | `studio-board-header-scene-v10.png` | **2220 × 340** | **Production asset** — wire into app |
| 3 | Verification screenshot | — | Studio Board `/studio-board` next to Studio Guide Momentum panel |

### Final export (`2220 × 340`)

- Crop from **center** of 4440 × 680 master (full-width center slice, 340 px tall).  
- PNG, sRGB, no transparency required (dark `#2b3239` letterbox OK in CSS if needed).  
- Filename for app: `public/studio-board/studio-board-header-scene-v10.png`

---

## Safe area diagram (@2x master)

```
4440 × 680 master
┌──────────────────────────────────────────────────────────────┐
│ 170px top gutter — environment only                          │
├──1110px──┬──────────────── 2220 × 340 SAFE ────────────────┬──1110px──┤
│  L gutter │  Notebooks · lamp · window · all hero content   │ R gutter │
│  (UI text │  must live here                                  │ (extend) │
│   overlays│                                                  │          │
│   here)   │                                                  │          │
├──1110px──┴──────────────────────────────────────────────────┴──1110px──┤
│ 170px bottom gutter — environment only                          │
└──────────────────────────────────────────────────────────────┘

Final export = center rectangle only → 2220 × 340
```

---

## Engineering verification

### 1. Check file dimensions (Windows)

```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("public\studio-board\studio-board-header-scene-v10.png")
"$($img.Width)x$($img.Height)"
$img.Dispose()
```

**Must print:** `2220x340`

### 2. Compare to Momentum reference

```powershell
# Both should be 2220x340
```

Open side-by-side:

- `public/studio-guide/hero-momentum.png`  
- `public/studio-board/studio-board-header-scene-v10.png`

Same width, same height, same strip feel.

### 3. Wire into app

In `src/config/studio-board.ts`:

```ts
headerBanner: "/studio-board/studio-board-header-scene-v10.png?v=1",
```

Display uses:

```css
aspect-ratio: 2220 / 340;
object-fit: fill; /* identical to .guide-detail-hero when asset matches */
```

Hard refresh: **Ctrl+Shift+R** → `http://localhost:3000/studio-board`

### 4. Acceptance checklist

- [ ] File properties: **2220 × 340 px**  
- [ ] No white letterbox baked into PNG  
- [ ] Banner height scales with width (≈340 px tall at 2220 px wide; ~380 px tall at ~2480 px viewport — **expected**)  
- [ ] No visible stretch (circles stay round, text not squashed)  
- [ ] Left overlay text readable over art  
- [ ] Matches Momentum hero **fit** on Studio Guide

---

## Why previous uploads failed

| File | Actual size | Problem |
|------|-------------|---------|
| v7–v9, ChatGPT exports | 1024 × 321–502 | Half resolution, ~2:1 aspect |
| v5 | 2400 × 448 | Wrong aspect (~5.4:1) |
| **hero-momentum.png** | **2220 × 340** | ✓ Correct |

The app was not wrong — the assets were not exported at the locked ratio.

---

## Handoff

When `studio-board-header-scene-v10.png` (2220 × 340) is approved:

1. Drop in `public/studio-board/`  
2. Update `headerBanner` path in `studio-board.ts`  
3. Run dimension check above  
4. Tagia sign-off on `/studio-board` vs Momentum panel  

**Do not** swap `hero-momentum.png` into Studio Board for production — different art. Use only for fit comparison during QA.
