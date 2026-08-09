# Creative Production Work Packet — VIDEO-OPS-1 / V1

**Label:** INTERNAL VIDEO PRODUCTION TEST — NOT CUSTOMER DELIVERABLE  
**Work packet ID:** `video-ops-1-cedar-lane`  
**Work packet version:** `wp-v1`  
**Storyboard version:** `sb-v1`  
**Script/copy version:** `script-v1`  
**SKU:** `v2-rtu-short-video`  
**Campaign/job ID:** `video-ops-1-cedar-lane`  
**Production role owner:** Creative Production  
**Temporary test operator (physical CapCut Desktop):** Tagia (one-time setup only — not routine model)  
**Tool:** CapCut Desktop (manual-operational)  
**Music:** none  
**Stock:** none  

---

## Job truth

| Field | Value |
|-------|--------|
| Duration target | 20–25 seconds |
| Aspect | Vertical 9:16 |
| Export format | MP4 |
| Target dimensions | 1080 × 1920 |
| Captions | Required (burned into scene plates + CapCut text OK if needed) |
| CTA | Required — “Book a visit” / cedarlane.studio |
| Revision allowance | 1 (catalog) — this package also proves a QA correction cycle |
| Publishing | Client posts (excluded from Studio) |
| Filming | None |

---

## Brand rules (locked — do not invent)

| Rule | Value |
|------|--------|
| Business | Cedar Lane Studio (fictional) |
| Primary color | Teal `#0F5C5C` |
| Background | Cream `#F7F1E8` |
| Logo | `source-assets/cedar-lane-logo.png` — end card center |
| Safe margins | Keep captions in lower 25%; logo clear of edges ≥48px |
| Font feel | Clean sans (Segoe UI / CapCut default sans) |
| Motion | Gentle only — Ken Burns slow zoom ≤5% or static hold |
| Transitions | Cross dissolve ≤0.35s or hard cut |
| Must not | Music, stock footage, real customer data, extra scenes |

---

## Script / copy (script-v1)

Spoken (certified voice MP3 — do not rewrite):

> Use the sealed Cedar Lane / Mira Chen certified voice track as-is. Do not edit script wording in CapCut.

On-screen captions (locked):

1. Quiet craft. Clear message.
2. Cedar Lane Studio
3. Brand stories, made calm.
4. Book a visit · cedarlane.studio

---

## Source assets

| ID | Path | Type | Role | SHA-256 |
|----|------|------|------|---------|
| logo | `docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-logo.png` | logo | End card | `285bdca23ba864d67a5ca72ba3178619dabb32a10d39f2c4a6e9bd3526f030b5` |
| still-01 | `.../cedar-lane-still-01.png` | still | Scene 1 base | `b50d3fa08bd7260804e00fc72969aec68cfdebf3f4eadb45ebf2cf8e92c5289b` |
| still-02 | `.../cedar-lane-still-02.png` | still | Scene 2 base | `4e1eac632668689a93eff9f54e2065a3a29b94ca27047d19a5ada285f194d30e` |
| still-03 | `.../cedar-lane-still-03.png` | still | Scene 3 base | `37bed9adcc04e1c6d81e5ba18cee5861c872013a9b9a396c392765fde97212ce` |
| end-bg | `.../cedar-lane-endcard-bg.png` | still | End card base | `5579b96dd690c2b7acc14f20d0be483d839d84d5b12e537319d11b6ce2afd41e` |
| scene-01 | `.../scenes/scene-01.png` | plate | Timeline clip 1 | `27a13c142cad0bedbeebd8765e10360978a28ffbc6d34b4bbb2b69205f25dd95` |
| scene-02 | `.../scenes/scene-02.png` | plate | Timeline clip 2 | `67e169d013d2c06ffda5625934ca673429a878128b042515c6da4912290f723b` |
| scene-03 | `.../scenes/scene-03.png` | plate | Timeline clip 3 | `1c13638b82fdd92ce9d93c10370873143d8ddb71502a46ab6ca91ed1eb8a600c` |
| scene-04 | `.../scenes/scene-04-endcard.png` | plate | Timeline clip 4 + CTA | `394cdbee4ee594486a07a2d536f5ed23b9e412550326fe3072d0abc67f7ded19` |
| voice | Sealed path below | mp3 | VO track | `d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4` |

**Voice (authoritative sealed artifact):**  
`docs/launch/kitchen-production-cert-voice-1/artifacts/cert-voice-1-cedar-lane/ap-001_cert-voice-script-v1_d283144563a6.mp3`  

Import convenience copy (same hash):  
`docs/launch/kitchen-video-operational-1/source-assets/certified-voice-ref_d283144563a6.mp3`

---

## Storyboard (sb-v1)

| Scene | Asset | Start–End | Crop | Motion | Caption | Transition |
|-------|-------|-----------|------|--------|---------|------------|
| 1 | scene-01 | 0.0–5.5s | Cover 9:16 (plate already) | Static or +3% slow zoom | Quiet craft. Clear message. | Dissolve 0.3s → |
| 2 | scene-02 | 5.5–11.0s | Cover 9:16 | Static | Cedar Lane Studio | Dissolve 0.3s → |
| 3 | scene-03 | 11.0–16.5s | Cover 9:16 | Static | Brand stories, made calm. | Dissolve 0.3s → |
| 4 | scene-04 | 16.5–22.5s | Cover 9:16 | Static | Book a visit / cedarlane.studio | End |

**Total target:** ~22.5s (acceptable band 20–25s)  
**Voice:** start at 0.0s, full mix under/over plates; no music bed  
**Audio level:** voice clear; do not duck below intelligibility  

---

## Export (V1)

| Setting | Value |
|---------|--------|
| Resolution | 1080 × 1920 |
| Frame rate | 30 fps (or CapCut default 30) |
| Format | MP4 |
| Codec | CapCut default H.264 |
| Bitrate | CapCut “Recommended” / high |
| Audio | AAC, include voice track |
| Music | **Off** |
| Filename | `v2-rtu-short-video_video-ops-1-cedar-lane_wp-v1_sb-v1.mp4` |
| Studio artifact path | `docs/launch/kitchen-video-operational-1/artifacts/v1/` |

After export: copy/move file into the Studio artifact path above. Do not rename away from the convention.

---

## QA correction intent (for V2 cycle)

Expected routine QA note (example): **CTA held too briefly / caption sizing on end card** — extend scene 4 by ~1.5s and ensure CTA text remains fully readable.  
Creative Production executes V2 from `WORK-PACKET-v2.md` without Owner inventing new creative.
