# Welcome Hall — LOCKED

**Status:** Founder approved — plate v31 locked effective 2026-06-14  
**Approved by:** Tagia (Creative Director)  
**Runtime:** `public/welcome-hall/welcome-hall-scene-v3.2.png?v=31` (1920×1080)  
**Archived final:** `public/welcome-hall/welcome-hall-v2-final-locked.png`

No further redesign without explicit Tagia approval.

## Change policy

No visual redesigns, copy rewrites, layout adjustments, mural/kiosk/draft room/lighting changes, or environmental experiments unless:

- verified technical defect
- verified accessibility issue
- verified navigation failure

All other changes require explicit Tagia approval.

## Customer journey

```
Welcome Hall  →  Kiosk (Start Here)  →  Draft Room intake
     Wow              Begin                    Action
```

Visual flow: **Kiosk right foreground** (primary CTA) · **Draft Room doorway** (baked label)

## Plate v31 (live)

- 1920×1080 16:9 plate — tower-free static scene
- Clean render with **baked tap finger** on kiosk (no code overlay)
- Wording locked: **START HERE** · *Let's build something great together.*
- **Full kiosk** is the tap target (screen, finger, body — forgiving for mobile)
- Kiosk route: `/draft-room?from=hall`
- Alignment reference: `welcome-hall-kiosk-hotspot-reference.png`
- Hotspot calibration overlay: `_verify-hotspots-v31.png`

## Engineering

- **Primary CTA:** invisible full-kiosk hotspot (`kioskTapTarget` in `welcome-hall-scene.ts`)
- **Tower:** dormant — `TOWER_ROTATION_ENABLED=false` in `welcome-hall-tower.ts`
- **Scout viewports:** 1920×1080, 1366×768, 390×844 portrait — run `node scripts/scout-welcome-hall-v31.mjs`

## Reference only (never runtime)

- Concept boards with callouts, arrows, or journey footers
- Debug `_debug-*` and `_verify-*` overlays (local QA only)
