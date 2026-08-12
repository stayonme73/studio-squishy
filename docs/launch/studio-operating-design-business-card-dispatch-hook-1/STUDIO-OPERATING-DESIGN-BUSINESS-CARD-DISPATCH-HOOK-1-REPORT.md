# STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Owner decisions sealed:**

- BUSINESS CARD TECHNICAL PROOF: **PASS**
- OWNER/MANAGER VISUAL VERDICT: **PASS WITH LIMITS**
- DOUBLE-SIDED PROMISE: **VISUALLY ACCEPTED**
- DISPATCH-HOOK: **AUTHORIZED** (this package)
- OTHER DESIGN SKUs: **UNTOUCHED**

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Flyer seal tip | `4a48c9893174b05db65083ccad630852c2d0713f` |
| Card proof | STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1 |
| Visual | PASS WITH LIMITS (accepted) |

---

## 2. Scope delivered

Thin `dd:{jobId}` invoke for **`v2-rtu-business-card` only** so EXECUTION_IDENTITY_READY card jobs auto-produce **front + back** via `studio_design_renderer` after `ensureDispatchExecution`, modeled on the sealed flyer lane.

Does **not** migrate remaining design SKUs.

---

## 3. Files changed (uncommitted)

| Path | Role |
|------|------|
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Card `primaryTool` → `studio_design_renderer` |
| `src/lib/studio-dispatch/map-business-card-job-truth.ts` | Intake → `BusinessCardProjectTruth` |
| `src/lib/studio-dispatch/card-hook-idempotency.ts` | Dual-side fingerprint / lock / receipts |
| `src/lib/studio-dispatch/business-card-dispatch-hook.ts` | `invokeBusinessCardDispatchHook` |
| `src/lib/studio-dispatch/business-card-dispatch-hook.test.ts` | Hook + idempotency tests |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Flyer **or** card lane observe |
| `src/lib/studio-dispatch/ensure.ts` | Comment: flyer + card |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-design-renderer/card-pipeline.ts` | `runBusinessCardJobPipeline` + QA brief fix |
| Tests updated | Flyer hook / observer / idempotency / card proof |
| `docs/launch/.../OWNER-DECISION-SEALED.md` | Visual + hook authorization |
| This report | Governing record |

**Flyer hook / flyer idempotency / flyer schema:** untouched behavior (card has parallel modules).

---

## 4. Hook contract

`invokeBusinessCardDispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

Gates (fail-closed):

1. `skuId === v2-rtu-business-card`
2. `executionIdentityReady === true`
3. `primaryTool === studio_design_renderer`
4. Route Map intake: businessName, cardNameTitle, phone, email, brandMaterials
5. Approved logo-brand + staged local path
6. Reject CERTIFICATION FIXTURE / Harbor demo leakage
7. Success requires **front + back** hashes + QA

Idempotency: same fingerprint → `ALREADY_RENDERED` (no new vN). Concurrent lock + post-lock lookup preserved.

---

## 5. Executor truth

| SKU | primaryTool |
|-----|-------------|
| `v2-rtu-flyer` | `studio_design_renderer` (sealed) |
| `v2-rtu-business-card` | **`studio_design_renderer`** (this package) |
| Other design SKUs (menu, social, …) | `canva` (unchanged) |

Canva **OFF** fulfillment spine for flyer + business card only.

---

## 6. Observer path

After durable `ensureDispatchExecution`:

- Flyer ready → `invokeDesignRendererDispatchHook`
- Card ready → `invokeBusinessCardDispatchHook`
- Other SKUs → ignored (no noise)

Observer records both `pngContentSha256` (front) and `backPngContentSha256` for cards.

---

## 7. Evidence

Customer demo (Cedar Lane / Alex Rivera) via hook + observer tests:

- Front + back PNG distinct hashes
- Receipt includes `frontPngContentSha256` + `backPngContentSha256`
- Repeat invoke → `ALREADY_RENDERED` same version
- No fixture leakage

Artifacts under `data/campaign-design-artifacts/{campaignId}/{safeDispatchId}/` (runtime; not for seal staging).

---

## 8. Owner-independence

Routine Owner production: **NONE**  
Canva required: **false**  
Make required: **false**

---

## 9. Visual limits (preserved, not polished here)

Accepted from Owner review — front emptiness, contact scale, back logo plate. No visual polish in this package.

---

## 10. Tests / result

```
business-card-dispatch-hook.test.ts — 5 PASS
design-renderer-observer.test.ts — 5 PASS (incl. card auto-invoke)
design-renderer-hook.test.ts — 5 PASS
hook-idempotency.test.ts — 8 PASS
business-card-proof.test.ts — 10 PASS
design-renderer-proof.test.ts — 10 PASS
dispatch.test.ts — 8 PASS
```

**Scoped green.** Flyer lane protected.

---

## 11. Verdict

**BUSINESS CARD DISPATCH HOOK READY**

Operating lane for this SKU:

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ card observer gate
→ invokeBusinessCardDispatchHook
→ front+back render
→ PNG/PDF + identity/hash + QA
→ durable truth
```

---

## 12. Git state

| Check | Value |
|-------|--------|
| Commit / push / merge | **NONE** |
| Worktree | Uncommitted hook + proof files present |

---

## 13. Exactly one recommended next step

**Owner/Manager authorize seal of BUSINESS-CARD-PROOF-1 + BUSINESS-CARD-DISPATCH-HOOK-1 (and related observer wiring) as one control point — or authorize a card-specific idempotency/observer seal package if preferred — before selecting the next design SKU by renderer capability delta.**

Do **not** start a bulk remaining-SKU migration.

---

**Scout PARKED**
