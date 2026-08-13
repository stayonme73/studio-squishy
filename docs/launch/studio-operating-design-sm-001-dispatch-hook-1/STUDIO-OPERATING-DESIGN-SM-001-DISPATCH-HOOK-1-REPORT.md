# STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1 REPORT

**Verdict: SM-001 DISPATCH HOOK READY**

**Package:** STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1
**Scope:** `sm-001` ONLY (Social Media Launch Set)
**Scout status:** PARKED
**Git:** No commit · No push · No merge

**Owner decisions sealed into this package:**

- SM-001-PROOF-1 — **PASS WITH LIMITS** (square-only executable plate)
- SM-001-INTAKE-TRUTH-1 — structure READY (layout templates are Studio production, not a customer menu)
- SM-001 DISPATCH HOOK — **AUTHORIZED** (this package)
- `sm-001-monthly` — **UNCHANGED** (Canva baseline)
- `ma-001` — **OUT OF SCOPE**
- Six sealed renderer lanes (flyer / card / menu / service-sheet / promotion-graphics / social-posts) — **PROTECTED**
- Canva = OFF the fulfillment spine for `sm-001`
- Make — **NOT REQUIRED**

---

## 1. Locks carried from Owner authorization

| Lock | Honored |
|------|---------|
| `plannedPostCount ∈ {4,5,6}` selected **before** execution | Yes — `selectSm001PlannedPostCount` via INTAKE-TRUTH mapper |
| N is never a customer field and never a QA outcome | Yes — smuggled `howManyPosts` / `plannedPostCount` keys fail closed |
| Durable IDs `social-post-1…N`, order 1–N | Yes |
| Layout templates assigned by Studio production | Yes — first N proven templates in library order |
| Square `cert-square-1024` only | Yes — portrait/TikTok not reachable; plate re-checked at dispatch |
| Captions Studio-written from campaign truth | Yes |
| Advisory posting calendar with date governance | Yes — N entries, campaign constraints respected, publishing excluded |
| Complete set or nothing (never shrink N) | Yes — `PARTIAL_SET_FAILURE` on any N mismatch |
| `primaryTool` remapped for this SKU only | Yes — `sm-001-monthly` still Canva |
| Six sealed lanes untouched | Yes (observer allow-list only) |
| No commit / push / merge | Yes |

---

## 2. Scope delivered

Thin `dd:{jobId}` invoke for **`sm-001` only**, so an EXECUTION_IDENTITY_READY job auto-produces a coordinated Launch Set — N square posts (PNG/PDF/HTML) + N Studio captions + posting order + advisory schedule manifest — through `studio_design_renderer` after `ensureDispatchExecution`.

No Owner routine production. No Canva step. No Make. No new customer questionnaire.

---

## 3. Executor remap (`sku-overrides.ts`)

| SKU | primaryTool | Change |
|-----|-------------|--------|
| `sm-001` | **`studio_design_renderer`** (integrated, contract_ready) | This package |
| `sm-001-monthly` | `canva` | **Unchanged** |
| Six sealed renderer lanes | `studio_design_renderer` | Unchanged |
| All other SKUs | unchanged | — |

`formatExportRequirements` now states the real deliverable set: four-to-six coordinated static graphics with `plannedPostCount` locked before execution, a caption for every post, a recommended posting order, and an advisory posting calendar that respects campaign timing (the Studio does not publish or schedule). `readinessNotes` states the Owner-independent Machine path, that Canva is not on the fulfillment spine for this SKU, that Make is not required, N ∈ {4,5,6} selected before execution, square-only plate, and calendar date governance.

---

## 4. INTAKE-TRUTH consumption (`map-sm-001-job-truth.ts`)

`mapSm001ProjectTruthFromJob({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

1. Refuses any SKU other than `sm-001`.
2. Refuses smuggled intake keys that would override a Studio production decision — per-post layout/role/plate, post count, publish dates, captions → `UNAUTHORIZED_CUSTOMER_FIELD`.
3. Builds `Sm001LiveTruthInput` from campaign truth only: `businessName` from `campaign.campaignName`; offer, price, prior price, date window, CTA, phone, and web extracted from `routeMapIntake` answers; `materials.hasLogo` from `resolveApprovedLogoMaterial`.
4. `timingConstraints` are set **only** when the campaign already carries ISO dates. A human-readable window such as “March 10 – April 15, 2026” stays unparsed rather than becoming an invented publish schedule.
5. Rejects certification-fixture content in customer truth.
6. Fails closed on missing logo, offer name, price token, phone/destination, or date window — the current Launch Set layout library states those facts on the plate.
7. Calls `mapSm001SetStructureFromLiveTruth` then `assertSm001StructureExecutableForDispatch`, and carries the resulting N, selection record, members, and timing into `Sm001ProjectTruth` (`outputMode: "customer"`, `proofScopeNote` = DISPATCH-HOOK-1 scope).

---

## 5. N selection lock

| Campaign richness | N | Behavior |
|-------------------|---|----------|
| Logo + offer/price/CTA + date window | 4 | Core set — never padded to six |
| \+ extended copy (headline + body) | 5 | Extended set |
| \+ secondary proof point (prior price) | 6 | Full Launch Set |
| Missing logo or offer facts or date window | — | Fail closed before execution |

N is chosen before any render, asserted again in the pipeline, re-derived from the recorded signals at the dispatch gate, and carried unchanged through QA. A rendered set that does not match the locked N is refused, never trimmed.

---

## 6. Calendar and plate

- Advisory schedule manifest with exactly N entries, each bound to its post and caption.
- Suggested dates respect campaign start/end/blackout constraints; with no campaign timing, a bounded advisory sequence is used and marked as such (`bounded_advisory_sequence`).
- `advisory: true`, `publishingExcluded: true`, `postingTimesExcluded: true` — the Studio does not post or schedule.
- Executable plate is square `cert-square-1024` (1024×1024) only. Portrait / TikTok remain unauthorized and fail closed.

---

## 7. Idempotency (`sm-001-hook-idempotency.ts`)

Tuple: `dispatchId | jobId | skuId | plannedPostCount | sharedSpecFingerprint | materialFingerprint | calendarInputFingerprint | rendererVersion`.

`calendarInputFingerprint` is the pre-render calendar identity (N + authoritative campaign timing), because the rendered `calendarFingerprint` only exists after the set version is minted; the rendered `calendarFingerprint` is stored on the receipt and on the set identity.

Artifacts-intact check requires all of: N assets with matching PNG/PDF hashes on disk, N captions, N posting-order entries, the persisted `calendar-manifest.json` with N entries, and a passing set-QA record. Anything less is treated as no reusable render.

- Same fingerprint → `ALREADY_RENDERED` (no new version).
- Changed authoritative truth → immutable whole-set `vN+1`.
- Partial state on disk → `PARTIAL_SET_FAILURE` (fail closed, no silent repair).
- Concurrent invokes → render lock; the loser returns the winner's identity or `CONCURRENT_IN_PROGRESS`, never a second mint.
- Receipts are immutable per version (`renders/vN/dispatch-hook-receipt.json` + current pointer).

---

## 8. Hook contract (`sm-001-dispatch-hook.ts`)

`invokeSm001DispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath?, ...test-only force flags })`

Gates (fail-closed, in order):

1. `skuId === "sm-001"` → else `SKU_NOT_SUPPORTED`
2. `executionIdentityReady === true` → else `DISPATCH_NOT_READY`
3. `primaryTool === "studio_design_renderer"` → else `EXECUTOR_MISMATCH`
4. Truth mapper OK (structure, plate, N, required facts, no smuggled fields)
5. Deterministic spec reasoning OK
6. No partial render state for this dispatch
7. Render lock acquired
8. Success requires **N/N** posts, **N** captions, **N** posting-order entries, and **N** calendar entries, with set QA passing

Every result reports `ownerRoutineProduction: "NONE"`, `canvaRequired: false`, `makeRequired: false`.

---

## 9. Observer path

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ sm-001 observer gate (allow-list + ready + renderer executor)
→ invokeSm001DispatchHook
→ INTAKE-TRUTH structure + campaign truth
→ N posts PNG/PDF + captions + posting order + advisory calendar + set QA
→ durable whole-set identity + immutable receipt
```

`DESIGN_RENDERER_SM_001_SKU` was added to `OBSERVED_RENDERER_SKUS` and given its own branch; the six sealed lanes keep their existing branches and behavior. Repeated observation is harmless (`ALREADY_RENDERED`).

---

## 10. Sealed lanes, Canva, Make

- Flyer, business card, menu, service sheet, promotion graphics, social posts: untouched; their proof and dispatch suites re-run green.
- Canva: not on the `sm-001` fulfillment spine. `sm-001-monthly` and every other Canva SKU keep the Canva baseline.
- Make: not required anywhere in this lane.
- Owner routine production: **NONE**.

---

## 11. Files changed (uncommitted)

| Path | Role |
|------|------|
| `src/lib/studio-kitchen-production/sku-overrides.ts` | `sm-001` primaryTool → `studio_design_renderer`; exports/readiness notes |
| `src/lib/studio-dispatch/map-sm-001-job-truth.ts` | **New** — campaign/job truth → `Sm001ProjectTruth` (customer mode) |
| `src/lib/studio-dispatch/sm-001-hook-idempotency.ts` | **New** — tuple, artifact integrity, lock, immutable receipts |
| `src/lib/studio-dispatch/sm-001-dispatch-hook.ts` | **New** — `invokeSm001DispatchHook` |
| `src/lib/studio-dispatch/sm-001-dispatch-hook.test.ts` | **New** — remap, mapping, N, render, idempotency, refusals, fail-closed, observer |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | sm-001 lane added to allow-list + branch; header updated |
| `src/lib/studio-dispatch/index.ts` | sm-001 hook / mapper / idempotency exports |
| `src/lib/studio-design-renderer/index.ts` | Header comments corrected for the authorized remap |
| `src/lib/studio-design-renderer/sm-001-contracts.ts` | `primaryToolRemapAuthorized: true`, `dispatchHookAuthorized: true`, note updated |
| `src/lib/studio-design-renderer/sm-001-intake-truth.ts` | Scope-guard comments corrected (no behavior change) |
| `src/lib/studio-design-renderer/sm-001-pipeline.ts` | Header comment corrected (proof + customer job modes) |
| `src/lib/studio-design-renderer/sm-001-fixtures.ts` | Proof scope note no longer claims “primaryTool remains Canva” |
| `src/lib/studio-design-renderer/sm-001-bind.ts` | Identity lineage note no longer claims “no dispatch remap” |
| `src/lib/studio-design-renderer/sm-001-proof.test.ts` | Expectations updated for the authorized remap |
| `src/lib/studio-design-renderer/sm-001-intake-truth.test.ts` | Contract-flag expectations updated |
| This report | Governing record |

Prior uncommitted sm-001 proof + intake-truth work remains in the working tree alongside this hook.

---

## 12. Tests

| Suite | Result |
|-------|--------|
| `src/lib/studio-dispatch/sm-001-dispatch-hook.test.ts` | **9 passed / 9** |
| `src/lib/studio-design-renderer/sm-001-proof.test.ts` | 10 passed |
| `src/lib/studio-design-renderer/sm-001-intake-truth.test.ts` | 13 passed |
| `src/lib/studio-dispatch` (whole folder, 10 files) | **75 passed / 75** |
| Final combined run — `src/lib/studio-dispatch` + both sm-001 renderer suites | **12 files / 98 passed / 0 failed** |

`npx tsc --noEmit` reports zero errors in any sm-001 file and zero errors in the files this package changed; the remaining errors are pre-existing (`studio-coordinator` tests, `menu-validate`, `promo-intake-truth`, `promo-pipeline`, `promotion-graphics-proof.test`, `design-renderer-observer.test` business-card record cast).

Environment note: the sandbox `PLAYWRIGHT_BROWSERS_PATH` temp cache can be evicted mid-session, which fails every renderer suite with “Executable doesn't exist … chrome-headless-shell.exe”. Not a code condition — re-run with `PLAYWRIGHT_BROWSERS_PATH=%USERPROFILE%\AppData\Local\ms-playwright`.

Executor spot check: `resolveServiceProductionContract("sm-001").primaryTool.toolId === "studio_design_renderer"`; `sm-001-monthly` → `canva`.

sm-001 hook coverage: remap + monthly-stays-Canva; execution identity formed without invoking; truth → six-post structure with Studio templates; N=4 for core richness; fail-closed on missing logo / price / date window / fixture content / smuggled Studio decisions; refusal of the wrong SKU, a not-ready dispatch, and a non-renderer executor; 6/6 render with captions, posting order, and a six-entry calendar; `ALREADY_RENDERED` on repeat with identical hashes and idempotency key; fail-closed on a missing calendar entry and on a mid-set export failure with N held at 6; observer auto-invoke plus `ALREADY_RENDERED` on re-observation.

**Known pre-existing failure (not caused by this package):** `src/lib/studio-kitchen-production/production-capability.test.ts` → “does not accidentally create Canva/CapCut/Make live integration claims” asserts no active SKU tool is `integrated`, which the six already-sealed renderer lanes violate. Reproduced with this package's `sku-overrides.ts` change stashed — same single failure. Left as-is; it is a sealed-lane question, not an sm-001 one.

---

## 13. Exactly one recommended next step

**Owner/Manager review this DISPATCH-HOOK-1 report.** Authorize seal and commit later, as a separate decision — not part of this package. Do not start the next SKU until the sm-001 lane is sealed by the Owner.

---

## Scout

**PARKED.**
