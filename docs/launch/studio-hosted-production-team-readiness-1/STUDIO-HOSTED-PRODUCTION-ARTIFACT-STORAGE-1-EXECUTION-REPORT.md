# STUDIO-HOSTED-PRODUCTION-ARTIFACT-STORAGE-1 — Execution Report

**Written:** 2026-10-27 (America/New_York)  
**Accepts:** `STUDIO-HOSTED-PAID-TO-PRODUCTION-HANDOFF-RECOVERY-1` — **PASS WITH EXPLICIT LIMITS**  
**Does not repeat:** hosted checkout, payment, webhook, or lane-claim certifications (no regression shown).

---

## Executive verdict

| Layer | Verdict |
|-------|---------|
| **Durable campaign-design artifact Storage (Test bucket)** | **PASS** — round-trip bytes on `studio-files-test` |
| **Hosted Vercel `/var/task/data/…` ENOENT** | **PASS** — production-team log + observer envelope persist |
| **Genuine rendered PNG/PDF on Preview** | **NOT PASS** — **RENDER_FAILURE** (fonts; Playwright bundle still excluded) |
| **Clip / SFV / Kit full factory cert** | **NOT REACHED** — materials gate, render release policy, intake completeness (unchanged) |

**Preview (artifact storage + intake defer):** `dpl_HwXykTZdWUcn3xcbGRMtne2LwYkf` · `https://the-studio-company-mhpvea2fp-stayonme73s-projects.vercel.app`  
**Prior handoff Preview:** `dpl_7QEMKtGK…` (superseded for this slice).

---

## 1. Trace — who writes `data/campaign-design-artifacts/`

| Consumer | Examples | Prior hosted failure |
|----------|----------|----------------------|
| Design dispatch hooks / idempotency | PNG, PDF, HTML, receipts under `…/renders/vN/` | Read-only `/var/task` |
| Production Team bus | `…/production-team/log.json` | **ENOENT** in `after()` (handoff recovery) |
| QA / review bind | Reads repo-relative paths + optional `storageRef` | Broken when files only on disk |
| Final delivery assembly | `supabase_storage` refs for File Room; design artifacts still repo-relative today | Partial |

**Desk/local:** unchanged — still `path.join(process.cwd(), "data/campaign-design-artifacts/…")` inside `/tmp` workspace on hosted only.

---

## 2. Implementation (smallest durable layer)

**New module:** `src/lib/campaign-design-artifacts/`

- **`hosted-durable.ts`** — When `VERCEL` (or test flag `STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE=1`) + Postgres persistence + Test/Production Supabase env:
  - **Hydrate** prefix `campaign-design-artifacts/{campaignId}/` from private bucket → `/tmp/studio-campaign-artifacts-{hash}/data/…`
  - Run existing production code with **`repoRoot = workspace`**
  - **Commit** workspace tree back via Storage upsert (`x-upsert: true`)
- **`ensure.ts`** — `withCampaignArtifactProductionWorkspace` wraps design/launch/QA observers; passes `repoRoot` into observers and Production Team bus.

**Storage:** Reuses **Test Supabase** private bucket (`STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET` / `studio-files-test`) — no new service.

**Tests:**

- `paths.test.ts` — **PASS**
- `hosted-durable.integration.test.ts` — **PASS** (2153ms round-trip on Test Storage)

---

## 3. Hosted Preview evidence

### 3a. Storage defect cleared

After `dpl_HwXykTZdWUcn3xcbGRMtne2LwYkf` deploy:

- Intake re-submit → **HTTP 200** (`2026-10-27T10:06:47Z`)
- Postgres: `designObserverPresent: true` (was null + ENOENT on `dpl_7QEMKtGK…`)
- Test Storage list: prefix `campaign-design-artifacts/disposable-hpt-cert-social_and_promo_graphics-cfee3b4a/` contains **`production-team/`** (committed log tree)

### 3b. Observer invoke (disposable proof)

For HPT social campaign only, disposable Test Postgres stamp of `socialPromoRenderRelease` (composite hold is otherwise **owner release** — not bypassed in product code):

- `2026-10-27T10:09:30Z` — release stamped (disposable campaign only)
- Re-wake `2026-10-27T10:09:59Z` → **`action: "invoked"`** both SKUs
- **RENDER_FAILURE** (honest, not placeholder):

```text
Font file missing: assets/fonts/source-serif-4/source-serif-4-latin-400-normal.woff2.
The Studio will not render customer work in a substituted typeface.
```

**Cause:** `next.config.ts` **outputFileTracingExcludes** removed `./assets/**/*` from serverless bundles. **Fix in tree (not redeployed in this run):** include `./assets/fonts/**/*` in `/api/**` tracing includes.

**Separate limit:** `/api/**` still excludes `playwright-core` — hosted HTML→PNG capture requires a **Playwright-on-Vercel** package (not invented here).

---

## 4. Package gates (unchanged — not bypassed)

| Package | Blocker | Type |
|---------|---------|------|
| **Clip / SFV** | `activation_phase:awaiting_materials` | Correct — requires **uploaded customer footage** |
| **Campaign Launch Kit** | Factory SKU routing fixed in handoff recovery; HPT intake still **incomplete brief** | Harness + routing re-eval on redeploy |
| **Social (customer path)** | `social_promo_composite_render_held` until **`socialPromoRenderRelease`** | Policy — not weakened |

---

## 5. Files touched (uncommitted)

| Path | Role |
|------|------|
| `src/lib/campaign-design-artifacts/*` | Durable Storage hydrate/commit + workspace wrapper |
| `src/lib/studio-dispatch/ensure.ts` | Workspace + `repoRoot` threading |
| `next.config.ts` | Font tracing for `/api/**` (post-report; redeploy needed) |
| Handoff fixes retained | `intake-submit` defer/`after()`, launch-kit composite SKU |

---

## 6. Register

Update **Hosted Production Team cert** row: artifact Storage layer **PASS WITH LIMITS** on `dpl_HwXykTZdWUcn3xcbGRMtne2LwYkf`; factory E2E **OPEN** (render runtime + materials + composite release).

---

## 7. STOP — remaining blockers (evidence-based)

1. **Redeploy Preview** with font tracing → re-prove render (may next fail on **Playwright** absence).  
2. **Playwright/Chromium on Vercel** — required for real PNG bytes; excluded by current NFT config.  
3. **Social composite render release** — customer automation vs owner stamp (policy).  
4. **Clip/SFV/Kit** — materials upload + complete kit intake (no payment rerun).

**No fabricated QA or delivery PASS** — invoke reached real renderer gate and failed with documented `RENDER_FAILURE`.
