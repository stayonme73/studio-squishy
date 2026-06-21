# Studio Squishy — Asset Specifications (Phase 0.3)

**For founder review before Phase 1 art production.**

**Layer strategy:** Path B — layered source in archive, flat WebP composite for web (Phase 2 integration).

---

## 1. Master environment plate (full room — Phase 1 deliverable)

| Spec | Value |
| ---- | ----- |
| **Aspect ratio** | 2:3 portrait (1024:1536) |
| **Master dimensions** | **2048 × 3072 px** (recommended @2x) |
| **Minimum dimensions** | 1024 × 1536 px (@1x) |
| **Color profile** | sRGB |
| **Orientation** | Portrait — height > width |
| **Safe zone** | Keep critical props inside central **90%** — ultrawide letterboxing crops edges only |

### Web export targets (Phase 2 — not produced in Phase 0)

| Asset | Dimensions | Format | Weight target |
| ----- | ---------- | ------ | ------------- |
| `studio-environment-v1.webp` | 1024 × 1536 | WebP | < 400 KB |
| `studio-environment-v1@2x.webp` | 2048 × 3072 | WebP | < 900 KB |
| `studio-environment-v1.png` | 1024 × 1536 | PNG | Archive / fallback only |

---

## 2. Style frame assets (Phase 0.2 / pre–Phase 1 gate)

| Spec | Value |
| ---- | ----- |
| **Crop** | Half-room — executive desk + strategy room (see [style-frame-scope.md](./style-frame-scope.md)) |
| **Ratio** | 2:3 portrait (same as master — do not use landscape style frames) |
| **Dimensions** | 1536 × 2304 px minimum; 2048 × 3072 px preferred |
| **Variations** | 3–5 color concepts for founder review |
| **Format** | PNG for review; no WebP required until approved |

---

## 3. Layer strategy (source archive)

**Master plate:** Extend **Concept #4** composition only — see [master-reference.md](./master-reference.md). Do not re-layout zones.

Layered source required even if web ships a flat composite.

### Recommended layer stack (static environment — Phase 1)

| Layer ID | Name | Contents |
| -------- | ---- | -------- |
| L0 | background | Cream walls, denim accent, ceiling, pipes, concrete floor |
| L1 | architecture | Baseboards, glass channels, cabinet housings, **Weather Portal frame cutout** |
| L2 | whiteboard | Board (right of portal), frame, marks, tray, markers |
| L3 | strategy_room | Glass, interior, table, chairs, pendant |
| L4 | executive_desk | Walnut top, steel trim, legs, monitors, props |
| L5 | builder_workspace | Bench, monitors, keyboard, chair, shelf |
| L6 | storage | Built-in steel cabinets, labels |
| L7 | lighting | Glow pools, pendant cone, desk lamp, monitor glow, portal spill |
| L8 | atmosphere | Subtle vignette / depth haze (minimal) |

### Weather Portal runtime stack (Phase 2+ — not flat composite)

The Weather Portal is an **integration exception** to the flat WebP composite. It uses a cutout/layering model (same pattern as Squishy `StudyRoom` + `StudyWindowPortal`):

| Layer | Contents |
| ----- | -------- |
| Studio interior | Full room art; portal opening masked transparent |
| Portal frame | Brushed steel frame + optional walnut ledge (may be baked into L1) |
| Weather effects | Rain, lightning, particles, fireflies, seasonal overlays |
| Outdoor environment | Sky, trees, time-of-day base scene |

**Cutout bounds (normalized, Tall Vertical — approved):** x `0.04`, y `0.14`, width `0.14`, height `0.40` — see [weather-portal.md](./weather-portal.md).

Outdoor scenes should be composed **vertically** (sky, weather, treetops) — not as wide panoramic vistas. The portal is for storytelling and emotional connection, not maximizing view area.

Outdoor and effects layers align to cutout at runtime; they are **not** baked into `studio-environment-v1.webp`.

### Source file requirements

| Spec | Value |
| ---- | ----- |
| **Format** | `.psd`, `.procreate`, or Affinity Photo with layers intact |
| **Naming** | `studio-environment-v1-source.psd` |
| **Storage** | External drive or Git LFS — **not required in Vercel deploy** |
| **Flatten export** | Top of stack → `studio-environment-v1.webp` |

---

## 4. Directory structure (proposed — Phase 2 integration)

```
public/studio/
├── studio-environment-v1.webp           # Primary web asset (@1x or @2x — pick one default)
├── studio-environment-v1@2x.webp        # Optional retina
└── README.md                            # Version, approval date, brief ref

docs/illustration/source/               # Optional — or external storage
├── studio-environment-v1-source.psd
├── style-frame/
│   ├── concept-a.png
│   ├── concept-b.png
│   └── approved-direction.png
└── production-log.md                   # Prompts, seeds (Phase 1)
```

**Phase 0:** Directories and README only if created during integration — **no art files in Phase 0.**

Future engineering config (Phase 2 — not implemented):

```typescript
// src/config/studio-assets.ts (future)
export const studioAssets = {
  environment: "/studio/studio-environment-v1.webp",
  environmentRetina: "/studio/studio-environment-v1@2x.webp",
} as const;
```

---

## 5. Integration constraints (for artists)

Art must work with the **approved responsive contain model**:

```css
/* Stage sizing — do not change ratio */
width: min(100vw, calc(100dvh * 1024 / 1536));
height: min(100dvh, calc(100vw * 1536 / 1024));
aspect-ratio: 1024 / 1536;
```

| Viewport | Expected stage size | Art behavior |
| -------- | ------------------- | ------------ |
| 1920×1080 | 720 × 1080 | Full plate visible, centered, side letterbox |
| 1366×768 | 512 × 768 | Full plate visible, centered |
| 1536×864 @ 125% | 576 × 864 | Full plate visible, centered |
| 390×844 mobile | 390 × 585 | Full plate visible, width-limited |

**Do not design for landscape crop.** Portrait master plate scales uniformly.

---

## 6. Text and prop requirements in art

| Element | Requirement |
| ------- | ----------- |
| Mug | Must read **`Let's Figure It Out.`** at @1x when viewed at full stage width on mobile |
| Whiteboard marks | Abstract / illegible — no readable sentences |
| Storage labels | Optional small handwritten-style words (*Refs*, *Sketches*) — not product copy |
| Monitors | Soft glow suggested — no readable UI text |

---

## 7. Explicit exclusions from all assets

- Squishy character (Step 3 paused)
- Zone label overlays
- Vault / safe / lock iconography
- Guarantee or security language
- Entrance lobby (separate future pass)
- Weather Portal outdoor/effects layers in static flat export (runtime only)
- StayOnMeVoice / Personal Squishy branding in environment art

---

## 8. Quality checklist (before calling art "final" in Phase 1)

- [ ] 2:3 ratio exact — no accidental 16:9 or square export
- [ ] sRGB color profile embedded
- [ ] No compression artifacts on gradients (banding check)
- [ ] Mug text legible at mobile stage width
- [ ] Glass edges have highlight + depth — not flat grey rectangle
- [ ] Floor shows gloss/reflection under desk and pendant
- [ ] Pipes read as cylindrical with light falloff
- [ ] Weather Portal frame + cutout mask in layered source ([weather-portal.md](./weather-portal.md))
- [ ] Layered source archived with named layers
- [ ] WebP optimized without destroying material detail
- [ ] Founder written approval recorded

---

## 9. Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| AI output looks generic | Half-room style frame gate; founder selects direction; human polish pass |
| File too large for LCP | WebP, quality 80–85, @1x default |
| Style drift in full room | Extend approved half-room only — same session/prompt chain |
| Mug text illegible at small size | Art review at 390px stage width before final sign-off |
| Layer source lost | Require `.psd` archive before accepting final |

---

## 10. Phase 0 founder review checklist

- [ ] Master dimensions (2048 × 3072) accepted
- [ ] WebP + optional @2x strategy accepted
- [ ] Layer stack (L0–L8) accepted
- [ ] Directory structure accepted
- [ ] Integration constraints understood
- [ ] Style frame specs accepted ([style-frame-scope.md](./style-frame-scope.md))
- [ ] Weather Portal spec accepted ([weather-portal.md](./weather-portal.md))
- [ ] Ready to begin **style frame generation** (still not Phase 1 full room)

**Founder approval:** _________________ **Date:** ___________

---

## 11. What happens next (not started until approved)

| Step | Phase | Action |
| ---- | ----- | ------ |
| Generate 3–5 half-room style frame concepts | Pre–Phase 1 | AI-assisted + founder review |
| Founder approves one direction | Gate | Sign style frame doc |
| Phase 1 full-room production | Phase 1 | Extend approved style to all zones |
| Engineering integration | Phase 2 | Replace CSS scaffold with image plate |

**Step 3 Squishy:** remains paused.
