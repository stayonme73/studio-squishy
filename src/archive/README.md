# Archive

Deprecated customer flows and prototypes — **not deleted**, removed from the active journey.

See `docs/customer-journey-v1-locked.md` for the locked journey and archive policy.

## Contents

| Path | Description |
|------|-------------|
| `payment/CompleteYourOrderCheckoutScene.tsx` | Three-column "Complete Your Order" checkout — active `/payment` re-exports via `src/components/payment/PaymentCheckoutScene.tsx` |
| `draft-room/TellUsWhatsOnYourMindIntro.tsx` | Standalone intake opening — superseded by Project Discovery opening |
| `entrance/` | Welcome Hall V3 showroom, interactive scene, IMAGE 1 composition, and orphaned wall components |

## Import convention

Archive modules use `@/archive/...` paths. Active code should not import from archive except thin re-exports documented in the lock doc.
