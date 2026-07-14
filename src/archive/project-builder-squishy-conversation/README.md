# BF-SQ-1 — Project Builder Squishy Conversation (deferred)

| Field | Value |
|-------|--------|
| Package | **BF-SQ-1** |
| State | **Unfinished · deferred · not certified** |
| Quarantined | 2026-07-14 |
| Future package | **Project Builder Squishy Conversation** (owner authorization required) |

## Status

These files are **unfinished deferred work**. They must not be treated as active production source and must not be silently restored.

Customer impact today: **none**. `/project-builder` still uses static `PROJECT_BUILDER_CONVERSATION_DEMO` (rail) and drawer tagline/timing helpers. Resolvers are **not wired**.

## Why quarantined

1. Unwired WIP under `src/lib/` entered the TypeScript program via `tsconfig.json` `**/*.ts` and blocked `npx tsc` / `npm run build`.
2. Owner deferred pre-purchase Squishy helpers (2026-07-14 closure); BH packages must not finish or certify this behavior.
3. Non-destructive disposition: preserve blueprints, remove from active compilation, restore only under a dedicated package.

## Extension convention

Files use **`.ts.deferred`** / **`.test.ts.deferred`** so they exit `**/*.ts` inclusion **without** editing `tsconfig.json` or ESLint config. A plain move into `src/archive/` keeping `.ts` would **still** typecheck.

## Original paths

| Quarantined file | Original path |
|------------------|---------------|
| `project-builder-drawer-squishy.ts.deferred` | `src/lib/project-builder-drawer-squishy.ts` |
| `project-builder-squishy.ts.deferred` | `src/lib/project-builder-squishy.ts` |
| `project-builder-squishy.test.ts.deferred` | `src/lib/project-builder-squishy.test.ts` |
| `project-builder-drawer-squishy.test.ts.deferred` | Extracted from `src/lib/project-builder-drawer.test.ts` (Squishy describe only) |

Related (not moved — still in place): `src/components/project-builder/PROJECT_BUILDER_PRINCIPLES.md` (copy-authoring rules).

## What this is not

- Not the wired `ProjectBuilderSquishyCompanion` / `ProjectBuilderSquishyGuide` (Pose B figure + demo thread)
- Not Route Map Squishy or character art assets
- Not owner-certified customer behavior

## Dependencies (read-only)

| Import | From |
|--------|------|
| `ServiceId` | `@/catalog/types` |
| `RouteMapJob`, `RouteMapRoadId`, `getRouteMapJob`, `getJobsForRoad` | `@/config/route-map-v1` |

Presentation-only — no catalog scoring.

## Known defects (do not fix in BF-SQ-1)

These remain **unresolved** until the Conversation package:

1. **Type blocker (~L67):** Stale `job.intakeType !== "rtu-menu"` in the `default` branch after `case "rtu-menu"` already handles that type. Left unfixed on purpose.
2. **Business-card / menu exhaustiveness mismatch:** Live `rtu-business-card` has no dedicated drawer-Squishy case (falls through to `default`); menu comparison logic in that default is dead/type-invalid. Broader copy drift — not certified product behavior.

Do **not** import these modules from active application code (including via `@/archive/project-builder-squishy-conversation/*`). They are unfinished draft blueprints, **not production-certified**.

## Locked-doc relationship

`docs/project-builder-production-pattern-v1-locked.md` §5 names `resolveProjectBuilderDrawerSquishyMessage` and `resolveProjectBuilderSquishyMessage` as the **intended** contracts. Philosophy stays locked. This folder is the implementation-status record: resolvers deferred here; production remains on DEMO + tagline.

## Restoration (all required)

Restore **only** after owner authorizes **Project Builder Squishy Conversation**:

1. Rename `.ts.deferred` → `.ts` (and `.test.ts.deferred` → `.test.ts`).
2. Move resolvers/tests back to `src/lib/`.
3. Fix the L67 type error.
4. Wire `ProjectBuilderScene` / Companion (replace or shrink `PROJECT_BUILDER_CONVERSATION_DEMO`).
5. Wire `ProjectBuilderServiceDrawer` to drawer Squishy copy.
6. Expand tests; restore drawer Squishy describe or keep paired test file.
7. Copy review against principles + locked §5.
8. Full `tsc` + `npm run build` + certification; then remove or mark this quarantine restored.

## Do not

- Silently restore into `src/lib/`
- Import `@/archive/project-builder-squishy-conversation/*` from active code
- Edit `tsconfig` / ESLint to “solve” deferred compilation
- Certify product behavior from these drafts alone
