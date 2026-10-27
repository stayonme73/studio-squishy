# STUDIO — Thin-Release GitHub Preservation Report

**Date:** 2026-10-27  
**Branch:** `operating/mobile-customer-journey-certification-1-thin-release`  
**Base preserved:** `78b3ac4f`  
**Remote tip after push:** `0c6e1b9aa2ac007f509d05f78fd05e0fd7cbb4b8`

## Verdict

**PASS WITH EXPLICIT LIMITS** — hosted Social & Promo engineering + spine preserved on GitHub without bulk media; Production unchanged.

## Gates

| Gate | Result |
|------|--------|
| Lane claims concurrency tests | **PASS** (test isolation: aligned `nowMs` + pre-test table cleanup; not a product capacity defect) |
| Harness credentials | **PASS** — `STUDIO_HOSTED_CERT_TEST_PASSWORD` from env / `.env.local` only |
| Manifest | **77 paths** `78b3ac4f..0c6e1b9a`; no video; no ops-bridge log / vitest dumps / review-shell screenshots |
| `tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| Targeted vitest (release set) | **PASS** (7 tests incl. Postgres lane claims) |
| Push | **PASS** — no force-push |

## Commits (7)

| SHA | Subject |
|-----|---------|
| `107a1973` | fix(vercel): ship fonts and chromium for hosted design render |
| `659aa14a` | feat(artifacts): hosted campaign design artifact workspace |
| `830c3a45` | feat(job-control): postgres lane claims on Vercel *(includes paid intake / dispatch / hosted-cert continue-chain — merged scope)* |
| `257f07f2` | fix(social-promo): hosted composite release, review bind, revision re-render |
| `f5aab50a` | fix(dispatch): campaign launch kit factory SKU routing |
| `7f2dadc4` | chore(scripts): hosted Preview cert harness |
| `0c6e1b9a` | docs(launch): hosted production team and Social and Promo evidence |

## Explicit limits

- **Preview deploy anchor** for Social cert remains **`dpl_7K8zNWYYku22nyQhgrxiWi4sETVy`** until Owner redeploys from Git tip.
- **Migration** `20261027200000_studio_lane_claims.sql` is in repo only — **Production apply not authorized**.
- **Remaining homepage packages** (short-form video, clip repurposing, campaign launch kit hosted factory) **OPEN** — not re-certified here.
- **Working tree leftovers** (ops-bridge, bridge.md, probes) intentionally **not** pushed.

## Harness note

Set `STUDIO_HOSTED_CERT_TEST_PASSWORD` in local `.env.local` before running committed cert scripts.
