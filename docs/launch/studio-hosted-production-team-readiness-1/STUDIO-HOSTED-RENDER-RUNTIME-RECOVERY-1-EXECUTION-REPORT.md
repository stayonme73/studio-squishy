# STUDIO-HOSTED-RENDER-RUNTIME-RECOVERY-1 — Execution Report

**Date:** 2026-10-27  
**Verdict:** **PASS WITH EXPLICIT LIMITS** (hosted genuine render + Storage bytes; not full Social package customer-journey cert)  
**Authoritative Preview deployment:** `dpl_8fAG9y6qHYcA5Gso4qdTvZ6VavbZ`  
**Preview URL:** `https://the-studio-company-avcaex9ve-stayonme73s-projects.vercel.app`  
**Accepted upstream:** `STUDIO-HOSTED-PRODUCTION-ARTIFACT-STORAGE-1` — **PASS WITH EXPLICIT LIMITS** (not re-run)

**Not done:** commit, push, merge, Production deploy, live Stripe, customer-journey stamp, auto-weakening of `socialPromoRenderRelease`.

---

## 1. Runtime fixes deployed (uncommitted)

| Area | Change | Evidence |
|------|--------|----------|
| Fonts on Vercel | Removed wholesale `assets` from `.vercelignore`; kept NFT includes for `./assets/fonts/**/*` | Probe: all three Source Serif 4 faces `exists: true` at `/var/task` |
| Fonts in `/tmp` workspace | `seedHostedDeployAssetsIntoWorkspace()` copies `assets/fonts` into durable workspace before render | Post-fix: no `FONT_FILE_MISSING`; promotion SKU **RENDERED** |
| Playwright on serverless | `playwright-core` + `@sparticuz/chromium`; split hosted/local launch; `serverExternalPackages` | Probe: `chromium.ok: true`, `launch_and_close_ok` (~3s warm) |
| NSS / `libnss3.so` on Vercel Node 24 | Shim `AWS_EXECUTION_ENV=AWS_Lambda_nodejs22.x` before importing `@sparticuz/chromium` so `al2023.tar.br` extracts | Prior deploy: `libnss3.so` failure → fixed on `dpl_31PzV3H8nkevoRhF1budmVSHkKvX` and later |
| Disposable re-run | Preview-only `POST /api/hosted-cert/continue-paid-intake-chain` (`maxDuration: 300`) | 200 in **~36s** on `dpl_8fAG9…` |

---

## 2. Probe (`GET /api/hosted-cert/render-runtime-probe`)

**Deployment:** `dpl_8fAG9y6qHYcA5Gso4qdTvZ6VavbZ` · 2026-10-27T12:27–12:31 UTC (prior build) / reconfirmed on final deploy stack

```json
{
  "vercelEnv": "preview",
  "fonts": [{ "exists": true }, { "exists": true }, { "exists": true }],
  "chromium": { "ok": true, "message": "launch_and_close_ok" }
}
```

---

## 3. Social & Promo disposable HPT render retry

**Campaign:** `disposable-hpt-cert-social_and_promo_graphics-cfee3b4a`  
**Method:** `POST /api/hosted-cert/continue-paid-intake-chain` on `dpl_8fAG9y6qHYcA5Gso4qdTvZ6VavbZ`  
**Gate note:** `socialPromoRenderRelease` remains product-controlled; prior **disposable** Postgres stamp used only for cert — **not** counted as customer-journey certification.

| SKU | Result | Detail |
|-----|--------|--------|
| `v2-rtu-promotion-graphics` | **PASS** | `invocationOutcome: RENDERED`, design loop `passed`, `pngContentSha256: 6e83cbec…` |
| `v2-rtu-social-posts` | **QA_FAILURE** | Required on-artifact copy missing (intake/test copy), **not** `RENDER_FAILURE` / Playwright |

Runtime logs (Postgres observer messages):

- Promotion: QA pass, receipt under `data/campaign-design-artifacts/.../campaign_graphics/renders/v1/`.
- Social posts: `Design-quality failed (1): Required on-artifact information missing: "Free mini-consultations Saturday 10–4…"`

---

## 4. Supabase Test Storage — genuine PNG/PDF bytes

**Bucket:** Test `studio-files-test` (env from `.env.local` preflight — not re-run)  
**Prefix:** `campaign-design-artifacts/disposable-hpt-cert-social_and_promo_graphics-cfee3b4a/`

- **12** objects ending in `.png` / `.pdf` (both branches present in Storage from prior + current runs).
- Sample verification (promotion graphics v1):
  - `campaign-graphic-portrait.png` — **66,700** bytes, magic `89504e47` (PNG)
  - `campaign-graphic-portrait.pdf` — **12,889** bytes, magic `%PDF-`
  - Square variants similarly valid.

**Hydrate path:** `withCampaignArtifactProductionWorkspace` lists Storage → `/tmp` workspace → render → commit; second hosted invocation on same campaign uses hydrated tree (prefix walk shows persisted v1 renders).

---

## 5. Playwright / serverless blocker assessment

| Constraint | Status |
|------------|--------|
| Chromium binary + AL2023 libs in function bundle | **Addressed** (tracing + env shim); cold extract adds latency |
| `playwright-core` vs `@sparticuz/chromium` 131 | **Works** for capture on Preview; version pairing not re-certified for all SKUs |
| Vercel function duration / memory | **Observed ~36s** for dual-branch dispatch on Pro; risk on cold + multi-SKU |
| Vercel Node 24 vs Sparticuz AWS detection | **Requires shim** until upstream detects Vercel/Node 24 |
| Function size (~60MB `chromium.br`) | **Deployed**; monitor limit on future routes |

No placeholder renderer substituted; quality gates left intact.

---

## 6. QA / Review

- **Independent Quality:** Exercised on **promotion-graphics** only (automated design-quality **pass**).
- **Social posts:** Render path reached QA; failure is **content completeness**, not infrastructure — Review Room / customer Review **not** stamped for social branch on this disposable run.

---

## 7. Remaining limits

1. **Social posts SKU** on disposable data: **QA_FAILURE** until intake/copy matches required on-artifact strings (separate content/test-data slice).
2. **`socialPromoRenderRelease`:** Product gate unchanged; disposable override remains **diagnostic only**.
3. **Chromium on Vercel:** Env shim is operational debt; Node 24 not first-class in `@sparticuz/chromium`.
4. **Checkout / payment / lane-claim / artifact-storage package:** Not repeated (no demonstrated regression).
5. **Changes uncommitted** — Preview deploys from local tree only.

---

## 8. Deployment lineage (this package)

| Deployment ID | Notes |
|---------------|--------|
| `dpl_FwPmbQxZMfHcW8p2DSr6Uj3VFU5d` | Fonts missing (`.vercelignore`); `libnss3.so` |
| `dpl_6ueVRVzyeRBJi6vJYjmPWEfT5uuR` | Fonts fixed; Chromium path error (custom bin path) |
| `dpl_31PzV3H8nkevoRhF1budmVSHkKvX` | Probe fonts + Chromium **ok** |
| `dpl_8fAG9y6qHYcA5Gso4qdTvZ6VavbZ` | **Authoritative** — workspace font seed + successful promotion render + Storage bytes |
