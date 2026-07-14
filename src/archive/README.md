# Archive

Deprecated customer flows and prototypes — **not deleted**, removed from the active journey.

See `docs/customer-journey-v1-locked.md` for the locked journey and archive policy.

## Contents

| Path | Description |
|------|-------------|
| `studio-plan-review/` | Legacy per-service Studio Plan detail UI (`StudioPlanReviewScene`, page client, styles) — superseded by `ProjectBuilderStudioPlanSummary` at `/project-builder?view=studio-plan` |
| `project-summary/` | Legacy Project Summary workspace and scene — quarantined; Route Map + Project Builder are the active pre-payment path |
| `project-builder-squishy-conversation/` | **BF-SQ-1 deferred** — unfinished PB Squishy copy resolvers (`resolveProjectBuilderDrawerSquishyMessage`, `resolveProjectBuilderSquishyMessage`); stored as `.ts.deferred` so they leave the TypeScript program; production still uses `PROJECT_BUILDER_CONVERSATION_DEMO` + drawer tagline — see folder README |
| `payment/CompleteYourOrderCheckoutScene.tsx` | Utility-header checkout — superseded by `CheckoutScene` at `/checkout` |
| `draft-room/TellUsWhatsOnYourMindIntro.tsx` | Standalone intake opening — superseded by Project Discovery opening |
| `draft-room/DraftRoomScene.tsx` | Draft Room intro plate — removed from active journey |
| `draft-room/DraftRoomIntakeScene.tsx` | Standalone intake wizard (`?begin=1`) — opening lives in Project Discovery |
| `draft-room/DraftIntakeForm.tsx` | Clipboard intake wizard form (archived with intake scene) |
| `draft-room/DraftIntakeConfirmation.tsx` | Post-intake confirmation panel |
| `draft-room/DraftIntakeAnswerSummary.tsx` | Intake review summary step |
| `draft-room/IntakeVisionAccents.tsx` | Intake vision field accents |
| `entrance/` | Welcome Hall V3 showroom, interactive scene, IMAGE 1 composition, and orphaned wall components |
| `route-map-visual/` | Superseded Route Map visuals — lane selector, full-page road view, reference board art. Active journey: `RouteMapWorkspace` at `/route-map` |

## Quarantined routes (redirect only)

These URLs remain as thin redirects in `src/app/` and `next.config.ts` — they are not deleted:

`/business-discovery-studio`, `/project-discovery`, `/draft-room`, `/intake`, `/project-summary`, `/studio-plan-review`, `/discovery-summary`, `/payment`, `/project-details`, `/studio-guide`, `/welcome-hall`

## Import convention

Archive modules use `@/archive/...` paths. Active code should not import from archive except thin re-exports documented in the lock doc.

Deferred WIP under `project-builder-squishy-conversation/` uses `.ts.deferred` (not importable as TypeScript) and must not be restored to `src/lib/` until the dedicated **Project Builder Squishy Conversation** package is authorized.
