# STUDIO-NEW-SITE-PREVIEW-BUILD-BLOCKERS-1 — Report

**Release base:** `ed36ba5c817c7c5c78c78bfd53eb4be5d9b7257b`  
**Package date:** 2026-10-26 (America/New_York)  
**Verdict:** **STOP accepted** — software defects **reduced locally**; **Preview still cannot ship on Vercel Hobby** after fixes (function-count gate).  
**Production OLD site:** **PROTECTED** — no `--prod`, no merge, no push in this package.

---

## 1. Preserved Vercel errors (Preview deploy attempts)

From **STUDIO-NEW-SITE-PREVIEW-DEPLOY-1** (same project **`the-studio-company`**, release **`ed36ba5c`**):

| # | Exact failure |
|---|----------------|
| 1 | Upload body **> 10 MB** (CLI upload) — mitigated with **`.vercelignore`**. |
| 2 | **`npm run build`** failed — TypeScript errors on frozen release. |
| 3 | Serverless function **`api/campaigns/[campaignId]/communications/[communicationId]/test-send`** — **462.21 MB** uncompressed (**> 250 MB** limit). Platform message referenced **`VERCEL_SUPPORT_LARGE_FUNCTIONS=1`**. |
| 4 | After large-functions Preview env flag: **“No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan. Create a team (Pro plan) to deploy more.”** |

**Approximate TypeScript debt on `ed36ba5c`:** **37** distinct `tsc` diagnostics across **15** source files (deploy narrative rounded to **~38**).

**API route inventory:** **65** `src/app/api/**/route.ts` files. Local **`next build`** lists **87** dynamic **`ƒ`** server entries (API + app routes + middleware proxy).

---

## 2. Frozen release vs local delta (not pushed)

| Change | Defect vs deploy config |
|--------|-------------------------|
| **`typescript.ignoreBuildErrors`** in working tree during deploy | **Deploy workaround only** — **removed**; not in this package’s intended release. |
| **`tsconfig.json`** excludes `src/archive`, `data`, `test-artifacts` | **Build config** — shrinks `tsc` surface; archive was not part of customer runtime. |
| **`.vercelignore`** | **Deploy config** — fixes 10 MB upload; no product behavior change. |
| **`scripts/preview-deploy-set-vercel-env.mjs`** | **Deploy tooling** — Preview env only. |
| **Type fixes** (project activity/communication, design renderer stacks, dispatch/post-pay unions, storage narrowing, disposable-kit narrowing) | **Genuine TS defects** on `ed36ba5c`. |
| **`src/types/polotno-schema-shim.d.ts`** | **Optional dependency** typing — runtime still dynamic-imports `@polotno/schema`. |
| **`next.config.ts`** `outputFileTracingExcludes` + `serverExternalPackages` | **Deploy/bundle** — stops multi-GB **`data/`**, **`docs/`**, demo **`public/`** media, Playwright, and wasm sharp from API traces; **Postgres Preview does not rely on shipping local `data/`**. |
| Launch docs (release-freeze register/report) | **Documentation only** — separate from code release. |

**Proposed release delta vs `ed36ba5c`:** code + config above — **Owner approval required** before commit/push.

---

## 3. TypeScript — fix approach (no `ignoreBuildErrors`)

- **`npx tsc --noEmit`:** **PASS** (0 errors) after fixes.
- Representative fixes:
  - **`mutateProjectActivityEnvelope<SubmitResult>`** — union return type.
  - **Project communication** — fail branch must not spread `envelope` onto `{ ok: false }`.
  - **`StackTextSpec` / `PromoStackTextSpec`** — **`y` optional** (stack layout assigns Y).
  - **`promoEditorialHeadlineLayer`** — **`id` not required** on partial (uses `assetId`).
  - **Dispatch / post-pay error unions** — include **`disposable_test_isolation`**, **`production_scope_ambiguous`**.
  - **Supabase storage narrowing** on **`map-flyer-job-truth`**.
  - **Disposable kit isolation** — narrow before **`checkoutSessionId`**.

---

## 4. Oversized function bundles — root cause and mitigation

**Misleading symptom:** Vercel named **`test-send`** (tiny handler; **404 in production**).

**Actual trace (pre-fix, local NFT resolve on `ed36ba5c` build pattern):**

- **~70,573** traced paths; **~6.7 GB** if all resolved — dominated by **`data/` (~4.2 GB)** and **`docs/` (~1.2 GB)** from `path.join(process.cwd(), "data", …)` in shared stores imported by most API routes.
- Secondary: **`public/`** demo MP4s, lobby/route-map plates, **`playwright-core`**, **`@img/sharp-wasm32`**.

**Mitigation (this package):** `outputFileTracingExcludes` in **`next.config.ts`** (global + **`/api/**`**), plus **`serverExternalPackages`** for **`sharp`**, **`canvas`**, **`@napi-rs/canvas`**.

**Post-fix local measurement (same route):**

| Route NFT trace | Before (approx.) | After |
|-----------------|------------------|--------|
| `…/test-send` | **462 MB** (Vercel) / **~6.7 GB** (local full resolve) | **~77 MB** |

**Under default 250 MB** per function with margin; **`VERCEL_SUPPORT_LARGE_FUNCTIONS=1`** on Preview remains useful backup but **should not be required** for size after this trace hygiene.

**Functionality:** No services removed, no catalog narrowing, no quality reduction — excludes only **non-runtime local trees** and **static marketing media not served by API handlers**.

---

## 5. Vercel plan limits (verified 2026-10-26)

| Topic | Finding |
|-------|---------|
| **Hobby 12-function error** | **Still observed** on deploy (exact message above). Community reports same message in **2026**. |
| **Current docs** | [Limits](https://vercel.com/docs/limits): Hobby **“Functions Created per Deployment”** = **framework-dependent**; [Runtimes](https://examples.vercel.com/docs/functions/runtimes.md) states Next.js **bundles** dynamic code into **fewer** functions. |
| **This repo** | **65** App Router API routes + many dynamic pages → deploy **still hit Hobby cap** in production attempt — treat **12-function enforcement as active** for **`the-studio-company`**. |
| **Pro** | **Unlimited** functions per deployment (per limits table). **~$20/seat/mo** team pricing (see [Hobby vs Pro](https://vercel.com/docs/plans/hobby)) — **not purchased** (Owner directive). |
| **`VERCEL_SUPPORT_LARGE_FUNCTIONS=1`** | Platform beta flag (already set Preview-only). Raises size ceiling; **does not** remove **12-function Hobby cap**. |

---

## 6. Is upgrade genuinely necessary?

| Blocker | After software fixes |
|---------|----------------------|
| **TypeScript build** | **Cleared locally** — no longer needs `ignoreBuildErrors`. |
| **250 MB function size** | **Likely cleared** (~77 MB traced on former worst-case route). |
| **Hobby ≤12 functions** | **Still blocking** full NEW Studio Preview — **~65 API routes** and deploy error **#4** unchanged by code. |

**Conclusion:** **Vercel Pro (or a different host / project split)** is **unavoidable** for deploying this **full** Next app on **`the-studio-company`** as configured. Software fixes **do not** substitute for plan capacity.

**Alternatives (not executed — Owner decision):** split customer API vs static export; remove or gate dev/cert API routes from production build; different platform. Each is a **product/architecture** decision, not done in this package.

---

## 7. Local verification (targeted)

| Check | Result |
|-------|--------|
| **`npx tsc --noEmit`** | **PASS** |
| **`npm run build`** | **PASS** (after tracing excludes) |
| **`vitest run src/lib/studio-post-pay-activation/activate.test.ts`** | **12/12 PASS** |
| **Full 42/42 · 4/4** | **Not rerun** (per standing directive) |
| **`vercel build` (function count)** | **Not run** — local project settings / auth not available in this package |

---

## 8. Smallest next deployment action

1. **Owner:** Approve **commit + push** of release delta vs **`ed36ba5c`** (table §2).
2. **Owner:** Authorize **Vercel Pro** for **`the-studio-company`** *or* an explicit alternative hosting strategy.
3. **Operator:** `vercel login` if needed → Preview deploy from approved tip → set **`NEXT_PUBLIC_SITE_URL`** → **T1–T5** smokes (**STUDIO-NEW-SITE-PREVIEW-DEPLOY-1** resume).

**Do not:** `--prod`, Production Supabase cutover, merge to **`main`**, or live Stripe.

---

## 9. Related docs

- `STUDIO-NEW-SITE-PREVIEW-DEPLOY-1-REPORT.md`
- `STUDIO-VERCEL-CONFIGURATION-RECONCILIATION-2026-10-26.md` §7
- `STUDIO-RELEASE-FREEZE-1-REPORT.md` (base **`ed36ba5c`**)
