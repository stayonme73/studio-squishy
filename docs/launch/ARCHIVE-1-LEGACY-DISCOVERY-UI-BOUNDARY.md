# ARCHIVE-1 — Legacy Discovery UI Boundary Review

**Status:** **COMPLETE** — boundary locked; move deferred until after Customer-One
**Readiness:** `TECHNICALLY READY — MOVE DEFERRED UNTIL AFTER CUSTOMER-ONE`
**Protected tip:** `cd1f6316cb8959a59c219361599c04d67b6930cd`
**Branch:** `fix/discovery-responsive-layout` · **Sync at review:** `0 ahead / 0 behind`
**Date:** 2026-07-26
**Master Launch List / migration ledger / archive README:** not updated in this checkpoint (belong to the future move package)

---

## 1. Protected tip and scope

Define the exact safe archive boundary for the unwired legacy Conversation Room discovery UI subsystem.

**Produces:** inventory, classifications, proposed destination, package shape, future move set, test plan.
**Does not:** move, archive, delete, rename, redirect, rewrite product files, or update the Master Launch List.

---

## 2. Archive-before-delete rule

Per CR-5 / CR-5-D2 / customer-journey archive policy:

1. Move to `src/archive/` (or agreed subfolder) with documentation.
2. Keep code out of the live customer Runtime import graph.
3. Delete only after Tagia explicitly approves a later deletion package.

**DELETE CANDIDATE is not used in this review.**

---

## 3. Current protected architecture

Already protected (do not reopen):

| Fact | Evidence |
|---|---|
| Live stage authority | `opening → route → services → plan → checkout → intake → complete` |
| Live opening UI | `StudioGuideTabletView` + `StudioGuideCommPanel` |
| Runtime does not import discovery subsystem | CR-5B2 framework test asserts no import of `@/lib/studio-conversation-discovery` or `DiscoveryTabletPanel` |
| `DiscoveryPresentationPayload` owned by framework | `src/lib/studio-conversation-framework/types.ts` |
| Discovery types compatibility re-export | `src/lib/studio-conversation-discovery/types.ts` → framework |
| Ledger truth | Discovery row: Guide live; `DiscoveryTabletPanel` present but unwired |
| CR-5 archive readiness | `READY FOR ARCHIVE-1 BOUNDARY REVIEW` |

---

## 4. Complete candidate inventory

### 4.1 Discovery UI components (folder)

| Path |
|---|
| `src/components/studio-conversation-room/discovery/DiscoveryTabletPanel.tsx` |
| `src/components/studio-conversation-room/discovery/DiscoveryStepForm.tsx` |
| `src/components/studio-conversation-room/discovery/DiscoveryPresentationView.tsx` |
| `src/components/studio-conversation-room/discovery/DiscoveryQuestion1View.tsx` |
| `src/components/studio-conversation-room/discovery/discovery-tablet.module.css` |
| `src/components/studio-conversation-room/discovery/discovery-presentation.module.css` |
| `src/components/studio-conversation-room/discovery/discovery-question-1.module.css` |

### 4.2 Discovery-only chrome (outside `discovery/` folder; only consumers are unwired discovery views)

| Path | Consumers |
|---|---|
| `PresentationSurfaceView.tsx` + `presentation-surface.module.css` | Barrel only; mounts `DiscoveryPresentationView` |
| `PresentationDisplay.tsx` + `presentation-display.module.css` | Barrel only; not mounted by Runtime |
| `ConversationDriverControl.tsx` + `conversation-driver-control.module.css` | `DiscoveryTabletPanel`, `DiscoveryPresentationView` only |
| `VoiceAssistControls.tsx` + `voice-assist-controls.module.css` | `DiscoveryPresentationView` only |

### 4.3 Discovery libraries

| Path | Role |
|---|---|
| `src/lib/studio-conversation-discovery/*` | Tablet steps, draft boot, facts→phase-gate bridge, presentation payload builder |
| `src/lib/discovery-question-1/*` | Q1 draft helpers (Speak/Type model) |

### 4.4 Config / doctrine (related but not UI)

| Path | Role |
|---|---|
| `src/config/discovery-question-1-v1.ts` | Locked doctrine / AGENTS reference |
| `docs/discovery-question-1-v1.md` | Doctrine doc |
| `src/config/studio-conversation-driver-v1.ts` | Driver doctrine (live framework still uses driver concept) |
| Working-draft slice `discoveryAnswers` | Persisted migration field — **not** the unwired UI |

### 4.5 Tests

| Path | Ties to |
|---|---|
| `src/lib/studio-conversation-discovery/studio-conversation-discovery.test.ts` | Discovery lib + calls phase-gate evaluator |
| `src/lib/discovery-question-1/discovery-question-1.test.ts` | Q1 lib |
| Framework CR-5B2 import-boundary test | Active — must remain |
| Migration ledger CR-5B2 discovery-row truth test | Active — must remain |

### 4.6 Assets

No discovery-specific images, icons, or audio under `public/` imported by the discovery UI tree. Styles are CSS modules colocated with components only.

### 4.7 Barrel

`src/components/studio-conversation-room/index.ts` still exports Presentation Display / Driver / Voice Assist / PresentationSurfaceView. Live page imports only `ConversationRoomRuntime` from the barrel.

---

## 5. Dependency graph

```
ConversationRoomRuntime / Guide          KEEP ACTIVE (no discovery imports)
        │
studio-conversation-framework
  DiscoveryPresentationPayload           KEEP ACTIVE (owner)
  resolvePresentationSurface             KEEP ACTIVE (tests; unmounted UI path)
        ▲
        │ type re-export only
studio-conversation-discovery (lib)      MOVE WITH UI
        ▲
        │
discovery/* UI + PresentationSurfaceView
+ Driver / VoiceAssist / PresentationDisplay MOVE TO ARCHIVE
        │
discovery-question-1 lib                 MOVE WITH Q1 UI
        │
discovery-question-1-v1 config           KEEP ACTIVE (doctrine)

working_draft.slices.discoveryAnswers    KEEP ACTIVE (persisted migration)
phase-gates package                      KEEP ACTIVE (not discovery UI)
```

**Static import proof (active Runtime):** none to discovery UI or `@/lib/studio-conversation-discovery`.
**String / ledger references:** migration ledger and CR-5 docs name `DiscoveryTabletPanel` as unwired — update wording after the move (still present under archive path).

---

## 6. File-by-file classifications

### MOVE TO ARCHIVE

| Path |
|---|
| Entire `src/components/studio-conversation-room/discovery/` (7 files) |
| `PresentationSurfaceView.tsx` + `presentation-surface.module.css` |
| `PresentationDisplay.tsx` + `presentation-display.module.css` |
| `ConversationDriverControl.tsx` + `conversation-driver-control.module.css` |
| `VoiceAssistControls.tsx` + `voice-assist-controls.module.css` |
| `src/lib/studio-conversation-discovery/` (all lib files + `studio-conversation-discovery.test.ts`) |
| `src/lib/discovery-question-1/` (lib + `discovery-question-1.test.ts`) |

### KEEP ACTIVE

| Path | Why |
|---|---|
| `ConversationRoomRuntime` + Guide tablet/comm | Certified live journey |
| `studio-conversation-framework/*` including `DiscoveryPresentationPayload` | Active contract |
| Framework / phase-gates / working-draft tests protecting live contracts | Required regression |
| `src/config/discovery-question-1-v1.ts` + `docs/discovery-question-1-v1.md` | Doctrine / AGENTS |
| `src/config/studio-conversation-driver-v1.ts` | Framework driver doctrine |
| Working-draft `discoveryAnswers` field + persist tests | Migration / restore |
| Migration ledger + CR-5B2 truth test | Passport truth |
| Live CR CSS (workspace, presence, guide, activity) | Live chrome |
| Thin Host redirect routes | Compatibility (out of ARCHIVE-1 scope) |

### KEEP ACTIVE TEMPORARILY

| Path | Until |
|---|---|
| Barrel exports of archived components in `index.ts` | Removed in the future move package (same PR as the move) — not a permanent keep |

### SPLIT BEFORE ARCHIVE

**None required.** No mixed file contains both live Runtime journey logic and discovery UI implementation that must be surgically divided before move. The only active-tree edit is barrel export cleanup + docs.

### RELOCATE WITH ARCHIVE SUPPORT

| Path | Note |
|---|---|
| Discovery lib + Q1 lib tests | Move beside their owning code under the archive folder |
| Optional archive README entry | Document the move in `src/archive/README.md` during the move package |

### UNRESOLVED → RESOLVED FOR BOUNDARY PURPOSES

| Item | Note |
|---|---|
| `.tsx` vs `.deferred` in archive | Implementation detail for the future move package — follow `src/archive/README.md` (see §14) |
| Customer-One timing of the move | **ARCHIVE-1-D3:** defer until after Customer-One unless an early-start trigger fires |

---

## 7. Compatibility-shim analysis

| Question | Finding |
|---|---|
| Who imports discovery re-export of `DiscoveryPresentationPayload`? | Unwired UI (`DiscoveryPresentationView`, `PresentationSurfaceView`) and discovery lib builders/tests |
| Does active Runtime need the re-export? | **No** — Runtime/framework use framework types |
| After MOVE of UI + discovery lib? | Re-export moves with the lib; active code should import payload type only from `@/lib/studio-conversation-framework` |
| Neutral bridge file needed? | **Not required** if the whole discovery lib moves in the same package and no external package imports `@/lib/studio-conversation-discovery` |
| Remove re-export now? | **No** — forbidden in this review; remove only as part of the approved move |

---

## 8. Proposed archive destination

**Existing convention:** `src/archive/` with `@/archive/...` imports · documented in `src/archive/README.md` and `docs/customer-journey-v1-locked.md`.

**Approved destination (ARCHIVE-1-D2) — do not create until the future move package:**

```text
src/archive/studio-conversation-discovery-ui/
  README.md
  components/          ← discovery/* + PresentationSurfaceView + PresentationDisplay + Driver + VoiceAssist (+ CSS)
  lib/
    studio-conversation-discovery/
    discovery-question-1/
```

**Why this location:**

- Follows the repository’s existing `src/archive/` convention and archive README rules
- Keeps archived TypeScript outside the active application and route trees
- Preserves history via `git mv`
- Makes the subsystem’s former purpose explicit
- Supports later owner-approved deletion
- Avoids inventing a new archive convention

---

## 9. Single versus split package decision — LOCKED

### OPTION A — SINGLE ARCHIVE PACKAGE · **APPROVED (ARCHIVE-1-D1)**

One atomic future move of:

- unwired discovery component folder
- `PresentationSurfaceView` · `PresentationDisplay` · `ConversationDriverControl` · `VoiceAssistControls`
- discovery-exclusive CSS modules
- `studio-conversation-discovery` library and tests
- `discovery-question-1` library and tests
- directly associated archive documentation support
- barrel export cleanup of archived components
- archive README + migration-ledger + CR-5 note updates (in the move package)

Must preserve active:

- framework ownership of `DiscoveryPresentationPayload`
- working-draft `discoveryAnswers`
- phase gates
- doctrine configuration (`discovery-question-1-v1`, driver config)

### OPTION B — SPLIT ARCHIVE PACKAGE · **REJECTED**

Not required — no split-before-archive prerequisite.

### OPTION C — NOT READY · **REJECTED**

CR-5B2 removed the framework coupling; Runtime non-import is protected.

---

## 10. Exact future move set (parked)

When Tagia authorizes the post–Customer-One move package (or an approved early-start trigger fires):

1. `git mv` the MOVE TO ARCHIVE paths into `src/archive/studio-conversation-discovery-ui/…`
2. Remove archived component exports from `src/components/studio-conversation-room/index.ts`
3. Add archive README section
4. Update migration ledger discovery notes to say code lives under `src/archive/…` (still not deleted)
5. Update CR-5 audit ARCHIVE-1 row to “moved”
6. Keep framework CR-5B2 non-import assertions; extend path assertions to the new archive location if useful
7. Run the future-move test plan (§12)

---

## 11. Files explicitly excluded from the move

- All Guide / Runtime / live CR chrome
- `studio-conversation-framework` (including payload type ownership)
- Phase-gates package and its unit tests
- Working-draft persistence + `discoveryAnswers` field
- `discovery-question-1-v1` config + doctrine docs
- Host redirect shells / quarantine inventory
- Recommendation engine
- Master Launch List (unless Tagia authorizes a separate docs status update)
- Dirty WIP (Owner QA, Lobby ledger query, etc.)

---

## 12. Test plan (for the future move package)

After the move (not during this review):

1. `npx vitest run src/lib/studio-conversation-framework/studio-conversation-framework.test.ts` — expect PASS including CR-5B2 import boundary
2. Focused migration ledger discovery-row truth — still PASS (update strings if paths change)
3. Confirm archived discovery tests either run from archive path intentionally or are excluded by convention (prefer keep runnable under `@/archive/...` like other archives)
4. Grep: no `from "@/lib/studio-conversation-discovery"` or `discovery/Discovery` imports under `src/components/studio-conversation-room` except archive
5. Grep: `ConversationRoomRuntime` still free of discovery imports
6. `tsc --noEmit` — report 0 errors in changed CR files; unrelated baseline out of scope
7. Confirm no new `src/app/**` routes created
8. Smoke: `/studio-conversation-room` still boots Guide opening (optional focused browser; not full CR-4 matrix)

Do **not** require the full CR-4 30-row matrix for a pure archive move with no behavior change.

---

## 13. Risks and rollback

| Risk | Mitigation |
|---|---|
| Missed importer | Pre-move ripgrep + post-move import resolution / vitest |
| Barrel still exports archived modules | Explicit index.ts cleanup in move PR |
| Ledger still claims “active tree” | Update discovery row notes in same PR |
| Typecheck noise from archive | Resolve `.tsx` vs `.deferred` in the future move package per `src/archive/README.md` (implementation detail, not a blocker) |
| Accidental reconnect | Forbid Runtime imports in CR-5B2-style assertion |

**Rollback:** reverse `git mv` + restore barrel exports from the move commit parent.

---

## 14. Owner decisions — LOCKED 2026-07-26

### ARCHIVE-1-D1 — Package shape · **ANSWERED**

**Approve Option A: Single atomic archive package.**

No split-before-archive package is required. Future move contents and preserves are listed in §9.

### ARCHIVE-1-D2 — Destination · **ANSWERED**

**Approve:** `src/archive/studio-conversation-discovery-ui/`

Do not create the directory in this documentation checkpoint. The future move package must follow `src/archive/README.md`.

### ARCHIVE-1-D3 — Timing · **ANSWERED**

**Defer the actual archive move until after Customer-One.**

Reasons: no Customer-One blocker from the unwired subsystem; Runtime/framework already decoupled; customer truth protected; move is repository hygiene; file motion adds merge/dirty-WIP risk before Customer-One.

**Early-start triggers** (only if one occurs before Customer-One is protected):

- build or import failures
- customer-facing false behavior
- security risk
- active dependency conflict
- meaningful development obstruction

Otherwise keep this exact archive plan parked.

### TS-in-archive style · **IMPLEMENTATION DETAIL (not a blocker)**

Resolve `.tsx` versus `.deferred` during the future move package by following existing `src/archive/README.md`. Prefer preserving `.ts` / `.tsx` when the README permits TypeScript in the archive so history and tests remain readable. Do not invent a second archive format in this checkpoint.

---

## 15. Final readiness recommendation

**ARCHIVE-1 Legacy Discovery UI Boundary Review: COMPLETE.**

**Readiness:** `TECHNICALLY READY — MOVE DEFERRED UNTIL AFTER CUSTOMER-ONE`

- Future move set defined (§10)
- Destination approved (§8 / ARCHIVE-1-D2)
- Package shape approved (Option A / ARCHIVE-1-D1)
- No further dependency repair currently required
- **No archive move authorized yet**

Next genuine launch work: return to the Customer-One launch sequence rather than performing ARCHIVE-1.

---

## 16. Explicit statement — nothing moved

During ARCHIVE-1 boundary review and this documentation checkpoint:

- No product code was changed.
- Nothing was moved, archived, deleted, renamed, or redirected.
- Dirty WIP was not staged or absorbed.
- Master Launch List, migration ledger, CR-5 audit, and archive README were not updated.
- Only this boundary document is protected by the docs-only commit.

---

## Appendix — Anti-loop

Did not reopen CR-5 classifications, CR-5B1 CTA, CR-5B2 payload ownership, recommendation-engine timing, quarantine hygiene, or CR-4 certification. Reused protected evidence and verified tip `cd1f631` import graph.
