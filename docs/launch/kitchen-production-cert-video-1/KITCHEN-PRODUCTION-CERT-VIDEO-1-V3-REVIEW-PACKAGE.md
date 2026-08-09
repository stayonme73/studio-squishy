# KITCHEN-PRODUCTION-CERT-VIDEO-1 — V3 REVIEW PACKAGE

**Verdict:** `V3 CANDIDATE READY FOR OWNER VISUAL REVIEW — NOT CERTIFIED`  
**Environment:** Shotstack **Production (v1)**  
**Git:** No commit · No push  

---

## Exact V3 artifact (for Owner visual review)

| Field | Value |
|-------|--------|
| Path | `docs/launch/kitchen-production-cert-video-1/artifacts/v3/v2-rtu-short-video_cert-video-1-cedar-lane_wp-v3_sb-v3.mp4` |
| Render ID | `1ef43f78-f5b9-4fe8-aebf-04392fb5b223` |
| SHA-256 | `15f2ffff4dcc2a44ac599c66b9234bc9b4625f8b22f34caedfee94d9bdfed154` |
| Bytes | `6564096` |
| Duration | `21.48s` |
| Dimensions | `1080×1920` |
| Video codec | `h264` |
| Audio | present (`hasAudio=true`) |
| QA state | **QA READY only** |
| customerReady / certified / qaPass | **false / false / false** |

Upload **this exact file** for Manager visual inspection. Do not substitute another hash.

---

## Production vs Sandbox

| Item | State |
|------|--------|
| Render environment | **Production / v1** |
| Sandbox watermark source | Not used for V3 |
| Purchase occurred | **No** |
| Tagia editing/rendering | **No** |

Watermark absence must still be confirmed by **Owner eyes** on the exact MP4 (machine QA cannot OCR frames).

---

## Exact correction list (applied)

1. **Watermark:** Production `v1` render (not stage).  
2. **Duplicate scene copy:** Scenes 1–3 use plate-embedded captions only — no Shotstack text overlay of the same strings.  
3. **Single CTA:** `Book your visit today` only; obsolete `Book a visit` removed from endcard plate + overlays.  
4. **CTA contrast:** Overlay color `#1F4A44` (dark teal), not white-on-cream.  
5. **End-card timing:** Certified voice MP3 = **39.43s** (fills/exceeds video). Hold trimmed 8s → **~6.5s** for pacing (total **21.48s**). Not post-VO silence.

---

## Machine QA (deterministic — not visual PASS)

All checks **ok** in `artifacts/v3-machine-qa.json` / `artifacts/v3-run-summary.json`:

- production env v1  
- no duplicate overlays for scenes 1–3  
- single primary CTA overlay  
- obsolete CTA absent  
- CTA contrast config ≠ white  
- V1 + V2 preserved  
- artifact downloaded · SHA-256 · 1080×1920 · 15–30s · h264 · audio present  

**qaPass / customerReady / certified remain false.**

---

## Voice binding

| Field | Value |
|-------|--------|
| Path | `docs/launch/kitchen-production-cert-voice-1/artifacts/cert-voice-1-cedar-lane/ap-001_cert-voice-script-v1_d283144563a6.mp3` |
| SHA-256 | `d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4` |
| Regenerated | **No** |

Listening / sync quality = **Owner review** (not inferred).

---

## History preserved

| Version | Path | SHA-256 (prefix) |
|---------|------|------------------|
| V1 | `kitchen-video-integration-1/artifacts/v1/…wp-v1….mp4` | `895c12c2…` |
| V2 | `kitchen-video-integration-1/artifacts/v2/…wp-v2….mp4` | `57817cdf…` |
| V3 | `kitchen-production-cert-video-1/artifacts/v3/…wp-v3….mp4` | `15f2ffff…` |

---

## Readiness

`v2-rtu-short-video` remains:

**INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED**

---

## Git state

- Branch: `kitchen/production-cert-video-1`  
- **No commit**  
- **No push**  

---

## Owner next action

1. Open/upload the exact V3 path above.  
2. Watch for: watermark, duplicate text, single CTA, contrast, pacing, brand, A/V sync, customer-worthiness.  
3. Return **PASS** or **CORRECTION REQUIRED** (V4).  

---

**READY FOR OWNER REVIEW**

Scout **PARKED** pending visual certification decision.
