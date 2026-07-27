# CR-5 — Obsolete-Path Dependency and Archive-Candidate Audit

**Status:** **COMPLETE** — inventory classified; owner decisions CR-5-D1–D3 locked; nothing archived or deleted
**Package type:** Inspection only — **nothing archived, deleted, moved, redirected, or renamed**
**Protected tip audited:** `79ed2ce8769d76d1d4e2b4f0ee3f847e33607207`
**Branch:** `fix/discovery-responsive-layout`
**Sync at audit open:** `0 ahead / 0 behind`
**Date:** 2026-07-26
**Master Launch List:** not updated in this checkpoint (deferred until CR-5B repair or Tagia-authorized launch-status update)

---

## 1. Scope and protected tip

CR-5 identifies old, parallel, disconnected, superseded, or development-only Conversation Room paths and classifies them with dependency proof.

**Produces:** evidence and classifications.
**Does not:** modify product behavior; archive; delete; redirect; rename; move files; stage dirty WIP; update the Master Launch List (until Tagia approves classifications).

**Locked principle:** Archive first. Delete only after Tagia explicitly approves.

---

## 2. Audit method

1. Read settled locks: Conversation Room Completion Plan, Master Launch List (CR-D4/CR-D5), CR-4 certification record, Customer-Facing Room Inventory, Studio Review migration ledger, dirty WIP boundary.
2. For each required candidate group, search static imports, dynamic imports, barrels, routes, redirects, middleware, config, tests, scripts, docs, storage keys, migration readers, CSS, asset URLs, staff tools.
3. Distinguish **protected HEAD (`79ed2ce`)** from **dirty uncommitted WIP** and **untracked** files.
4. Assign exactly one primary classification per candidate.
5. No deletion simulation on the dirty main tree.

**Static checks run (no product changes):**

- Tip / sync verification (`79ed2ce`, `0/0`)
- Ripgrep import graphs for discovery UI, phase gates, Host remnants, recommendation engine, Studio Review nav
- Cross-read of `next.config.ts`, `legacy-route-quarantine-v1.ts`, `customer-journey-v1.ts`, inventory §G, migration ledger

**Not rerun:** CR-4 30-row matrix, Vitest full sets, production build.

---

## 3. Settled doctrine not reopened

Hey Chat — this is repetitive if we re-open work already completed or locks already on the books.

| Lock | Status |
|---|---|
| CR-1 / CR-2 / CR-3 / CR-4 / CR-4R1–R5 | Complete and protected — do not reopen |
| Live Host / Package 4 Voice Host | DISCONTINUED |
| Recommendation engine for launch | DISCONTINUED |
| Stage machine authority | `opening → route → services → plan → checkout → intake → complete` |
| Voice preference gate · Lobby silence | Locked |
| Signed-in / signed-out handoff | CR-4 certified |
| CR-D4 | Parallel `discovery/` untouched through CR-4; classify after dependency inspection; archive before delete |
| CR-D5 | Do **not** wire `evaluateConversationPhaseGate`; stage machine is sole journey authority |
| Studio Review → tablet migration | Remove pages only after full tablet integration + owner approval |
| Truthful route starting-point | Keyword map + “Suggested starting point” badge **KEEP — LIVE** |

---

## 4. Candidate inventory (groups 1–9)

### Group 1 — Parallel discovery components

| Candidate | Paths | Classification |
|---|---|---|
| Discovery Q1 UI | `src/components/studio-conversation-room/discovery/DiscoveryQuestion1View.tsx` + `discovery-question-1.module.css` | **ARCHIVE CANDIDATE** |
| Discovery tablet interview | `DiscoveryTabletPanel.tsx` · `DiscoveryStepForm.tsx` · `discovery-tablet.module.css` | **ARCHIVE CANDIDATE** |
| Discovery presentation | `DiscoveryPresentationView.tsx` · `discovery-presentation.module.css` | **ARCHIVE CANDIDATE** |
| Presentation surface shell | `PresentationSurfaceView.tsx` · `presentation-surface.module.css` | **ARCHIVE CANDIDATE** |
| Driver / Voice Assist chrome | `ConversationDriverControl.tsx` · `VoiceAssistControls.tsx` + CSS modules | **ARCHIVE CANDIDATE** |
| Q1 draft lib | `src/lib/discovery-question-1/*` | **ARCHIVE CANDIDATE** (config/docs may stay KEEP — INTERNAL doctrine) |
| Discovery facts / steps lib | `src/lib/studio-conversation-discovery/*` | **ARCHIVE CANDIDATE with discovery UI** — framework type coupling **repaired in CR-5B2** (Presentation payload type now owned by `studio-conversation-framework`). Lib remains for unwired UI + its tests only. |
| Migration ledger claim naming `DiscoveryTabletPanel` as tablet replacement | `studio-review-voice-tablet-migration-v1.ts` discovery row | **REPAIRED in CR-5B2** — ledger states Guide is live; `DiscoveryTabletPanel` present but unwired / archive candidate |

**Evidence:** Zero runtime importers from `ConversationRoomRuntime` / Guide. Live opening UI is `StudioGuideTabletView` + `StudioGuideCommPanel`. Barrel exports unused by the live page. Config `discovery-question-1-v1` still referenced by doctrine docs/AGENTS.

**CR-5B2 repair (2026-07-26):** Framework `types.ts` / `presentation-manager.ts` no longer import `@/lib/studio-conversation-discovery`. Discovery UI files untouched. ARCHIVE-1 not started.

### Group 2 — `evaluateConversationPhaseGate`

| Candidate | Paths | Classification |
|---|---|---|
| Phase-gate evaluator + helpers | `src/lib/studio-conversation-phase-gates/*` | **KEEP — INTERNAL** |
| Phase-gate config + locked doc | `src/config/studio-conversation-phase-gates-v1.ts` · `docs/studio-conversation-phase-gates-v1-locked.md` | **KEEP — INTERNAL** |
| Live stage machine | `conversation-room-stage-v1.ts` + Runtime `stage` | **KEEP — LIVE** |

**Evidence:** Evaluator called only from phase-gates tests and `studio-conversation-discovery.test.ts`. Not imported by Runtime. CR-4 Vitest matrix still includes the package path. Per CR-D5: do not wire; preserve while tests/docs depend.

### Group 3 — Legacy standalone routes

Inventory already classifies **19 redirect-only** Host/commerce shells as obsolete bookmarks. Tip `next.config.ts` has **12** redirects; additional page-only redirects cover the rest (e.g. `/intake`, `/draft-room`, Discovery trio, `/welcome-hall`).

| Family | Examples | Classification |
|---|---|---|
| Live CR + stages | `/studio-conversation-room`, `?stage=checkout`, `?stage=intake` | **KEEP — LIVE** |
| Post-purchase live | `/studio-board`, `/campaign-details`, `/feedback-studio`, `/deliverables`, `/account-handoff` | **KEEP — LIVE** |
| Host commerce redirects | `/route-map`, `/project-builder`, `/checkout`, `/payment`, `/project-details`, `/project-summary`, `/discovery-summary`, `/studio-plan-review`, `/studio-guide`, `/studio-guide-prototype`, `/studio-tablet`, `/review-room`, Discovery trio, `/intake`, `/draft-room*`, `/welcome-hall` | **KEEP — COMPATIBILITY** (redirect shells) · page shells = **ARCHIVE CANDIDATE** after bookmark proof |
| Tip quarantine list gaps | Omits some redirected URLs (e.g. `/route-map`, `/project-builder`, `/checkout`) | **UNRESOLVED** hygiene (list completeness) — do not change redirects in CR-5 |
| Dirty WIP quarantine add `/checkout` | Working tree only | Dirty WIP — **do not stage** |

**Do not change redirects during CR-5.**

### Group 4 — Development-only Studio Review navigation

| Candidate | At tip `79ed2ce` | Classification |
|---|---|---|
| `OwnerQaRoot` + `OwnerQaPanel` + `?studioReview=1` | Dev-only mount (`NODE_ENV === "development"`) | **KEEP — INTERNAL** |
| `stripStudioReviewSearch` | Device-preview hygiene | **KEEP — INTERNAL** |
| Conversation Room customer nav Studio Review link | **Absent** at tip | Protected without customer exposure |
| Dirty WIP: `studioReviewHref` on `ConversationNavPanel` / Runtime | Working tree only | **RELOCATE CANDIDATE** (belongs with OwnerQa) — **do not stage** |

### Group 5 — Host-era paths and identifiers

| Candidate | Evidence | Classification |
|---|---|---|
| CTA `"Open Host Project Intake"` | `conversation-room-guide-v1.ts` → `ConversationIntakePanel.tsx` | **REPAIR BEFORE ARCHIVE** (customer-visible truth repair — future tiny package) |
| Redirect shells `/studio-tablet`, `/studio-guide*` | next.config + pages | **KEEP — COMPATIBILITY** |
| `StudioHostGreeting` | No importers found | **ARCHIVE CANDIDATE** |
| `StudioLobbyHostLayer` + `enabled: false` config | Unmounted | **ARCHIVE CANDIDATE** |
| Retired `src/components/studio-guide/*` | Explicitly retired; routes redirect | **ARCHIVE CANDIDATE** |
| CSS tokens `.slideHost`, `.checkoutHostSurface`, `.intakeHostSurface`, `.typeHost` | Live layout names | **KEEP — LIVE** (harmless internal) — rename later only with owner approval |
| Studio Host character assets/docs | Locked art doctrine | **KEEP — INTERNAL** / historical — not Live Host product |
| Package 4 Voice Host comments in framework | Obsolete wording | **REPAIR BEFORE ARCHIVE** (comment truth) or leave as historical |
| Auth “Package 4” cert naming | Shipped auth package | **KEEP — INTERNAL** (different lineage) |

### Group 6 — Recommendation-related remnants

| Candidate | Classification |
|---|---|
| CR route keyword map + “Suggested starting point” badge + draft slice | **KEEP — LIVE** |
| `src/recommendation/*` engine | **ARCHIVE CANDIDATE** (after test/catalog coupling repair) |
| `src/lib/run-discovery-recommendation.ts` | **ARCHIVE CANDIDATE** (with engine) |
| `src/discovery-summary/*` + unwired `DiscoverySummary` UI | **ARCHIVE CANDIDATE** / **REPAIR BEFORE ARCHIVE** if Board types still need shared types |
| Catalog `focus-keyword` / discovery triggers | **REPAIR BEFORE ARCHIVE** (catalog coupling) |
| `decision-core/evaluators/discovery.ts` | **ARCHIVE CANDIDATE** with engine · **REPAIR BEFORE ARCHIVE** if decision-core tests require it |
| Archived Project Summary / Studio Plan Review consumers | Already in `src/archive/` — **KEEP** archived |
| Flow-rhythm / phase-gate vocabulary (“route-recommendation”) | **KEEP — INTERNAL** locked doctrine — confusing name, not archive |

### Group 7 — Legacy phase / review / completion systems

| Candidate | Classification |
|---|---|
| Stage machine + working-draft stage cursor | **KEEP — LIVE** |
| Working draft store + Lobby begin completion clear | **KEEP — LIVE** |
| `studioConversationSession` (phase/step only) | **KEEP — COMPATIBILITY** (Lobby round-trip) |
| Framework `journeyPhase` / `flowStep` / Help mode | **KEEP — LIVE** (partial — presence/help/lobby) · not journey authority |
| Navigation spine forward/back (unused by Runtime) | **KEEP — INTERNAL** (tests + Lobby return live) |
| Presentation Manager / Conversation Controller stubs | **KEEP — INTERNAL** (tests / Package 3 contract) |
| Framework `open-review` / `mark-completed` | **KEEP — INTERNAL** (test/contract; not live UI) |
| Flow rhythm config | **KEEP — INTERNAL** (locked Voice hallway) |

### Group 8 — Obsolete tests and fixtures

| Candidate | Classification |
|---|---|
| CR-4 cert harnesses + conversation-room-draft / lobby-begin / intake-attribution tests | **KEEP — LIVE** required regression |
| Framework / phase-gates / rhythm tests | **KEEP — INTERNAL** compatibility protection |
| Discovery / Q1 component-adjacent tests | **KEEP — INTERNAL** until owning code archived · then archive with owners |
| Tip tests asserting literal `/route-map` destinations while product aliases CR | **REPAIR BEFORE ARCHIVE** (test truth) — e.g. `intake-edit.test.ts`, parts of Help Center / journey consolidation tests |
| Owner QA Host labels with CR hrefs | **KEEP — INTERNAL** · partly stale labels |
| Legacy `scripts/*route-map*e2e*` Host destinations | **ARCHIVE CANDIDATE** with Host shells · superseded for CR by CR-4 harnesses |
| Recommendation / discovery-summary / studio-plan-review tests | **KEEP — INTERNAL** until engine archive package |

### Group 9 — CSS and assets

| Candidate | Classification |
|---|---|
| Live room / workspace / presence / guide / activity CSS | **KEEP — LIVE** |
| Lobby plate background reused by CR | **KEEP — LIVE** (owner approval before any visual change) |
| Discovery / presentation / driver / voice-assist CSS modules | **ARCHIVE CANDIDATE** with Group 1 |
| `presentation-display.module.css` (unmounted dual display) | **ARCHIVE CANDIDATE** |
| `public/studio-guide/*` Host-era art | **ARCHIVE CANDIDATE** / historical — owner approval required |
| `public/route-map/*` | **KEEP — COMPATIBILITY** / historical until Route Map shells retired |
| Host-era class names on live surfaces | **KEEP — LIVE** identifiers — not delete candidates |

---

## 5. Dependency evidence (summary)

| Claim | Proof |
|---|---|
| Parallel `discovery/` not on live path | No imports from `ConversationRoomRuntime` / Guide; page mounts Runtime only |
| Phase gates not wired | Grep: evaluator only in its tests + discovery lib tests |
| Redirect shells still needed | `next.config.ts` + thin pages; inventory §G bookmark doctrine |
| Studio Review not in tip CR nav | Tip `ConversationNavPanel` comment: customer-facing only; dirty WIP adds link |
| Engine not launch path | Runtime uses `recommendRouteFromProjectNeed` only; `@/recommendation` unused by CR Runtime |
| Host CTA still customer-visible | Exact string in protected guide config + Intake panel |

---

## 6. Classifications (rollup table)

| ID | Candidate | Primary classification | Customer-One |
|---|---|---|---|
| G1-a | Unwired `discovery/` UI + chrome | ARCHIVE CANDIDATE | Does not block · can wait |
| G1-b | `studio-conversation-discovery` lib | REPAIR BEFORE ARCHIVE | Does not block |
| G1-c | Migration ledger DiscoveryTabletPanel claim | REPAIR BEFORE ARCHIVE | Does not block |
| G2 | Phase-gate evaluator system | KEEP — INTERNAL | Must remain (tests/docs) |
| G3-a | Live CR / Board / handoff routes | KEEP — LIVE | Must remain |
| G3-b | Host redirect shells | KEEP — COMPATIBILITY · shells ARCHIVE CANDIDATE later | Must remain for bookmarks |
| G3-c | Quarantine list completeness vs redirects | UNRESOLVED — HYGIENE ONLY | Does not block |
| G4-a | OwnerQa Studio Review | KEEP — INTERNAL | Hide from customers (already) |
| G4-b | Dirty CR nav Studio Review link | RELOCATE CANDIDATE (dirty — do not stage) | Should stay absent for Customer-One |
| G5-a | “Open Host Project Intake” CTA | REPAIR BEFORE ARCHIVE | **Must be corrected before Customer-One** (CR-5-D1) |
| G5-b | Unmounted Host greeting / Lobby host layer / retired studio-guide | ARCHIVE CANDIDATE | Does not block |
| G5-c | Live Host CSS identifiers | KEEP — LIVE | Must remain |
| G6-a | Route starting-point map + badge | KEEP — LIVE | Must remain |
| G6-b | Full recommendation engine package | ARCHIVE CANDIDATE AFTER COUPLING REPAIR | Deferred until after Customer-One (CR-5-D3) |
| G7 | Framework dual model (presence/lobby/help) | KEEP — LIVE / COMPATIBILITY | Must remain until migration |
| G8 | Stale Host-URL unit tests | REPAIR BEFORE ARCHIVE | Does not block |
| G9 | Unwired discovery/presentation CSS | ARCHIVE CANDIDATE with G1 | Does not block |

---

## 7. Customer-One impact

| Impact | Items |
|---|---|
| **Must be corrected before Customer-One** | Customer-visible `"Open Host Project Intake"` CTA (CR-5-D1 → package CR-5B1) |
| **Should stay absent / hidden** | Dirty Studio Review nav link (do not stage) · OwnerQa production mount |
| **Must remain for Customer-One compatibility** | Redirect shells · working draft · Lobby session · stage machine · route starting-point badge |
| **Can wait until after Customer-One** | Archiving `discovery/` UI (after CR-5B2) · full recommendation-engine archive (CR-5-D3) · Host greeting shells · presentation dual-surface · public Host art · quarantine-list hygiene (ROUTE-HYGIENE) |

---

## 8. Archive prerequisites

Before any archive move:

1. Tagia approves the classification table in this document.
2. Retarget or move tests that import archive targets (`studio-conversation-discovery`, phase-gate coupling, recommendation suites if engine archived).
3. Repair migration ledger discovery row so it does not claim `DiscoveryTabletPanel` as live tablet replacement.
4. Confirm no dirty WIP absorbs archive targets as “new live.”
5. Prefer `src/archive/` (or agreed archive tree) **before** any deletion.
6. Deletion requires a **separate** Tagia-approved package after archive evidence exists.

---

## 9. Owner decisions — LOCKED 2026-07-26

### CR-5-D1 — Host Intake CTA · **ANSWERED**

**Decision:** Repair before Customer-One.

| Field | Value |
|---|---|
| Customer-visible string | `Open Host Project Intake` |
| Conflict | Protected Host discontinuation / truthfulness |
| Classification | **REPAIR BEFORE ARCHIVE** |
| Future package | **CR-5B1 — Remove Host Intake CTA wording** |
| Boundary | Customer-visible wording correction only · preserve current destination/behavior unless inspection proves destination wrong · do not revive Host terminology elsewhere · do not redesign Intake · do not absorb redirect cleanup |
| Customer-One | **Must be corrected before Customer-One** |

### CR-5-D2 — Discovery directory archive · **ANSWERED**

**Decision:** Do **not** archive `discovery/` yet.

| Field | Value |
|---|---|
| Unwired discovery UI and chrome | **ARCHIVE CANDIDATE** (blocked until repairs) |
| Coupled library + ledger claims | **REPAIR BEFORE ARCHIVE** → **CR-5B2 completed** (framework decoupled; ledger corrected) |
| First repairs | `studio-conversation-discovery` library coupling · inaccurate migration-ledger `DiscoveryTabletPanel` claim · any test/config dependency identified in this audit |
| Sequence | 1) ~~**CR-5B2 — Discovery dependency and ledger repair**~~ · 2) **ARCHIVE-1 — Preserve and remove discovery UI from active product tree** · 3) deletion only after separate owner approval |
| Customer-One | Archive can wait until after Customer-One unless repair exposes a customer-facing truth or stability problem |
| Archive readiness after CR-5B2 | **READY FOR ARCHIVE-1 BOUNDARY REVIEW** — discovery UI remains unwired; no active Runtime/framework import of the discovery UI subsystem; remaining deps are discovery-internal + its own tests + phase-gate test usage of facts helpers |

### CR-5-D3 — Recommendation engine archive · **ANSWERED**

**Decision:** Defer full recommendation-engine archive until after Customer-One.

| Field | Value |
|---|---|
| Keep live | Truthful route keyword mapping · “Suggested starting point” · required route tests |
| Honesty | Do not represent starting-point behavior as an intelligent recommendation engine |
| Unused engine / catalog / decision-core coupling | **ARCHIVE CANDIDATE AFTER COUPLING REPAIR** |
| Future package | **ENG-ARCHIVE — Separate and archive unused recommendation engine** |
| Early start only if | Build failure · security problem · customer-facing false claim · live dependency conflict |
| Customer-One | **Does not block Customer-One** |

### Quarantine-list gap · **RECORDED**

| Field | Value |
|---|---|
| Classification | **UNRESOLVED — HYGIENE ONLY** |
| Facts | Redirect behavior unchanged · no customer failure established · quarantine list may not represent the full redirect inventory |
| Future package | **ROUTE-HYGIENE — Reconcile redirect and quarantine inventories** |
| Blocks CR-5 / Customer-One? | **No** |

---

## 10. Proposed future packages (sequence)

1. **CR-5 protect** — this audit document (docs-only).
2. **CR-5B1 — Remove Host Intake CTA wording** ← next genuine package (not started).
3. **CR-5B2 — Discovery dependency and ledger repair** — then return for ARCHIVE-1 approval.
4. **ARCHIVE-1** — preserve and remove discovery UI from the active product tree (after CR-5B2).
5. **ARCHIVE-2** — Host dead shells (`StudioHostGreeting`, unmounted Lobby host layer, retired `studio-guide`) — redirects stay.
6. **ENG-ARCHIVE** — unused recommendation engine after Customer-One (unless early-start trigger).
7. **ROUTE-HYGIENE** — reconcile redirect and quarantine inventories (hygiene).
8. **FRAMEWORK-MIGRATE** — optional later stage-machine-only simplification (Tagia-only).
9. **Deletion** — only after archive evidence and separate Tagia approval.

---

## 11. Explicit statement — nothing was removed

During CR-5 inspection and this audit checkpoint:

- No product code was changed.
- Nothing was archived, deleted, moved, redirected, or renamed.
- Dirty WIP was inspected for evidence only and was not staged.
- Master Launch List was **not** updated in this commit.
- CR-4 certification and stage-machine authority were not reopened.
- Archive work is **not** complete — only the audit and owner decisions are locked.

---

## 12. Final recommendation

**CR-5 — Obsolete-Path Dependency and Archive-Candidate Audit: COMPLETE.**

Follow-on repairs:

- ~~**CR-5B1 — Remove Host Intake CTA wording**~~ — protected
- ~~**CR-5B2 — Discovery dependency and ledger repair**~~ — staged/protected when Tagia approves
- Next after CR-5B2 protect: **ARCHIVE-1 boundary review** (do not begin until Tagia authorizes)

---

## Appendix A — Dirty WIP boundary

Inspected for dependency evidence; **not** treated as protected behavior:

- Dirty Conversation Room nav Studio Review link
- Dirty quarantine list additions
- Unrelated modified payment/entrance/Owner QA/package files
- Untracked voice audition / mobile entry / test-artifacts

## Appendix B — Anti-loop red flags honored

Did **not** re-decide: Host discontinuation, recommendation discontinuation, stage-machine authority, Voice preference, Lobby silence, CR-4 results, CR-D4/CR-D5 answers.
