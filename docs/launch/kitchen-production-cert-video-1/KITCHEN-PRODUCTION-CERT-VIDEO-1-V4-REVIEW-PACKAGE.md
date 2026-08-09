# KITCHEN-PRODUCTION-CERT-VIDEO-1 — V4 REVIEW PACKAGE

**Verdict:** `READY FOR OWNER REVIEW`  
**Machine verdict:** `V4 CANDIDATE READY FOR OWNER VISUAL REVIEW — NOT CERTIFIED`  
**Environment:** Shotstack **Production (v1)**  
**Correction focus:** Message-to-visual synchronization (not cosmetic-only)  
**Git:** No commit · No push  

---

## Exact V4 artifact (for Owner visual review)

| Field | Value |
|-------|--------|
| Path | `docs/launch/kitchen-production-cert-video-1/artifacts/v4/v2-rtu-short-video_cert-video-1-cedar-lane_wp-v4_sb-v4.mp4` |
| Render ID | `f25cb1cd-e8f7-4585-93c1-1233f6ec4b86` |
| SHA-256 | `1c674130ba412751d5f5d0288426fac40e164925badec60519a6296437719fe8` |
| Bytes | `9006057` |
| Duration | `29.72s` |
| Dimensions | `1080×1920` |
| Frame rate | `25 fps` |
| Video codec | `h264` |
| Audio | `aac` · `48000 Hz` · stereo |
| Container bitrate | ~`2.42 Mbps` |
| QA state | **QA READY only** |
| customerReady / certified / qaPass | **false / false / false** |

Upload **this exact file** for Owner visual inspection with sound. Do not substitute another hash.

Frame checks extracted from the actual render (not storyboard-only):  
`docs/launch/kitchen-production-cert-video-1/artifacts/v4/frame-checks/`

---

## Current readiness (unchanged until Owner PASS)

| Gate | State |
|------|--------|
| Technical render | PASS (machine) |
| Watermark | Production v1 — Owner eyes still confirm |
| Message-to-visual sync | **Owner judgment** (V4 built to address V3 FAIL) |
| Customer Ready | **NO** |
| Certified | **NO** |

---

## Scene-to-script mapping (actual V4 render)

Timing method: character-proportional estimate against certified voice duration **39.427s**, clipped to SKU band **15–30s** (render **29.72s**). Soundtrack plays from t=0 of the certified MP3 for the video length.

| Time range | Narration beat | Visual | Designed text | Caption behavior |
|------------|----------------|--------|---------------|------------------|
| 0.00–5.19s | Certification fixture disclaimer (pre-intro) | Studio still establish | Cedar Lane Studio | Embedded plate + support “Certification fixture — internal” |
| 5.19–8.94s | Hello — this is Mira Chen at Cedar Lane Studio | Craft still + identity card | Mira Chen · Cedar Lane Studio | Embedded + support “Hello — this is Mira Chen” |
| 8.94–12.93s | Book your Portrait Refresh for ninety-nine dollars | Studio workspace still + offer card | Portrait Refresh · **$99** | Embedded + support “for ninety-nine dollars” |
| 12.93–15.88s | before May third, twenty twenty-six | Branded still + deadline card | **Before May 3rd, 2026** | Embedded + spoken-date support |
| 15.88–19.39s | Sessions begin at ten thirty in the morning | Studio still + timing card | **Sessions from 10:30 AM** | Embedded + support “Sessions begin at ten thirty” |
| 19.39–27.06s | Call 555… / visit cedar-lane-studio.example/book | Endcard bg + contact card | **(555) 018-4421** · cedar-lane-studio.example/book | Embedded + support “Call or visit to book” |
| 27.06–29.75s | Final CTA visual (voice enters pronunciation section; SKU caps ≤30s) | Logo endcard + contact retained | **Book your visit today** | Shotstack **overlay** only — single primary CTA |

### Beat mappings (truth)

| Beat | Mapping in V4 |
|------|----------------|
| Offer | Scene 3 · `$99` on screen during spoken offer window |
| Deadline | Scene 4 · `Before May 3rd, 2026` during spoken deadline |
| Session time | Scene 5 · `Sessions from 10:30 AM` during spoken timing |
| Contact | Scene 6 · exact fixture phone + URL during spoken contact |
| CTA | Scene 7 · single overlay `Book your visit today` |

**Known constraint (disclose, do not hide):** Certified voice is **39.43s**; short-video SKU is **15–30s**. V4 covers intro → contact → final CTA inside **29.72s**. Spoken “Reserve your Portrait Refresh today” / pronunciation check fall after the video ends. Visual CTA is the Owner-required `Book your visit today`.

---

## Voice binding

| Field | Value |
|-------|--------|
| Path | `docs/launch/kitchen-production-cert-voice-1/artifacts/cert-voice-1-cedar-lane/ap-001_cert-voice-script-v1_d283144563a6.mp3` |
| SHA-256 | `d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4` |
| Regenerated | **No** |

---

## Production / owner-independence

| Item | State |
|------|--------|
| Render environment | **Production / v1** |
| Shotstack integration reopened for CapCut | **No** |
| Owner edit / Owner render | **No** |
| Purchase occurred | **No** |
| Stock / music | **None** |
| Shotstack credits consumed | **Not returned** on this job record (`credits` absent in render-job JSON) |

---

## Machine QA

All checks **ok** in `artifacts/v4-machine-qa.json` / `artifacts/v4-run-summary.json`, including:

- Production env v1  
- No duplicate overlays for embedded scenes  
- Single primary CTA overlay · obsolete CTA absent · CTA contrast `#1F4A44`  
- Offer / deadline / session / contact / identity beat presence in packet timing  
- Scene-to-script map present · timing not equal 5s slabs  
- V1 / V2 / V3 preserved  
- Artifact downloaded · SHA-256 · 1080×1920 · 15–30s · h264 · audio present  

**qaPass / customerReady / certified remain false.** Do **not** grant QA PASS from this report.

---

## History preserved

| Version | Path | SHA-256 |
|---------|------|---------|
| V1 | `docs/launch/kitchen-video-integration-1/artifacts/v1/v2-rtu-short-video_video-int-1-cedar-lane_wp-v1_sb-v1.mp4` | `895c12c2d0adaad1d3a5c4fd2867f69a6e410a60faa4158bcaeb2d3238c633bf` |
| V2 | `docs/launch/kitchen-video-integration-1/artifacts/v2/v2-rtu-short-video_video-int-1-cedar-lane_wp-v2_sb-v2.mp4` | `57817cdf40c34b472f77abcfcdbd301efb84d41a586804da0b02434c0fbb066d` |
| V3 | `docs/launch/kitchen-production-cert-video-1/artifacts/v3/v2-rtu-short-video_cert-video-1-cedar-lane_wp-v3_sb-v3.mp4` | `15f2ffff4dcc2a44ac599c66b9234bc9b4625f8b22f34caedfee94d9bdfed154` |
| V4 | `docs/launch/kitchen-production-cert-video-1/artifacts/v4/v2-rtu-short-video_cert-video-1-cedar-lane_wp-v4_sb-v4.mp4` | `1c674130ba412751d5f5d0288426fac40e164925badec60519a6296437719fe8` |

Work packet: `docs/launch/kitchen-production-cert-video-1/work-packet/work-packet-v4.json` (`wp-v4` / `sb-v4`)

---

## Tests / result

`npx vitest run src/lib/studio-kitchen-production/video-cert/video-cert.test.ts src/lib/studio-kitchen-production/video-integration/video-integration.test.ts` → **12 passed**

---

## Git state

- Branch: `kitchen/production-cert-video-1` (tip base sealed integration `40a487b`; working tree dirty — uncommitted cert work)  
- **No commit**  
- **No push**  

---

## Owner action

Watch the exact V4 MP4 **with sound**. Judge whether visuals now track the major narration beats.

Do **not** treat Scout machine QA as certification.
