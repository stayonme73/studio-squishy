# STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Owner decisions sealed into this package:**

- MENU TECHNICAL PROOF: **PASS**
- MENU LAYOUT REPAIR: **PASS**
- MAX-LOAD VISUAL VERDICT: **PASS WITH LIMITS**
- MENU RENDERER PROOF OVERALL: **ACCEPTED**
- `primaryTool`: retargeted for **`v2-rtu-menu` only**
- MENU DISPATCH HOOK: **AUTHORIZED** (this package)
- Flyer / Card: **PROTECTED**
- Make: **NOT REQUIRED**

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Card seal tip (prior Machine lane) | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Menu proof | STUDIO-OPERATING-DESIGN-MENU-PROOF-1 |
| Menu layout repair | STUDIO-OPERATING-DESIGN-MENU-LAYOUT-1 |
| Max-load visual evidence | `docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu/renders/v6/menu.png` |
| Visual | PASS WITH LIMITS (accepted) |

Limits preserved (not polished here): compact body at 30-item ceiling; uneven lower whitespace from section distribution.

---

## 2. Scope delivered

Thin `dd:{jobId}` invoke for **`v2-rtu-menu` only** so EXECUTION_IDENTITY_READY menu jobs auto-produce a **single-page** menu via `studio_design_renderer` after `ensureDispatchExecution`, modeled on the sealed flyer / card lanes.

Does **not** migrate service-sheet or any other design SKU. No bulk migration.

---

## 3. Files changed (uncommitted)

| Path | Role |
|------|------|
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Menu `primaryTool` → `studio_design_renderer` |
| `src/lib/studio-dispatch/map-menu-job-truth.ts` | Intake → `MenuProjectTruth` (JSON or pipe lines); fail-closed |
| `src/lib/studio-dispatch/menu-hook-idempotency.ts` | Fingerprint / lock / receipts (single PNG + PDF) |
| `src/lib/studio-dispatch/menu-dispatch-hook.ts` | `invokeMenuDispatchHook` |
| `src/lib/studio-dispatch/menu-dispatch-hook.test.ts` | Hook + parse + leak + idempotency |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Flyer **or** card **or** menu observe |
| `src/lib/studio-dispatch/ensure.ts` | Comment: flyer + card + menu |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-design-renderer/menu-pipeline.ts` | `forceQaFail` support for hook tests |
| Tests updated | `menu-proof.test.ts`, `hook-idempotency.test.ts` |
| This report | Governing record |

**Flyer hook / card hook / flyer–card schemas:** parallel modules only — no intentional behavior change to sealed lanes.

---

## 4. Hook contract

`invokeMenuDispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

Gates (fail-closed):

1. `skuId === v2-rtu-menu`
2. `executionIdentityReady === true`
3. `primaryTool === studio_design_renderer`
4. Route Map intake: business name, menu sections/items (structured JSON or pipe lines), brand materials
5. Contract ceilings: ≤5 sections / ≤30 items TOTAL (enforced by menu validate / packer)
6. Approved logo-brand + staged local path when required
7. Reject CERTIFICATION FIXTURE / Harbor demo leakage
8. Success requires menu PNG + PDF hashes + QA pass

Idempotency: same fingerprint → `ALREADY_RENDERED` (no new vN). Concurrent lock + post-lock lookup preserved (flyer-style single-surface receipts).

---

## 5. Executor truth

| SKU | primaryTool |
|-----|-------------|
| `v2-rtu-flyer` | `studio_design_renderer` (sealed) |
| `v2-rtu-business-card` | `studio_design_renderer` (sealed) |
| `v2-rtu-menu` | **`studio_design_renderer`** (this package) |
| `v2-rtu-service-sheet` (and other design SKUs) | `canva` (unchanged) |

Canva **OFF** fulfillment spine for flyer + business card + menu only.

---

## 6. Observer path

After durable `ensureDispatchExecution`:

- Flyer ready → `invokeDesignRendererDispatchHook`
- Card ready → `invokeBusinessCardDispatchHook`
- Menu ready → `invokeMenuDispatchHook`
- Other SKUs → ignored (no noise)

Observer records menu `pngContentSha256` (and PDF identity via receipt / artifact tree).

---

## 7. Evidence

Hook test path (customer truth, not CERT fixture):

- Ready `dd:{jobId}` → RENDERED once
- Repeat identical truth → `ALREADY_RENDERED` same version
- Pipe-line parse fail-closed; fixture leakage refused
- Non-menu SKUs refused by menu hook
- Flyer hook still refuses menu (menu uses its own hook)

Artifacts under `data/campaign-design-artifacts/{campaignId}/{safeDispatchId}/` (runtime; not for seal staging).

---

## 8. Owner-independence

Routine Owner production: **NONE**  
Canva required: **false**  
Make required: **false**

---

## 9. Visual limits (preserved, not polished here)

Accepted from Owner max-load review (MENU-LAYOUT-1 / v6):

- Body remains fairly compact at the 30-item ceiling
- Lower half can show more open space than the upper half (section distribution)
- Do **not** reopen the renderer solely for perfect symmetry

---

## 10. Tests / result

```
menu-dispatch-hook.test.ts — PASS (6)
menu-proof.test.ts — PASS (incl. primaryTool + flyer/card regression)
hook-idempotency.test.ts — PASS (flyer lane; menu refused by flyer hook)
design-renderer-observer.test.ts — PASS (flyer + card lanes)
```

**37/37 scoped green** across those four files. Flyer / card lanes protected.

---

## 11. Verdict

**MENU DISPATCH HOOK READY**

Operating lane for this SKU:

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ menu observer gate
→ invokeMenuDispatchHook
→ single-page menu render (two-column capable)
→ PNG/PDF + identity/hash + QA
→ durable truth
```

---

## 12. Git state

| Check | Value |
|-------|--------|
| Commit / push / merge | **NONE** |
| Worktree | Uncommitted hook + prior menu proof/layout files present |

---

## 13. Exactly one recommended next step

**Owner/Manager authorize seal of MENU-PROOF-1 + MENU-LAYOUT-1 + MENU-DISPATCH-HOOK-1 (and related observer / primaryTool wiring) as one control point** — same pattern as flyer/card auto-production seal — **before** selecting the next design SKU by renderer capability delta (likely service-sheet later).

Do **not** start a bulk remaining-SKU migration. Do **not** open Make.

---

**Scout PARKED**
