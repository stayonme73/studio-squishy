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
4. FULL BUSINESS REHEARSAL
Tagia closeout call 2026-08-17: Room 1 stays technically OPEN solely for the deferred domain/email sticky (`d6974eb`). That prerequisite does **not** block Room 2, Room 3, or Room 4. Room 1 does **not** receive a full CLOSED stamp.
Tagia closeout call 2026-08-18: Room 2 is **CLOSED**.
Tagia closeout call 2026-08-19: Room 3 is **CLOSED** at `cd2a1e2`.
Executable Room 1 customer-life work stands at authoritative torture-test tip `a49efd7`. Abandoned 3067 attempts do not count.
Do not leave this room because technical tests are green.
A section closes only after:
RUN BUSINESS → BREAK IT → RECOVER → RETEST
Repeat until launch-scope blockers and important whole-business defects inside that section are resolved or explicitly accepted as a truthful launch limit.
Do not silently carry launch blockers into the next room.
Do not start Room 5.
ROOM 1 REMAINING (yellow sticky, not current execution)
Customer-life work listed below is complete for launch-scope execution except branded domain/email identity. Do not reopen those capabilities unless new evidence proves a real defect.
Intake + materials
real upload/storage/retrieval behavior
Machine ↔ team execution handoff
Studio Voice ↔ Machine ↔ customer communication
customer questions during the project
Studio asking customer for information
acknowledgements
Resend / customer lifecycle email — still parked at `d6974eb`
Review
revisions
re-review
approval
exact Final Delivery
return-later continuity
stalls / retries / watchdog behavior
wrong uploads / duplicate uploads / failed notification / timeout / QA failure / stale-version attempts
NEXT ROOM, ONLY AFTER #1 IS CLOSED — **exception authorized 2026-08-17**
Room 1 is not fully closed. Tagia authorized Room 2 anyway because the only remaining Room 1 item is an external domain/email prerequisite, not a customer-life defect.
2. CUSTOMER-FACING TRUTH + FRICTION CLEANUP — **CLOSED 2026-08-18**
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
NEXT ROOM, ONLY AFTER #2 IS CLOSED — **entered 2026-08-18**
3. OWNER CONSOLE — **CURRENT**
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
The active execution room is always the highest unfinished room above, except the Tagia 2026-08-17 authorization: Room 1 remains open solely for deferred domain/email and that sticky must not block Room 2 or Room 3.
Do not start rooms 5 while Room 4 is open.
Do not start work in a later room while the current execution room has an unresolved launch blocker or important customer-flow defect.
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
| 1. Customer Life + Communication | **COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL.** Not a full CLOSED stamp. Authoritative executable tip `a49efd7`. Yellow sticky: branded email/domain at `d6974eb`. Does **not** block Room 2 or Room 3. Ledger: `docs/launch/studio-operating-room-1-customer-life-closeout-v1.md`. |
| 2. Customer-facing truth + friction cleanup | **CLOSED.** Section 1 `45b09b1`. Section 2 `e609203`. Section 3 `3328807`. Section 4 `6cf9ca0`. Section 5 `b3397a6`. |
| 3. Owner Console | **CLOSED** at `cd2a1e2`. Section 1 `76b974f`. Section 2 `199e4a4`. Section 3 `cd2a1e2`. Do not reopen unless new evidence. |
| 4. Full business rehearsal | **ACTIVE.** Room 4A CLOSED at `9f9ac7c`. Room 4B **CLOSED** at `8c919e0` — closeout `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-CLOSEOUT.md`. Classifications frozen (Campaign Creative on Launch Now with limits; carousel off menu). Room 4C Multi-Service Client Gauntlet — **CLOSED WITH EXPLICIT LIMITS** at `92f47e2` (`STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1`; closeout `docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-CLOSEOUT.md`). Scenarios 1–3 PASS WITH EXPLICIT LIMITS. Room 4 remains open. **Pre-Launch Master Closeout Register** — **ACTIVE_REGISTER** / **NOT_AN_EXECUTION_PACKAGE** (`STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1`; `docs/launch/studio-pre-launch-master-closeout-register-1/STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1.md`). **External Customer Content Intake and Rights Certification** — **CLOSED WITH EXPLICIT LIMITS** (`STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1`; closeout `docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md`). **Mobile Customer Journey Certification** — **PARKED** (readiness prepared; real-phone cert not stamped) (`STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`; `docs/launch/studio-operating-mobile-customer-journey-certification-1/STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-PACKAGE-CONTRACT.md`). Customer-One E2E remains **COMPLETE_AND_FROZEN**; Owner-as-Customer Real Studio Campaign remains **REQUIRED_NOT_STARTED**. `ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA` remains REQUIRED · NOT CERTIFIED. Do not start Room 5. Do not assign Room 4D/4E. Do not execute roadmap packages from the register alone. |
| 5. Soft-opening preparation | Not started. Do not enter. |

**COME BACK LATER (Room 1 yellow sticky — does not block Room 2, Room 3, or Room 4):** The Studio does not yet have a purchased and verified business domain or business email identity. Deferred until then: branded sender certification, real inbox delivery proof, live provider reject/retry against the final Studio sender. Return to the same Resend package when Owner establishes that identity. Do not fake. Do not reopen from Room 4.

Do **not** reopen completed Room 1, Room 2, Room 3, Room 4B, or Room 4C capabilities unless new evidence proves an actual defect. Do not start Room 5. No merge unless separately authorized.
