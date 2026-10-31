# Clip Repurposing — Factory Learning & Lock-In (2026-10-31)

**Purpose:** Record verified defects, corrections, team/runtime updates, regression safeguards, deployment version, and remaining limits for Owner GO Preview git deployment.

**Authorization:** Dedicated Preview branch push only — no merge, Production, SELL NOW, or Production Shotstack.

---

## Verified defects (root cause)

| Defect | Symptom | Root cause |
|--------|---------|------------|
| Clip 2 production stall / bad mux | Set incomplete; FFmpeg failures on worker | Mux/caption path + checkpoint resume; clip 2 window handling |
| Competing production drivers | Double chunk loops, stale IN_PROGRESS | Desk chunk driver + worker self-chain vs single Preview→DO kick |
| Set revision not on worker | Revision requested but no re-render | Orchestrator skipped `tryCompleteHostedClipSetRevision`; Preview observer did not map customer emphasis |
| Review without durable MP4s | Empty review / manual DB hydration | Bind presented scoped renders only; `clipFactoryScopedRender` gate |
| Approve 422 | "Feedback already submitted" | Cert harness left `feedback.submittedAt`; production-resume script clears before approve |
| Launch-menu 500 re-wake | Re-invoke after production satisfied | Continue chain did not bind-only skip when QA + production complete |
| TypeScript build | Vercel/CI fail on observer | Union narrowing on `hooked.attempts` in observer + orchestrator |

---

## Corrections (application — this branch)

- **`resolve-set-revision-from-campaign.ts`** — maps sticky-note emphasis → `swap_clip` \| `cta_change` \| `end_card_hold` (+ unit test).
- **`hosted-clip-production-orchestrator.ts`** — revision completion before first-cut chunking when spine `revision_requested`.
- **`launch-menu-production-observer.ts`** — revision lane; Preview worker POST; inline revision off-Preview; TS fix.
- **`continue-launch-menu-chain.ts`** — bind-only when production + QA satisfied and no pending set revision.
- **`machine-clip-repurposing-review-bind.ts`** — hydrate durable MP4s; open review draft after `revision_ready_again`.
- **`live-factory.ts` / `caption-burn.ts`** — `end_card_hold` / `cta_change` re-render; `ctaHoldSeconds`; FFmpeg/mux fixes.
- **`hosted-clip-droplet-worker-http-1.ts`** — single HTTP step per request (no self-chain).
- **`hosted-clip-repurposing-production-resume-1.mjs`** — official Preview API journey; `file.url` downloads; approve hygiene.
- **`vercel.json`** — ffmpeg/ffprobe static includes for API routes.
- **`next.config.ts`** — NFT excludes (data/docs/public heavy assets) to reduce serverless trace blow-up.

---

## Machine / Production Team / Quality

| Lane | Update |
|------|--------|
| **Machine (Preview)** | Launch-menu observer dispatches `HOSTED_CLIP_WORKER_URL` one chunk; continue-paid-intake-chain sync/async. |
| **Production Team (DO)** | Worker at `127.0.0.1:8787` + cloudflared; code synced to `/var/studio/studio-squishy`; Test DB env only. |
| **Quality** | Machine QA + bind attestation in review bind; **human independent watch not substituted** in this pass. |

---

## Regression safeguards

- `resolve-set-revision-from-campaign.test.ts`
- `caption-burn.test.ts`, `caption-finish.test.ts`, `caption-production-burn.test.ts` (where present)
- `hosted-durable` / file-storage preview env tests (bounded)
- Official harness: `hosted-clip-factory-journey-arm-1.mjs`, `hosted-clip-repurposing-production-resume-1.mjs` (no `_tmp` scripts for cert)

---

## Deployment version

- **Git branch:** `preview/clip-repurposing-integration-2026-10-31` (Preview only).
- **Prior failed CLI deployments:** `dpl_3UJMk…`, `dpl_Cu4D7…` — internal Vercel error post-build.
- **Target:** Vercel Preview **Ready** from Git push (not CLI prebuilt on Windows).

---

## Remaining limitations (explicit)

- **Unwatermarked delivery:** Preview Shotstack stage → watermarked; Production v1 not activated.
- **Revision matrix:** `end_card_hold` primary proof; `swap_clip` / `cta_change` need worker Shotstack stability + exact CTA QA.
- **Independent Quality:** Owner/human watch required for commercial sign-off beyond machine QA.
- **SELL NOW:** Not authorized until fresh disposable E2E on **Ready integrated Preview** completes without `_tmp`/DB surgery.

---

## Evidence reused (not reopened)

- Campaign `disposable-hpt-cert-clip_repurposing-36dd199b` — prior PASS WITH LIMITS tail (approve, download, 403).
- DO SSH key `studio-do-ed25519`, tunnel URL in Preview env — verified 2026-10-31.
