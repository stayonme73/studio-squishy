# STUDIO-OPERATING-DESIGN-RM-J002-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RM-J002-DISPATCH-HOOK-1  
**Mode:** Consume paid `rmJ002PostPayDispatchStructure` → invoke Profile Kit composer — **remap only `rm-j002`**  
**Prior:** **RM-J002 POSTPAY KIT DISPATCH STRUCTURE READY** (Owner accepted)  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### `RM-J002 DISPATCH HOOK READY`

The Machine dispatches `rm-j002` only from the durable post-pay kit structure. Exact platform, N, member identities/order/kinds, plates, copy, checklist, avatar, and Facebook-only cover are preserved. Composer consumes the structure — it does not rebuild membership from SKU/platform guesses. Remap: **`rm-j002` → `studio_design_renderer`**. Same paid truth → `ALREADY_RENDERED`; material authorized truth change → immutable `vN+1`. Owner routine **NONE**. Scoreboard stays **9/13** until the lane seals.

| Gate | Status |
|------|--------|
| Dispatch only from post-pay structure | **ENFORCED** |
| Exact platform preserved | **ENFORCED** |
| Exact N (FB 4 / IG 3 / TT 3) | **ENFORCED** |
| Exact member identities / order / kinds | **ENFORCED** |
| Avatar plate preserved | **ENFORCED** |
| Facebook cover plate only when Facebook | **ENFORCED** |
| Copy + field-map members preserved | **ENFORCED** |
| Customer-applies / no-credentials | **ENFORCED** |
| Composer consumes structure (no SKU guess) | **ENFORCED** |
| Missing seal / structure / mismatch | **FAIL CLOSED** |
| Platform swap / wrong N / plate tamper | **FAIL CLOSED** |
| IG/TT cover / missing FB cover | **FAIL CLOSED** |
| Partial kit / member QA / kit QA | **FAIL CLOSED** |
| Remap `rm-j002` only | **DONE** (`bf-001`, `rm-j008`, `rm-j007` remain Canva) |
| Idempotency ALREADY_RENDERED / vN+1 | **PROVEN** |
| Owner routine | **NONE** |
| Scoreboard | **Still 9/13** (lane not sealed) |

---

## 1. Remap

| SKU | Executor |
|-----|----------|
| `rm-j002` | **`studio_design_renderer`** (Canva off fulfillment spine) |
| `rm-j008` · `bf-001` · `rm-j007` | **Unchanged (Canva)** |
| Nine sealed lanes + `ma-001` | **Unchanged (studio_design_renderer)** |

---

## 2. Files changed

| Path | Role |
|------|------|
| `src/lib/studio-dispatch/map-rm-j002-job-truth.ts` | Paid structure + seal → composer truth |
| `src/lib/studio-dispatch/rm-j002-dispatch-hook.ts` | Invoke composer · receipt · fail closed |
| `src/lib/studio-dispatch/rm-j002-dispatch-hook.test.ts` | Hook proofs |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Auto-invoke `rm-j002` |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Remap `rm-j002` |
| `src/lib/studio-design-renderer/rm-j002-{types,fingerprint,pipeline,members}.ts` | Logo material · `invocationOutcome` · a11y |
| `src/lib/studio-dispatch/ma-001-dispatch-hook.test.ts` | Expect `rm-j002` remapped (sample Canva now `rm-j008`) |
| This report | Governing record |

---

## 3. Behavior

1. Require `paymentTruth.rmj002KitSeal` + `campaign.rmJ002PostPayDispatchStructure`
2. Assert seal ↔ structure match
3. Map membership **only** from structure (validate against platform recipe — never invent)
4. Resolve approved logo material → `truth.logoMaterial`
5. `runRmJ002KitComposerPipeline({ outputMode: "customer" })`
6. Fail closed on partial kit, member QA, kit QA, platform/member drift
7. Write `dispatch-hook-receipt.json` under the versioned render

---

## 4. Proof command

```bash
npx vitest run src/lib/studio-dispatch/rm-j002-dispatch-hook.test.ts
```

**Result:** 6/6 passed (composer proof suite still 7/7).

---

## 5. Explicit next step (Owner)

If accepted: **land the full RM-J002 lane in one scoped commit before final seal** — same discipline as MA-001 — rather than growing another long uncommitted train.

Still out of scope until Owner authorizes seal: tip-identity finalize, scoreboard 10/13, push/merge.

---

**Scout PARKED.** Scoreboard **9/13**.
