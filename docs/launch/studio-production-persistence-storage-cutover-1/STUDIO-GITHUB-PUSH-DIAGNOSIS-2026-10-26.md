# GitHub push failure — focused diagnosis (2026-10-26)

**Branch:** `operating/mobile-customer-journey-certification-1`  
**Local tip:** `7df67f59` (+ signup recovery commit when stamped)  
**Remote tip (verified `git ls-remote`):** `ee8afb0d`  
**Ahead by:** 6 commits (before recovery commit)  
**Symptom:** `git push` → `HTTP 500`, `RPC failed`, `send-pack: unexpected disconnect while reading sideband packet` (also hangs on retry).

---

## Conclusion (not a generic GitHub outage assumption)

**Primary cause: push payload — multi‑gigabyte objects in commit `20a5e00e`.**

This is **repository content / history shape**, not evidence that the NEW Studio Preview app is broken.

---

## Evidence

| Check | Result |
|-------|--------|
| Commits not on remote | `20a5e00e`, `e9edfb42`, `18574344`, `d92faf83`, `481bc268`, `7df67f59` |
| **`20a5e00e`** stat | **`37690 files changed`**, ~3.2M insertions — bulk under `docs/launch/` |
| Largest new blobs in unpushed range | **`The Studio Long Video.mp4` ~2.4 GB**; other live-proof **`*.mp4` / `*.webm`** hundreds of MB each |
| Video paths in range | **796** added `*.mp4|webm|mov` paths (sample) |
| Commits **`18574344`–`7df67f59`** | Normal product/docs size (~25 files in build fix; doc-only merges) |
| `git count-objects` (worktree) | **size-pack ~8.72 GiB** (whole object store; includes above) |
| Remote read | **`git ls-remote`** OK → `ee8afb0d` (service reachable for read) |
| Blind push retries | Repeated **500 / hang** — consistent with oversized pack upload |

GitHub documents file/size limits (100 MB per blob hard limit on standard Git; pushes with very large packs often fail or timeout). A **2.4 GB** blob in history explains receive-pack failure better than an unexplained platform outage.

---

## What is **not** the cause

- Preview signup / Postgres / Vercel env (hosted T2 **PASS** after env fix).
- The six commits taken as a single “release” without separating **`20a5e00e`** from the **`18574344`** preview build-fix line.

---

## Recommended remediation (Owner authorization required)

**Do not** repeat identical `git push` until history is split or blobs removed.

| Option | Action | Tradeoff |
|--------|--------|----------|
| **A — Sync lane (recommended)** | New branch from **`origin/operating/mobile-customer-journey-certification-1` @ `ee8afb0d`**; **cherry-pick** `18574344`, `d92faf83`, `481bc268`, `7df67f59`, signup-recovery commit; **omit `20a5e00e`** (and optionally re-apply **`e9edfb42`** doc-only if needed); push **thin** branch | Preserves local mega-commit on original branch for archive; remote gets releasable tip |
| **B — History rewrite** | `git filter-repo` / BFG to strip `docs/launch/**` videos from branch; force-push | **Force-push** — needs explicit Owner GO; rewrites shared history |
| **C — LFS migration** | Move large media to Git LFS, rewrite history | Heavier; still rewrite + force-push |

**Separate track:** Relocate launch video evidence to Dropbox / object storage (already used elsewhere in Project Alpha); keep **pointers or manifests** in git, not multi‑GB binaries.

---

## Signup recovery commit (local)

Preserved in a **dedicated commit** on the same branch (product + launch docs only; no probe scripts). Push that commit only as part of **Option A** thin branch, not with **`20a5e00e`**.

---

## Next steps

1. Owner **authorize** signup-recovery commit (if not already stamped) and **Option A** branch push.
2. Continue **T3 / T5** Preview smokes on Vercel (no Production, no live Stripe).
3. Do **not** merge/promote until GitHub tip matches intended release commits **without** accidental media bulk.
