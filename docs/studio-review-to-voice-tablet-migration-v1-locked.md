# Studio Review → Voice Tablet Migration Contract — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED — migration rule + ledger** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Agent entry | `AGENTS.md` → **Studio Review Migration** |
| Ledger (machine) | `src/config/studio-review-voice-tablet-migration-v1.ts` |
| Ledger (human) | `docs/studio-review-voice-tablet-migration-ledger.md` |
| Working reference | Studio Review (`OwnerQaPanel`, `?studioReview=1`) — **dev-only** |

**Machine rule:** Studio Review is not deleted in bulk. Chat is not the ledger. Update the config ledger on every Voice-tablet package.

---

## Locked migration rule

> **As each Studio Review page is fully integrated into Voice’s tablet and certified, that specific page is removed from Studio Review.**

Not before.

**No bulk deletion.** No “we rebuilt most of it, so remove the rest.”  
One page enters the new machine, earns its passport stamp, then leaves Studio Review.

---

## “Fully integrated” means all of the following

- tablet workflow (Voice Workspace)  
- customer-facing Presentation Display view  
- unified working-draft storage  
- Back and resume persistence  
- add, remove, and change behavior where applicable  
- action attribution  
- desktop certification  
- mobile certification  
- tests passing  
- owner approval  

Only then may Scout remove the original Studio Review entry for that page.

---

## Required sequence (every page)

1. Select one Studio Review page.  
2. Inspect its current behavior and dependencies.  
3. Integrate that function into Voice’s tablet.  
4. Connect the customer Presentation Display.  
5. Connect it to the unified working draft.  
6. Test navigation, edits, and attribution.  
7. Certify desktop and mobile.  
8. Get owner approval.  
9. Remove **only** that completed Studio Review page.  
10. Move to the next page.  

---

## Ledger fields (required per row)

| Field | Requirement |
| ----- | ----------- |
| Source | Existing Studio Review page |
| Tablet replacement | Where Voice performs the work |
| Presentation view | What the customer sees |
| Data mapping | Where answers and selections are stored |
| Persistence | Back, refresh, Lobby return, and resume verified |
| Editing | Add, remove, and change behavior verified |
| Attribution | Customer vs Voice action recorded |
| Tests | Required tests passing |
| Desktop | Certified |
| Mobile | Certified |
| Owner approval | Received |
| Removal | Original page removed only after all gates pass |

---

## Status values

| Status | Meaning |
|--------|---------|
| `not_started` | Still only in Studio Review |
| `in_progress` | Tablet integration underway |
| `gates_pending` | Built but cert / approval incomplete |
| `ready_to_remove` | All integration gates passed; removal authorized |
| `removed` | Original Studio Review entry removed |

---

## Related contracts

- Working draft persistence — `docs/studio-working-draft-persistence-v1-locked.md`  
- Conversation rhythm — `docs/studio-conversation-flow-rhythm-v1-locked.md`  
- Phase gates — `docs/studio-conversation-phase-gates-v1-locked.md`  
- Conversation Room hardware — `docs/studio-conversation-room-foundation-v1-locked.md`  
