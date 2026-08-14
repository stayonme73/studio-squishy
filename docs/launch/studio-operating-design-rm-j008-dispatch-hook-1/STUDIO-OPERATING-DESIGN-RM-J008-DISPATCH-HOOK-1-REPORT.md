# STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1  
**Mode:** Consume paid `rmJ008PostPayDispatchStructure` → invoke Update Kit composer — **remap only `rm-j008`**  
**Prior:** **RM-J008 POSTPAY KIT DISPATCH STRUCTURE READY** (Owner accepted)  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### `RM-J008 DISPATCH HOOK READY`

The Machine dispatches `rm-j008` only from the durable post-pay Update Kit structure. Exact platform, customer-supplied before-state, approved after-state intent, N (Facebook **5** / Instagram **4** / TikTok **4**), change sheet, revised copy, replacement checklist, always-reissued avatar, and Facebook-only cover are preserved. Composer consumes the structure — it does not rebuild membership or before-state from SKU/platform guesses. Remap: **`rm-j008` → `studio_design_renderer`**. Same paid truth → `ALREADY_RENDERED`; material authorized truth change → immutable `vN+1`. Owner routine **NONE**. Scoreboard stays **10/13** until the lane seals.

| Gate | Status |
|------|--------|
| Dispatch only from post-pay structure | **ENFORCED** |
| Exact platform preserved | **ENFORCED** |
| Customer-supplied before-state preserved | **ENFORCED** |
| Approved after-state intent preserved | **ENFORCED** |
| Exact N (FB 5 / IG 4 / TT 4) | **ENFORCED** |
| Change sheet / checklist / revised copy | **ENFORCED** |
| Avatar always reissued · FB cover only when Facebook | **ENFORCED** |
| Customer-applies / no-credentials | **ENFORCED** |
| Composer consumes structure (no SKU guess) | **ENFORCED** |
| Missing seal / structure / mismatch | **FAIL CLOSED** |
| Before-state drift / platform swap / wrong N | **FAIL CLOSED** |
| Missing change sheet / partial kit / cover wrong | **FAIL CLOSED** |
| Kind/order/plate tamper / credentials | **FAIL CLOSED** |
| Member QA / kit QA failure | **FAIL CLOSED** |
| Remap `rm-j008` only | **DONE** (`bf-001`, `rm-j007` remain Canva) |
| Idempotency ALREADY_RENDERED / vN+1 | **PROVEN** |
| Owner routine | **NONE** |
| Scoreboard | **Still 10/13** (lane not sealed) |

---

## 1. Remap

| SKU | Executor |
|-----|----------|
| `rm-j008` | **`studio_design_renderer`** (Canva off fulfillment spine) |
| `bf-001` · `rm-j007` | **Unchanged (Canva)** |
| Ten sealed/remapped lanes including `rm-j002` + `ma-001` | **Unchanged (studio_design_renderer)** |

---

## 2. Files changed

| Path | Role |
|------|------|
| `src/lib/studio-dispatch/map-rm-j008-job-truth.ts` | Paid structure + seal → Update Kit composer truth |
| `src/lib/studio-dispatch/rm-j008-dispatch-hook.ts` | Invoke composer · receipt · fail closed |
| `src/lib/studio-dispatch/rm-j008-dispatch-hook.test.ts` | Hook proofs |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Auto-invoke `rm-j008` |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Remap `rm-j008` |
| `src/lib/studio-dispatch/rm-j002-dispatch-hook.test.ts` · `ma-001-dispatch-hook.test.ts` | Remaining Canva sample = `bf-001` / `rm-j007` |
| This report | Governing record |

**Not changed:** Composer plates (reused) · tip identity · scoreboard seal · commit/push/merge.

---

## 3. Behavior

1. Require `paymentTruth.rmj008KitSeal` + `campaign.rmJ008PostPayDispatchStructure`
2. Assert seal ↔ structure match (including before-state identity)
3. Map membership + before + after **only** from structure (validate against update platform recipe — never invent)
4. Resolve approved logo material → `truth.logoMaterial`
5. `runRmJ008KitComposerPipeline({ outputMode: "customer" })`
6. Fail closed on partial kit, missing change sheet, member QA, kit QA, platform/member/before-state drift
7. Write `dispatch-hook-receipt.json` under the versioned render

---

## 4. Proof command

```bash
npx vitest run src/lib/studio-dispatch/rm-j008-dispatch-hook.test.ts
```

**Result:** 6/6 passed (rm-j002 hook 6/6 · ma-001 hook 11/11 still green).

---

## 5. Explicit next step (Owner)

If accepted: **one scoped RM-J008 lane commit** before final seal — same discipline as RM-J002 / MA-001 — rather than growing another long uncommitted train.

Still out of scope until Owner authorizes seal: tip-identity finalize, scoreboard **11/13**, push/merge.

---

## Exact return string

**`RM-J008 DISPATCH HOOK READY`**

**Scout PARKED.** Scoreboard **10/13**.
