# STUDIO-HOSTED-SOCIAL-PROMO-FINAL-CERTIFICATION-1 — Execution Report

**Verdict:** **PASS WITH EXPLICIT LIMITS** (fresh disposable hosted Preview E2E for Social & Promo Graphics homepage package; product render-release path connected; genuine revision v2 artifacts; no Scout Postgres steering on the happy path.)

**Accepts prior:** `STUDIO-HOSTED-SOCIAL-PROMO-REVIEW-HANDOFF-1` **PASS WITH EXPLICIT LIMITS** (composite review bind + Review → delivery on Preview).

**Preview deployment (this package):** `dpl_7K8zNWYYku22nyQhgrxiWi4sETVy` · `https://the-studio-company-b0qpk1oab-stayonme73s-projects.vercel.app`

**Authoritative run:** campaign `disposable-hosted-sp-final-cert-d03a76a8` · `HOSTED-SOCIAL-PROMO-FINAL-CERTIFICATION-1-RUN.json`

---

## 1. `socialPromoRenderRelease` — policy trace and authorized path

| Question | Finding |
|----------|---------|
| **Frozen intent** | Composite branch observation respects `campaign.socialPromoRenderRelease` (Owner release of the Social & Promo composite render hold — `src/config/studio-board.ts`, observer in `design-renderer-observer.ts` / `SOCIAL_PROMO_COMPOSITE_RENDER_HOLD`). |
| **Owner exception vs Quality vs workflow** | **Not** an automated Quality release. **Not** a forged Owner HTTP decision. Historically **machine-cert** disposable campaigns (`disposable-social-promo-machine-cert-*`) stayed held until **explicit owner stamp scripts** — intentional isolation. **Product gap:** paying customers had no durable stamp without manual Postgres / cert scripts. |
| **Connected path (this package)** | `ensureSocialPromoCompositeRenderRelease` in `src/lib/studio-dispatch/social-promo-composite-render-release.ts` stamps release after **confirmed payment + submitted intake** on the **current door** package, **excluding** machine-cert isolation campaigns. Wired from intake advance / `continuePaidIntakeOperatingChain` (`intake-submit.ts`). |
| **E2E proof** | Run ledger **`socialPromoRenderRelease-product-path` PASS** — reason: *Confirmed payment and submitted Project Intake — automatic Social & Promo composite render authorization (current door).* `authorizedBy: "owner"` is the **existing envelope field** for a recorded release, not a substitute for a separate Owner Console click. |

**Limit:** Machine-cert and other isolation campaigns **still require** owner stamp scripts; do not treat this auto-release as overriding that frozen cert lane.

---

## 2. Revision accounting and corrected artifacts

| Check | Result |
|-------|--------|
| **`correctionUses: 0` confusion (prior handoff)** | Wrong diagnostic field. Authoritative ledger is **`jobCorrectionUses`** on the tasks envelope. |
| **This run** | **`jobCorrectionUses: 1`** after one `request_revision` PATCH — **PASS**. |
| **Three-round allowance** | Not exhaustively re-certified here; one genuine round consumed and locked — consistent with package revision policy. |
| **Corrected production** | **PASS** — `renderVersion=2`, social PNG SHA **v1** `84f2531d…` → **v2** `faee04ba17dd…` (matches released CDF `contentSha256` / Storage checksum). |

**Root cause (offer-led cert intake):** HPT cert intake is **offer-led**, not `theme_led`. Revision idempotency + layout changes were initially theme-led-only. **Fix (uncommitted):** `revisionInstruction` on offer-led social truth; revision salt in social/promo dispatch fingerprints for non–theme-led; offer-headline typography softening in `layoutOfferLead` when revision note matches tone/headline cues.

---

## 3. Fresh disposable customer scenario (no Postgres steering)

| Stage | Status |
|-------|--------|
| Stripe TEST checkout + webhook | PASS |
| Intake submit | PASS |
| Auto render release | PASS |
| `continue-paid-intake-chain` | PASS (~16s production wait observed) |
| Both SKUs v1 production | PASS |
| Parent `ready_for_review` | PASS |
| Customer Review GET (8 deliverables) | PASS |
| One revision + v2 artifacts | PASS |
| Approve → `ready_for_delivery` | PASS |
| 8/8 released CDFs | PASS |
| Cross-customer Review denial | PASS (403) |
| Durable second campaign GET | PASS |

**Harness:** `scripts/hosted-social-promo-final-certification-1.mjs` — no `stampRenderRelease` SQL.

---

## 4. Released bytes and access

| Check | Result |
|-------|--------|
| **Ledger `exact-byte-download`** | **FAIL (HTTP 0)** on the cert run — Windows harness passed `-sS` to `vercel curl`; Vercel CLI interprets **`-S` as `--scope`**. |
| **Post-fix verification** | `hosted-preview-vercel-curl.mjs` uses **`--silent` / `--show-error`**. Same deployment + owner session + file-room route → **HTTP 200**, **60324** bytes, SHA256 **`faee04ba17dd…`** matches released CDF (v2 social post 1). |
| **Cross-customer** | Review API **403** for unrelated session (cert run). |

**Limit:** Re-run full cert script after harness fix for a single ledger-all-green JSON; byte integrity is otherwise proven by CDF checksum + post-fix download.

---

## 5. Scout / Postgres steering

Routine product path did **not** require Scout to manually UPDATE `socialPromoRenderRelease` or parent spine for this campaign. Test DB reads in the harness are **verification only**, not production steering.

---

## 6. Explicit limits (not FAIL blockers for hosted Preview product cert)

1. **Machine-cert render hold** — owner stamp scripts remain required; auto-release is **customer current-door only**.
2. **Cert intake shape** — offer-led HPT answers; theme-led revision typography path also implemented but not this E2E’s intake mode.
3. **Preview harness** — binary download stage fixed after run; document or re-run for all-green ledger.
4. **Browser `/deliverables` UI** — not browser-stamped; file-room API is authoritative (prior handoff: 307 without redirect follow).
5. **Serverless timing** — `continue-paid-intake-chain` / re-render after revision subject to Vercel duration; observed ~16–34s on this deployment.
6. **No commit / push / Production** — all evidence on isolated Preview + Test Postgres + Test Storage.

---

## 7. Code touched (uncommitted)

- Render release: `social-promo-composite-render-release.ts`, `intake-submit.ts`
- Review bind (handoff): `machine-social-promo-review-bind.ts`, `collect.ts`, `ensure.ts`
- Revision re-render: `map-social-promo-offer-led-truth.ts`, `social-posts-dispatch-hook.ts`, `promo-dispatch-hook.ts`, `social-posts-reason.ts`, theme-led mappers/types (prior slice)
- Harness: `hosted-social-promo-final-certification-1.mjs`, `hosted-preview-vercel-curl.mjs`

---

## 8. Verdict summary

| Scope | Stamp |
|-------|--------|
| Close Social & Promo hosted journey gaps (release gate + revision bytes + fresh E2E) | **PASS WITH EXPLICIT LIMITS** |
| Full hosted Preview certification with zero documented harness/runtime caveats | **Not stamped** — machine-cert hold + cert ledger byte stage + browser delivery UI |

**STOP conditions:** None encountered requiring Owner business judgment, third-party blocker, or material factory defect beyond the documented limits above.
