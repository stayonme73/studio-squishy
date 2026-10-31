# Studio architecture alignment — DigitalOcean clip worker (implementation plan)

**Status:** PROPOSAL ONLY — no deploy, infra change, commit, push, merge, or Production until Owner **GO** on each gate below.  
**Audience:** Chat + Scout + Owner (one page, same facts).  
**Compiled:** 2026-10-30  
**Cert campaign (unchanged):** `disposable-hpt-cert-clip_repurposing-6a31a13c` · account `hpt-cert-clip_repurposing-2d52e67f@example.com` · **Clip 1 PASS protected** · clips 2–3 not certified.

---

## 1. Shared facts (verified in repo / registers)

| Layer | Provider | Role today |
|-------|----------|------------|
| Customer web app | **Vercel** (`the-studio-company`, Preview + Production) | Routes, auth, Machine observer, Shotstack API calls from app, Review / Final Delivery |
| Durable state + File Room | **Supabase** (Test `tzyglhypseyokhbeozjw` for Preview cert) | Postgres campaigns, private Storage artifacts |
| Video finish | **Shotstack** | `production.mp4` after local proof |
| Clip factory logic | **Same codebase** | `runHostedClipProductionStep` · `withCampaignArtifactProductionWorkspace` · lease + checkpoint in Supabase |
| Clip **execution** today | **Vercel serverless** | `POST /api/hosted-cert/clip-production-chunk` · `maxDuration = 800` · self-kick via `scheduleHostedClipProductionContinuation` |
| DigitalOcean | **Droplet `studio-company-1`** (reported id `611581495`) | Purchased + prepared (Ubuntu, Node 22, ffmpeg); **app and workers not deployed**; **not referenced in git** |

**Agreed direction (Owner + Chat + Scout):**

- **Keep Vercel** for the website and customer application.
- **Use the existing droplet** for **long-running FFmpeg** (concat, burn, end-card), not another Vercel serverless experiment chain.
- **Preserve** Machine → Production Team → Quality → Review → Final Delivery (Postgres + Storage contract unchanged).
- **Do not** migrate the whole site, buy new hosting, or restart the cert campaign.
- **Stop** repeated Preview mux/chunk deploy + `hosted-clip-mux-phase-chain-1.mjs` loops until a **targeted** fix or **DO worker** path is authorized.

---

## 2. Why this is the smallest path to finish Clip cert

Engineering already centralizes clip work in **`runHostedClipProductionStep`** (orchestrator) and **`withCampaignArtifactProductionWorkspace`** (hydrate → work on disk → commit to Supabase). The Vercel route is a thin wrapper:

```54:60:src/app/api/hosted-cert/clip-production-chunk/route.ts
  const step = await withCampaignArtifactProductionWorkspace(campaignId, (repoRoot) =>
    runHostedClipProductionStep({
      repoRoot,
      campaign: envelope.record,
      dispatchRecord: record,
    }),
  );
```

**Desk concat probe (2026-10-30)** proved intermediates for clip 2 can complete with **local ffmpeg + same Supabase bytes**; the failure mode on Vercel is **time / invocation / self-kick**, not missing business logic.

**Droplet path:** run the **same orchestrator** on a machine with **no 800s wall**, **no curl abort at 25s on kick**, and **stable `/tmp` workspace** — still one worker at a time via existing **checkpoint lease** (`CHUNK_LEASE_MS` / stale recovery).

---

## 3. Phase 0 — Verify droplet (Owner-assisted; read-only)

Scout has **no DO API or SSH** in repo. Verification is a **checklist**, not a purchase.

Owner (or whoever has SSH) runs on **`studio-company-1`** and saves output to a desktop report (same pattern as Oct 2026 Scout reports):

| Check | Pass criteria |
|-------|----------------|
| Reachability | `ssh studioadmin@<droplet-ip>` succeeds |
| OS / resources | Ubuntu 24.04; **≥ 4 vCPU / 8 GB RAM / ≥ 50 GB free disk** on `/` (Basic plan target) |
| Node | `node -v` → **22.x** |
| FFmpeg | `ffmpeg -version` and `ffprobe -version` present |
| Security baseline | `ufw status`, `fail2ban` active (as prepared) |
| **No duplicate workers** | No cron/systemd running unknown node jobs for Studio |
| Supabase from droplet | `psql` or existing connection script to **Test** ref only — **must not** use Production ref `txgzguzlojlhndkbncc` for cert worker |
| Egress | Can HTTPS to Supabase API + Shotstack + (optional) Vercel Preview for tail scripts |

**If droplet is gone, resized down, or disk full:** stop — **no new spend** until Owner confirms restore or repurpose; do not silently fall back to more Vercel chains.

**Deliverable:** `HOSTED-CLIP-DO-DROPLET-VERIFY-2026-10-30.json` (paste outputs, no secrets).

---

## 4. Phase 1 — Smallest code changes (bounded package)

Goal: **one long-lived process on DO** can drive **`runHostedClipProductionUntilIdle`** for the **existing cert campaign**, committing through **existing** `commitCampaignDesignArtifacts`. No fork of Machine, QA, or delivery.

### 4.1 Environment shim (≈15 lines)

Today durable artifacts enable when `VERCEL` is set or `STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE=1` (`hosted-durable.ts`). Preview test Supabase remap runs when `VERCEL_ENV === "preview"`.

**Change:** treat **`STUDIO_HOSTED_CLIP_WORKER=1`** like Preview for:

- `applyStudioPersistenceTestSupabaseEnvToProcess`
- `clipFactoryScopedRender` on hydrate (skip re-downloading clip 1 `production.mp4`)

**Droplet env file (never committed):** Test Postgres URL, Supabase URL + service role, Shotstack stage keys, Deepgram if needed, `STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE=1`, `STUDIO_HOSTED_CLIP_WORKER=1`, `STUDIO_PERSISTENCE_TEST_PROJECT_REF=tzyglhypseyokhbeozjw`.

### 4.2 CLI entry (new file, no Vercel deploy required for first cert run)

**New:** `scripts/hosted-clip-droplet-production-drive-1.mjs` (or `.mts` via `tsx`):

- Load secrets from `/etc/studio/worker.env` (path configurable).
- Resolve `campaignId` from argv (default cert campaign).
- Import orchestrator + workspace (same as API route).
- Loop **`runHostedClipProductionUntilIdle`** with high `maxSteps` and **wall-clock timeout** (e.g. 4h) suitable for clips 2–3.
- Exit code + JSON log for `hosted-clip-set-mp4-proof-1.mjs` (unchanged).

This satisfies **autonomous cert boundary** when run **on DO from deployed git SHA**, not desk upload recovery.

### 4.3 Optional — wire Machine kicks to DO (second slice, after 3/3 proof)

**Change:** `scheduleHostedClipProductionContinuation` / `kickHostedClipProductionChunk`:

- If `HOSTED_CLIP_WORKER_URL` is set on **Vercel Preview**, `POST` worker instead of self-URL.
- Worker exposes **`POST /run-chunk`** with body `{ campaignId }`, header **`x-hosted-cert-internal`**.

**Guard:** `clip-production-chunk` route returns **`409 clip_worker_external`** when worker URL is set and request is not the worker callback — prevents **dual FFmpeg**.

**New on droplet:** minimal **Node HTTP** (or `systemd` + on-demand script only for v1).

### 4.4 Explicitly out of scope (this package)

- Moving Next.js app off Vercel  
- DO App Platform  
- New queues (Redis, SQS) — lease + checkpoint in Supabase remain source of truth  
- Production Supabase / Production Vercel env  
- Restarting campaign or re-pay  
- Desk `hosted-clip-upload-local-text-proof-1.mjs` as cert path  

---

## 5. Security

| Risk | Mitigation |
|------|------------|
| Worker endpoint open to internet | **ufw:** allow 22 from Owner IP; worker port **only from Vercel egress IPs** or **Tailscale/private**; prefer **no public HTTP in v1** — SSH + one-shot systemd timer only |
| Shared secret leak | **`HOSTED_CERT_INTERNAL_CHUNK_KEY`** on droplet + Preview; rotate if ever logged |
| Production data | Worker env **Test ref only**; scripts reject Production DB ref (same as `hosted-clip-sync-test-account-password-1.mjs`) |
| Duplicate workers | Existing **lease** + stale recovery; operator rule: **one** drive process; stop Vercel mux chains while DO drive runs |
| Secrets in git | `/etc/studio/worker.env` mode `600`, owned by service user; document keys in `.env.example` **names only** |

---

## 6. Rollback

1. **Stop** droplet service / kill drive script.  
2. **Remove** `HOSTED_CLIP_WORKER_URL` from Vercel Preview (if set).  
3. Lease clears within **~3 minutes**; stale lease recovery already in orchestrator.  
4. **No** Supabase schema rollback — artifacts remain; worst case stale checkpoint → existing recover scripts.  
5. Vercel chunk route works again as today (not recommended for cert until proven broken on DO).

---

## 7. Certification sequence (after implementation GO)

1. Deploy **git SHA** to droplet (`git pull` + `npm ci` + build if needed for imports).  
2. **Single** drive for `disposable-hpt-cert-clip_repurposing-6a31a13c` — **no** parallel Vercel `mux-phase-chain`.  
3. **`hosted-clip-set-mp4-proof-1.mjs`** → **3/3** ftyp-readable `production.mp4`; per-clip PASS JSON for `c-17-127`, `c-82-641`.  
4. **`hosted-clip-repurposing-production-resume-1.mjs`** on current Preview URL — Quality → Review → delivery → stranger 403 (needs `STUDIO_HOSTED_CERT_TEST_PASSWORD` in Owner `.env.local` only).  
5. Record closeout JSON; **then** decide SELL NOW stamp with Chat.

---

## 8. Owner authorization gates (precise)

| Gate | Owner says | Scout/Chat may do |
|------|------------|-------------------|
| **A — Verify** | “GO verify droplet” + IP or SSH session | Run checklist §3; produce verify JSON |
| **B — Code** | “GO DO worker code package” | Implement §4.1–4.2 (+ optional 4.3); **commit only if Owner also says commit** |
| **C — Droplet secrets** | “GO place worker env on droplet” | Owner pastes Test keys on server (Scout never commits secrets) |
| **D — Cert run** | “GO single DO production drive for cert campaign” | One orchestrator run; **no** Vercel mux chain |
| **E — Preview wire-up** | “GO HOSTED_CLIP_WORKER_URL on Preview” | Deploy Preview env + worker HTTP (optional until 3/3) |
| **F — Production** | *Not requested* | **Forbidden** until separate launch authorization |

**Default until A–D:** no commits, no Vercel redeploys for mux experiments, no new hosting spend.

---

## 9. Time and money (launch pressure)

| Stop | Saves |
|------|--------|
| End EJT8/FX9/9HQC-style **Vercel redeploy + 800s chains** | Vercel duration + engineer loop time |
| Use **fixed droplet** already paid | FFmpeg minutes without serverless tax |
| **No** site migration | Avoid weeks of unrelated work |

**Critical path to launch for Clip Repurposing cert:** **B → C → D → proof scripts → resume tail (password) → business sign-off.** Wiring observer kicks (E) can wait until after **3/3**.

---

## 10. Single recommendation (Chat = Scout)

**Do not** run another broad Vercel FFmpeg experiment. **Do** verify `studio-company-1`, implement **§4.1 + §4.2**, run **one DO production drive** on the **existing cert campaign**, prove **3/3** with existing proof scripts, then finish the **customer tail on Vercel Preview**. Keep Supabase + Shotstack + Machine architecture intact.

---

## References

- `HOSTED-CLIP-DIGITALOCEAN-VS-VERCEL-TIMELINE-2026-10-30.json`
- `DIGITALOCEAN-INFRASTRUCTURE-AUDIT-2026-10-30.md`
- `HOSTED-CLIP-AUTONOMOUS-PRODUCTION-CERT-BOUNDARY-2026-10-30.md`
- Orchestrator: `src/lib/studio-hosted-cert/hosted-clip-production-orchestrator.ts`
- Chunk API: `src/app/api/hosted-cert/clip-production-chunk/route.ts`
