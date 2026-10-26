# STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1 — Register

**Stamped:** 2026-10-26  
**Phase:** Preparation + final preflight + Owner Production evidence  
**Verdict:** **PREPARED — NO-GO FOR EXECUTE** (recovery limits + Vercel) · **Preview plan PREPARED — NOT DEPLOYED**

| Field | Value |
|-------|--------|
| Release code ref | `ed36ba5c817c7c5c78c78bfd53eb4be5d9b7257b` |
| Plan | `docs/launch/studio-production-persistence-storage-cutover-1/STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1-PLAN.md` |
| Preflight report | `STUDIO-PRODUCTION-CUTOVER-FINAL-PREFLIGHT-1-REPORT.md` |
| Master Discoveries | `docs/launch/studio-verified-discoveries-master-record-1/STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-2026-10-25.md` §3b |
| Test Storage preflight | **PASS** 2026-10-26 AM (`studio-files-test`, ref `tzyglhypseyokhbeozjw`) — **not rerun** |
| Production Supabase (Owner 2026-10-26) | **VERIFIED** — `txgzguzlojlhndkbncc` HEALTHY; **`studio-files`** private; **8** scheduled DB backups; latest **2026-10-26 12:59:38 UTC**; **PITR off**; **migrations none** |
| Vercel (Owner 2026-10-26) | Project **`the-studio-company`**; Prod **`fc56426`** OLD; Git **disconnected**; reconciliation + **Preview §7** |
| Preview build fixes | **`18574344`** 2026-10-26 PM — TS + NFT trace + `.vercelignore`; `tsc` PASS · `npm run build` PASS · `activate.test.ts` 12/12 (package evidence) |
| NEW Preview deploy | **IN PROGRESS** — Owner **Vercel Pro** activated; resume **`STUDIO-NEW-SITE-PREVIEW-DEPLOY-1`** from **`18574344`**; Prod **`fc56426` untouched** |
| Production migration / deploy | **NOT RUN** |

**Execute approvals:** §10 plan — migration GO, **`R-04` limits acceptance**, Vercel env + deploy `ed36ba5c`.

**Not authorized without separate stamp:** merge `main`, live Stripe, publication, PITR purchase, live restore, 42/42 or 4/4 rerun.
