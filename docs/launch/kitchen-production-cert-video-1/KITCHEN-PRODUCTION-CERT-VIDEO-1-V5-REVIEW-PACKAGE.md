# KITCHEN-PRODUCTION-CERT-VIDEO-1 — V5 REVIEW PACKAGE

**Owner close:** `CUSTOMER READY WITH LIMITS — MP4`  
**Visual/message quality:** `PASS WITH MINOR TIMING LIMIT`  
**Further cert renders:** **NOT AUTHORIZED**  
**Environment:** Shotstack **Production (v1)**  
**Correction focus:** SKU-appropriate narration → actual audio timing → visual sync  
**Git:** No commit · No push (unless Owner requests seal)  

See `KITCHEN-PRODUCTION-CERT-VIDEO-1-FINALIZATION.md` · `PRODUCTION-QA-AV-SYNC.md`.  


---

## Exact final narration

**scriptId:** `cert-video-narration`  
**scriptVersionId:** `cert-video-narration-v1`

### Approved text
```
Cedar Lane Studio. Refresh your portrait for $99 when you book by May 3rd, 2026. Sessions begin at 10:30 AM. Call (555) 018-4421 or visit cedar-lane-studio.example/book. Book your visit today.
```

### Generation text (TTS spoken forms)
```
Cedar Lane Studio. Refresh your portrait for ninety-nine dollars when you book by May third, twenty twenty-six. Sessions begin at ten thirty in the morning. Call five five five, zero one eight, four four two one, or visit cedar lane studio dot example slash book. Book your visit today.
```

**Removed vs voice-cert fixture:** certification fixture / internal test language · pronunciation-test tail · any non-SKU message content.  
**Voice-cert evidence preserved unchanged** (`cert-voice-script-v1` / SHA `d283144563a6…`).

Records:  
`docs/launch/kitchen-production-cert-video-1/narration/APPROVED-SCRIPT-v1.md`  
`docs/launch/kitchen-production-cert-video-1/narration/GENERATION-SCRIPT-v1.md`  
`docs/launch/kitchen-production-cert-video-1/artifacts/voice/BINDING-MANIFEST-v1.json`

---

## New voice artifact (ElevenLabs — certified path)

| Field | Value |
|-------|--------|
| Provider | `elevenlabs` |
| Model | `eleven_multilingual_v2` |
| Voice ID | `21m00Tcm4TlvDq8ikWAM` |
| Output format | `mp3_44100_128` |
| Provider request ID | `kLpm0IPL4Oouh7BeXYfb` |
| Path | `docs/launch/kitchen-production-cert-video-1/artifacts/voice/cert-video-1-cedar-lane/ap-001_cert-video-narration-v1_f0d811bc5d10.mp3` |
| SHA-256 | `f0d811bc5d10490b108fe58edad55d7d97001e799e34534c3e716186f4bf86c7` |
| Bytes | `348622` |
| Duration | **`21.734s`** |
| Fits 15–30s SKU | **Yes** (prefer band ~22–27; natural length accepted) |
| Truncated for video | **No** |

---

## Exact V5 MP4

| Field | Value |
|-------|--------|
| Path | `docs/launch/kitchen-production-cert-video-1/artifacts/v5/v2-rtu-short-video_cert-video-1-cedar-lane_wp-v5_sb-v5.mp4` |
| Shotstack render ID | `9d6ff47e-7b0b-4a7a-8c96-77788a6a21fa` |
| SHA-256 | `6223a8f016f53021172768d1a97b25376b9b18e2421d8bfef29647ecaf51f190` |
| Bytes | `6659088` |
| Duration | **`23.20s`** (VO 21.73s + ~1.5s CTA readability hold — silence pad only; **no VO truncation**) |
| Dimensions | `1080×1920` |
| Video codec | `h264` · 25 fps |
| Audio | `aac` · 48 kHz · stereo |
| Env | Shotstack Production `v1` |
| QA state | **QA READY only** |
| customerReady / certified / qaPass | **false / false / false** |

---

## Scene-to-spoken-beat timing (actual V5)

Method: character-proportional map against **actual** MP3 duration `21.734s`, then +1.5s CTA hold.

| Time range | Spoken beat | Visual / designed text | Caption |
|------------|-------------|------------------------|---------|
| 0.000–1.368s | Cedar Lane Studio. | Brand plate · Cedar Lane Studio | embedded |
| 1.368–4.864s | Refresh your portrait for ninety-nine dollars | Portrait Refresh · **$99** | embedded |
| 4.864–8.435s | when you book by May third, twenty twenty-six. | **Before May 3rd, 2026** | embedded |
| 8.435–11.855s | Sessions begin at ten thirty in the morning. | **Sessions from 10:30 AM** | embedded |
| 11.855–19.986s | Call … / visit cedar-lane-studio.example/book | **(555) 018-4421** · URL | embedded |
| 19.986–23.234s | Book your visit today. (+hold) | **Book your visit today** | overlay (single CTA) |

V4 visual architecture retained (offer / deadline / sessions / contact / CTA plates). Brand plate support line cleaned of certification-fixture wording for V5.

---

## Confirmations

| Check | State |
|-------|--------|
| No audio truncation of SKU narration | **Yes** — mp4 `23.20s` ≥ voice `21.73s` |
| Certification-only narration removed | **Yes** |
| V1–V4 preserved | **Yes** |
| Tagia editing/rendering | **No** |
| Stock / music | **None** |
| Watermark env | Production `v1` (Owner eyes still confirm) |
| Shotstack credits | Not returned on job record |

---

## Machine QA

All checks **ok** in `artifacts/v5-machine-qa.json` / `artifacts/v5-run-summary.json`, including:

- Production env · single CTA · no duplicate overlays  
- Brand / $99 / deadline / 10:30 / contact / CTA beats present  
- SKU narration duration band · not bound to 39s voice-cert SHA  
- Timeline covers full narration · no voice truncation  
- V1–V4 preserved · 1080×1920 · h264 · audio present  

**qaPass / customerReady / certified remain false.**

---

## History preserved

| Version | Path | SHA-256 |
|---------|------|---------|
| V1 | `…/kitchen-video-integration-1/artifacts/v1/…wp-v1….mp4` | `895c12c2…` |
| V2 | `…/kitchen-video-integration-1/artifacts/v2/…wp-v2….mp4` | `57817cdf…` |
| V3 | `…/kitchen-production-cert-video-1/artifacts/v3/…wp-v3….mp4` | `15f2ffff…` |
| V4 | `…/kitchen-production-cert-video-1/artifacts/v4/…wp-v4….mp4` | `1c674130…` |
| V5 | `…/kitchen-production-cert-video-1/artifacts/v5/…wp-v5….mp4` | `6223a8f016f53021172768d1a97b25376b9b18e2421d8bfef29647ecaf51f190` |

Voice cert MP3 still at original path/hash (`d283144563a6…`, ~39.43s).

---

## Readiness (Owner close)

`v2-rtu-short-video`:

**CUSTOMER READY WITH LIMITS — MP4**

Limit: final A/V beat synchronization is mandatory per-artifact QA before delivery.

---

## Git state

- Branch: `kitchen/production-cert-video-1`  
- **No commit**  
- **No push**  

---

## Owner action

Watch the exact V5 MP4 **with sound**. Confirm natural A/V sync for brand → offer → deadline → sessions → contact → CTA.
