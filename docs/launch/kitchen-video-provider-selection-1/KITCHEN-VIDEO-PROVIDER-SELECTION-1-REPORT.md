# KITCHEN-VIDEO-PROVIDER-SELECTION-1 REPORT

**Package:** `KITCHEN-VIDEO-PROVIDER-SELECTION-1`  
**Mode:** Selection only — no provider integration, no account purchase, no CapCut reopen  
**Branch:** `kitchen/video-provider-selection-1`  
**Status:** READY FOR OWNER REVIEW  

---

## 1. Starting Control Point

| Item | Value |
|------|--------|
| Branch from | `7377c47` (`KITCHEN-VIDEO-OPERATIONAL-1`) |
| Full tip | `7377c47a4717a715cf19f233cfa09f5ed1314550` |
| CapCut owner-independence | **FAIL** (sealed — do not reopen) |
| Active service | `v2-rtu-short-video` |
| Dirty WIP | Protected / untouched |

### Sealed chain (control)

| Package | Tip |
|---------|-----|
| KITCHEN-FOUNDATION-1 | `c640e8c` |
| KITCHEN-COMMS-1 | `d926a23` |
| KITCHEN-PRODUCTION-CAPABILITY-1 | `9083bf4` |
| KITCHEN-PRODUCTION-CERT-COPY-1 | `cfff55d` |
| KITCHEN-PRODUCTION-CERT-DESIGN-1 | `664af4c` |
| KITCHEN-VOICE-PRODUCTION-1 | `48d61c4` |
| KITCHEN-VOICE-INTEGRATION-1 | `eb96045` |
| KITCHEN-PRODUCTION-CERT-VOICE-1 | `5348ba7` |
| KITCHEN-VIDEO-PRODUCTION-1 | `cb775d8` |
| KITCHEN-VIDEO-OPERATIONAL-1 | `7377c47` |

Scout began ACTIVE on this package and parks only after selection is complete.

---

## 2. Replacement Requirements

Baseline: `docs/launch/kitchen-video-operational-1/REPLACEMENT-CAPABILITY-SPEC.md`

Hard requirements applied as elimination gates:

- Programmatic / API-controlled execution  
- No routine human editor  
- Studio-provided image/video assets  
- Deterministic scene ordering  
- Text overlays / captions / CTA  
- Certified MP3 audio input  
- 9:16 output · 1080×1920 target · 15–30s · MP4  
- Cloud / server-accessible execution  
- Commercial-use suitability (documented terms; not legal advice)  
- Retrievable final artifact · persistence / SHA-256 binding  
- Repeatable correction / regeneration  
- Owner-independent operation  

Service scope not expanded. Contract remains: one basic short video, captions + CTA, one revision, customer posts, no filming.

---

## 3. Provider Candidates

Evaluated (minimum set):

1. **Creatomate**  
2. **Shotstack**  
3. **JSON2Video**  

No fourth candidate added. No CapCut. No affiliate/SEO/YouTube/Reddit as primary proof.

Research standard: current first-party docs. Gaps marked **UNVERIFIED**.

---

## 4. Hard-Gate Matrix

| Gate | Creatomate | Shotstack | JSON2Video |
|------|------------|-----------|------------|
| Programmatic production | PASS | PASS | PASS |
| Scene / timeline control | PASS | PASS | PASS |
| Captions / text | PASS | PASS | PASS |
| External certified MP3 | PASS | PASS | PASS |
| MP4 · 9:16 · 1080×1920 target | PASS | PASS | PASS |
| 15–30s output | PASS | PASS | PASS |
| Artifact retrieval | PASS | PASS | PASS |
| Regeneration | PASS | PASS | PASS |
| Commercial-use path | PASS | PASS | PASS* |
| No routine human editor | PASS | PASS | PASS |
| **Overall** | **PASS** | **PASS** | **PASS** |

\*JSON2Video commercial path requires a **paid** plan for client deliverables; free plan is non-commercial + may watermark. That is still a PASS for “path exists,” not a free-tier PASS for customer delivery.

Any hard FAIL would eliminate regardless of score. None eliminated.

---

## 5. Owner-Independence Evidence

### Creatomate — PASS

- REST `POST https://api.creatomate.com/v2/renders` with `Authorization: Bearer` API key.  
- Template + modifications **or** full RenderScript JSON (no human editor required).  
- Documented Make / Zapier / n8n automation paths.  
- Source: [Create a Render](https://creatomate.com/docs/api/reference/create-a-render), [RenderScript quick start](https://creatomate.com/docs/api/quick-start/create-a-video-by-render-script).

### Shotstack — PASS

- Cloud Edit API: JSON `timeline` + `output`; described as code-based editing without a desktop editor for the render path.  
- Submit render → async status → output URL.  
- Source: [Core concepts](https://shotstack.io/docs/guide/getting-started/core-concepts/), [API reference](https://shotstack.io/docs/api/).

### JSON2Video — PASS

- REST `POST https://api.json2video.com/v2/movies` with `x-api-key`.  
- Movie JSON scenes/elements; poll `GET /v2/movies?project=…`; optional webhook export destination.  
- Source: [Create movie](https://json2video.com/docs/v2/api-reference/api-endpoints/movies), [Generic HTTP](https://json2video.com/docs/v2/guides/no-code/generic-http).

---

## 6. Render / MP4 Capability

| Provider | MP4 | Vertical / size | Notes | Source |
|----------|-----|-----------------|-------|--------|
| Creatomate | `output_format: mp4` | `width` / `height` (e.g. 1080×1920) | RenderScript examples use explicit dimensions | Creatomate RenderScript quick starts |
| Shotstack | `output.format: mp4` | `aspectRatio: "9:16"` and/or `output.size.width/height` | Custom size must be even; 1080p on standard plans | Shotstack API + crop/resize guide |
| JSON2Video | Returns MP4 URL | `resolution: "instagram-story"` or `custom` + width/height | Plan max resolution applies | Movie JSON syntax |

Duration 15–30s: all three accept second-level timeline/scene durations — **PASS**.

---

## 7. Scene / Caption / CTA Control

| Control | Creatomate | Shotstack | JSON2Video |
|---------|------------|-----------|------------|
| Scene order | Element tracks / compositions timed in RenderScript | Tracks + clips with `start` / `length` | `scenes[]` order |
| Scene duration | Element `duration` / time | Clip `length` | Scene/element `duration` |
| Images / video | `image` / `video` `source` URLs | `image` / `video` `src` URLs | `image` / `video` `src` |
| Text / captions | `text` elements; transcript helpers exist | `text` assets with font/alignment | `text` / `subtitles` elements |
| Transitions | Animations / transitions in RenderScript | Clip `transition` in/out | Scene/element transitions (docs) |
| CTA placement | Positioned text (or template named element) | Positioned text clip | Positioned text element |

**Recommended build model for winner (Shotstack):** fully programmatic timeline from Studio work packet (hybrid later if Shotstack templates prove useful for brand locks).  
**Creatomate best model:** hybrid — locked brand template + API modifications for images/text/audio.  
**JSON2Video best model:** scene-based programmatic movie JSON (maps cleanly to work packets).

---

## 8. Certified MP3 Input Compatibility

| Provider | External MP3 | Volume / timing | Source |
|----------|--------------|-----------------|--------|
| Creatomate | Audio element `source` URL (MP3 demonstrated) | `time`, `duration`, fade props documented | [Audio element](https://creatomate.com/docs/api/render-script/audio-element) |
| Shotstack | Timeline `soundtrack.src` MP3 URL; audio clips also supported in API model | Soundtrack `volume` / effects; clip timing via `start`/`length` | API reference + core concepts |
| JSON2Video | Audio element `src` URL (MP3/WAV) | `volume`, `seek`, loop | [Audio element](https://json2video.com/docs/v2/api-reference/json-syntax/element/audio) |

Studio path for cert: host/serve sealed voice MP3 (hash-bound) via URL the provider can fetch — **compatible for all three**.  
Studio should continue to own the exact MP3 bytes + SHA-256; provider only mixes.

---

## 9. Artifact Retrieval / Binding Fit

| Provider | Retrieval | Persistence note | Binding fit |
|----------|-----------|------------------|-------------|
| Creatomate | Render object URL when succeeded; webhook | Hosted **≤30 days** then deleted — copy immediately | Strong if Studio downloads + hashes on success |
| Shotstack | Render status returns output URL; `callback` webhook | Treat URL as ephemeral pickup | Strong — same bind pattern as Kitchen video ops |
| JSON2Video | `movie.url` on completion; webhook destination | Docs: render URL pickup **7 days**; do not use as public CDN | Strong — must persist immediately |

All three support programmatic download → Studio persist → SHA-256 → campaign/SKU/work-packet bind.

---

## 10. Correction / Regeneration Fit

All three: submit a new job definition → new render → new artifact URL.  
None require a human editor for correction.

Studio contract (unchanged): preserve V1 bind; V2 = new job + new hash.  
JSON2Video notes `POST /v2/movies` is not idempotent (each call = new project) — acceptable for versioned regeneration.

---

## 11. Commercial-Use / Licensing Findings

**Not legal advice.** Documented terms only.

| Provider | Finding | Source |
|----------|---------|--------|
| Creatomate | Terms: user responsible for input legality; platform positioned for automated marketing/production videos. Exact “client deliverable” phrasing less explicit than JSON2Video — treat as suitable API SaaS path with user content responsibility. | creatomate.com/terms |
| Shotstack | Terms of Service + Acceptable Use for API business use; 1080p on standard plans. Commercial API product. | shotstack.io/legal/terms-of-service |
| JSON2Video | **Clearest:** paid plans = commercial use, no watermark; free plan = non-commercial + may watermark; ownership of renders with user. | [Content ownership](https://json2video.com/docs/v2/reference/content-ownership) |

Stock/music rights remain separate: Studio-controlled media + certified voice is the first cert path.

---

## 12. Cost / Trial Findings

### Creatomate

- Free trial: **50 credits**, no credit card ([pricing](https://creatomate.com/pricing)).  
- Essential: **$54/mo**, 2,000 credits ([how pricing works](https://creatomate.com/docs/account/how-does-the-pricing-work)).  
- Credits: `(width × height × fps × duration) / 100_000_000` ([credit formula](https://creatomate.com/docs/account/how-are-credits-calculated)).  
- Example Studio target 1080×1920 × 30 fps × 25 s ≈ **15.6 → ~16 credits** per render.  
- Trial ≈ **~3** such test renders.  
- Renders deleted after **30 days**.  
- Watermark: not documented as a free-trial watermark gate in the pages reviewed — **UNVERIFIED** if any trial watermark exists beyond credit limits.

### Shotstack

- Start: **10 free credits**, valid **30 days** ([pricing FAQ](https://shotstack.io/pricing)).  
- **1 credit = 1 minute**; 30s ≈ **0.5 credit** (rounded to the second).  
- PAYG ≈ **$0.30/min**; subscription from ≈ **$0.20/min** ($39/mo tier listed).  
- Likely cost for 15–30s: about **$0.05–$0.15** PAYG, or ~**0.25–0.5 credit**.  
- Developer sandbox included on plans.  
- 1080p on standard plans.  
- Test certification can start **without a major subscription**.

### JSON2Video

- Free: **600 credits**, watermark possible, **non-commercial only** ([plans](https://json2video.com/docs/v2/reference/credits/plans), [ownership](https://json2video.com/docs/v2/reference/content-ownership)).  
- Render: **1 credit/second** at Full HD (30s = 30 credits) ([credit consumption](https://json2video.com/docs/v2/reference/credits/credit-consumption)).  
- Paid tiers (Professional / Startup / Enterprise) remove watermark + unlock commercial use.  
- Exact USD list prices: pricing HTML page returned **404** during research → dollar amounts **UNVERIFIED** from first-party live page; use dashboard/pricing page at purchase time.

---

## 13. Security / Data Handling

Material production facts only (not a full security audit):

| Topic | Creatomate | Shotstack | JSON2Video |
|-------|------------|-----------|------------|
| Auth | Bearer API key (server-side) | API key (stage/prod) | `x-api-key` |
| Asset ingest | URLs fetched by provider | URLs fetched by provider | URLs / media library |
| Render URL exposure | Hosted download URL (≤30d) | Output URL via status/callback | Pickup URL (~7d); not for public CDN |
| Secret handling | Keep key server-only | Keep key server-only; sandbox vs prod | Dedicated Render-role keys recommended in HTTP guide |
| Customer data | Avoid PII in public asset filenames/URLs | Same | Same |
| Retention/delete | Renders auto-deleted 30d | **UNVERIFIED** exact retention in pages used | Documented short render URL life |

---

## 14. Stock / Music Findings

Unresolved stock/music does **not** block selection. First cert path: Studio media + certified MP3, no BGM.

| Provider | Stock | Music library | Licensing |
|----------|-------|---------------|-----------|
| Creatomate | Not required for API path | Not required | User responsible for inputs (terms) |
| Shotstack | Third-party integrations exist in product surface | Soundtrack often customer-supplied URL | Acceptable Use / ToS; input rights on Studio |
| JSON2Video | Media library; stock not required | Not required for Studio path | Ownership page: input licences travel with output |

Follow-up later if Studio wants licensed stock/music packs.

---

## 15. Scoring Matrix

Scale 0–5. Hard-gate FAIL would override totals (none failed).

| Dimension | Creatomate | Shotstack | JSON2Video |
|-----------|------------|-----------|------------|
| Owner independence | 5 | 5 | 5 |
| API / render capability | 5 | 5 | 5 |
| Deterministic scene control | 5 | 5 | 5 |
| External MP3 support | 5 | 5 | 5 |
| Artifact retrieval / binding fit | 5 | 5 | 5 |
| Branded short-video fit | 5 | 4 | 4 |
| Correction / regeneration fit | 5 | 5 | 5 |
| Implementation simplicity | 4 | 5 | 4 |
| Cost fit | 3 | 5 | 3 |
| Studio architecture fit | 5 | 4 | 4 |
| **Total** | **47** | **48** | **45** |

---

## 16. WINNER

### SELECT: SHOTSTACK

Shotstack earns the replacement engine slot against the replacement spec:

1. All hard gates **PASS** (owner-independent programmatic MP4).  
2. Highest score total (**48**).  
3. Clearest minute/credit economics for 15–30s RTU + free credits sufficient for first integration tests.  
4. Deterministic JSON timeline maps directly to sealed work-packet scene lists.  
5. Soundtrack/external MP3 + webhook/poll + downloadable MP4 support Kitchen bind + SHA-256.  
6. Make & Zapier listed on pricing matrix — optional; direct API preferred if cleaner.

Ledger: `src/lib/studio-kitchen-production/video-provider-selection/`.

---

## 17. Runner-Up

### CREATOMATE

**Why it lost:** Also passes every hard gate and scores highest on branded template / hybrid RenderScript fit. It lost on **cost_fit** and **implementation_simplicity** at Studio’s 1080×1920 target (pixel-based credits ≈16 credits per ~25s @30fps vs Shotstack ≈0.5 credit per 30s), and because Studio already has deterministic work packets that do not require a template-editor step to start.

JSON2Video placed third: solid scene API, but free tier cannot be used for commercial client deliverables, and overall score lowest.

---

## 18. Integration Architecture for Winner

**No implementation in this package.**

Flow:

```
Studio work packet
  → Shotstack provider adapter
  → render job submit
  → render status (poll and/or webhook)
  → artifact download
  → persist exact MP4
  → SHA-256
  → campaign / SKU / work-packet binding
  → QA READY
```

### Proposed environment variables

- `SHOTSTACK_API_KEY`  
- `SHOTSTACK_API_BASE_URL`  
- `SHOTSTACK_ENV` (`stage` | `v1` / prod naming per Shotstack docs at integration time)  
- `SHOTSTACK_WEBHOOK_SECRET` (if callback verification used)  
- `STUDIO_VIDEO_ASSET_BASE_URL`  
- `STUDIO_VIDEO_RENDER_WEBHOOK_URL`  

### Adapter boundary

Suggested home: `src/lib/studio-kitchen-production/video-integration/`  
Owns: work packet → Edit JSON, submit, status, download.  
Does not own: catalog pricing, Studio Voice, CapCut, QA READY business rules (Kitchen bind retains).

### Render job record (fields)

`jobId`, `provider`, `providerRenderId`, `campaignId`, `skuId`, `workPacketId`, `workPacketVersion`, `status`, `submittedAt`, `completedAt`, `failureCode`, `failureMessage`, `requestHash`, `outputUrl`, `retryCount`

### Output artifact record (fields)

`artifactId`, `jobId`, `localPath`, `sha256`, `byteLength`, `mimeType`, `width`, `height`, `durationSeconds`, `container`, `boundAt`, `campaignId`, `skuId`, `workPacketId`

### Failure states

`submit_rejected` · `render_failed` · `render_timeout` · `download_failed` · `probe_failed` · `hash_mismatch_on_retry_compare` · `webhook_auth_failed`

### Retry behavior

- Transient submit/download: backoff retry.  
- Creative correction: new work-packet version → new job → new hash; never overwrite V1 bind.  

### Secret isolation

API key server-only; never log; never browser; treat provider URLs as ephemeral pickup.

---

## 19. Account / Plan Recommendation

**Minimum for next real integration test (do not purchase in this package):**

- Create Shotstack developer account (Owner-authorized when ready).  
- Use **sandbox/stage** API key + included **10 free credits**.  
- Smoke-render 15–30s 1080×1920 MP4 from Studio work-packet assets + certified voice URL.

**Before any customer deliverable:** move to paid PAYG pack or lowest subscription covering commercial 1080p renders.

Do **not** purchase in this package.

---

## 20. Readiness Status

`v2-rtu-short-video` remains:

**BLOCKED / INTEGRATION REQUIRED / NOT CUSTOMER READY / NOT CERTIFIED**

Provider selection alone does not change readiness.

---

## 21. Backtrack Impact

| Area | Impact |
|------|--------|
| CapCut | Remains FAIL; not reopened |
| Sealed Copy / Design / Voice certs | Untouched |
| Studio Voice | Untouched |
| Prices / catalog scope | Untouched |
| Original dirty WIP | Untouched |
| ffmpeg preassembly from VIDEO-OPERATIONAL | Remains signal-only; not the production engine |
| Stock / music | Still unresolved; not blocking |

---

## 22. Exact Next Package

**KITCHEN-VIDEO-INTEGRATION-1**

Authorized only after Owner seals this selection.  
Do **not** execute it in this package.

Scope expectation: Shotstack adapter + render job + download + bind + hash + QA READY wiring for `v2-rtu-short-video` synthetic/cert path — still not customer-ready until cert package succeeds.

---

## 23. Git State

- Branch: `kitchen/video-provider-selection-1` from `7377c47`  
- **No commit**  
- **No push**  
- Selection ledger + report present for Owner review  

---

## Decision line

```
SELECT: SHOTSTACK
```

---

**READY FOR OWNER REVIEW**

Scout **PARKED** — provider selection complete.
