# Discovery Decision Matrix & Question Audit

**Status:** Architectural planning — no UI or engine changes  
**Purpose:** Define HOW The Studio makes service recommendations before adding or changing Discovery questions  
**Sources:** `src/catalog/services.ts`, `src/config/business-discovery-studio.ts`, `src/config/studio-services.ts`, `src/recommendation/engine.ts`, `docs/discovery-studio-redesign-proposal.md`, `src/config/studio-guide-v1-lock.ts`  
**Last updated:** June 25, 2026

---

## Executive Summary

Discovery Studio is a **professional consultation**, not generic intake. Its job is to gather evidence that lets the Recommendation Engine recommend the **right services at the right time** — protecting boutique quality (~20–25 active clients) by recommending impact, not everything possible.

**Critical finding:** The catalog, engine, and Discovery UI are **not aligned today**.

| Layer | What it does today | Gap |
|-------|-------------------|-----|
| **Discovery UI** | 8 generic tiles; no need selector | Engine expects `selectedNeeds[]` but no tile collects it |
| **Catalog `discoveryMapping`** | Weighted rules on needs, situation, challenge, focus keywords | Maps to **packages** (SPARK/MOMENTUM/GROWTH), not need→deliverable scope |
| **Recommendation Engine** | Scores all active services with score > 0; returns full ranked list | No NOW vs LATER phasing; no single-primary enforcement |
| **Redesign proposal** | Need→deliverable mapping; no package pressure in Discovery | Conflicts with catalog package scoring |

**Stop-work directive:** Do not add or revise Discovery questions until this matrix is reviewed by Tagia and the recommendation philosophy (packages vs scope vs hybrid) is locked.

---

## Boutique Philosophy (Embedded in All Decisions)

1. **Experienced creative consultant, not shopping cart** — Discovery recommends a focused path, not every service that partially matches.
2. **NOW vs LATER phasing** — One primary package or scope NOW; add-ons and upgrades are LATER unless evidence is overwhelming.
3. **Capacity constraint** — ~20–25 active clients. High-effort services (GROWTH, recurring MOMENTUM) require stronger evidence than entry SPARK.
4. **Quality protection** — Do not stack add-ons on day one. Inactive add-ons exist in catalog but should surface as opt-in suggestions, not bundled recommendations.
5. **Deterministic, not AI** — Every question must map to a catalog signal the engine can score. Free-text without parsing rules is context-only.

---

## Part A: Discovery Decision Matrix

### How to read this section

- **Discovery evidence** lists signals the catalog `discoveryMapping` uses today (in parentheses: weight).
- **SHOULD recommend** is the **target** consultant behavior — what Tagia would say after a good Discovery conversation.
- **Catalog gap** notes where current `discoveryMapping` differs from SHOULD behavior.
- **Phase:** NOW = recommend at Discovery/checkout; LATER = suggest after first campaign or upgrade conversation.

---

### Packages (Active)

#### SPARK (`spark`) — $299 one-time

| Field | Detail |
|-------|--------|
| **Customer problem** | Needs to test a promotion, product, event, or offer before investing in a larger marketing system; lacks clarity on direction; first campaign. |
| **Deliverables** | 3 concepts, 3 social, 3 emails, 3 SMS, 1 calendar, 1 video script |
| **Production effort** | Medium (~12 hrs) |

**Discovery evidence required (current catalog rules):**

| Signal | Value | Weight | Tile / source |
|--------|-------|--------|---------------|
| need | `get-more-customers` | 2 | `selectedNeeds` — **no Discovery tile** |
| situation | `Starting fresh` | 2 | `your-situation` |
| challenge | `Lack of clarity or direction` | 1 | `your-challenge` |
| focus-keyword | `test` | 2 | `your-focus` |
| focus-keyword | `first campaign` | 2 | `your-focus` |

**SHOULD recommend when:**

- Customer is new or restarting (`Starting fresh`)
- Primary goal is customer acquisition or validating an offer
- Focus language indicates testing, first campaign, or pilot
- No evidence of need for ongoing monthly production or full marketing system

**SHOULD NOT recommend when:**

- Customer explicitly needs consistent monthly content (→ MOMENTUM)
- Customer is scaling operations and wants a complete system (→ GROWTH)
- Customer only needs a single channel add-on without a base campaign (add-ons depend on SPARK but are LATER)
- Focus/challenge indicate operations, team, or technology as primary blocker (marketing assets won't solve root issue — consultant should clarify scope)

**Phase:** **NOW** — default entry for first-time and test-minded customers.

**Dependencies:** None (base package).

**Catalog gap:** `get-more-customers` need is the strongest signal (weight 2) but **cannot be collected in current Discovery UI**. Situation/challenge alone can score SPARK at 3 without any need selected.

---

#### MOMENTUM (`momentum`) — $499/month

| Field | Detail |
|-------|--------|
| **Customer problem** | Wants consistent visibility and regular content creation; growing business needs ongoing marketing support, not a one-off. |
| **Deliverables** | 3 concepts/mo, 6 social, 6 emails, 6 SMS, 1 calendar/mo, 2 video scripts/mo |
| **Production effort** | High (~20 hrs/cycle) |

**Discovery evidence required (current catalog rules):**

| Signal | Value | Weight | Tile / source |
|--------|-------|--------|---------------|
| need | `create-content` | 2 | `selectedNeeds` |
| need | `improve-communication` | 1 | `selectedNeeds` |
| situation | `Growing an existing business` | 2 | `your-situation` |
| challenge | `Marketing and visibility` | 2 | `your-challenge` |
| focus-keyword | `consistent` | 2 | `your-focus` |
| focus-keyword | `monthly` | 2 | `your-focus` |

**SHOULD recommend when:**

- Existing business with traction seeking regular content cadence
- Challenge is visibility/marketing, not foundational clarity
- Focus mentions ongoing, monthly, or consistent presence
- Customer has tools or prior marketing activity (optional — see `your-current-tools` gap)

**SHOULD NOT recommend when:**

- Customer is truly starting fresh with no offer validated (→ SPARK first)
- Primary pain is operations/systems/team (→ GROWTH or Business Workflow LATER)
- Customer wants one campaign only — recurring commitment misaligned

**Phase:** **NOW** if evidence is strong; **LATER** (upgrade from SPARK) if customer is test-minded but situation says "growing."

**Dependencies:** None in catalog (logical upgrade path from SPARK).

**Catalog gap:** No rule uses `your-current-tools`. Redesign proposal suggests tool presence indicates readiness for recurring work — not implemented.

---

#### GROWTH (`growth`) — $799/month

| Field | Detail |
|-------|--------|
| **Customer problem** | Ready to build a complete marketing system; scaling operations; needs strategy, priority production, higher quotas. |
| **Deliverables** | 10 social, 10 emails, 10 SMS, 3 concepts, 1 calendar, 3 video scripts, quarterly strategy session, priority queue, 3 revision rounds |
| **Production effort** | High (~32 hrs/cycle) |

**Discovery evidence required (current catalog rules):**

| Signal | Value | Weight | Tile / source |
|--------|-------|--------|---------------|
| need | `better-business-systems` | 2 | `selectedNeeds` |
| need | `workflow-improvements` | 2 | `selectedNeeds` |
| situation | `Scaling operations` | 2 | `your-situation` |
| challenge | `Operations and efficiency` | 1 | `your-challenge` |
| challenge | `Team and hiring` | 1 | `your-challenge` |
| focus-keyword | `scale` | 2 | `your-focus` |
| focus-keyword | `system` | 2 | `your-focus` |

**SHOULD recommend when:**

- Customer is scaling, not starting
- Needs span systems + marketing (calendar, planning, high volume)
- Focus language includes scale, system, or partnership
- Customer can sustain premium monthly commitment

**SHOULD NOT recommend when:**

- Customer needs a single test campaign (→ SPARK)
- Customer wants content only without strategic partnership (→ MOMENTUM)
- Challenge is purely technology/tools — Studio creates assets, does not implement CRM/automation
- Capacity/quality risk: weak evidence (score ≤ 1) should trigger human review, not auto-recommend

**Phase:** **NOW** only with strong multi-signal match; otherwise **LATER** after SPARK/MOMENTUM proves fit.

**Dependencies:** None in catalog.

**Catalog gap:** `Team and hiring` challenge maps to GROWTH but Studio does not deliver HR/team services — consultant must frame as marketing system support, not team building.

---

### Add-ons (Inactive in Catalog — Opt-in / LATER)

All add-ons have `status: "inactive"`. Engine scores them but emits `inactive-service-match` warnings. Target behavior: suggest in **You May Also Like**, not primary recommendation.

---

#### Email Marketing (`email-marketing`)

| Field | Detail |
|-------|--------|
| **Customer problem** | Needs expanded email campaign copy beyond base package quotas. |
| **Deliverables** | 1× Email Campaign |
| **Pricing** | Quoted at checkout (TBD) |

**Discovery evidence (catalog):** need `improve-communication` (2), `better-customer-experience` (1); challenge `Marketing and visibility` (1)

**SHOULD recommend when:** Communication need + email gap in tools (no email platform selected) OR customer opts in after base package set.

**SHOULD NOT recommend when:** No base package (SPARK) in recommendation set — dependency unmet.

**Phase:** **LATER** — opt-in add-on after primary package.

**Dependencies:** `spark` (catalog)

**Catalog gap:** `your-current-tools` option "Email marketing" not wired — redesign proposal maps absence to this add-on.

---

#### SMS Campaign (`sms-campaign`)

| Field | Detail |
|-------|--------|
| **Customer problem** | Needs SMS messaging copy for mobile reach. |
| **Deliverables** | 1× SMS Messaging |

**Discovery evidence (catalog):** need `improve-communication` (2), `better-customer-experience` (2)

**SHOULD recommend when:** Customer acquisition or communication needs + mobile/SMS intent; opt-in only.

**SHOULD NOT recommend when:** No SPARK in set; customer has no SMS capability and no plan to execute (Studio delivers copy only).

**Phase:** **LATER**

**Dependencies:** `spark`

---

#### Business Workflow (`business-workflow`)

| Field | Detail |
|-------|--------|
| **Customer problem** | Needs campaign planning and workflow documentation for the team. |
| **Deliverables** | 1× Campaign Planning |

**Discovery evidence (catalog):** need `better-business-systems` (2), `workflow-improvements` (3), challenge `Operations and efficiency` (2)

**SHOULD recommend when:** Systems/workflow needs on MOMENTUM+ customer; CRM/project management gap in tools.

**SHOULD NOT recommend when:** Customer on SPARK only — dependency is `momentum`, not `spark`.

**Phase:** **LATER** — after recurring relationship established.

**Dependencies:** `momentum`

**Catalog gap:** Tool gap rules (no CRM → Business Workflow) from redesign proposal not in catalog.

---

#### Customer Follow-Up (`customer-follow-up`)

| Field | Detail |
|-------|--------|
| **Customer problem** | Needs nurture sequences for leads and customers post-campaign. |
| **Deliverables** | 3× Follow-Up Emails, 3× Follow-Up SMS |

**Discovery evidence (catalog):** need `better-customer-experience` (3), challenge `Marketing and visibility` (1)

**SHOULD recommend when:** Customer experience/retention focus; "some ongoing help" support appetite (proposed, not in UI).

**SHOULD NOT recommend when:** Customer hasn't committed to base campaign; follow-up without primary offer is premature.

**Phase:** **LATER**

**Dependencies:** `spark`

---

#### Monthly Support (`monthly-support`)

| Field | Detail |
|-------|--------|
| **Customer problem** | Wants ongoing Studio support beyond one-time campaign — bridge toward MOMENTUM. |
| **Deliverables** | 1× Marketing Calendar |

**Discovery evidence (catalog):** situation `Growing an existing business` (2); focus-keyword `ongoing` (2), `support` (1)

**SHOULD recommend when:** Customer wants continuity but isn't ready for full MOMENTUM quotas; upgrade path signal.

**SHOULD NOT recommend when:** MOMENTUM is the right fit (don't offer bridge and full tier together); starting fresh with test mindset.

**Phase:** **LATER** — or NOW as softer entry to recurring if MOMENTUM feels too large (consultant judgment; engine can't express this today).

**Dependencies:** `spark`

**Catalog gap:** Overlaps MOMENTUM signals (`Growing an existing business`) — engine may score both; no mutual-exclusion logic.

---

### Need IDs Without Package Mapping

These exist in `studio-services.ts` but have **no** `discoveryMapping` on any active package:

| Need ID | Label | Deliverables (need→deliverable map) | Decision matrix note |
|---------|-------|-------------------------------------|----------------------|
| `better-branding` | Better Branding | Campaign Creation, Brand Messaging, Marketing Graphics | **Gap** — no package rule; branding customers may score SPARK only via `get-more-customers` if they pick it elsewhere |
| `create-content` | Create Content | Social Media Content, Video Scripts | Maps to MOMENTUM (weight 2) only |
| `workflow-improvements` | Workflow Improvements | Marketing Calendar | Maps to GROWTH + Business Workflow add-on |
| `better-customer-experience` | Better Customer Experience | Email, SMS, Social | Maps to inactive add-ons only |

---

## Part B: Question-to-Service Mapping

Current Discovery tiles (`src/config/business-discovery-studio.ts`) mapped to services that **depend on their answers** for catalog scoring.

| Tile ID | Question (summary) | Field type | Services / signals affected |
|---------|-------------------|------------|----------------------------|
| `your-business` | Business or project name | text | **None** — identity/metadata only; required for campaign record, not scoring |
| `your-situation` | Where are you in your journey? | select | **SPARK** (`Starting fresh`), **MOMENTUM** (`Growing an existing business`), **GROWTH** (`Scaling operations`), **monthly-support** (`Growing an existing business`) |
| `your-challenge` | Main challenge right now? | select | **SPARK** (`Lack of clarity or direction`), **MOMENTUM** (`Marketing and visibility`), **GROWTH** (`Operations and efficiency`, `Team and hiring`), **email-marketing**, **customer-follow-up** (visibility) |
| `your-current-tools` | Tools/platforms in use | multiselect-other | **None in catalog today** — redesign proposal: gap detection for email-marketing, sms-campaign, business-workflow |
| `your-focus` | What should we focus on first? | text (keyword) | **SPARK** (test, first campaign), **MOMENTUM** (consistent, monthly), **GROWTH** (scale, system), **monthly-support** (ongoing, support) |
| `success-looks-like` | What does success look like? | textarea | **None** — no parsing rules; consultant context only |
| `whats-slowing-you-down` | What's getting in the way? | textarea | **None** — no parsing rules; consultant context only |
| `anything-else` | Anything else we should know? | textarea | **None** — no parsing rules |
| `submit-project` | Ready to submit? | submit | **None** — gate only |

### External signal (not a tile)

| Signal | Source | Services affected |
|--------|--------|-------------------|
| `selectedNeeds[]` | Expected on `DiscoveryBrief` but **not collected in Discovery UI** | **All packages and add-ons** — primary need-based rules |

### Situation / challenge options with NO catalog mapping

| Tile | Option | Notes |
|------|--------|-------|
| `your-situation` | Pivoting or rebranding | No rule — may relate to `better-branding` need (unmapped) |
| `your-situation` | Other | Free text in select — no scoring |
| `your-challenge` | Technology and tools | No rule — Studio doesn't implement tools |
| `your-challenge` | Other | No scoring |

---

## Part C: Questions to Keep

| Tile | Rationale |
|------|-----------|
| **Your Business** (`your-business`) | Required identity for campaign record and Discovery Summary; zero scoring impact is correct. |
| **Your Situation** (`your-situation`) | Directly drives package tier (fresh → SPARK, growing → MOMENTUM, scaling → GROWTH). Core consultant question. Keep options aligned to catalog values exactly (engine uses exact string match). |
| **Your Challenge** (`your-challenge`) | Secondary discriminator between packages and add-ons. Keep; trim or remap options that don't connect to services (see Part D). |
| **Your Focus** (`your-focus`) | Free-text priority captures nuance keywords (`test`, `monthly`, `scale`) that selects/phases recommendations. Keep; consider guided prompts or chips to reduce low-confidence matches. |
| **Your Current Tools** (`your-current-tools`) | Not wired to engine yet, but **essential** for honest add-on suggestions (redesign proposal §2). Keep; wire to gap-detection rules before treating as optional. |
| **Submit Project** (`submit-project`) | Required gate. |

---

## Part D: Questions to Revise

Recommendations for Tagia's review — **not final copy**.

| Tile | Issue | Recommended change |
|------|-------|------------------|
| **Your Situation** | `Pivoting or rebranding` has no catalog mapping | Add mapping via new need tile OR link to `better-branding` need + SPARK/MOMENTUM rules; clarify whether rebrand customers start with SPARK or MOMENTUM |
| **Your Situation** | `Other` bypasses deterministic scoring | Consider `select` + conditional detail field, or map Other text to nearest situation bucket via fixed synonym list (engine change — out of scope for this doc) |
| **Your Challenge** | `Technology and tools` implies execution Studio doesn't offer | Revise option to customer-facing outcome (e.g. marketing asset gap) OR keep as disqualifier/context with explicit "Studio creates copy, not implementations" |
| **Your Challenge** | `Team and hiring` maps to GROWTH weakly (weight 1) | Clarify option label to marketing-system readiness, not HR; or remove from scoring |
| **Your Focus** | Unstructured text → fragile keyword matching | Consider hybrid: short guided choices (test / consistent / scale) plus optional detail line; preserves keyword signals, reduces ties |
| **Success Looks Like** | Collects rich data with zero scoring | Either wire high-value keywords to phasing (NOW vs LATER), merge into Focus, or demote to optional post-recommendation note |
| **What's Slowing You Down** | Overlaps Challenge + Focus; no scoring | Merge with Challenge OR use as optional context field; avoid three overlapping "problem" prompts |
| **Anything Else** | Duplicate context bucket | Keep as single optional catch-all; remove redundancy if blockers/success merged |
| **Missing: Desired Outcomes** | Engine depends on `selectedNeeds` but no tile exists | **Highest priority revision** — add multiselect need bubbles per `studio-services.ts` (redesign proposal Decision 2) |

---

## Part E: Questions to Remove

| Tile | Rationale |
|------|-----------|
| **What's Slowing You Down** (`whats-slowing-you-down`) | **Remove or merge** — third free-text "problem" field alongside Challenge and Focus; no deterministic path; adds fatigue without improving recommendations. |
| **Success Looks Like** (`success-looks-like`) | **Remove or merge** — unless revised to structured outcomes tied to needs; currently does not affect engine; consultant can absorb in Focus or Anything Else. |

**Do not remove** until Tagia approves merge targets (likely Focus + Anything Else).

---

## Part F: Questions to Add

Proposed **evidence areas** — Tagia to refine final question text and UI pattern.

| Proposed area | Why | Services / decisions unlocked |
|---------------|-----|------------------------------|
| **Desired outcomes (need selector)** | Engine's strongest signal is `need`; completely absent from UI | All packages; deliverable scope via `NEED_TO_DELIVERABLES`; resolves `better-branding` gap |
| **Project type** | Campaign shape (promotion, event, launch) | Refines SPARK deliverable emphasis; aligns with redesign Decision 3 |
| **Target audience** | Content angle for social/email/SMS | Does not change package tier but required for production; metadata for Campaign Record |
| **Support appetite / engagement model** | One-time vs ongoing vs partnership | NOW vs LATER phasing; MOMENTUM vs SPARK vs monthly-support bridge; redesign Decision 5 |
| **Execution readiness** | Whether customer can send email/SMS/run social themselves | Prevents recommending channels they can't execute; aligns with `studioGuideCustomerClarifications` |
| **Timeline urgency** | Launch date or season | Phasing NOW vs LATER; capacity planning (~20–25 clients) |
| **Prior Studio relationship** | New vs returning vs upgrade | Upgrade path vs net-new SPARK; avoid re-recommending entry tier |

---

## Part G: Recommendations

### 1. Lock the recommendation philosophy first

Choose one primary model (or explicit hybrid):

| Model | Discovery output | Package role |
|-------|------------------|--------------|
| **A. Package consultant** (current catalog) | Ranked SPARK / MOMENTUM / GROWTH + optional inactive add-ons | Primary recommendation |
| **B. Scope assembler** (redesign proposal) | Need→deliverable `projectIncludes` + opt-in add-ons | Packages hidden until Payment |
| **C. Hybrid** | Needs + situation → primary package NOW + scoped deliverables + LATER add-ons | Package as production tier, needs as scope |

Until this is locked, **do not add Discovery questions** — new questions will map to the wrong output shape.

### 2. Add the need selector before any other question work

Implement Decision 2 from `discovery-studio-redesign-proposal.md` as the next Discovery change. Wire answers to `DiscoveryBrief.selectedNeeds`. Without it, **every need-weighted catalog rule is dead code** in production Discovery.

### 3. Align catalog `discoveryMapping` to this matrix

After Tagia approves Part A SHOULD rules:

- Add rules for `better-branding`, `Pivoting or rebranding`, tool-gap signals
- Add negative weights or exclusion rules (engine enhancement) for mutual exclusion (SPARK vs GROWTH)
- Wire `your-current-tools` selections to add-on gap detection
- Resolve monthly-support vs MOMENTUM overlap

### 4. Implement NOW vs LATER in the engine (future)

Current engine returns **all** active services with score > 0. Target behavior:

- **Primary** — highest score, meets confidence threshold
- **Also consider** — runner-up within 1 point (optional disclosure)
- **Later** — add-ons and upgrade paths, inactive services as suggestions only

This requires engine changes **after** matrix approval — not in this documentation pass.

### 5. Reduce question count; increase signal density

Target flow (8 decisions + review from redesign proposal):

1. Business name (keep)
2. Desired outcomes (add — needs)
3. Situation (keep, revise options)
4. Challenge (keep, trim unmapped options)
5. Focus (keep, consider structure)
6. Current tools (keep, wire to catalog)
7. Support appetite (add)
8. Anything else (keep, optional)
9. Review / submit (keep)

Remove or merge: Success Looks Like, What's Slowing You Down.

### 6. Exact string contract

Engine matches situation/challenge with **exact option text**. Any copy change in Discovery tiles **must** update catalog `discoveryMapping` in the same change set.

### 7. Human review triggers (already in engine)

Preserve and surface clearly in Discovery Summary:

- `low-confidence-match` (top score ≤ 1 or tie)
- `unmet-dependency` (add-on without base package)
- `missing-discovery-answer` on situation, challenge, focus
- `requiresApproval` when quoted pricing or warnings present

At ~20–25 client capacity, default to **consultant review** on low-confidence matches rather than auto-checkout.

---

## Appendix: Catalog vs Engine vs UI Gap Summary

| Gap | Severity | Action owner |
|-----|----------|--------------|
| No `selectedNeeds` tile | **Critical** | Discovery config + UI |
| `your-current-tools` unused | High | Catalog rules + engine |
| `better-branding` need unmapped | High | Catalog + need tile |
| Engine recommends all matches, no phasing | High | Engine (post-approval) |
| Redesign proposal vs package catalog conflict | **Strategic** | Tagia decision |
| Free-text tiles with no parsing | Medium | Merge or structure |
| Inactive add-ons score without offer path | Medium | Engine filter + Summary UX |
| Situation/challenge orphan options | Medium | Revise options or add rules |
| monthly-support overlaps MOMENTUM | Low | Catalog mutual-exclusion |

---

## Appendix: Scoring Reference (Current Engine)

For a valid brief, engine:

1. Validates brief (`validateDiscoveryBrief`)
2. Scores each **active** service by summing matched rule weights
3. Returns all services with score > 0, ranked by score desc
4. Sets `primaryServiceId` to rank 1
5. Warns on missing situation/challenge/focus, inactive matches, unmet dependencies, low confidence (top ≤ 1 or tie)

**Prototype brief** (`src/lib/discovery-summary-prototype-brief.ts`) scores SPARK highest: needs `get-more-customers` (+2), situation Starting fresh (+2), challenge Lack of clarity (+1), focus "test our first campaign" (+2) = **7**.

---

*This document is planning-only. Implementation requires Tagia approval on philosophy (Part G.1) before Discovery or engine changes.*
