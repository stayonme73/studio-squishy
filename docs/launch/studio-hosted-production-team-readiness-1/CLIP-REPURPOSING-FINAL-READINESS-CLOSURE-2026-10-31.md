# Clip Repurposing — Final Readiness Closure (2026-10-31)

**Assignment:** Close gaps so **deployed Studio Preview** completes the real customer journey without `_tmp` cert scripts, manual DB surgery, or competing chunk drivers.

**Hard boundaries honored:** No Production Shotstack activation, no commits/pushes/merges, no new purchases, no frozen-surface redesign.

---

## What already works (evidence retained)

| Capability | Status | Evidence |
|------------|--------|----------|
| First-cut production 3/3 MP4 | **PASS** | `HOSTED-CLIP-E2E-CERT-36dd199b-CONSOLIDATED-RUN.json`, `hosted-clip-set-mp4-proof-1.mjs` on `disposable-hpt-cert-clip_repurposing-36dd199b` |
| Preview owner auth + Review GET (3 deliverables) | **PASS** | `HOSTED-CLIP-JOURNEY-TAIL-ONLY-RUN.json` (after QA bind) |
| Approve → release → owner download (3× MP4) | **PASS** | `HOSTED-CLIP-JOURNEY-APPROVE-ONLY-RUN.json`, `HOSTED-CLIP-FINAL-DOWNLOAD-PROOF-RUN.json` |
| Stranger final download | **PASS — HTTP 403** | `HOSTED-CLIP-FINAL-DOWNLOAD-PROOF-RUN.json` |
| Single DO worker HTTP step (no self-chain) | **Implemented** | `scripts/hosted-clip-droplet-worker-http-1.ts` |
| Clip 2 FFmpeg / mux root cause | **Corrected in tree** | `live-factory.ts`, `caption-burn.ts` (worker path + durable checkpoints) |

**Not SELL NOW:** Prior E2E used cert scripts for QA auth, review draft, and set-revision (`end_card_hold` reuse). Pinned Preview `dpl_9HQC72wZVk9AW99sUHVoSwyUpiSL` does not yet run this closure commit.

---

## Defects corrected in application code (local tree — deploy pending)

1. **Launch menu — included set revision**
   - Preview/worker: revision lane receipt check; worker kick when `revision_requested`.
   - Non-preview: inline `reproduceClipRepurposingAfterRevision` with mapped `SetRevision`.
   - **New:** `resolve-set-revision-from-campaign.ts` maps customer emphasis → `swap_clip` | `cta_change` | `end_card_hold`.

2. **Orchestrator — revision on worker**
   - `tryCompleteHostedClipSetRevision` runs before first-cut chunking when spine is `revision_requested`.

3. **Review bind — no manual DB**
   - Hydrate durable MP4s (`clipFactoryScopedRender: false`) before present.
   - Open editable review draft after `revision_ready_again` bind.

4. **Continue launch-menu chain — no 500 re-wake**
   - Bind-only path when production + QA already satisfied and no pending set revision.

5. **End-card hold revision**
   - `forceNewRender` + `ctaHoldSeconds` passed into caption burn for `end_card_hold`.

6. **TypeScript / build**
   - Fixed union typing on hook `attempts` (observer + orchestrator).

---

## Session result (2026-10-31 final-readiness continuation)

| Check | Result |
|-------|--------|
| **`dpl_3UJMk5VKJS1v9dy7tFvNmPfnkYn3`** | **FAILED** — `● Error`, reason: *internal Vercel error* after ~28m remote build (not a compile/TS failure). |
| **Redeploy `dpl_Cu4D7KM2zofY7yCRaXiEEevSwiuc`** | **FAILED** — same internal error after ~27m build from integrated local tree via `vercel deploy --yes`. |
| **Local `npm run build`** | **PASS** (integrated tree). |
| **Local `vercel build` → prebuilt** | **FAIL** — `EPERM` creating function symlink on Windows (`deliverables.func` → `studio-board.func`). Junctions work; Vercel CLI requires symlinks. |
| **DO SSH + worker** | **PASS** — `studio-do-ed25519`, worker health, cloudflared tunnel, code tar-sync, `worker.env` (16 keys), Preview env vars synced. |
| **Fresh disposable E2E on integrated Preview** | **NOT RUN** — no Ready deployment runs closure code. Last Ready: `dpl_9HQC72wZVk9AW99sUHVoSwyUpiSL` (~20h old). |

Machine-readable: `HOSTED-CLIP-FINAL-READINESS-DEPLOY-STATUS-2026-10-31.json`.

---

## What remains blocked

| Blocker | Owner / infra action |
|---------|----------------------|
| **Preview ship path (gating)** | Pick one: (A) Enable **Windows Developer Mode** (or build on Linux) → `vercel build` + `vercel deploy --prebuilt --yes`; (B) **Authorize commit/push** so Vercel Git deploy may avoid desk symlink limit; (C) **Vercel support** for recurring *internal error* after ~27m successful remote build. Until then, integrated code is **local + DO worker only**. |
| **DO SSH from this desk** | **Resolved** this session with `~/.ssh/studio-do-ed25519`. |
| **Full revision matrix on Preview** | `swap_clip` needs Shotstack on worker (desk ECONNRESET). `cta_change` needs **approved intake CTA** (exact-text QA). Only **`end_card_hold`** fully proven on cert campaign. |
| **Unwatermarked delivery** | Preview uses Shotstack **stage** → `watermarkExpected: true` (`render-env.ts`). Unwatermarked path requires **Production v1 key + explicit authorization** — not activated. |
| **Independent Quality watch** | Machine QA record + attestation in bind; **no substitute for human video/audio inspection** in this closure pass. |

---

## Autonomous production + delivery (target architecture)

```
Preview launch-menu observer
  → HOSTED_CLIP_WORKER_URL POST /run-chunk (one step per request)
  → runHostedClipProductionStep | tryCompleteHostedClipSetRevision
  → continueHostedCertLaunchMenuChain → review bind → customer APIs
```

Competing desk `_tmp-worker-chunk-drive` loops and worker HTTP self-chaining are **out of scope** for routine operation.

---

## Owner-only decisions

1. **Authorize git commit + push** (or Cursor merge) so Preview deployments track the integrated fixes.
2. **Provide DO SSH identity** (`STUDIO_DO_SSH_IDENTITY`) or run one bounded `hosted-clip-droplet-production-drive-1.ts` on droplet after sync.
3. **Production Shotstack / unwatermarked delivery** — separate GO; do not enable from cert closure alone.
4. **SELL NOW stamp** — after one **fresh** disposable campaign completes entirely through **deployed Preview** (production → QA → review → all three revision types where advertised → approve → 403) without `_tmp` scripts.

---

## Recommended next execution slice (authorized Test/Preview)

1. `npx vercel deploy --yes` → note new `dpl_*` and set `HOSTED_CLIP_WORKER_URL` + internal chunk key on Preview env.
2. Arm disposable campaign via existing `hosted-clip-factory-journey-arm-1.mjs` (not a new product purchase).
3. Single driver: DO `hosted-clip-droplet-production-drive-1.ts` OR worker kicks only — no parallel tunnel chunk loops.
4. Customer path via UI/API only: revision request → worker set revision → rebind → approve → `/deliverables` + file-room downloads + stranger 403.
