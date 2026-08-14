# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1  
**Mode:** Proof only — no remap · no dispatch · no cycle minting · no subscription/billing infra  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001-MONTHLY CYCLE PROOF PASS

Cycle-keyed wrapper around sealed `sm-001` proven. Renderer **consumes** authoritative cycle truth and **refuses to mint** `productionCycleId`. Catalog `sm-001-monthly.primaryTool` remains **Canva**.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Accepted class | **SM-001-MONTHLY DELTA A** |
| Contract | MONTHLY-CONTRACT-TRUTH-1 accepted + **CY-7** immutability clarification |
| Sealed engine | `sm-001` Launch Set (unchanged) |

---

## 2. Accepted cycle contract (preserved)

| Law | Honored |
|-----|---------|
| Explicit service production period | Yes |
| Durable `productionCycleId` + start/end + focus | Yes |
| Identity before production | Yes · fail closed if absent |
| `productionCycleId` in fingerprint | Yes |
| Immutable once production begins (CY-7) | Yes · in-place date/focus mutate → `CYCLE_IDENTITY_IMMUTABLE` |
| Late/backfill → new cycle only | Yes |
| `"Current cycle"` never authority | Yes |
| Per-cycle `plannedPostCount`; N may differ | Yes · Cycle A N=4 · Cycle B N=6 |
| Prior-cycle immutability | Yes |
| Calendar inside cycle bounds | Yes |
| No renderer minting | Yes · `WRAPPER_REFUSED_CYCLE_MINT` |

---

## 3. Files changed

| Path | Role |
|------|------|
| `src/lib/studio-design-renderer/sm-001-monthly-types.ts` | Wrapper types / receipt |
| `src/lib/studio-design-renderer/sm-001-monthly-contracts.ts` | Proof contract (remap **closed**) |
| `src/lib/studio-design-renderer/sm-001-monthly-cycle.ts` | Validate cycle · refuse mint · intersect window |
| `src/lib/studio-design-renderer/sm-001-monthly-fingerprint.ts` | Cycle-keyed production fingerprint |
| `src/lib/studio-design-renderer/sm-001-monthly-fixtures.ts` | Pre-authored Cycle A/B (consume-only ids) |
| `src/lib/studio-design-renderer/sm-001-monthly-pipeline.ts` | Wrapper → sealed `runSm001RendererPipeline` |
| `src/lib/studio-design-renderer/sm-001-monthly-proof.test.ts` | Two-cycle + fail-closed + seven-lane regression |
| `src/lib/studio-design-renderer/index.ts` | Exports |

**Not modified:** sealed `sm-001-*` engine modules · `sku-overrides.ts` · dispatch hooks · observer.

Proof artifacts under `docs/launch/studio-operating-design-sm-001-monthly-proof-1/artifacts/` (local test output).

---

## 4. Cycle prerequisite

Missing/ambiguous cycle truth **FAIL CLOSED**:

| Case | Code |
|------|------|
| Missing `productionCycleId` | `MISSING_PRODUCTION_CYCLE_ID` |
| `"Current cycle"` label | `MISSING_PRODUCTION_CYCLE_ID` |
| Missing start/end | `MISSING_CYCLE_START` / `MISSING_CYCLE_END` |
| Invalid / inverted range | `INVALID_CYCLE_DATE_RANGE` |
| Missing focus | `MISSING_CYCLE_FOCUS` |
| Missing / unsupported N | `MISSING_PLANNED_POST_COUNT` / `INVALID_PLANNED_POST_COUNT` |
| Mint from month/today/billing/label/prior | `WRAPPER_REFUSED_CYCLE_MINT` |

No fallback to current month, today, billing metadata, `"Current cycle"`, or prior cycle.

---

## 5. Production identity + fingerprint

Conceptual identity:

`campaign + sm-001-monthly + productionCycleId`

Fingerprint includes: campaign, sku, `productionCycleId`, cycle start/end, focus, plannedPostCount, creative fields, timing bounds, wrapper version.

| Same cycle + same truth | → `ALREADY_RENDERED` |
| Different `productionCycleId` | → distinct artifact root + fingerprint |
| Same cycle + material change | → immutable `vN+1` inside that cycle root |

---

## 6. Sealed sm-001 reuse

Wrapper maps validated monthly truth → `Sm001ProjectTruth` with `skuId: "sm-001"` and calls **`runSm001RendererPipeline`**.

Reused: N∈{4,5,6} · exact N/N · layouts · captions · order · calendar · date governance · square-only · QA · set versioning.

**No second monthly renderer family.**

---

## 7. Two-cycle actual evidence

Same campaign, two pre-authored cycles:

| | Cycle A | Cycle B |
|--|---------|---------|
| `productionCycleId` | `cyc-harbor-sm001m-2026-03-early` | `cyc-harbor-sm001m-2026-04-late` |
| Window | 2026-03-10 … 2026-03-20 | 2026-03-25 … 2026-04-15 |
| N | **4** | **6** |
| Focus | March Spring Tune-Up awareness | April Drain Clear booking push |

Proven:

- Both render independently under separate roots  
- Cycle B does **not** overwrite Cycle A receipt / current-identity  
- Repeat A → `ALREADY_RENDERED` (A)  
- Repeat B → `ALREADY_RENDERED` (B)  
- Fingerprints and roots do not cross-hit  
- Calendar entries stay inside each cycle window  

---

## 8. Prior-cycle immutability / stale / late-backfill

| Behavior | Result |
|----------|--------|
| Work in B cannot mutate A artifacts/manifest/captions/calendar/identity | Proven (separate roots + A intact after B) |
| In-place date change under same cycle id after production | `CYCLE_IDENTITY_IMMUTABLE` |
| Force reuse prior cycle as current | `PRIOR_CYCLE_REUSE_FORBIDDEN` |
| Creative without this-cycle focus | `STALE_CYCLE_TRUTH` |
| Empty cycle ∩ campaign timing | `CYCLE_WINDOW_CONFLICT` (no silent extend) |
| Unsupported plate | `INVALID_PLATE` |

---

## 9. Owner-independence / tools

| Item | Status |
|------|--------|
| Owner routine | **NONE** |
| Cycle creation | Upstream create-only prerequisite — **not** Owner render task; **not** renderer mint |
| `sm-001-monthly.primaryTool` | **Canva** (unchanged) |
| Canva used in proof | **No** |
| Make | **NOT REQUIRED** |
| Sealed `sm-001` | Untouched |
| Dispatch / remap | **Not wired** |
| `ma-001` / remaining SKUs | Parked |

---

## 10. Seven-lane protection

Regression in proof suite: flyer · business-card · menu · service-sheet · promotion-graphics · social-posts · **sm-001** → **all green**.

---

## 11. Tests / result

```
npx vitest run src/lib/studio-design-renderer/sm-001-monthly-proof.test.ts
→ 5 passed
```

---

## 12. Git state

| Field | Value |
|-------|--------|
| HEAD | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` (control; uncommitted proof work) |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |

---

## 13. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-SOURCE-1`**

Inspection only: where do authoritative `productionCycleId` + start/end + focus records come from on the live job/subscription path? Map the create-only accept seam. **Do not** invent a subscription engine inside the renderer. **Do not** remap or dispatch until that source is honest and fail-closed.

---

## PASS criteria checklist

1. Cycle truth required before execution — **PASS**  
2. Renderer cannot mint cycle identity — **PASS**  
3. Cycle ID in fingerprint — **PASS**  
4. Same-cycle repeat → `ALREADY_RENDERED` — **PASS**  
5. Different cycle → separate root — **PASS**  
6. Within-cycle material change → `vN+1` — **PASS**  
7. Prior-cycle immutable — **PASS**  
8. Per-cycle N may differ — **PASS**  
9. Calendar inside cycle bounds — **PASS**  
10. Stale prior-cycle truth blocked — **PASS**  
11. Backfill requires distinct cycle — **PASS**  
12. Sealed sm-001 reused — **PASS**  
13. Owner routine NONE — **PASS**  
14. Seven sealed lanes green — **PASS**  

---

**Scout PARKED.**
