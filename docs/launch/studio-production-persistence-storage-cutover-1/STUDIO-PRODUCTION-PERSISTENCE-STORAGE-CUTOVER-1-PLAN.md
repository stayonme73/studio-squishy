# STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1 — Cutover plan (preparation only)

**Package:** `STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1`  
**Prepared:** 2026-10-26  
**Release code ref (GitHub):** `ed36ba5c817c7c5c78c78bfd53eb4be5d9b7257b`  
**Branch tip (report/register):** `ee8afb0d` (see release-freeze register)  
**Status:** **PREPARED — NOT EXECUTED** (no Production changes in this package)

**Authority inputs (read-only):**

- `docs/launch/studio-prelaunch-infrastructure-completion-1/PRODUCTION-CUTOVER-CHECKLIST.md` (on laptop branch `operating/mobile-customer-journey-certification-1` commit `20a5e00e`; not on GitHub bulk docs commit)
- `docs/launch/studio-release-freeze-1/STUDIO-RELEASE-FREEZE-1-REPORT.md`
- `docs/launch/studio-verified-discoveries-master-record-1/STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-2026-10-25.md` (laptop / WD preservation)
- Shared Launch Control v1.1 (`T-01`–`T-09`, `R-02`, `R-04`)

**Not authorized in preparation:** Production migrations, Vercel deploy, secret rotation, Stripe live, publication, merge to `main`, rerun of 42/42 or 4/4 unless Owner orders a regression gate.

---

## 1. Targets (verified from repo + local guards)

| Layer | Test (DONE — do not recreate) | Production (cutover target) |
|-------|------------------------------|-----------------------------|
| **Supabase project ref** | `tzyglhypseyokhbeozjw` | `txgzguzlojlhndkbncc` |
| **Postgres** | Session pooler URL via `STUDIO_PERSISTENCE_TEST_DATABASE_URL` | **Owner-supplied** Production pooler URL on Vercel as `DATABASE_URL` (never reuse test URL) |
| **Storage bucket** | `studio-files-test`, **private** (preflight PASS 2026-10-26) | **`studio-files`** — **VERIFIED** exists, **public OFF** (Owner dashboard 2026-10-26); **do not create** |
| **Storage API** | `STUDIO_PERSISTENCE_TEST_SUPABASE_*` → mapped to app env in integration runners | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` on Vercel **Production** (server-only service role) |
| **App backend** | `STUDIO_PERSISTENCE_BACKEND=postgres` during test runs | Same on Vercel **after** schema exists on Production DB |
| **Default when unset** | Filesystem under `data/` (local laptop) | **Serverless Production must not rely on filesystem** for durable campaign state |

**Guard rails (already in code):** `STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF` must match Production dashboard ref; integration scripts refuse runs when test URL/ref equals Production ref (`test-target-verify.ts`, `test-storage-target-verify.ts`).

**Vercel deployment target (inferred — dashboard not inspected this session):**

- Git remote: `stayonme73/studio-squishy`
- README: pushes to **`main`** deploy Production; PRs get previews
- **Release freeze ref is on** `operating/mobile-customer-journey-certification-1`, **not** merged to `main`
- No `.vercel/project.json` in workspace → **confirm** linked project, production domain, and which branch Production tracks **before** deploy (Owner / Vercel dashboard)
- Historical hostname cited in scripts: `studio-squishy.vercel.app` — treat as **unverified** until current deployment evidence is captured

**Machine / production-team hosting (related, mostly OUT OF SCOPE for this package):**

- Customer site + File Room download/upload APIs: **Vercel serverless** (Next.js App Router)
- Shared Launch Control **`T-09`**: production worker execution, provider credentials, health — **separate** from DB/Storage cutover; Kitchen lanes (Shotstack, ElevenLabs, Netlify, etc.) use server env vars per `.env.example`
- **`P-07`**: durable job truth on live spine — requires postgres cutover **plus** Machine path proof; not satisfied by migrations alone

---

## 2. Required migrations (Production — apply once, ordered)

All at release ref `ed36ba5c` under `supabase/migrations/`:

1. `20261025100000_studio_spine_local_foundation.sql`
2. `20261025120000_studio_identity_local_foundation.sql`
3. `20261025130000_studio_comms_life_local_foundation.sql`
4. `20261025140000_studio_activity_production_local_foundation.sql`
5. `20261025150000_studio_assignments_local_foundation.sql`

SQL uses `CREATE TABLE IF NOT EXISTS` / idempotent patterns suitable for **empty or partial** Production schemas, but **Owner must confirm** Production DB current state (empty vs legacy tables) before apply — no destructive re-run of integration tests against Production.

**Test-only apply path (already used):** `applyLocalPersistenceSchemasFromFile()` in `schema-apply.ts` — **not** invoked for Production; use Supabase SQL editor or approved migration pipeline when authorized.

---

## 3. What already exists (do not recreate)

| Asset | State |
|-------|--------|
| Persistence **Test** Supabase project | Connected; 42/42 integration; 4/4 prelaunch Phase A/B on test |
| Test Storage credentials in `.env.local` | Present; `npx tsx scripts/studio-prelaunch-storage-preflight.ts` → **PASS** (private bucket) |
| Production project ref guard | `STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF=txgzguzlojlhndkbncc` in local env (non-secret) |
| Production Postgres URL / Production Storage keys in laptop env | **Not present** in `.env.local` (correct — avoids accidental Production writes from laptop scripts) |
| Five migration files on GitHub | **Yes** @ `ed36ba5c` |
| Production schema applied | **OPEN** per master record — **not verified** this session |
| Production private bucket `studio-files` | **VERIFIED** Owner dashboard 2026-10-26 (exists, public OFF, 0 storage policies listed) |
| Production project identity / health | **VERIFIED** — The Studio Production, ref `txgzguzlojlhndkbncc`, HEALTHY |
| Production DB migrations applied | **None** per dashboard 2026-10-26 (repo SQL pending EXECUTE) |
| Scheduled Production DB backups | **VERIFIED** — 8 backups Oct 19–26; latest **2026-10-26 12:59:38 UTC** |
| Production PITR | **NOT enabled** (Owner dashboard 2026-10-26) |
| Vercel modern build from release branch | **OPEN** (`T-06`) |
| Oct 25 two-drive preservation | **Frozen** — rollback reference for **code/docs**, not live DB |
| Bulk `data/` import | **Explicitly out of scope** (checklist + master record) |

---

## 4. Test vs Production — completed work

### Done on **Persistence Test** only (no repeat unless regression)

| Evidence | Runner / doc |
|----------|----------------|
| Postgres spine, identity, comms, life, activity, production, payments, E2E orchestrators | `npm run` / `npx tsx scripts/run-studio-persistence-integration.ts` (42 tests) |
| Assignments + Storage backup/restore + authorized download | `scripts/run-studio-prelaunch-infrastructure-integration.ts` (Phase A) |
| One-service Final Delivery path with Storage bytes | Phase B in same runner (4/4 prelaunch) |
| Storage preflight (private bucket, ref match) | `scripts/studio-prelaunch-storage-preflight.ts` |

### Required on **Production** only (after explicit authorization)

| Step | Action |
|------|--------|
| P0 | ~~Confirm Production dashboard~~ **DONE (Owner 2026-10-26)** — see §12; accept **`R-04` limits** or schedule non-destructive drill before EXECUTE |
| P1 | **Backup / snapshot** immediately before migration (Supabase backup + note Vercel deployment id pin) |
| P2 | Apply five migrations in order (single maintenance window) |
| P3 | ~~Create bucket~~ **SKIP** — **`studio-files` verified**; at EXECUTE re-check public=OFF only |
| P4 | Set Vercel **Production** env (see §5); **do not** copy `STUDIO_PERSISTENCE_TEST_*` to Production |
| P5 | Deploy application from authorized Git ref (`ed36ba5c` minimum; branch deploy or merge strategy is Owner decision — **merge to `main` not authorized here**) |
| P6 | Production smoke tests (§6) |
| P7 | Soak + monitor; keep rollback pins until Owner accepts |

---

## 5. Production Vercel environment (when authorized)

Set on **Production** environment (values from Owner secret store — **never** commit):

| Variable | Purpose |
|----------|---------|
| `STUDIO_PERSISTENCE_BACKEND` | `postgres` |
| `DATABASE_URL` | Production Supabase **session pooler** URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://txgzguzlojlhndkbncc.supabase.co` (confirm in dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; File Room Storage adapter |
| `SUPABASE_STORAGE_BUCKET` | `studio-files` (confirm name) |
| `SESSION_SECRET` | Stable across deploys (rotating invalidates sessions) |
| `NEXT_PUBLIC_SITE_URL` | Production customer URL (non-localhost) |

**Optional guard (non-secret):** `STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF=txgzguzlojlhndkbncc` on CI/preview if used.

**Leave unchanged until separate packages:** live Stripe (`T-07`), branded Resend/domain (`T-08`), `STUDIO_PERSISTENCE_TEST_*`, filesystem backend.

---

## 6. Execution order (Owner-approved cutover day)

1. **Gate:** Release ref pinned (`ed36ba5c` or documented successor); no concurrent Production schema edits.
2. **Evidence capture:** Screenshot/export Supabase Production schema + bucket ACL **before** change.
3. **Backup:** Supabase backup + record Vercel current production deployment SHA.
4. **Migrate:** Apply migrations 1→5 on Production Postgres.
5. **Storage:** Verify bucket private; run **read-only** bucket visibility check (same logic as preflight, Production credentials — **manual or one-off authorized script**, not laptop test runner).
6. **Vercel env:** Set §5 variables; **no** deploy until env saved.
7. **Deploy:** Deploy release branch build to Production (or Preview-first if Owner chooses staged cutover — document URL).
8. **Smoke (Production, non-destructive):**
   - Public: Lobby / Route Map load (no auth)
   - **Do not** run Vitest integration suite against Production
   - With **Stripe test mode** still (until `T-07`): sandbox checkout → webhook → campaign row visible via Owner Console or approved probe route
   - Auth: sign-in session cookie round-trip
   - File Room: staff upload **test object** to disposable campaign id → client authorized download **200** → stranger **403** → delete test object
   - Postgres: confirm new campaign writes appear in `studio_campaigns` (dashboard SQL, limited SELECT)
9. **Rollback decision window:** 30–60 minutes monitored; abort criteria §7.

---

## 7. Rollback triggers and doctrine

| Trigger | Response |
|---------|----------|
| Migration error / partial apply | **Stop**; do not deploy app with `postgres` backend; restore DB from pre-migration backup |
| Wrong Supabase ref in env | **Stop** deploy; fix env; redeploy prior build |
| Bucket `public=true` | **Stop**; lock bucket private before traffic |
| 5xx on claim/payment/file routes after deploy | Roll Vercel to pinned prior deployment; investigate DB connectivity |
| Data written to wrong project | Incident protocol; do not “flip env only” |

**Rollback doctrine (from checklist):** Reverting `STUDIO_PERSISTENCE_BACKEND` to filesystem on Vercel **does not** restore serverless durability — rollback = **prior Vercel deployment + DB restore**, not env flip alone.

**Backup adequacy for this release:**

| Layer | Preparation verdict |
|-------|---------------------|
| Code | GitHub `ed36ba5c` + Oct 25 WD preservation |
| Test DB/Storage | Proven restore paths on **test** (`R-02` DONE) |
| Production DB scheduled backups | **VERIFIED** (Owner 2026-10-26); **restore not demonstrated** |
| Production PITR | **NOT enabled** — daily backups only; finer rollback requires PITR purchase (**not authorized** in prep) |
| Production Storage object recovery | **`R-04` OPEN** — scheduled **DB** backups **exclude** Storage bytes; separate object recovery strategy required after cutover |

---

## 8. Secret handling and recovery

- All Production secrets live in **Vercel Environment Variables** (Production scope) and Owner password manager — not git, not chat.
- Laptop `.env.local` holds **test** persistence + dev keys only; scripts load only allowlisted keys and **never log secret values**.
- Recovery: rotate service role in Supabase → update Vercel → redeploy; document in launch register (separate authorized package).
- **Do not** paste Production `DATABASE_URL` or service role into integration runners on laptop without explicit Owner “break glass” procedure.

---

## 9. Genuinely missing prerequisites (block cutover GO)

| ID | Gap | Owner action |
|----|-----|--------------|
| G1 | Production schema | **No Supabase migrations applied** (dashboard 2026-10-26); treat as **pre-migration** — apply five SQL files at EXECUTE |
| G2 | Production Storage bucket | **Cleared** — verified private `studio-files` |
| G3 | **`R-04`** Production recovery | Scheduled DB backups **verified**; **PITR off**; **no restore drill**; **Storage not in DB backups** — Owner **accept limits** or authorize non-destructive drill package |
| G4 | **`T-06`** Vercel project/branch/domain vs release ref | Dashboard: link `operating/mobile-customer-journey-certification-1` or approve merge/deploy strategy |
| G5 | Deploy path: release not on `main` | Authorize branch Production deploy **or** merge (merge **not** in this package) |
| G6 | **`T-07` / `T-08`** | Stripe live + email — **out of scope** for persistence cutover but block **full** four-package live launch |
| G7 | **`T-09` / `P-07`** Machine durable job truth | Follow-on after postgres live |
| G8 | Checklist doc drift **`T-03`**: Phase B proof is Supabase-backed on test, not FS | Doc fix only (optional; no test rerun) |

---

## 10. Approvals required before any production-changing step

1. **Owner GO** for Production migration window on ref `txgzguzlojlhndkbncc`.
2. **Owner GO** for Vercel Production env changes (§5) and deployment source ref/branch.
3. **Owner confirmation** of **`R-04` WITH EXPLICIT LIMITS** (scheduled DB backups yes, PITR off, no demonstrated restore, Storage bytes separate) **or** GO for a **non-destructive recovery demonstration** package (no PITR purchase / no live Production restore in prep).
4. **Separate authorization** (not this package): merge to `main`, live Stripe, publication, four-package UNPUBLISHED flip, Production Machine workers (`T-09`).

**Stop line:** This document ends at preparation. Next package step is **Owner review of this plan** → explicit **EXECUTE** authorization for migration + env + deploy only.

---

## 11. STUDIO-PRODUCTION-CUTOVER-FINAL-PREFLIGHT-1 (read-only, 2026-10-26)

**Package:** `STUDIO-PRODUCTION-CUTOVER-FINAL-PREFLIGHT-1`  
**Method:** Public HTTP/DNS probes, GitHub metadata, laptop env key inventory (names only), existing launch records. **No** Supabase/Vercel dashboard login, **no** production DB/storage writes, **no** test integration rerun.

### 11.1 Production Supabase (schema, bucket, migrations)

| Check | Result | Evidence |
|-------|--------|----------|
| Documented Production ref `txgzguzlojlhndkbncc` | **SUPERSEDED** | Owner dashboard **VERIFIED** 2026-10-26 (Scout AM DNS probe unreliable; do not use as authority) |
| Persistence Test ref `tzyglhypseyokhbeozjw` host resolves | **PASS** | DNS A records present; `auth/v1/health` → **401** (host live, unauthenticated probe) |
| Production `DATABASE_URL` / service role on laptop | **Absent** | `.env.local` keys: test persistence + `STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF` only — correct for safety |
| `studio_campaigns` / five migrations on Production | **UNKNOWN** | Cannot inspect without valid Production project URL + dashboard or read-only SQL |
| Private bucket `studio-files` + RLS/policies on Production | **UNKNOWN** | Owner prior statement (Oct 25): bucket **`studio-files`** on **The Studio Production** project; **not re-verified** (ref/host blocked) |
| Supabase migration history table on Production | **UNKNOWN** | No CLI/dashboard access; repo migrations **not** evidence of Production apply |

**Interpretation (2026-10-26 PM):** Owner confirmed Production project. Do **not** assume Production Postgres is empty of *all* data — dashboard reports **no migrations** from Supabase migration tracking; apply repo SQL at EXECUTE. Do **not** recreate **`studio-files`**.

### 11.2 Vercel (project, domain, deploy path for `ed36ba5c`)

| Check | Result | Evidence |
|-------|--------|----------|
| Public Production URL | **VERIFIED legacy build** | `https://studio-squishy.vercel.app/` — copy references **Draft Room** / `welcome-hall-scene-v3.2`; **not** NEW Studio Lobby @ `ed36ba5c` |
| `/studio-lobby` on live site | **404** | Route exists in release code; absent on current Production deployment |
| `/studio-board` on live site | **200** | Legacy “START A NEW CAMPAIGN” shell |
| Response headers | **Vercel** | `Server: Vercel`, `X-Vercel-Id: iad1::…` (2026-10-26 HEAD `/`) |
| GitHub `origin/main` | **`c0c081f4`** | “establish Studio Service Catalog” — aligns with **old** public site |
| Release commit on GitHub | **`ed36ba5c` on branch only** | `origin/operating/mobile-customer-journey-certification-1`; **not** ancestor of `origin/main` |
| Local Vercel CLI | **Logged out** | Dashboard project name / env vars **not** inspected |
| Custom domain `thestudiocompany7.com` | **Not verified as Vercel alias** | DNS SOA only from this probe; no A/CNAME evidence tied to Vercel here |

**Safe deploy of pinned release without merge to `main` (Owner dashboard — not executed):**

1. **Preview-first (recommended):** Vercel → Project → **Create Deployment** → Git reference **`ed36ba5c817c7c5c78c78bfd53eb4be5d9b7257b`** on branch **`operating/mobile-customer-journey-certification-1`** → validate Preview URL (Lobby, `/studio-lobby`, persistence flags still filesystem until env set).
2. **Promote:** Promote that Preview to **Production** when env + DB ready (Vercel “Promote deployment”).
3. **Alternative:** Temporarily set **Production branch tracking** to `operating/mobile-customer-journey-certification-1` (Vercel KB: non-default production branch) — **Owner decision**; revert after cutover if desired.
4. **Not required:** merge to `main` (explicitly unauthorized in prep packages).

### 11.3 Backup / PITR vs demonstrated restore

| Layer | Configured (evidence) | Demonstrated restore |
|-------|----------------------|----------------------|
| Code @ `ed36ba5c` | GitHub + Oct 25 WD preservation | N/A |
| Persistence Test DB/Storage | 42/42 + 4/4 + preflight PASS | **YES on test** (`R-02`) |
| Production Postgres PITR | **UNKNOWN** this session | **NO** (`R-04` OPEN) |
| Production Storage object recovery | **UNKNOWN** | **NO** |
| Owner prior note | Supabase org **Pro plan** (Oct 25 implement package) | Pro **may** include PITR — **must confirm in dashboard**; configuration ≠ drill |

**Recovery procedure (credible on paper, not drilled on Production):** pre-migration Supabase backup/snapshot → apply migrations → if fail, **restore DB from backup** + redeploy prior Vercel deployment pin; Storage rollback via bucket restore/export per checklist §Backup.

### 11.4 Minimum smoke tests & rollback triggers (confirmed unchanged)

**Smokes after EXECUTE (Production, non-destructive):** §6 steps 8 — public Lobby/Route Map; Stripe **test** checkout + webhook + row in `studio_campaigns`; auth cookie; File Room upload/download 200/403 on disposable id; **no** Vitest against Production.

**Rollback triggers:** §7 — migration failure; wrong Supabase ref in env; bucket public; 5xx on claim/payment/file routes; writes to wrong project. Response: **stop**, pin prior Vercel deployment, **DB restore** (not filesystem env flip).

### 11.5 Remaining blockers after preflight (genuine only)

| ID | Blocker |
|----|---------|
| **B1** | ~~Production ref invalid~~ **CLEARED** (Owner 2026-10-26) |
| **B2** | **Partial** — identity/health/bucket/backups **verified**; **five repo migrations not applied**; **0 storage policies** — review at EXECUTE |
| **B3** | **`R-04`** — scheduled DB backups **yes**; **PITR off**; **restore not demonstrated**; **Storage recovery not evidenced** |
| **B4** | Vercel **Production env** for postgres + Production Supabase secrets **not** verified (CLI logged out) |
| **B5** | NEW Studio **not** on live URL yet — deploy/promote of `ed36ba5c` still required (separate EXECUTE auth) |

**Removed as blockers for *persistence cutover plan quality*:** re-running Test 42/42 or 4/4; bulk docs upload; merge to `main`.

### 11.6 GO / NO-GO recommendation

| | |
|--|--|
| **Cutover EXECUTE** | **NO-GO** until **B3–B5** addressed + Owner §10 approvals (**B1 cleared**) |
| **Plan / preparation quality** | **GO** — test work complete; Production target **verified** |
| **Recovery demonstration** | See **§12** — recommended **accept `R-04` limits** for first migration on pre-migration DB; full drill optional separate package |

---

## 12. Owner Production Supabase evidence (2026-10-26)

**Source:** Owner dashboard inspection + screenshots. **Not authorized:** PITR purchase, live restore, migrations, bucket changes.

| Item | Status |
|------|--------|
| Project **The Studio Production**, ref **`txgzguzlojlhndkbncc`** | **VERIFIED** |
| Status **HEALTHY** | **VERIFIED** |
| Bucket **`studio-files`**, public **OFF** | **VERIFIED** |
| Storage policies (dashboard count) | **0** |
| Scheduled database backups | **VERIFIED** — 8 visible Oct 19–26, 2026; latest **2026-10-26 12:59:38 UTC** |
| Point-in-Time Recovery | **NOT enabled** |
| Supabase-tracked migrations on Production | **None** |
| Production restore demonstrated | **No** |
| Storage objects in scheduled DB backups | **No** (product limit) |
| Complete Production customer-file recovery | **Not evidenced** |

### Recovery demonstration before cutover (assessment)

| Option | Role |
|--------|------|
| **A — Accept `R-04` WITH EXPLICIT LIMITS** | Reasonable for **first EXECUTE** while Production has **no applied migrations** and no production customer-file corpus yet: rely on **scheduled daily DB backups**; accept **no PITR**, **no proven restore**, **no Storage-in-backup**. Document Storage recovery as **follow-on** (export/inventory, optional second project restore test — **separate authorization**). |
| **B — Non-destructive drill (optional)** | Before or after first migration: download backup metadata, or restore a scheduled backup into a **disposable non-Production project** to prove RPO — **not performed**; **no PITR purchase**; **no in-place Production restore** without EXECUTE stamp. |
| **Recommendation** | **A required** (explicit Owner ack on limits); **B optional** if Owner wants **`R-04` stronger than configured backups** before heavy Production traffic. **Do not block** schema cutover solely on B if A is signed and pre-migration state holds. |

**Test integrations:** 42/42 and 4/4 remain **frozen PASS** — do not rerun.

---

## 13. Vercel project `the-studio-company` (Owner evidence, 2026-10-26)

| Item | Status |
|------|--------|
| Production URL **`studio-squishy.vercel.app`** | **OLD** Studio @ **`fc56426`** on **`main`**, deployed **2025-06-22** |
| Git connection | **None** — no branch tracking on Production |
| Preview / Development envs | **Exist** |
| Production env vars | **Many set** (values UNKNOWN); includes `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `STUDIO_DURABLE_STATE_PROVIDER`, domain-specific lanes |
| `STUDIO_PERSISTENCE_BACKEND` / `DATABASE_URL` | **UNKNOWN** (not in screenshots — verify full inventory) |
| Needs Attention | `AUTH_EMAIL_…PROVIDER`, `AUTH_PASSWO…PROVIDER` — **not used** by `ed36ba5c`; likely legacy/integration orphans — see reconciliation doc §4 |

**Env reconciliation & Preview-first deploy:** `docs/launch/studio-production-persistence-storage-cutover-1/STUDIO-VERCEL-CONFIGURATION-RECONCILIATION-2026-10-26.md`

**Safest `ed36ba5c` path:** Preview deployment only → validate → **Promote** to Production when GO (keeps OLD site live until promote; **no merge to `main` required**).

---

## 14. NEW Studio Preview (`ed36ba5c`) — PREPARED, NOT EXECUTED

**Authority:** Vercel reconciliation doc **§7** (`STUDIO-VERCEL-CONFIGURATION-RECONCILIATION-2026-10-26.md`).

- **Isolation:** Persistence Test ref **`tzyglhypseyokhbeozjw`**, bucket **`studio-files-test`**, Stripe **`sk_test`**, email **`TRANSACTIONAL_EMAIL_PROVIDER=none`** recommended.
- **Deploy:** `vercel deploy` (no `--prod`); **OLD** Production stays on **`fc56426`**.
- **Smokes / stop / auth:** reconciliation **§7.4–7.6**.
- **42/42 + 4/4:** protected — not rerun for Preview.
