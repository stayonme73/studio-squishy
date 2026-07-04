# Archive

Deprecated customer flows and prototypes — **not deleted**, removed from the active journey.

See `docs/customer-journey-v1-locked.md` for the locked journey and archive policy.

## Contents

| Path | Description |
|------|-------------|
| `payment/CompleteYourOrderCheckoutScene.tsx` | Utility-header "Complete Your Studio Plan" checkout — superseded by `SecureCheckoutPageScene` at `/payment` |
| `draft-room/TellUsWhatsOnYourMindIntro.tsx` | Standalone intake opening — superseded by Project Discovery opening |
| `draft-room/DraftRoomScene.tsx` | Draft Room intro plate — removed from active journey |
| `draft-room/DraftRoomIntakeScene.tsx` | Standalone intake wizard (`?begin=1`) — opening lives in Project Discovery |
| `draft-room/DraftIntakeForm.tsx` | Clipboard intake wizard form (archived with intake scene) |
| `draft-room/DraftIntakeConfirmation.tsx` | Post-intake confirmation panel |
| `draft-room/DraftIntakeAnswerSummary.tsx` | Intake review summary step |
| `draft-room/IntakeVisionAccents.tsx` | Intake vision field accents |
| `entrance/` | Welcome Hall V3 showroom, interactive scene, IMAGE 1 composition, and orphaned wall components |
| `route-map-visual/` | Superseded Route Map visuals — lane selector, full-page road view, reference board art. Active journey: `RouteMapWorkspace` at `/route-map` |

## Import convention

Archive modules use `@/archive/...` paths. Active code should not import from archive except thin re-exports documented in the lock doc.
