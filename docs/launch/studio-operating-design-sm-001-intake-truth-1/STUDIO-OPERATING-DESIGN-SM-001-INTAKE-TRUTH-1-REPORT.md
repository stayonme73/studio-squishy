# STUDIO-OPERATING-DESIGN-SM-001-INTAKE-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-INTAKE-TRUTH-1  
**Mode:** Upstream intake / Machine structure truth — no dispatch hook · no primaryTool remap · no sealed-lane edits · no Canva · no Make  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001 INTAKE STRUCTURE TRUTH READY

Live campaign truth resolves the complete sm-001 Launch Set structure — Studio-selected `plannedPostCount ∈ {4,5,6}`, member assignment, square-only executable plate, posting-order and calendar requirements, and campaign timing constraints — **without** adding a single customer-facing question about layout, plate, count, or publish dates.

| Gate | Status |
|------|--------|
| Technical renderer proof (SM-001-PROOF-1) | PASS (prior) |
| Owner visual | PASS WITH LIMITS (prior, accepted) |
| Layout-template classification | **CLOSED** — Studio production, not customer contract |
| Live structure mapping (N / members / plate / order / calendar / timing) | **CLOSED** (this package) |
| Dispatch hook | **STILL NOT AUTHORIZED** |
| primaryTool | Canva (unchanged) |
| Sealed social-posts lane | untouched (read-only pattern reuse) |

---

## 1. Seam confirmed

The seam this package closes is **campaign truth → executable set structure**, and it sits entirely upstream of dispatch.

| Question | Finding |
|----------|---------|
| Does sm-001 have its own customer intake form? | **No.** The live `SocialPostsIntakeForm` belongs to **v2-rtu-social-posts** (fixed four square posts). sm-001 is that SKU's `legacySourceSku`, not a separate live form. |
| Does any form ask for layout template / plate / post count? | **No** — and this package deliberately adds none. |
| Where does N come from? | `collectSm001NSelectSignals` + `selectSm001PlannedPostCount` — a deterministic, auditable Studio decision made **before** execution from material availability and campaign richness. |
| Where do calendar dates come from? | Campaign timing constraints. When none exist, timing stays empty and the advisory calendar resolves a bounded sequence later. |
| Who writes captions? | The Studio, from campaign truth. |

---

## 2. What maps

`mapSm001SetStructureFromLiveTruth(input)` reads campaign-level truth only — `businessName`, `offerName`, `priceDisplay`, optional `wasPriceDisplay` / `dateWindow` / `body` / `headline` / `cta` / `phone`, `materials.hasLogo`, optional `timingConstraints`, optional `platformLabel` — and produces:

| Output | Source |
|--------|--------|
| `plannedPostCount` ∈ {4,5,6} + full selection record | `selectSm001PlannedPostCount` (fingerprinted, `selectedBeforeExecution: true`) |
| `assets` (members) | `assignSm001MembersForCount(N)` — first N proven templates, `offer_lead` … `soft_close` |
| `plateId` / `canvas` / `executablePlate` | `cert-square-1024` · 1024×1024 · `"square"` — square-only |
| `captionSource` | `studio_written` |
| `postingOrderRequired` / `calendarRequired` | `true` / `true` |
| `timingConstraints` + `timingSource` | provided ISO constraints → `campaign_constraints`; simple ISO found in the window → `parsed_date_window`; otherwise `{}` → `none_pending_advisory` |

Richness mapping proven by test: full (extended copy + secondary proof point) → **N=6**; extended (extended copy only) → **N=5**; core → **N=4**, with no padding.

`assertSm001StructureExecutableForDispatch(structure)` is the fail-closed readiness gate — **not** an authorization. It rejects: N outside {4,5,6}; selection/structure count drift; signals that no longer justify N (missing logo, offer facts, or date window); non-square plate or canvas; member-count mismatch; phantom members, order gaps, duplicate or unproven templates; non-Studio caption source; missing order/calendar requirement.

---

## 3. Traps avoided

| Trap | Avoided how |
|------|-------------|
| Layout templates presented as customer contract | `SM_001_LAYOUT_TEMPLATE_CLASSIFICATION` — `customerConfigurable: false`, `fixedServiceContractRoles: false`, `intakeSelectFields: false` |
| Harbor-as-menu (CERT template names becoming selects) | Smuggled `postN_layoutTemplate` / `postN_role` / `postN_plate` rejected with `UNAUTHORIZED_CUSTOMER_FIELD` |
| Customer choosing N | `plannedPostCount` / `postCount` / `numberOfPosts` keys rejected; N stays a Studio pre-execution decision |
| Customer posting-date questions | `publishDate` / `postingDate` / `postingSchedule` keys rejected; calendar timing comes from campaign constraints |
| Inventing publish dates as facts | A human-readable window such as "March 10 – April 15, 2026" stays **unparsed**; only unambiguous ISO dates are lifted |
| Silent plate substitution | Square-only executable plate, canvas dimensions verified at the gate |
| Customer-supplied captions | `caption*` keys rejected; `captionSource` locked to `studio_written` |
| Confusing the two SKUs | Module header and classification record state plainly that the live form is v2-rtu-social-posts, not sm-001 |
| Silent field drift | Allowlist (`SM_001_AUTHORIZED_LIVE_TRUTH_KEYS`) — any unknown key fails closed rather than being ignored |

---

## 4. What changed

| Path | Role |
|------|------|
| `src/lib/studio-design-renderer/sm-001-intake-truth.ts` | Classification · live truth input · structure mapper · timing resolver · dispatch readiness gate |
| `src/lib/studio-design-renderer/sm-001-intake-truth.test.ts` | N=6/5/4 · no phantom members · smuggled-field rejection · plate + count fail-closed · classification flags |
| `src/lib/studio-design-renderer/sm-001-contracts.ts` | `liveIntakeSetStructureResolved: true` + intake-field flags; `dispatchHookAuthorized` unchanged (`false`) |
| `src/lib/studio-design-renderer/index.ts` | Additive exports |
| This report | Governing record |

**Not changed:** sealed v2-rtu-social-posts lane · dispatch / observer wiring · `sku-overrides` primaryTool · catalog schemas · live intake forms · renderer pipeline · proof artifacts · SM-001-PROOF-1 report section 13 (visual already recorded).

---

## 5. Dispatch — NOT AUTHORIZED

`SM_001_PROOF_CONTRACT.dispatchHookAuthorized` remains `false` and `primaryToolRemapAuthorized` remains `false`. Nothing in this package calls the Machine, remaps a tool, or touches the observer. `assertSm001StructureExecutableForDispatch` answers *"would this structure be safe to send?"* — it does not send anything, and passing it is not consent.

---

## 6. Tests

```
npx vitest run src/lib/studio-design-renderer/sm-001-intake-truth.test.ts
→ 1 file · 13 tests · PASS
```

---

## 7. Exactly one recommended next step

**Owner authorize `STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1` — only after reviewing this report.** That package would be the narrow hook alone: keep square-only execution, keep Studio-selected N and Studio-written captions, keep the sealed social-posts lane untouched, and remap `primaryTool` for sm-001 only if and when the Owner says so.

---

## Scout

**PARKED.**
