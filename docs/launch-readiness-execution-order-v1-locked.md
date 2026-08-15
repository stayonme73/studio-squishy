# Launch Readiness Execution Order — LOCKED

| Field | Value |
|-------|--------|
| Status | **LOCKED** |
| Owner | Tagia |
| Date | 2026-08-15 |
| Kind | Sequence-control standing rule |
| Config | `src/config/studio-launch-readiness-execution-order-v1.ts` |

This is **not** authorization to start multiple packages at once. One active room at a time. Do not modify the order without Tagia approval.

---

SCOUT — STANDING EXECUTION ORDER FOR LAUNCH READINESS
This is a sequence-control instruction, not authorization to start multiple packages at once.
From this point forward, The Studio follows this order and does not skip ahead.
CURRENT ACTIVE ROOM
1. CUSTOMER LIFE + COMMUNICATION
Stay here until the full launch-scope customer journey is actually closed.
Required areas inside this room:
Intake + materials
real upload/storage/retrieval behavior
Machine ↔ team execution handoff
Studio Voice ↔ Machine ↔ customer communication
customer questions during the project
Studio asking customer for information
acknowledgements
Resend / customer lifecycle email
Review
revisions
re-review
approval
exact Final Delivery
return-later continuity
stalls / retries / watchdog behavior
wrong uploads / duplicate uploads / failed notification / timeout / QA failure / stale-version attempts
Do not leave this room because technical tests are green.
A section closes only after:
BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST
Repeat until launch-scope blockers and important friction inside that section are resolved or explicitly accepted as a truthful launch limit.
Do not silently carry launch blockers into the next room.
NEXT ROOM, ONLY AFTER #1 IS CLOSED
2. CUSTOMER-FACING TRUTH + FRICTION CLEANUP
Clean customer-visible residue found during the Maya runs:
stale terminology
contradictory wording/status
old tool references
unnecessary jargon
misleading material requests
duplicate/confusing controls
anything that makes a normal customer unsure what to do
Then rerun the customer journey.
Do not turn this into a redesign spree.
NEXT ROOM, ONLY AFTER #2 IS CLOSED
3. OWNER CONSOLE
Tune the existing Owner Console into Tagia's one-stop decision desk.
It should surface:
true Owner decisions
meaningful stalls
failed communications
failed/repeated recovery
exceptions
status explanations from Machine truth
controlled Owner actions when actually needed
Routine work must remain with Machine / Studio Voice / production team / policy.
Do not build a second admin system.
NEXT ROOM, ONLY AFTER #3 IS CLOSED
4. FULL BUSINESS REHEARSAL
Run a realistic Customer-One project from beginning to end over the actual Studio:
entry → questions → payment → intake → upload → production → communication → QA → Review → revision → re-review → approval → final delivery → leave → return.
Include realistic failures and interruptions.
Fix what the rehearsal exposes before progressing.
FINAL ROOM
5. SOFT-OPENING PREPARATION
Only after the full rehearsal passes:
final real-business email/domain presentation
launch monitoring
customer-facing final truth
operational launch checks
controlled paid soft opening
PERMANENT RULE
For every major capability:
BUILD → BREAK → CUSTOMER-USE → FIX → RETEST → CLOSE
Do not use:
BUILD → TESTS GREEN → NEXT
Technical PASS alone is not enough.
CURRENT PRIORITY RULE
The active room is always the highest unfinished room above.
Do not start work in a later room while the current room has an unresolved launch blocker or important customer-flow defect.
Do not reopen earlier sealed work unless new evidence proves a real defect.
No parallel package jumping.
No unrelated improvements.
No merge unless separately authorized.
If a new issue is found, classify it as:
belongs to current room → fix before leaving
proven defect in an earlier sealed room → report and repair narrowly
later-room issue → record it, but do not jump ahead
SIMPLE NORTH STAR
The Studio is ready to move forward only when:
the customer can use the current section, the team can execute it, the Machine knows what is happening, communication works, failures are visible/recoverable, and Tagia is not carrying routine operations.
Keep this sequence as the standing roadmap for all future launch work unless Tagia explicitly changes it.

---

## Current board (Scout)

| Room | Status |
|------|--------|
| 1. Customer Life + Communication | **ACTIVE — not closed.** Last package PARKED at `c713cb7` with verdict **WORKS WITH LAUNCH BLOCKERS**. Tests green is not close. Stay here. |
| 2. Customer-facing truth + friction cleanup | Not started. Do not enter. |
| 3. Owner Console | Not started. Do not enter. |
| 4. Full business rehearsal | Not started. Do not enter. |
| 5. Soft-opening preparation | Not started. Do not enter. |

Launch blockers still inside Room 1 (from that PARK, not silently accepted as launch limits unless Tagia says so):

- Customer lifecycle email is queued, not delivered (`pending_owner_send` / no live Resend lifecycle).
- Customer materials are metadata receipts, not stored-file retrieve.
- Seeded required logo/photo slots can mislead vs wordmark-only flyer SKU law.
- Live Maya USE-LIKE-A-CUSTOMER on the connected Voice/Review/revision path has not closed the room.

Do not start Room 2–5 from this document.
