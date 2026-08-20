# Room 4B continuation-v2 — composition notes

**Package:** `STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1`  
**Purpose:** Re-dispatch flyer + promo + social after mapper composition fixes (business name vs campaign title, short CTA, offer headline).  
**Status:** PARK for Manager — package remains OPEN until professional creative is certified.  
**Do not start Room 5. Do not commit from this note. Do not merge.**

**Campaign id:** `nia-r4b-live-1787185497469`  
**Recorded:** 2026-08-19  
**Evidence:** `room-4b-launch-toolbox-continuation-v2-evidence.json`  
**Walk mode:** Fresh design PNGs + leak scan; prior continuation MP4s re-attached (no live Shotstack).

---

## Composition check (declared customer art)

| Surface | Business / wordmark | Offer / headline | CTA |
|---------|---------------------|------------------|-----|
| Flyer | Rooted & Ready Wellness Studio | Fall Reset | Enroll in Fall Reset |
| Promo set | Rooted & Ready Wellness Studio | Fall Reset | Enroll in Fall Reset |
| Social set | Rooted & Ready Wellness Studio | Fall Reset | Enroll in Fall Reset |

Campaign title (`Fall Reset Launch Campaign`) is **not** used as the wordmark. Offer stays **Fall Reset**. CTAs are short customer-facing strings.

---

## Leak scan

**Clean:** YES — scanned **3** design-spec siblings (flyer + promo set + social set).  
`FORBIDDEN_CUSTOMER_ART_FRAGMENTS` / `assertNoInternalLeakInCustomerText`: **no hits**.

---

## Fresh PNG paths (continuation-v2)

Primary copies under `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/`:

| Artifact | Path |
|----------|------|
| Flyer v1 | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-flyer-v1.png` |
| Flyer v1 PDF | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-flyer-v1.pdf` |
| Flyer v2 (post-revision copy) | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-flyer-v2.png` |
| Promo graphic A | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-promo-graphic-a.png` |
| Social post 1 | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-social-post-1.png` |
| Promo render A | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/renders-campaign-graphic-a.png` |
| Promo render B | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/renders-campaign-graphic-b.png` |
| Social renders 1–4 | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/renders-social-post-1.png` … `renders-social-post-4.png` |

**Fresh vs prior continuation:** flyer / promo / social primary PNGs differ in SHA-256 from `continuation/artifacts/` (mapper re-render confirmed).

Renderer sources (same campaign):

- Flyer PNG: `data/campaign-design-artifacts/nia-r4b-live-1787185497469/dd_nia-r4b-live-1787185497469_v2-rtu-flyer/renders/v1/flyer.png`
- Flyer design-spec: `data/campaign-design-artifacts/nia-r4b-live-1787185497469/dd_nia-r4b-live-1787185497469_v2-rtu-flyer/renders/v1/design-spec.json`
- Promo set spec: `data/campaign-design-artifacts/nia-r4b-live-1787185497469/dd_nia-r4b-live-1787185497469_v2-rtu-promotion-graphics/renders/v1/campaign-set-design-spec.json`
- Social set spec: `data/campaign-design-artifacts/nia-r4b-live-1787185497469/dd_nia-r4b-live-1787185497469_v2-rtu-social-posts/renders/v1/campaign-set-design-spec.json`

---

## Video (reattached — not re-rendered)

| Role | Path |
|------|------|
| V1 MP4 | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/video/nia-fall-reset-1787185497469.mp4` |
| Timing revision MP4 | `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/video/nia-fall-reset-1787185497469-rev-timing.mp4` |
| Artifact copies | `continuation-v2/artifacts/nia-fall-reset-video.mp4`, `nia-fall-reset-video-v2-timing.mp4` |

Source reuse: prior `continuation/video/nia-fall-reset-1787184976955(.mp4|-rev-timing.mp4)`.

---

## Walk totals

| | Count |
|--|------:|
| PASS | **32** |
| FAIL | **0** |
| BLOCKED | **0** |

Owner visual inspection of creative still required before any READY FOR LAUNCH claim.
