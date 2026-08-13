# STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Owner decisions sealed into this package:**

- SOCIAL-POSTS DELTA B — SMALL EXTENSION (accepted)
- SOCIAL-POSTS RENDERER PROOF — **PASS** (visual **PASS WITH LIMITS**)
- Four-post campaign set / captions / posting order — **ACCEPTED**
- INTAKE-TRUTH-1 — structure READY (Harbor roles = Machine layouts, not customer contract)
- SOCIAL-POSTS DISPATCH HOOK — **AUTHORIZED** (this package)
- Flyer / Card / Menu / Service-sheet / Promotion-graphics — **PROTECTED**
- Canva = OFF fulfillment spine for this SKU
- Make — **NOT REQUIRED**
- SKU #7 — **PARKED**

---

## 1. Locks carried from Owner authorization

| Lock | Honored |
|------|---------|
| Exactly four posts | Yes |
| Durable IDs `social-post-1…4` | Yes |
| Durable order 1–4 | Yes |
| Roles/layouts via Studio production (not Harbor-as-customer-contract) | Yes — INTAKE-TRUTH-1 mapper |
| Square `cert-square-1024` executable | Yes |
| Portrait / TikTok fail-closed | Yes |
| Captions Studio-written from authoritative truth | Yes |
| Reject smuggled `postN_roleAngle` | Yes |
| No new customer role/plate questionnaire | Yes |
| `primaryTool` remapped only in this package | Yes — this SKU only |
| Five sealed lanes untouched | Yes (observer allow-list only) |
| SKU #7 parked | Yes |

---

## 2. Scope delivered

Thin `dd:{jobId}` invoke for **`v2-rtu-social-posts` only** so EXECUTION_IDENTITY_READY jobs auto-produce a coordinated four-post campaign set (PNG/PDF/HTML ×4 + captions + posting order) via `studio_design_renderer` after `ensureDispatchExecution`.

Consumes INTAKE-TRUTH-1 structure + campaign-level intake facts. No customer role menu. No plate substitution. No Canva. No Make.

---

## 3. Plate execution lock

| Plate / surface | Intake | Execution |
|-----------------|--------|-----------|
| Square 1024×1024 (`cert-square-1024`) | implied (one platform size) | **EXECUTABLE** |
| Instagram chip “portrait” copy | advisory text only | **NOT executable** (square label) |
| TikTok (catalog schema option) | recordable on schema | **FAIL CLOSED** |

---

## 4. Files changed (uncommitted)

| Path | Role |
|------|------|
| `sku-overrides.ts` | Social `primaryTool` → `studio_design_renderer` (this SKU only) |
| `map-social-job-truth.ts` | Intake → SocialPostsProjectTruth + structure + executable gate |
| `social-posts-hook-idempotency.ts` | Campaign-set fingerprint / lock / receipts (4 posts + captions + order) |
| `social-posts-dispatch-hook.ts` | `invokeSocialPostsDispatchHook` |
| `social-posts-dispatch-hook.test.ts` | Hook gates, idempotency, versioning, fail-closed |
| `design-renderer-observer.ts` | + social-posts observe |
| `design-renderer-observer.test.ts` | Social auto-invoke + ALREADY_RENDERED |
| `ensure.ts` | Comment: + social-posts |
| `index.ts` (dispatch) | Exports |
| `social-posts-contracts.ts` / fixtures / proof.test | Remap flags + expectations |
| `service-sheet-dispatch-hook.test.ts` | Expects social on renderer |
| This report | Governing record |

**Prior uncommitted social proof + intake-truth stacks** remain in the working tree alongside this hook.

---

## 5. Hook contract

`invokeSocialPostsDispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

Gates (fail-closed):

1. `skuId === v2-rtu-social-posts`
2. `executionIdentityReady === true`
3. `primaryTool === studio_design_renderer`
4. Structure mapper OK (purpose / action / platform; no smuggled roles)
5. Square plate executable
6. Required campaign/material/contact/price/date truth present (no invent)
7. Success requires **4/4** posts + **4** captions bound + posting order + set QA

Idempotency: same fingerprint → `ALREADY_RENDERED` (no new set version).  
Authoritative truth change → immutable campaign-set `vN+1` (whole set).

---

## 6. Executor truth

| SKU | primaryTool |
|-----|-------------|
| `v2-rtu-flyer` | `studio_design_renderer` (sealed) |
| `v2-rtu-business-card` | `studio_design_renderer` (sealed) |
| `v2-rtu-menu` | `studio_design_renderer` (sealed) |
| `v2-rtu-service-sheet` | `studio_design_renderer` (sealed) |
| `v2-rtu-promotion-graphics` | `studio_design_renderer` (sealed) |
| `v2-rtu-social-posts` | **`studio_design_renderer`** (this package) |
| Other design SKUs | unchanged (Canva baseline where previously set) |

---

## 7. Observer path

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ social-posts observer gate
→ invokeSocialPostsDispatchHook
→ INTAKE-TRUTH-1 structure + campaign truth
→ 4 posts PNG/PDF + captions + posting order + set QA
→ durable campaign-set identity
```

Repeated observation is harmless (`ALREADY_RENDERED`).

---

## 8. Owner-independence

Routine Owner production: **NONE**  
Canva required: **false** (this SKU)  
Make required: **false**

---

## 9. Exactly one recommended next step

**Owner/Manager review this DISPATCH-HOOK-1 report**, then authorize commit (and later seal / next-SKU selection) only if accepted. Do not start SKU #7 until social lane is sealed by Owner.

---

## Scout

**PARKED.**
