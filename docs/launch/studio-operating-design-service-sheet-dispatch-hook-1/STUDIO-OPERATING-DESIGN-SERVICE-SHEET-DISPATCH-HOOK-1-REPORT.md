# STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Owner decisions sealed into this package:**

- SERVICE-SHEET DELTA B — SMALL EXTENSION (accepted)
- SERVICE-SHEET RENDERER PROOF — **PASS** (Owner visual control locked)
- Pricing modes locked: `listed` · `contact_for_pricing` · `omitted`
- SERVICE-SHEET DISPATCH HOOK — **AUTHORIZED** (this package)
- Flyer / Card / Menu — **PROTECTED**
- Make — **NOT REQUIRED**

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Branch tip (pre-package) | `a92947a156fee54a25916da5803c9224ba1ed350` |
| Proof | STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1 |
| Visual evidence | `docs/launch/.../service-sheet-proof-1/artifacts/v2-rtu-service-sheet/renders/v1/service-sheet.png` |

---

## 2. Scope delivered

Thin `dd:{jobId}` invoke for **`v2-rtu-service-sheet` only** so EXECUTION_IDENTITY_READY jobs auto-produce a single-page service sheet via `studio_design_renderer` after `ensureDispatchExecution`.

Does **not** migrate promotion-graphics, social-posts, or any other design SKU.

---

## 3. Files changed (uncommitted)

| Path | Role |
|------|------|
| `sku-overrides.ts` | Service-sheet `primaryTool` → `studio_design_renderer` |
| `map-service-sheet-job-truth.ts` | Intake → truth; pricing modes via `mapServicePriceDisplayMode` |
| `service-sheet-hook-idempotency.ts` | Fingerprint / lock / receipts |
| `service-sheet-dispatch-hook.ts` | `invokeServiceSheetDispatchHook` |
| `service-sheet-dispatch-hook.test.ts` | Hook + parse + leak + idempotency + versioning |
| `design-renderer-observer.ts` | Flyer/card/menu/**service-sheet** observe |
| `design-renderer-observer.test.ts` | Service-sheet auto-invoke + ALREADY_RENDERED |
| `ensure.ts` | Comment: + service-sheet |
| `index.ts` (dispatch) | Exports |
| `service-sheet-pipeline.ts` | `runServiceSheetJobPipeline` |
| `service-sheet-reason.ts` | Customer leakage scan = content fields only |
| `service-sheet-proof.test.ts` | Expects remapped primaryTool |
| `menu-dispatch-hook.test.ts` | Expects service-sheet on renderer |
| This report | Governing record |

**Flyer / card / menu hooks:** parallel modules only — no intentional sealed-lane behavior change.

---

## 4. Hook contract

`invokeServiceSheetDispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

Gates (fail-closed):

1. `skuId === v2-rtu-service-sheet`
2. `executionIdentityReady === true`
3. `primaryTool === studio_design_renderer`
4. Intake: business name, contact, wording, materials, services (JSON or pipe lines)
5. ≤10 services; pricing modes exact — never invent “contact for pricing”
6. Reject CERTIFICATION FIXTURE / Harbor–Salt demo leakage in customer content
7. Success requires PNG + PDF hashes + QA pass

Idempotency: same fingerprint → `ALREADY_RENDERED`. Truth change → immutable vN+1.

---

## 5. Pricing modes (preserved)

| Mode | Mapping |
|------|---------|
| `listed` | Customer `startingPriceText` (or explicit listed + text) |
| `contact_for_pricing` | Customer `contactForPricingText` only |
| `omitted` | Neither supplied |
| Both price + contact wording | Fail-closed (ambiguous) |

---

## 6. Executor truth

| SKU | primaryTool |
|-----|-------------|
| `v2-rtu-flyer` | `studio_design_renderer` (sealed) |
| `v2-rtu-business-card` | `studio_design_renderer` (sealed) |
| `v2-rtu-menu` | `studio_design_renderer` (sealed) |
| `v2-rtu-service-sheet` | **`studio_design_renderer`** (this package) |
| Other design SKUs (promo, social, …) | `canva` (unchanged) |

---

## 7. Observer path

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ service-sheet observer gate
→ invokeServiceSheetDispatchHook
→ bounded truth/spec (optional pricing)
→ PNG/PDF + identity/hash + QA
→ durable truth
```

---

## 8. Owner-independence

Routine Owner production: **NONE**  
Canva required: **false** (this SKU)  
Make required: **false**

---

## 9. Tests / result

```
service-sheet-dispatch-hook.test.ts — PASS (7)
service-sheet-proof.test.ts — PASS
menu-dispatch-hook.test.ts — PASS
design-renderer-observer.test.ts — PASS (incl. service-sheet auto-invoke)
hook-idempotency.test.ts — PASS (flyer lane protected)
```

**44/44 scoped green** across those five files.

---

## 10. Verdict

**SERVICE-SHEET DISPATCH HOOK READY**

---

## 11. Git state

| Check | Value |
|-------|--------|
| Commit / push / merge | **NONE** (await Owner review before seal) |
| Worktree | Uncommitted hook + prior proof files present |

---

## 12. Exactly one recommended next step

**Owner/Manager authorize seal of SERVICE-SHEET-PROOF-1 + SERVICE-SHEET-DISPATCH-HOOK-1 (and related observer / primaryTool wiring) as one control point** — same pattern as flyer/card/menu — **before** selecting SKU #5 by capability delta.

Do **not** start a bulk remaining-SKU migration. Do **not** open Make.

---

**Scout PARKED**
