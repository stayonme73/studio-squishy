# C8a — Review Room panel chrome + in-room Project Communication

**Status:** Local commit approved · awaiting Tagia push authorization
**Base tip:** `7180f1c0d62291e9eefdeca730610de3684f6cf3`
**Contract:** `docs/launch/UNIFIED-REVIEW-FINAL-DELIVERY-ROOM-CONTRACT-V1-LOCKED.md`

## Scope completed

1. Renamed tools rail label **Feedback Tools** → **REVIEW TOOLS** (`src/config/feedback-studio.ts`).
2. Added **PROJECT COMMUNICATION** inside Job Review rail by reusing `StudioBoardProjectCommunicationSection` + protected COMM APIs/data (presentation overrides only).
3. Preserved central preview and existing Job Review actions (request revision / approve for delivery / save feedback tools).
4. Optional presentation-only map from Package **7A** stages → C #7 handoff wording (`src/config/c8a-review-handoff-presentation-v1.ts`). 7A derivation remains authoritative.

## Explicit non-goals (honored)

- No new Review Room shell
- No Final Delivery route merge
- No highlighter / version compare
- No correction-package architecture
- No Lobby reconstruction
- No Materials / Project Claim / timeout / Auth
- No second stage system

## Proof

`npx vitest run src/lib/c8a-review-room-panel-chrome.test.ts src/lib/review-delivery-stage/review-delivery-stage.test.ts` → **43/43 PASS**
