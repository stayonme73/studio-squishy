# Discovery ↔ Recommendation Engine Alignment Audit

**Status:** Architectural audit — no UI or engine changes  
**Purpose:** Verify every Discovery question maps to a business decision the Recommendation Engine (and Discovery Summary) actually makes — and identify gaps where the engine needs data Discovery does not collect  
**Sources:** `src/recommendation/engine.ts`, `src/recommendation/types.ts`, `src/catalog/services.ts`, `src/config/business-discovery-studio.ts`, `src/config/studio-services.ts`, `src/discovery-summary/buildDiscoverySummary.ts`, `docs/discovery-decision-matrix.md`  
**Last updated:** June 25, 2026

---

## Executive Summary

Discovery Studio and the Recommendation Engine are **not aligned**. The engine scores services using four signal kinds (`need`, `situation`, `challenge`, `focus-keyword`) from `DiscoveryBrief`, but Discovery UI never collects `selectedNeeds` — the strongest weighted rules across all packages and add-ons. Three free-text tiles (`success-looks-like`, `whats-slowing-you-down`, `anything-else`) have **zero code paths** into scoring, dependencies, timeline, or customer summary copy. `your-current-tools` is collected but **not consumed** by any catalog rule today.

**Top findings:**

1. **`selectedNeeds` is missing from Discovery UI** — need-weighted catalog rules are dead code in production Discovery.
2. **Three textarea tiles should be removed or merged** — they do not influence any engine decision.
3. **`your-current-tools` is a keep-with-gap** — essential for add-on gap detection per business model, but unwired in catalog/engine.
4. **Engine returns all matches with no NOW vs LATER phasing** — Discovery cannot express engagement model or timeline urgency the engine would need even if collected.
5. **Orphan select options** (`Pivoting or rebranding`, `Technology and tools`, `Other`) score nothing — they add customer fatigue without improving recommendations.

---

## 1. Engine Decision Inventory

Every decision the Recommendation Engine makes, what consumes it downstream, and the data each requires. Grounded in `recommendFromDiscovery()` (`src/recommendation/engine.ts`) and `buildDiscoverySummary()` (`src/discovery-summary/buildDiscoverySummary.ts`).

| # | Business decision | Engine function / output | Data required | Discovery source today |
|---|-------------------|--------------------------|---------------|------------------------|
| 1 | **Which services match the brief** | `scoreService()` — sum `discoveryMapping` rule weights per service | `need` → `brief.selectedNeeds[]`; `situation` → exact `your-situation` answer; `challenge` → exact `your-challenge` answer; `focus-keyword` → substring in `your-focus` (case-insensitive) | Situation, challenge, focus tiles only; **needs never collected in UI** |
| 2 | **Ranked recommendation list** | Filter active services with score > 0, sort by score desc, tie-break by `serviceId` | Same as #1 | Partial — missing needs |
| 3 | **Primary service** | `primaryServiceId` = rank 1 `serviceId` | Same as #1 | Partial |
| 4 | **Per-service rationale** | `RecommendationReason[]` from matched rules | Matched signal + value + weight | Partial — need reasons never fire without `selectedNeeds` |
| 5 | **Deliverables scope** | `deliverablesSummary` from recommended services' catalog `deliverables` | Recommended service IDs (derived from #1) | Indirect via scoring tiles |
| 6 | **Estimated investment** | `estimatedInvestment` — sum `pricing.amountUsd`, flag `hasQuotedItems` | Recommended service IDs + catalog pricing | Indirect |
| 7 | **Estimated timeline** | `estimatedTimeline` — longest `businessDays` across recommended services | Recommended service IDs + catalog `estimatedProductionTime` | Indirect — **no customer-provided deadline** |
| 8 | **Missing-answer warnings** | `missing-discovery-answer` for unanswered `your-situation`, `your-challenge`, `your-focus` | Those three tile answers | Three tiles only (engine ignores other tiles) |
| 9 | **Inactive add-on warnings** | `inactive-service-match` — scores inactive catalog entries, surfaces as warnings | Same scoring signals as #1 | Partial |
| 10 | **Dependency warnings** | `unmet-dependency` — add-on recommended without base package in set | Recommended set + catalog `dependencies` | Indirect |
| 11 | **Low-confidence warnings** | `low-confidence-match` — top score ≤ 1 or tie at top | Scoring outcome | Indirect |
| 12 | **No-match warnings** | `no-recommendations` — zero services scored > 0 | Scoring outcome | Indirect |
| 13 | **Requires human approval** | `requiresApproval` — no recs, quoted pricing, unmet deps, or low confidence | Warnings + investment flags | Indirect |
| 14 | **Customer-facing service copy** | `buildDiscoverySummary()` — title, explanation from `reasonPhrase()`, deliverables, investment, timeline per service | `RecommendationResult` only — **does not read raw tile answers** | Only via engine output |
| 15 | **Customer warnings** | Summary maps engine warnings (excludes `inactive-service-match` from customer view) | Engine warnings | Indirect |
| 16 | **Next-step CTA** | `buildNextStep()` — checkout vs review vs update answers | `recommendations.length`, `requiresApproval` | Indirect |

**Signals the engine does NOT consume (no code path):**

- `your-business` — not referenced in `engine.ts` or `buildDiscoverySummary.ts`
- `your-current-tools` — no `DiscoverySignalKind` for tools; multiselect string unused
- `success-looks-like`, `whats-slowing-you-down`, `anything-else` — no parsing rules
- `NEED_TO_DELIVERABLES` (`studio-services.ts`) — not read by engine; scope assembly is a separate redesign path

**Exact-string contract:** `situation` and `challenge` rules match **exact option text** from `discoveryTileConfig.options`. Any Discovery copy change must update `discoveryMapping` in the same change set.

---

## 2. Per-Question Audit Table

Eight discovery prompts + submit gate. Config: `src/config/business-discovery-studio.ts`. Scoring: `matchDiscoveryRule()` in `src/recommendation/engine.ts`.

| Question (tile ID) | Business decision it supports | Used by engine? | Production / deps / scheduling / comms? | Verdict | Rationale |
|--------------------|------------------------------|-----------------|----------------------------------------|---------|-----------|
| **What's the name of your business or project?** (`your-business`) | Campaign identity for production dossier; not a scoring signal | **no** | **partial** — metadata for downstream Campaign Record; not read by engine or Discovery Summary today | **KEEP** | Required project identity even though engine ignores it. Does not affect recommendation ranking. |
| **Where are you in your journey?** (`your-situation`) | Package tier: SPARK (`Starting fresh`), MOMENTUM + monthly-support (`Growing an existing business`), GROWTH (`Scaling operations`) | **yes** | **yes** — drives primary package → deliverables, effort tier, billing model, timeline labels in summary | **KEEP** | Core consultant signal; exact match to catalog rules. Options `Pivoting or rebranding` and `Other` have **no mapping** — see Revise. |
| **What's the main challenge right now?** (`your-challenge`) | Discriminates packages and add-ons: SPARK (clarity), MOMENTUM + email/customer-follow-up (visibility), GROWTH + business-workflow (operations, team) | **yes** | **yes** — secondary package selector; feeds summary `reasonPhrase` | **KEEP** | Essential discriminator. `Technology and tools` and `Other` unmapped — see Revise. |
| **What tools or platforms do you use today?** (`your-current-tools`) | *Target:* add-on gap detection (email/SMS/CRM absence → email-marketing, sms-campaign, business-workflow) | **no** | **partial** — production readiness and channel execution; proposed in redesign, **not in catalog rules** | **KEEP** | Business model requires honest channel readiness; must be wired to catalog before treating as optional. Currently collected dead weight. |
| **What should we focus on first?** (`your-focus`) | Keyword phasing: SPARK (`test`, `first campaign`), MOMENTUM (`consistent`, `monthly`), GROWTH (`scale`, `system`), monthly-support (`ongoing`, `support`) | **yes** | **yes** — tie-breaker and phrasing in summary; triggers `missing-discovery-answer` if empty | **KEEP** | Fragile substring matching on unstructured text — see Revise for structured hybrid. |
| **What does success look like for this project?** (`success-looks-like`) | None — no `DiscoverySignalKind`, no summary consumer | **no** | **no** | **REMOVE** | Third outcome-adjacent free-text field; zero code path into engine, deps, timeline, or `buildDiscoverySummary`. Overlaps focus + needs. |
| **What's getting in the way?** (`whats-slowing-you-down`) | None | **no** | **no** | **REMOVE** | Duplicates challenge + focus; no parsing rules; adds fatigue without changing recommendations. |
| **Anything else we should know?** (`anything-else`) | None | **no** | **no** | **REMOVE** | Optional context bucket with no engine or summary consumer. If consultant notes are needed, they belong post-recommendation, not in scoring intake. |
| **Ready to send your discovery brief?** (`submit-project`) | Submission gate — completeness check in UI | **no** (data) | **partial** — workflow gate only | **KEEP** | Not a data question; required UX gate. |

### Situation / challenge options (sub-audit)

| Option | Parent tile | Catalog mapping | Verdict |
|--------|-------------|-----------------|---------|
| Starting fresh | situation | SPARK (+2) | OK |
| Growing an existing business | situation | MOMENTUM (+2), monthly-support (+2) | OK — overlap with MOMENTUM unresolved in engine |
| Pivoting or rebranding | situation | **none** | **REVISE** — link to `better-branding` need or new rules |
| Scaling operations | situation | GROWTH (+2) | OK |
| Other | situation | **none** | **REVISE** — bypasses deterministic scoring |
| Lack of clarity or direction | challenge | SPARK (+1) | OK |
| Marketing and visibility | challenge | MOMENTUM (+2), email-marketing (+1), customer-follow-up (+1) | OK |
| Operations and efficiency | challenge | GROWTH (+1), business-workflow (+2) | OK |
| Technology and tools | challenge | **none** | **REVISE** — implies execution Studio does not offer |
| Team and hiring | challenge | GROWTH (+1) | **REVISE** — weak signal; Studio does not deliver HR |
| Other | challenge | **none** | **REVISE** |

### External field (not a tile)

| Field | Business decision | Used by engine? | Verdict |
|-------|-------------------|-----------------|---------|
| `selectedNeeds[]` on `DiscoveryBrief` | Primary need→service rules for all packages and inactive add-ons; summary `reasonPhrase` for need signal | **yes** (when present) | **ADD** — **critical gap**; no Discovery tile collects this |

---

## 3. Engine Gaps

Information the engine's catalog rules expect but Discovery does not collect, or collects without a consumer.

| Gap | Severity | Engine / catalog evidence | Impact |
|-----|----------|---------------------------|--------|
| **`selectedNeeds[]` not collected** | **Critical** | All `signal: "need"` rules in `services.ts`; `matchDiscoveryRule` case `"need"` reads `brief.selectedNeeds ?? []` | Strongest weighted rules never fire in production Discovery. Prototype brief manually sets needs (`discovery-summary-prototype-brief.ts`). |
| **`your-current-tools` unwired** | High | No tools signal kind in `DiscoverySignalKind`; zero rules reference tool selections | Add-on gap detection (email-marketing, sms-campaign, business-workflow) impossible. |
| **`better-branding` need unmapped** | High | Need exists in `studioNeeds` + `NEED_TO_DELIVERABLES`; no package `discoveryMapping` entry | Rebrand customers cannot score on branding outcome. |
| **NOW vs LATER phasing** | High | Engine returns **all** active services with score > 0; no phase field on `DiscoveryBrief` | Cannot enforce boutique "one primary NOW" consultant behavior. |
| **Engagement / support model** | High | MOMENTUM vs SPARK vs monthly-support overlap with no mutual-exclusion | Customer cannot express one-time vs ongoing vs partnership intent. |
| **Timeline urgency** | Medium | `estimatedTimeline` uses catalog defaults only | Capacity planning (~20–25 clients) cannot prioritize by customer deadline. |
| **Execution readiness** | Medium | No signal for "can customer send email/SMS/post social" | Risk recommending channels customer cannot run. |
| **Prior Studio relationship** | Low | No upgrade vs net-new signal | May re-recommend SPARK to returning customers. |
| **Free-text parsing** | Medium | Only `your-focus` keywords parsed; success/blockers/anything-else ignored | Lost signal density; redundant prompts. |

---

## 4. Questions to Remove

Explicit rationale: **does not influence any engine decision** (recommendation, production planning via deliverables, dependencies, scheduling, or customer communication via Discovery Summary).

| Tile | Question | Rationale |
|------|----------|-----------|
| `success-looks-like` | What does success look like for this project? | No `DiscoverySignalKind`; `buildDiscoverySummary` reads `RecommendationResult` only — this answer never appears in summary copy, warnings, or timeline. Overlaps `your-focus` and the missing need selector. |
| `whats-slowing-you-down` | What's getting in the way? | Same — zero engine consumers. Third "problem statement" alongside challenge and focus without improving scores or summary. |
| `anything-else` | Anything else we should know? | Same — no code path. Optional consultant notes do not belong in deterministic scoring intake. |

**Do not remove** `your-business`, `submit-project`, or scoring tiles without Tagia approval on merge targets for removed copy.

---

## 5. Questions to Keep

Explicit engine or production-plan linkage.

| Tile | Engine decision linkage | Downstream linkage |
|------|------------------------|-------------------|
| `your-situation` | `situation` rules for SPARK, MOMENTUM, GROWTH, monthly-support | Package tier → deliverables quotas, billing, effort tier, summary explanations |
| `your-challenge` | `challenge` rules across all packages and four add-ons | Secondary package/add-on discriminator; summary challenge phrases |
| `your-focus` | `focus-keyword` rules (8 keywords across 4 services) | Tie-breaking, phasing language, `missing-discovery-answer` guard |
| `your-current-tools` | *Not yet* — keep for planned gap rules | Channel execution readiness; add-on eligibility once catalog wired |
| `your-business` | None (identity metadata) | Campaign Record / production dossier identity |
| `submit-project` | Gate only | Workflow completion |

---

## 6. Questions to Revise

Recommendations for Tagia review — **decision areas only, not final question copy**.

| Tile | Issue | Recommended direction |
|------|-------|----------------------|
| **Situation** | `Pivoting or rebranding` scores nothing | Decide primary package path for rebrand customers; wire `better-branding` need + catalog rules |
| **Situation** | `Other` bypasses scoring | Replace with bounded options or structured follow-up that maps to a catalog bucket |
| **Challenge** | `Technology and tools` unmapped | Reframe to marketing-asset gap Studio can solve, or treat as disqualifier with explicit scope boundary |
| **Challenge** | `Team and hiring` weakly maps to GROWTH | Clarify as marketing-system readiness, not HR; or remove from scoring |
| **Challenge** | `Other` bypasses scoring | Same as situation Other |
| **Focus** | Unstructured text → fragile keyword hits | Hybrid: guided priority buckets (test / consistent / scale / ongoing) plus optional detail line |
| **Current tools** | Collected but unused | Wire selections to add-on gap rules before next Discovery copy change |
| **Missing need selector** | Engine depends on `selectedNeeds` | Add multiselect outcome area per `studioNeeds` — **highest priority revision** |

---

## 7. Gaps to Add

What Discovery must collect — framed as **decision areas**, not final wording.

| Decision area | Why the engine / business model needs it | Unlocks |
|---------------|------------------------------------------|---------|
| **Desired outcomes (need selection)** | `need` is the highest-weight signal across catalog; completely absent from UI | All package scoring; `NEED_TO_DELIVERABLES` scope; summary need phrases; fixes `better-branding` gap |
| **Engagement model / support appetite** | Distinguish one-time test (SPARK) vs recurring (MOMENTUM) vs bridge (monthly-support) vs partnership (GROWTH) | NOW vs LATER phasing; resolves MOMENTUM / monthly-support overlap |
| **Project shape / campaign type** | Refines SPARK deliverable emphasis (promotion, event, launch) | Production planning within package quotas |
| **Execution readiness** | Customer can send email, post social, run SMS | Prevents recommending undeliverable channels; pairs with tools gap |
| **Timeline urgency** | Launch date, season, or hard deadline | Scheduling and capacity allocation at ~20–25 active clients |
| **Prior Studio relationship** | New vs returning vs upgrade | Avoid re-recommending entry tier; upgrade path |
| **Target audience** | Content angle for social/email/SMS | Production brief metadata (may not change package tier) |

Catalog and engine wiring for tools, phasing, and mutual exclusion are **follow-on work** after Tagia locks recommendation philosophy (see `docs/discovery-decision-matrix.md` Part G.1).

---

## 8. Balanced Production Plan Principle

How Discovery should support the boutique business model built over the last two days — consultant, not cart; NOW vs LATER; ~20–25 client capacity.

### Consultant, not shopping cart

Discovery must produce **evidence for one primary recommendation**, not a wish list. Today the engine returns every active service with score > 0 (`engine.ts` filter `entry.score > 0`), which conflicts with consultant behavior. Discovery should collect **dense, deterministic signals** (needs, situation, challenge, structured focus) so a future phasing layer can select one NOW package plus LATER suggestions. Free-text tiles that do not score add conversational warmth but **no decision value** — remove them.

### NOW vs LATER

| Phase | Discovery evidence (target) | Engine behavior today |
|-------|----------------------------|------------------------|
| **NOW** | Strong multi-signal match on one package tier; engagement model = one-time or ready for recurring | All matching active packages returned ranked — no single-primary enforcement beyond `primaryServiceId` label |
| **LATER** | Add-ons (inactive catalog), upgrade paths (SPARK → MOMENTUM → GROWTH), monthly-support bridge | Inactive services score and emit `inactive-service-match` warnings; not filtered from scoring |

Discovery should add **engagement model** and **timeline urgency** decision areas so Tagia can phase recommendations without stacking high-effort services on day one.

### Boutique capacity (~20–25 active clients)

High-effort services (GROWTH ~32 hrs/cycle, MOMENTUM ~20 hrs/cycle) require **stronger evidence** than SPARK (~12 hrs one-time). Engine already flags `low-confidence-match` when top score ≤ 1 or tied (`LOW_CONFIDENCE_MAX_SCORE = 1`), which sets `requiresApproval = true`. Discovery Summary surfaces this as "a quick review before checkout is recommended."

Discovery should:

1. Collect needs first — reduces false SPARK matches from situation alone (situation + challenge can score SPARK at 3 without any need).
2. Avoid redundant prompts — fewer tiles, higher signal density.
3. Surface orphan options (`Pivoting`, `Technology and tools`) only after catalog rules exist.

Default to **human review on weak matches** rather than auto-checkout — aligned with capacity protection.

### Exact alignment checklist (post-approval)

1. Add need selector → wire to `DiscoveryBrief.selectedNeeds`
2. Remove or merge non-scoring textareas
3. Wire `your-current-tools` to catalog gap rules
4. Revise orphan select options or add catalog mappings
5. Lock package vs scope philosophy before further question additions
6. Implement engine phasing (NOW / LATER) after Discovery collects engagement model

---

## Appendix: Scoring Reference (Current Code)

Prototype brief (`src/lib/discovery-summary-prototype-brief.ts`) — SPARK wins with needs + tiles:

| Signal | Value | Weight |
|--------|-------|--------|
| need | get-more-customers | +2 |
| situation | Starting fresh | +2 |
| challenge | Lack of clarity or direction | +1 |
| focus-keyword | test (in "test our first campaign") | +2 |
| focus-keyword | first campaign | +2 |
| **Total** | | **7** |

Same brief **without** `selectedNeeds` would score SPARK at **5** — still top, but need rules for MOMENTUM/GROWTH/add-ons never contribute in real Discovery submissions.

---

## Appendix: Relationship to Prior Doc

`docs/discovery-decision-matrix.md` defines target consultant behavior per service (SHOULD recommend / SHOULD NOT). **This audit** grounds the same questions in **actual code paths** — what `engine.ts` and `buildDiscoverySummary.ts` consume today. Use the decision matrix for service-level philosophy; use this audit for Discovery question keep/remove/add decisions.

---

*Planning-only. No Discovery UI, engine, Payment, Campaign Record, Studio Board, Review Room, or Final Delivery changes in this pass.*
