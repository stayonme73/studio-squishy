# KITCHEN-VIDEO-INTEGRATION-1 REPORT

**Package:** `KITCHEN-VIDEO-INTEGRATION-1`  
**Branch:** `kitchen/video-integration-1`  
**Status:** READY FOR OWNER REVIEW  

---

## Verdict

```
SHOTSTACK INTEGRATION: PROVEN
```

`v2-rtu-short-video` readiness:

**INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED**

---

## 1. Starting control point

| Item | Value |
|------|--------|
| Sealed selection tip | `fb2c3b8324453480e98ac9e2ca29033a98288389` |
| Selected provider | **SHOTSTACK** |
| CapCut | **CLOSED — OWNER-INDEPENDENCE FAIL** |
| Environment | `stage` |
| Dirty WIP | Untouched |

---

## 2. Shotstack account / API state

| Item | State |
|------|--------|
| Owner stage key in `.env.local` | Present (value never logged/committed) |
| Paid plan purchased by Scout | **No** |
| Secret gitignored | Yes (`.env*`) |

---

## 3. Secret handling

- `SHOTSTACK_API_KEY` / `SHOTSTACK_ENV=stage` in `.env.local` only  
- Not printed in chat, logs, or evidence JSON  
- Server-side adapter only  

---

## 4. Adapter architecture

`src/lib/studio-kitchen-production/video-integration/`

Work packet → Ingest signed upload → Edit API submit → poll → download → persist → SHA-256 → QA READY bind.

---

## 5. Work-packet mapping

| Version | Packet | Correction |
|---------|--------|------------|
| V1 | `work-packet-v1.json` | Baseline 22.5s / CTA “Book a visit” |
| V2 | `work-packet-v2.json` | Longer end-card + CTA “Book your visit today” |

Deterministic: scene order, timing, captions, CTA, certified voice soundtrack, 1080×1920 MP4, no music/stock.

---

## 6. Media-delivery mechanism

Shotstack **Ingest signed upload** for local fixture PNGs + certified MP3.  
No permanent public Studio CDN. Voice SHA verified before upload.

---

## 7. Voice artifact mapping

| Field | Value |
|-------|--------|
| Path | `docs/launch/kitchen-production-cert-voice-1/artifacts/cert-voice-1-cedar-lane/ap-001_cert-voice-script-v1_d283144563a6.mp3` |
| SHA-256 | `d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4` |
| Regenerated | **No** |

---

## 8. Live render fixture

Synthetic Cedar Lane · 9:16 · 1080×1920 · captions + CTA · certified voice · no music · no stock · no real customer data.

---

## 9. V1 render evidence

**Authoritative bound V1 (restored):** first live V1 (`8bec1930-…` / hash `c86513f2…`) was accidentally overwritten by a mock unit-test write; Scout immediately re-rendered V1 from the same work packet. Unit test now uses an isolated fixture path. **Bound V1 below is the restored live Shotstack MP4.**

| Field | Value |
|-------|--------|
| Provider render ID | `311fa267-f228-4b1f-bd71-fa4b5a1a78b4` |
| Status | `done` |
| Local path | `docs/launch/kitchen-video-integration-1/artifacts/v1/v2-rtu-short-video_video-int-1-cedar-lane_wp-v1_sb-v1.mp4` |
| Bytes | `7105903` |
| Duration | `22.48s` |
| Dimensions | `1080×1920` |
| Frame rate | `25` |
| Codec | `h264` |
| SHA-256 | `895c12c2d0adaad1d3a5c4fd2867f69a6e410a60faa4158bcaeb2d3238c633bf` |
| QA state | `qa_ready` |
| customerReady / certified / qaPass | **false / false / false** |

Prior first-pass render ID retained in `artifacts/v1/render-job-8bec1930-….json` for audit; binding manifest matches restored hash.

---

## 10. Correction selected

Machine-driven V2 work packet (Tagia did not edit):

- Extend scene 4 hold for CTA legibility  
- CTA text: `Book a visit` → `Book your visit today`  
- V1 preserved on disk  

---

## 11. V2 render evidence

| Field | Value |
|-------|--------|
| Provider render ID | `4c5b5653-7fbe-46d1-9211-3c3b09baf6bf` |
| Status | `done` |
| Local path | `docs/launch/kitchen-video-integration-1/artifacts/v2/v2-rtu-short-video_video-int-1-cedar-lane_wp-v2_sb-v2.mp4` |
| Bytes | `7171724` |
| Duration | `23.00s` |
| Dimensions | `1080×1920` |
| Frame rate | `25` |
| Codec | `h264` |
| SHA-256 | `57817cdf40c34b472f77abcfcdbd301efb84d41a586804da0b02434c0fbb066d` |
| Different hash from V1 | **Yes** |
| QA state | `qa_ready` |
| customerReady / certified / qaPass | **false / false / false** |

---

## 12. Shotstack credit usage

| Item | Value |
|------|--------|
| Credits field on render response | Not returned in stage response payload (UNVERIFIED exact debit) |
| Renders completed | V1 + V2 (2× ~22–23s @ 1080p) |
| Paid purchase | **None** |

---

## 13. QA state

Both artifacts: **QA READY** only.  
Human visual/content review = next package. No QA PASS / CUSTOMER READY / CERTIFIED.

---

## 14. Artifact-binding records

- `artifacts/v1/...binding.json`  
- `artifacts/v2/...binding.json`  
- `artifacts/v1/render-job-8bec1930-….json`  
- `artifacts/v2/render-job-4c5b5653-….json`  
- `artifacts/live-run-summary.json`  

Bound fields include campaign/SKU/packet/storyboard/script/source hashes/voice hash/dimensions/duration/path/SHA-256/QA state.

---

## 15. Failure / retry behavior

Implemented: queued/fetching/rendering/saving/done/failed/timed_out/download_failed; bounded submit/poll/download retries; no unlimited auto-resubmit.

---

## 16. Security findings

- Key server-side only; gitignored  
- Evidence JSON omits secrets  
- Provider output URLs treated as ephemeral; Studio copy persisted  
- Fixture-only assets  

---

## 17. Tests / result

- `video-integration.test.ts` — mocked path (10 tests)  
- Production capability / video-production tests updated for Shotstack primary tool  

---

## 18. Stock status

**STOCK MEDIA = UNRESOLVED** (unused)

## 19. Music status

**MUSIC = UNRESOLVED** (unused)

---

## 20. `v2-rtu-short-video` exact readiness

**INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED**

Primary tool: Shotstack (`partial_adapter`). CapCut remains closed FAIL (optional/historical only).

---

## 21. Backtrack impact

| Area | Impact |
|------|--------|
| CapCut | Still closed FAIL |
| Voice cert | Untouched; hash reused |
| Scope / price | Untouched |
| Customer readiness | Not granted |

---

## 22. Git state

- Branch: `kitchen/video-integration-1`  
- **No commit**  
- **No push**  
- Awaiting Owner review of evidence  

---

## 23. Exact next package

**KITCHEN-PRODUCTION-CERT-VIDEO-1**

Visual/content/listening review of exact bound Shotstack MP4(s), correction verification, customer-readiness decision.  
Do **not** start until this integration package is sealed.

---

**READY FOR OWNER REVIEW**

Scout **PARKED** — live integration complete.
