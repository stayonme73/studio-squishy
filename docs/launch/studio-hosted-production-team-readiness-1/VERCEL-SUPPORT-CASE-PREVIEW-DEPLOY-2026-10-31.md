# Vercel Support Case — Preview deploy fails at “Deploying outputs” (2026-10-31)

**Submit via:** [Vercel Dashboard → Help](https://vercel.com/help) or account support channel for team **stayonme73s-projects** / project **the-studio-company** (`prj_EDqYPQwY3gbLs0Orc1K4JqVJfVyx`).

**Subject:** Preview deployments fail with “internal Vercel error” immediately after “Deploying outputs…” (Next.js 16, NFT whole-project trace warning)

---

## Summary

Multiple Preview deployments **complete `next build` and `Build Completed in /vercel/output`**, then fail during **“Deploying outputs…”** with:

> The deployment failed because of an internal Vercel error.

This is **not** a TypeScript compile failure. Build logs show **NFT / file-tracing warnings** that the **entire repo** may be traced unintentionally (import trace through `next.config.ts` and `src/app/api/campaigns/[campaignId]/studio-extras/files/.../route.ts`).

**Git integration branch (integrated clip-repurposing fixes):** `preview/clip-repurposing-integration-2026-10-31` @ `6191d640` / `d55b3312` (docs only).

---

## Failed deployment IDs (sanitized pattern)

| Deployment ID | URL slug | Build duration | Post-build | Notes |
|---------------|----------|----------------|------------|--------|
| `dpl_7LX7U91qMEuT9Teefjr9r2wXRAUa` | `c0s50qbq9` | 27m 16s | 18s | Git commit `6191d640`; logs: cache from `9HQC72wZVk9AW99sUHVoSwyUpiSL`, output build ~1m, then deploy outputs fail |
| `dpl_3UJMk5VKJS1v9dy7tFvNmPfnkYn3` | `rm33og6rf` | ~28m | ~19s | Same internal error |
| `dpl_Cu4D7KM2zofY7yCRaXiEEevSwiuc` | `2j60i8c4r` | ~27m | — | Same internal error |
| `dpl_Eo5jLxTJrFygVvsNLutUJgGrEuJM` | `4wb1hcghk` | ~27m | — | Same internal error |

**Last known Ready Preview (older code):** `dpl_9HQC72wZVk9AW99sUHVoSwyUpiSL` (`evck8xks9`).

---

## Log excerpts (sanitized — no secrets)

From `vercel inspect dpl_7LX7U91qMEuT9Teefjr9r2wXRAUa --logs`:

```
Downloading 4311 deployment files...
Restored build cache from previous deployment (9HQC72wZVk9AW99sUHVoSwyUpiSL)
...
Encountered unexpected file in NFT list
A file was traced that indicates that the whole project was traced unintentionally.
Import trace:
  ./next.config.ts
  ./src/app/api/campaigns/[campaignId]/studio-extras/files/[extraId]/[unitId]/[index]/route.ts
...
Build Completed in /vercel/output [1m]
Deploying outputs...
→ status ● Error — internal Vercel error
```

**Build machine:** standard elastic, 4 vCPU, 8192 MiB. **Build cache:** often unavailable on failed attempts; successful compile sometimes uses cache from `9HQC`.

---

## Project configuration (relevant)

- **Framework:** Next.js 16.2.x, Node 24.x on Vercel
- **`vercel.json`:** `includeFiles` for `ffmpeg-static` / `ffprobe-static` on `src/app/api/**/*.ts`
- **`next.config.ts`:** `outputFileTracingExcludes` for `./data/**/*`, heavy `public/**` paths on `/api/**`

---

## Request to Vercel

1. **Root cause** of internal error at **Deploying outputs** for the deployments above (artifact size limit, function count, upload timeout, platform bug, etc.).
2. **Actionable fix:** config or platform guidance to stop **whole-repo NFT tracing** for the cited API route / `next.config.ts` import chain.
3. Confirm whether **4311 deployment files** / traced output size exceeds plan limits for Hobby team **stayonme73s-projects**.

---

## What we are not requesting

- Production promotion or domain change
- Account billing changes

---

## Owner follow-up (engineering, separate from ticket)

- **2026-10-31 bounded DO prebuilt:** failed at **`vercel pull`** — no credentials on headless Linux (`VERCEL_OIDC_TOKEN` invalid as `--token`; PAT on DO **deferred** until packaging fix is verified insufficient).
- **Desk Windows prebuilt:** `vercel build` fails **`EPERM` symlink** when packaging functions.
- **2026-10-31 Owner GO — packaging first:** replace `path.join(process.cwd(), artifact.path)` on `studio-extras/files/.../route.ts` with scoped `studioExtraArtifactAbsolutePath` (same class of fix as `STUDIO-NEW-SITE-PREVIEW-BUILD-BLOCKERS-1-REPORT.md`); local `npm run build` verification before **one** bounded Preview deploy; support case filed in parallel. No merge to main.
