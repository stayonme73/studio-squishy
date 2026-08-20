# Room 4B continuation walk — draft notes

**Package:** `STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1`  
**Status:** PARK for Manager — package remains OPEN until professional creative is certified.  
**Do not start Room 5. Do not commit from this note. Do not merge.**

**Campaign id:** `nia-r4b-live-1787184976955`  
**Recorded:** 2026-08-19 (continuation after customer-surface + short-video wire fixes)  
**Evidence:** `room-4b-launch-toolbox-continuation-evidence.json`  
**Main evidence:** parent `../room-4b-launch-toolbox-evidence.json` updated with `continuation` section (prior park preserved).

---

## Totals

| | Count |
|--|------:|
| PASS | **32** |
| FAIL | **0** |
| BLOCKED | **0** |
| Total | 32 |

Automated pipeline/admission/ops walk: green. Owner visual inspection of creative still required before any READY FOR LAUNCH claim.

---

## Customer art leaks

**Leaks gone on declared PNG text (this run):** YES.

- Scanned **3** design-spec siblings (flyer + promo set + social set).
- `assertNoInternalLeakInCustomerText` / `FORBIDDEN_CUSTOMER_ART_FRAGMENTS`: **no hits**.
- Prior park (`nia-r4b-live-1787183222186`) still showed Voice brief / purpose chrome / Post N of 4 on declared text — those fragments are absent on this continuation’s specs.

---

## Short video Review path

| Step | Result |
|------|--------|
| Deliberate Shotstack fail | PASS (`PACKET_INVALID`) |
| Live vertical MP4 (Shotstack + ElevenLabs) | PASS (~24.84s) |
| `attachShortVideoArtifactToCustomerJob` | PASS — spine `ready_for_review` with review_proof MP4 |
| Video timing feedback (`request_revision`) | PASS |
| `reproduceShortVideoAfterRevision` (`runPipeline: true`) | PASS |

**Revised video**

- Path: `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation/video/nia-fall-reset-1787184976955-rev-timing.mp4`
- SHA-256: `ceb65a0c9a0248c7365b36da130af8b9e9b165f00deb63884615ca1587294d29`
- Artifact copy: `continuation/artifacts/nia-fall-reset-video-v2-timing.mp4`
- Adjusted packet: `continuation/video/work-packet-nia-v1-rev-timing.json` (also copied under artifacts)

**V1 video**

- Path: `continuation/video/nia-fall-reset-1787184976955.mp4`
- SHA-256: `5465975d82d3c13278d617f14b9c8247fd2a2f46ed02d25e548efd2e07c38621`
- Artifact copy: `continuation/artifacts/nia-fall-reset-video.mp4`

---

## Key artifact paths

Under `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation/artifacts/`:

- `nia-flyer-v1.png` / `nia-flyer-v1.pdf` / `nia-flyer-v2.png`
- `nia-promo-graphic-a.png`
- `nia-social-post-1.png` (+ `renders-social-post-1..4.png`, `renders-campaign-graphic-a/b.png`)
- `nia-fall-reset-video.mp4` / `nia-fall-reset-video-v2-timing.mp4`
- `copy/nia-fall-reset-promotional-email.txt` / `copy/nia-fall-reset-social-captions.txt`
- `work-packet-nia-v1-rev-timing.json`

---

## Carousel

Decision B from `src/lib/studio-room-4b-launch-toolbox/carousel-decision.ts`: **NOT ON LAUNCH MENU** (`B_REMOVE_FROM_LAUNCH_NOW_MENU`). Walk admission check PASS.

Classification labels used: **READY FOR LAUNCH** | **READY WITH EXPLICIT LIMITS** | **NOT ON LAUNCH MENU** only.

---

## Tool gaps / notes for Manager

1. **Flyer v1 vs v2 PNG hash identical** (`33062c164840…`) on this run — intake revision note stored and check soft-passed, but design renderer did not mint a visibly different flyer byte set. Creative revision path for flyer still weak for “old not current” proof by hash alone.
2. **Voice multi-SKU honesty** — after deliberate video fail, customer Voice still answered with generic “You can review it now” (flyer-level eligibility). Attach later opened real video Review; Voice wording across multi-SKU jobs remains a quality gap.
3. **Social trust post / price** — first continuation attempt failed set QA (`Brand-trust post carries campaign price`). Fixed narrowly: strip price from social `offerName`/`headline` in `map-social-job-truth.ts`; Nia `postsAbout` sentence order adjusted. Re-run then rendered social PASS with leak scan clean.
4. **Revision rounds** — walk sets `revisionRoundsIncluded: 2` so flyer + short-video Review revisions can both run in one campaign cert (honest multi-SKU). Do not treat as a new sold product rule without Manager call.
5. **Owner visual inspection still required** — automated PASS ≠ professional creative. Package stays OPEN / parked.

---

## Fixes applied during this continuation (code)

- Walk: continuation output dirs, leak scan, carousel decision, attach + reproduce beats, evidence merge.
- `map-social-job-truth.ts`: brand-safe offer name/headline (no embedded price on trust post).
- `reproduce-short-video-after-revision.ts`: revised export path `*-rev-timing.mp4`.
- `nia-fixture.ts`: clearer `postsAbout` sentence split so offer name is not `$297`.
