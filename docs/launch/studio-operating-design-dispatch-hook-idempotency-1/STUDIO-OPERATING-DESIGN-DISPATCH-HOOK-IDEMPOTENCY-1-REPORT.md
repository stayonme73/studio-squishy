# STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Upstream:** STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1 (uncommitted)

---

## Root cause

`invokeDesignRendererDispatchHook` always ran the full render pipeline and wrote a **root-level** `dispatch-hook-receipt.json` that was **overwritten** on every call.

Same dispatch + same design-spec/material fingerprints therefore minted `renders/vN+1` and regenerated PNG/PDF — safe for lineage retention, **unsafe for automatic observer reevaluation**.

## Files changed

| Path | Change |
|------|--------|
| `src/lib/studio-dispatch/hook-idempotency.ts` | Idempotency key, success lookup, partial detect, immutable version receipts, exclusive lock |
| `src/lib/studio-dispatch/design-renderer-hook.ts` | Pre-reason → lookup → lock → render; `ALREADY_RENDERED` / `RENDERED` |
| `src/lib/studio-dispatch/hook-idempotency.test.ts` | Idempotency suite |
| `src/lib/studio-dispatch/design-renderer-hook.test.ts` | Align with new receipt shape |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-design-renderer/pipeline.ts` | Job pipeline `specOverride` + test `forceQaFail` |
| `src/lib/studio-design-renderer/index.ts` | Export `resolveRenderPaths` |

**Observer:** not added.

## Idempotency key / tuple

```
dispatchId
| jobId
| skuId
| designSpecFingerprint
| materialFingerprint
| rendererVersion
```

Computed **before** export by deterministic design-spec reasoning from authoritative job truth.

## Existing-render lookup

Before render:

1. Scan `renders/vN` newest-first  
2. Accept only `status: success` receipts (or legacy identity+QA with matching fingerprints)  
3. Require intact PNG/PDF hashes + `design-qa.json ok: true`  
4. Reject `qa_failed` / `failed` / `partial` / incomplete evidence  

Match → **`invocationOutcome: "ALREADY_RENDERED"`** — no new `vN`, no PNG/PDF regenerate.

## Versioning on real changes

New immutable `vN+1` when:

- design spec fingerprint changes (content/truth)
- material fingerprint changes (logo bytes)
- (renderer version in key — future renderer bump)

Prior `renders/vN` + receipts remain on disk.

## Receipt immutability

- Per-version: `renders/vN/dispatch-hook-receipt.json`  
- **Refuse overwrite** if that file already exists  
- `current-dispatch-hook-receipt.json` pointer may update  
- Historical version receipts stay intact  

## Failed-attempt retry

| Prior state | Behavior |
|-------------|----------|
| Matching **success** | ALREADY_RENDERED |
| **qa_failed** receipt | Not reusable; retry may render new version |
| Failure before identity | No success receipt; retry allowed |
| Partial (PNG without identity) | `PARTIAL_RENDER_STATE` fail-closed |

## Concurrency

Narrow exclusive lock: `locks/{token}.lock` via `wx` create.

- Second caller waits briefly and re-looks up  
- If still busy → `CONCURRENT_IN_PROGRESS` (no conflicting mint)  
- Stale lock (>120s) cleared once  

Proven: parallel identical invokes → **one** successful identity.

## Test results

```
hook-idempotency.test.ts — 8/8 PASS
design-renderer-hook.test.ts — 5/5 PASS
dispatch.test.ts — 8/8 PASS
routing-handoff.test.ts — 9/9 PASS
payment-truth.test.ts — 15/15 PASS
design-renderer-proof.test.ts — 10/10 PASS
```

**55/55** in this suite set.

## Flyer-only confirmation

Hard gates preserved: SKU, `EXECUTION_IDENTITY_READY`, `studio_design_renderer`, intake, logo, phone/web/price, fixture-leak rejection. Other design SKUs remain Canva-primary.

## Observer remains absent

**NOT AUTHORIZED. Not wired.**

## Owner production

**NONE** · Canva not required · Make not required

## Git state

| Item | Value |
|------|--------|
| Branch | `operating/design-renderer-proof-1` |
| Tip / base | `f9a19c530d5be5dd2f6dfc7cc30692f8557bbaf7` |
| Commit / push / merge | **None** |

## Exactly one recommended next step

**Owner/Manager authorize a flyer-only post-`ensureDispatchExecution` observer that calls `invokeDesignRendererDispatchHook` — now guaranteed to return `ALREADY_RENDERED` for unchanged fingerprints instead of minting duplicate cupcakes.**

---

## Final verdict

### DESIGN DISPATCH HOOK IDEMPOTENCY READY

**Scout PARKED.**
