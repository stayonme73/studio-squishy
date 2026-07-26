# The Studio — Master Launch List

**Living checklist.** Carry this document into every new thread alongside [`STUDIO-LAUNCH-WORKING-PROTOCOL.md`](./STUDIO-LAUNCH-WORKING-PROTOCOL.md).

Completed work stays crossed out with evidence. Only one item is marked **CURRENTLY IN PROGRESS**.

---

## 1. Launch Goal

- Tagia is **Customer One**
- Prove The Studio can grow Tagia's business
- Prove deadlines, quality, communication, review, and delivery **before** outside customers arrive

---

## 2. Launch Gate

> Is this required for Tagia to submit, track, review, resolve issues with, and receive a real project successfully?

If no → **Parking Lot** (§15).

---

## 3. Timeline

| Phase | Target |
|---|---|
| **August** | Finish customer-facing experience and define Studio Voice |
| **Early September** | Connect production and the team |
| **Mid-to-Late September** | Intensive end-to-end testing |
| **Late September / Early October** | Tagia Customer-One trial |
| **Mid-to-Late October** | Controlled external soft opening |

October is the backstop. Every package should note schedule impact.

---

## 4. Current Repository Checkpoint

| Field | Value |
|---|---|
| Repo | `C:\Users\tagia\studio-squishy` |
| Branch | `fix/discovery-responsive-layout` |
| Protected tip | `e68ccbde4f6b08ae77410f2fec5370a41c06cb1b` |
| Sync | 0 ahead / 0 behind |
| Production build | Green |
| Unrelated dirty WIP | Protected — see §16 |
| Lobby `sourceHref` | Remains **uncommitted** (`/studio-lobby?lobbyEntry=reset`) |

---

## Communication Notebook

> Temporary owner ↔ Scout notebook. All notes live in this markdown file. The Launch Tracker page is only a readable view. Refresh the page after Scout saves updates.

### Tagia Notes

Observations, priorities, visual concerns, decisions, or instructions from Tagia.

- **2026-07-26 — Standing rule (locked):** Important Chat guidance must not live only in chat. Send it to Scout and record it in this Communication Notebook or the relevant package document. This covers decisions, priority changes, warnings, blockers, scope limits, definitions, timeline changes, owner instructions, completion evidence, and anything Scout needs to remember in the next thread. Casual conversation does not need logging.
- **2026-07-26 — Commit separation approved:** Protect the Master Launch List and the temporary Launch Tracker page as two isolated commits (`docs:` then `feat:`), then return immediately to the first launch item: Customer-Facing Room Inventory and Gap Classification.

### Scout Notes

Progress summaries, technical discoveries, risks, unfinished work found, test findings, questions requiring Tagia's decision, schedule impact, and recommended next action.

- **2026-07-26** — Studio Launch Working Protocol protected (`e68ccbd`). Master Launch List draft includes Communication Notebook. Temporary owner-only Launch Tracker is ready for Tagia review at `/file-room/launch-tracker` (cert 18/18). Updates appear after page refresh; no separate notes database. Recommended next action after Launch Tracker is protected: Customer-Facing Room Inventory and Gap Classification.

### Decisions Needed

Every entry includes: question · why needed · affected package · smallest options · Scout recommendation · status (`waiting` / `answered`).

_No decisions waiting._

### Blocker Notes

Use only when work cannot safely continue. Visible warning must begin:

> Hey Tagia, Scout and I found something we need to fix before moving on.

_No active blocker notes._

### Daily Progress Notes

| Date | Active task | Work completed | Proof | Still open | Next action |
|---|---|---|---|---|---|
| 2026-07-26 | Launch process documents | Protocol committed and pushed | `e68ccbd` · 0 ahead / 0 behind | Master Launch List draft + Launch Tracker page | Finish and protect Launch Tracker, then begin room inventory |

---

## 5. Completed and Protected Work

### Customer entry and account

- [x] ~~Lobby entry film and returning-client flow~~
  - Latest protecting commit: `e5902a367fe1d2f48c27ca37950221659a546451` — `fix: keep Lobby Entry Film reopen after dismiss`
  - Earlier Lobby commits also in branch history; full commit set not re-enumerated at this checkpoint.
- [x] ~~Authentication and password recovery~~
  - Type-safety corrections protected in `41d9ffe` (below).
- [x] ~~Inactivity timeout~~
  - Protected in branch history. Commit hash not re-verified at this checkpoint.

### Conversation Room

- [x] ~~Conversation Room framework~~
  - Protected in branch history. Commit hash not re-verified at this checkpoint.
- [x] ~~Voice preference before speech~~
  - Latest protecting commit: `0f35fdb29880f0727b5357e31080cec416e494f7` — `fix: persist Studio browser voice selection`
- [x] ~~Signed-in and signed-out Intake handoff~~
  - Protected in branch history. Commit hash not re-verified at this checkpoint.
- [x] ~~Studio Board handoff~~
  - Protected in branch history. Commit hash not re-verified at this checkpoint.

### Review and Delivery

- [x] ~~**Package 7A** — Review & Delivery Stage Truth Contract~~
  - Commit: `ea81b7df36073ed16d828c3f2b952a4f8b5613c9`
  - Subject: `feat: add Review & Delivery stage truth contract`

- [x] ~~**Package 7B1** — Review Room Stage Shell~~
  - Commit: `13baf50a668f1db362ee5d723225b5f1fcc911ac`
  - Subject: `feat: add Review Room stage shell`
  - Certification: 44/44 (re-verified during 7B2)

- [x] ~~**Production build type-safety cleanup**~~
  - Commit: `41d9ffe7f8b3a5998c99d1f33d468bfe4bf8719f`
  - Subject: `fix: restore production build type safety`
  - Pushed: yes · Sync at time: 0 ahead / 0 behind
  - Protected: authentication runtime behavior, password hashing parameters, stored hash compatibility, customer messages
  - Deferred: unrelated Lobby `sourceHref` hunk left uncommitted

- [x] ~~**Honest Final Files**~~
  - Commit: `7d1f9099cca34f85b828fa0990741463b87855b3`
  - Subject: `fix: make final file delivery truthful`
  - Certification: **67/67** production (`certMode: production`, `next start`)
  - Production build: green
  - Protected: no generated placeholder packages in production; truthful preparing / partial / delivered-without-files; preview content development-only

- [x] ~~**Package 7B2** — Legacy Concept Review Customer-Path Retirement~~
  - Commit: `5b95e1218d79325a3234c9f5daeb345a5933ad1e`
  - Subject: `fix: retire legacy concept review from customer path`
  - Pushed: yes · Sync: 0 ahead / 0 behind
  - Package cert: **125/125**
  - Package 7B1 regression: **44/44**
  - Honest Final Files: **67/67**
  - Production build: green
  - Protected behavior: bare `/feedback-studio` → Review Room shell · `?concept=A|B|C` inert → shell · valid `?jobId=` → job-review workspace · concept + valid `jobId` → job review wins · unknown `jobId` → unavailable-work behavior · `READY_FOR_REVIEW` no longer opens fabricated picker · Board and Project Record no longer promise concept selection · roadmap no longer contains "Choose Direction" · historical concept metadata intact
  - Deferred: legacy concept components, generator, config, and CSS retained (deletion parked)

### Process

- [x] ~~**Studio Launch Working Protocol**~~
  - Commit: `e68ccbde4f6b08ae77410f2fec5370a41c06cb1b`
  - Subject: `docs: add Studio launch working protocol`
  - Pushed: yes · Sync: 0 ahead / 0 behind
  - File: `docs/launch/STUDIO-LAUNCH-WORKING-PROTOCOL.md`
  - Includes Visual Quality Queue and off-list warning convention

---

## 6. CURRENTLY IN PROGRESS

### ▶ Customer-Facing Room Inventory and Gap Classification

**Purpose:** Establish the truthful state of every customer-facing room before any further construction, so the completion order is chosen from evidence rather than assumption.

**Approved boundary:** Inspection and documentation only.

**Files allowed:** This document (and a supporting inventory document only if approved).

**Files protected:** All product code. All dirty WIP. All locked rooms.

**Definition of done:**

- [ ] Every customer-facing room listed
- [ ] Each classified **complete / partial / scaffold / missing**
- [ ] Exact completion order locked
- [ ] Studio Voice definition placed before further room construction where required
- [ ] First construction package selected
- [ ] No product code changed during inventory

**Tests required:** None (inspection only).

**Certification required:** None (inspection only).

**Commit status:** Not started.

**Risks / blockers:** None recorded.

---

## 7. Ordered Customer-Facing Work

1. [ ] **Customer-facing room inventory and gap classification** ← *current*
2. [ ] Studio Voice definition and customer-presence doctrine
3. [ ] Conversation Room completion without recommendation engine
4. [ ] Customer communication and follow-up access
5. [ ] Studio Board customer truth and completeness
6. [ ] Unified Review, Final, and Delivery room **design approval**
7. [ ] Unified room construction
8. [ ] Slide-out tool panel
9. [ ] Separate slide-out communication panel
10. [ ] Complaints, requests, refunds, and issue entry
11. [ ] Customer update history
12. [ ] Cross-room progress preservation
13. [ ] Desktop and mobile certification

> **Room lock:** Items 6–9 require Tagia's approval before any physical construction of the unified Review, Final, and Delivery room.

---

## 8. Studio Voice

**Must do:**

- [ ] Briefly explain where the customer is and what happens next
- [ ] Remain available without hovering
- [ ] Customer communication
- [ ] Machine communication
- [ ] Chat communication
- [ ] Team communication
- [ ] Tagia escalation

**Boundaries:**

- No fake recommendation engine
- No constant narration
- No forced conversation
- No pretending to know more than verified data
- Escalate money, deadlines, complaints, refunds, reputation, and trust issues

---

## 9. Team and Production

*Phase: Early September.*

- [ ] Roles and permissions
- [ ] Assignment
- [ ] Ownership
- [ ] Deadlines
- [ ] Internal review
- [ ] Customer review handoff
- [ ] Revisions
- [ ] Release authority
- [ ] Machine action tracking
- [ ] Studio Voice coordination
- [ ] Escalation
- [ ] Deadline risk

---

## 10. Intensive Testing

*Phase: Mid-to-Late September.*

- [ ] Signed in / signed out
- [ ] Voice On / Voice Off
- [ ] Desktop / phone / 360px
- [ ] Missing materials
- [ ] Multiple jobs
- [ ] Revisions
- [ ] Approvals
- [ ] Partial delivery
- [ ] Final delivery
- [ ] Complaint
- [ ] Refund
- [ ] Machine failure
- [ ] Team delay
- [ ] Interrupted session
- [ ] Returning customer
- [ ] Bad job link
- [ ] Deadline risk

---

## 11. Customer-One Trial

*Phase: Late September / Early October.*

- [ ] Real Tagia project
- [ ] Real deadline
- [ ] Real team
- [ ] Real production
- [ ] Real updates
- [ ] Real review
- [ ] Real revisions
- [ ] Real delivery
- [ ] Real issue handling

---

## 12. Owner Console

**DEFERRED.** Do not begin until all of the following are true:

- [ ] Customer rooms complete
- [ ] Studio Voice defined
- [ ] Team and production connected
- [ ] Testing complete
- [ ] Customer-One trial reveals actual needs

---

## 13. Visual Quality Queue

Rules: [`STUDIO-LAUNCH-WORKING-PROTOCOL.md` §18](./STUDIO-LAUNCH-WORKING-PROTOCOL.md).

Each entry: page or room · device · screenshot or description · exact concern · desired outcome · priority · owner · status · completion proof.

### Blockers

`No visual issues entered yet in this document. Tagia may add them at any time.`

### Before Customer-One Trial

`No visual issues entered yet in this document. Tagia may add them at any time.`

### Before External Soft Opening

`No visual issues entered yet in this document. Tagia may add them at any time.`

### Post-Launch Polish

`No visual issues entered yet in this document. Tagia may add them at any time.`

> Scout must not independently change fonts, brand colors, background art, room atmosphere, major layouts, or visual style. Scout may inspect and propose; Tagia approves before construction.

---

## 14. Blockers

`No active launch blocker recorded at this checkpoint.`

When a blocker is discovered, Chat must say plainly:

> Hey Tagia, Scout and I found something we need to fix before moving on.

Then explain: what was found · why it matters · whether the customer can see it · whether it blocks the current package · the smallest safe fix · what will remain untouched · how much it changes the launch order.

---

## 15. Parking Lot

Not required for launch. Revisit after the soft opening.

- [ ] Advanced recommendation engine
- [ ] Legacy concept deletion (components, generator, config, CSS)
- [ ] Broad CSS cleanup
- [ ] Non-launch automation
- [ ] Optional dashboard features
- [ ] Advanced Owner Console features
- [ ] Route consolidation not required for launch
- [ ] Unrelated visual polish
- [ ] Obsolete capture / e2e scripts still expecting the retired concept picker

---

## 16. Dirty WIP Protection

The following remain modified and **must be preserved**:

- Conversation Room WIP
- Lobby WIP
- Owner QA WIP
- Auth timeout WIP
- Package files (`package.json`, `package-lock.json`)
- Test artifacts (`test-artifacts/`)
- Lobby `sourceHref` → `/studio-lobby?lobbyEntry=reset`
- All other pre-existing modified files

> **Do not clean, restore, stage, commit, or absorb without an approved package boundary.**

---

## 17. Daily Update Area

**Today's Finish Line:** Finish and protect the temporary owner-only Launch Tracker page.

**Completed Today:** Studio Launch Working Protocol protected (`e68ccbd`). Master Launch List draft created with Communication Notebook. Launch Tracker construction in progress.

**Still Open:** Launch Tracker review/protection · Customer-facing room inventory.

**Next Thread:** After Launch Tracker is protected — Customer-Facing Room Inventory and Gap Classification.

**Last Updated:** 2026-07-26
