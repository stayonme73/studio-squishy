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
| Preview build fixes | **`18574344`** (+ **`d92faf83`**, deploy docs **`7df67f59`**, signup recovery **`5dae8ee0`**) — on GitHub via **thin release sync** (below) |
| GitHub thin release sync | **PASS** 2026-10-26 PM — branch **`operating/mobile-customer-journey-certification-1-thin-release`** @ **`0fc9ad05`** (from **`ee8afb0d`**). **Included:** `18574344`→`bcf012ca`, `d92faf83`→`fddb6bd0`, `7df67f59`→`69be22af`, `5dae8ee0`→`0fc9ad05`. **Excluded:** **`20a5e00e`** (bulk launch media), **`e9edfb42`**, merge **`481bc268`** (empty on remote base). **Original remote branch unchanged** @ **`ee8afb0d`**. Local thick history preserved (**`thin-release-sync-backup`** → **`5dae8ee0`**). Diagnosis: `STUDIO-GITHUB-PUSH-DIAGNOSIS-2026-10-26.md` |
| Vercel Pro | **ACTIVE** — team **`stayonme73s-projects`** · project **`the-studio-company`** |
| NEW Preview deploy | **PASS WITH LIMITS** — signup recovery **`STUDIO-NEW-SITE-PREVIEW-SIGNUP-RECOVERY-1`** · T1 PASS · **T2 PASS** · T4 identity PASS (limits) · T3/T5 not complete · report `STUDIO-NEW-SITE-PREVIEW-SIGNUP-RECOVERY-1-REPORT.md` |
| Production | **`fc56426`** / Welcome Hall **unchanged** on **`studio-squishy.vercel.app`** |
| Production migration / deploy | **NOT RUN** |

**Execute approvals:** §10 plan — migration GO, **`R-04` limits acceptance**, Vercel env + deploy `ed36ba5c`.

**Not authorized without separate stamp:** merge `main`, live Stripe, publication, PITR purchase, live restore, 42/42 or 4/4 rerun.
