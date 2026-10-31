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
- **`studioExtraArtifactAbsolutePath` + studio-extras file route** (`a980f0e1`) — removes Vercel-cited `path.join(process.cwd(), artifact.path)` whole-repo NFT chain; scoped under `data/campaign-design-artifacts/{campaignId}/…` only.

---

## Machine / Production Team / Quality

| Lane | Update |
|------|--------|
| **Machine (Preview)** | Launch-menu observer dispatches `HOSTED_CLIP_WORKER_URL` one chunk; continue-paid-intake-chain sync/async. |
| **Production Team (DO)** | Worker at `127.0.0.1:8787` + cloudflared; code synced to `/var/studio/studio-squishy`; Test DB env only. |
| **Quality** | Machine QA + bind attestation in review bind; **human independent watch not substituted** in this pass. |

---

## Regression safeguards

- `studio-extra-artifact-path.test.ts` — allowed paths resolve under campaign artifact root; traversal rejected.
- `resolve-set-revision-from-campaign.test.ts`
- `caption-burn.test.ts`, `caption-finish.test.ts`, `caption-production-burn.test.ts` (where present)
- `hosted-durable` / file-storage preview env tests (bounded)
- Official harness: `hosted-clip-factory-journey-arm-1.mjs`, `hosted-clip-repurposing-production-resume-1.mjs` (no `_tmp` scripts for cert)

---

## Deployment version

- **Git branch:** `preview/clip-repurposing-integration-2026-10-31` (Preview only).
- **Commit:** `6191d640` — integration bundle; **`a980f0e1`** — NFT studio-extras packaging fix + support case doc.
- **Vercel deployment (pre-fix):** `dpl_7LX7U91qMEuT9Teefjr9r2wXRAUa` — **Error**, internal Vercel error after **27m 16s** build (NFT cited studio-extras chain).
- **Bounded post-fix deploy:** *(record `dpl_*` + Ready/Error after Owner GO push `a980f0e1`)*.
- **GitHub → Vercel hook:** not observed (zero check runs on commit).
- **Fresh disposable E2E:** not started — no **Ready** integrated Preview.

---

## Deployment-unblock assignment (2026-10-31 Owner GO)

### Evidence review (not “faultless code” assumption)

Remote **`vercel inspect dpl_7LX7… --logs`** shows:

1. **Compile succeeds** — `Build Completed in /vercel/output [1m]` (with cache from `9HQC…`).
2. **Failure phase** — immediately after **`Deploying outputs…`** → *internal Vercel error* (post-build ~18s).
3. **NFT warning** — *“whole project was traced unintentionally”* via `next.config.ts` → `studio-extras/files/.../route.ts` (dynamic `path.join(process.cwd(), …)` / fs reads). **4311** deployment files uploaded.

**Conclusion:** Platform error label is real, but **trace/output payload is abnormally large** — likely contributor to deploy-phase failure.

### NFT packaging fix — verified locally (`a980f0e1`, 2026-10-31)

| Gate | Result |
|------|--------|
| `npm run build` | **PASS** (~9.6 min compile + TS + static gen) |
| Vercel-cited trace (`next.config.ts` → `studio-extras/files/.../route.ts` → *whole project traced unintentionally*) | **Eliminated** — no longer appears in build log |
| Remaining *whole project* NFT warnings (4×) | Import trace now **`next.config.ts` → `hosted-cert/footage-runtime-probe/route.ts`** only (separate follow-up; not deploy blocker for this bounded attempt) |
| studio-extras broad-pattern warnings | Reduced severity class (scoped path join); `readFile(abs)` still dynamic — monitor |

**Log artifact:** desk `.next-build-nft-verify.log` (same commit tree as `a980f0e1`).

**Prevention:** Never `readFile(path.join(process.cwd(), dynamicRel))` for campaign artifacts — use fixed subfolder segments + allowlist (`studioExtraArtifactAbsolutePath` pattern; see `STUDIO-NEW-SITE-PREVIEW-BUILD-BLOCKERS-1-REPORT.md`).

### DigitalOcean Linux prebuilt (one bounded try)

| Check | Result |
|-------|--------|
| Isolation | Clone at `/home/studioadmin/preview-prebuilt-build-1/studio-squishy` — **worker** `/var/studio/studio-squishy` + `:8787` **unchanged** |
| Resources | ~7 GB RAM available, 143 GB disk — **adequate** for `npm ci` |
| Credentials | **BLOCKED** — `VERCEL_OIDC_TOKEN` is **not** a valid `VERCEL_TOKEN` on headless Linux; no `auth.json` at standard desk path for SCP |
| Outcome | **`vercel pull` / `vercel build` on DO failed** before output — **no prebuilt upload** |

**Prevention safeguard:** Headless build hosts require **`VERCEL_TOKEN` (account PAT)** in Owner-controlled secret store, or one-time `vercel login` on DO — not OIDC JWT from `.env.local`.

### Vercel support

Prepared case (paste into dashboard): [`VERCEL-SUPPORT-CASE-PREVIEW-DEPLOY-2026-10-31.md`](VERCEL-SUPPORT-CASE-PREVIEW-DEPLOY-2026-10-31.md).

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
