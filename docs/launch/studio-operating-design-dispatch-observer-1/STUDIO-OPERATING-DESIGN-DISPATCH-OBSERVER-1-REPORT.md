# STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Accepted upstream:** DESIGN-DISPATCH-HOOK-1 · DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1 (IDEMPOTENCY READY)

---

## Observer insertion point

After durable `ensureDispatchExecution` identity is established (both fresh and `alreadyEvaluated` paths):

`ensureDispatchExecution` → `attachDesignRendererObserver` → `runDesignRendererDispatchObserver` → `invokeDesignRendererDispatchHook` (flyer-gated)

Identity evaluation itself still does **not** invoke tools. Observation is a separate post-identity step. Hook failures are recorded; they do **not** fail dispatch identity.

## Files changed

| Path | Role |
|------|------|
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Flyer-only observer + gates |
| `src/lib/studio-dispatch/design-renderer-observer.test.ts` | Observer suite |
| `src/lib/studio-dispatch/ensure.ts` | Wire observer after identity |
| `src/lib/studio-dispatch/types.ts` | Optional `designRendererObserver` on envelope |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-dispatch/dispatch.test.ts` | Align with flyer executor + fail-closed observe |

## Invocation gates

Invoke only when all true:

1. `skuId === "v2-rtu-flyer"`
2. `executionIdentityReady === true`
3. `status === EXECUTION_IDENTITY_READY`
4. `primaryTool === studio_design_renderer`

Else: **do nothing** (flyer not-ready → recorded skip; other SKUs → omitted from results).

Hook prerequisites still enforced inside the hook (intake, logo, phone/web/price, fixture-leak).

## Idempotent repeat behavior

Repeated `ensureDispatchExecution` on unchanged truth:

- Observer re-enters  
- Hook returns **`ALREADY_RENDERED`**  
- No new `renders/vN`  
- Same PNG SHA-256 / render version  

## Changed-fingerprint behavior

Preserved by hook (not reimplemented in observer): content/material fingerprint change → immutable `vN+1`.

## Failure behavior

Hook fail-closed results (`MISSING_REQUIRED_MATERIAL`, QA failure, etc.):

- Recorded on `dispatchExecution.designRendererObserver.results`  
- `ok: false` + `failureCode`  
- Dispatch identity remains ready  
- No silent Owner routing  
- No artifact marked complete  

## Flyer-only proof

| Case | Result |
|------|--------|
| Ready flyer + intake + staged logo | Auto **RENDERED** |
| Repeat ensure | **ALREADY_RENDERED** |
| Not-ready flyer | **skipped** |
| Business card only | Canva primary; **never** in observer invoke list |
| Ready flyer missing logo file | Identity ok; observe **fail-closed** |

## Other-SKU protection

Other 12 design SKUs unchanged (e.g. `v2-rtu-business-card` still `canva`). No renderer invoke, no primaryTool migration.

## Owner-independence

Happy path:

`READY_FOR_DISPATCH` → `ensureDispatchExecution` → observer → design hook → render → QA → durable artifact  

Routine Owner production: **NONE**  
No File Room / Owner Console / customer page required for the observe→render path when prerequisites are already machine-true.

## Canva status

Off fulfillment spine for `v2-rtu-flyer`. No Canva calls.

## Make status

**NOT REQUIRED NOW.** No Make calls.

## Tests / result

```
design-renderer-observer.test.ts — 5/5 PASS
dispatch.test.ts — 8/8 PASS
hook-idempotency.test.ts — 8/8 PASS
routing-handoff.test.ts — 9/9 PASS
activate.test.ts — 10/10 PASS
payment-truth.test.ts — 15/15 PASS
```

**55/55** in this set.

## Git state

| Item | Value |
|------|--------|
| Branch | `operating/design-renderer-proof-1` |
| Tip / base | `f9a19c530d5be5dd2f6dfc7cc30692f8557bbaf7` |
| Commit / push / merge | **None** |

## Exactly one recommended next step

**Owner/Manager accept this observer as the sealed flyer auto-production lane, then decide whether to commit/seal the full uncommitted operating stack (`renderer proof → hook → idempotency → observer`) before authorizing any second design SKU.**

---

## Final verdict

### DESIGN DISPATCH OBSERVER READY

**Scout PARKED.**
