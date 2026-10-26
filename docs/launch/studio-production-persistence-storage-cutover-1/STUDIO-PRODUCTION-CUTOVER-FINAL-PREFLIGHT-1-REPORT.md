# STUDIO-PRODUCTION-CUTOVER-FINAL-PREFLIGHT-1 — Report

**Release code ref:** `ed36ba5c817c7c5c78c78bfd53eb4be5d9b7257b`  
**Updated:** 2026-10-26 (Owner Supabase Production evidence)

## Verdict

| | |
|--|--|
| **Cutover EXECUTE** | **NO-GO** until recovery limits accepted + Vercel deploy path + §10 GO |
| **Prepared plan** | **GO** |
| **Production Supabase target** | **VERIFIED** (Owner dashboard, 2026-10-26) |

## Owner-verified Production Supabase (2026-10-26)

| Item | Status |
|------|--------|
| Project **The Studio Production**, ref **`txgzguzlojlhndkbncc`** | **VERIFIED** |
| Project **HEALTHY** | **VERIFIED** |
| Bucket **`studio-files`**, public **OFF** | **VERIFIED** |
| Storage policies listed | **0** |
| Scheduled **database** backups (Oct 19–26, 2026) | **VERIFIED** — latest **2026-10-26 12:59:38 UTC** |
| Point-in-Time Recovery | **NOT enabled** |
| Production migrations (dashboard) | **None applied** |
| Production restore demonstrated | **No** |
| DB backups include Storage objects | **No** |
| Complete Production customer-file recovery | **Not evidenced** |

Stale Scout claim (**Production ref invalid / DNS**) — **withdrawn**. Do **not** create **`studio-files`**.

**Protected:** Test 42/42 and 4/4 — **not rerun**.

## Recovery demonstration (read-only assessment)

- **Required before EXECUTE:** Owner **written acceptance of `R-04` WITH EXPLICIT LIMITS** — daily DB backups only, **no PITR**, **no demonstrated restore**, **Storage bytes not in DB backups**, customer-file recovery **not complete**.
- **Optional (separate package):** Non-destructive drill (e.g. restore scheduled backup to a **disposable** project) — **not performed**; **no PITR purchase**; **no in-place Production restore** without EXECUTE authorization.

First migration while dashboard shows **no migrations** and no production file corpus is **compatible with Option A** if Owner signs limits.

## Vercel — VERIFIED (Owner, 2026-10-26)

Project **`the-studio-company`**: Production **`studio-squishy.vercel.app`** = OLD @ **`fc56426`** / **`main`** (2025-06-22); **Git disconnected**; Production **no branch tracking**; Preview+Dev exist; many Production env vars (values UNKNOWN). Reconciliation: **`STUDIO-VERCEL-CONFIGURATION-RECONCILIATION-2026-10-26.md`**.

## Remaining blockers

1. **`R-04` / Production recovery** — scheduled DB backups yes; PITR off; restore not demonstrated; Storage not in DB backups.  
2. **Vercel deploy** — **`ed36ba5c` not deployed**; Preview-first path documented; **`STUDIO_PERSISTENCE_BACKEND` / `DATABASE_URL`** — confirm in **full** env inventory.  
3. **EXECUTE** — five migrations + env delta + smokes.  
4. **Needs Attention** auth provider vars — investigate exact names; likely legacy vs `ed36ba5c` code.  
5. **Storage policies (0)** — service-role path review at EXECUTE.

## Owner approvals still required

1. **GO** migration window on verified Production project.  
2. **Accept `R-04` limits** (or authorize optional non-destructive drill package).  
3. **GO** Vercel Production env + deploy/promote **`ed36ba5c`** (Preview-first; merge to `main` not required).

**Evidence detail:** cutover plan **§12** · Master Discoveries **§3b** · register.
