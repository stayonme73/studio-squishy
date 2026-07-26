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
| Protected tip | `28bc218d0bf0ef294be69eb8ba24c2be88011bcd` |
| Sync | 0 ahead / 0 behind |
| Production build | Green |
| Unrelated dirty WIP | Protected — see §16 |
| Lobby `sourceHref` | Remains **uncommitted** (`/studio-lobby?lobbyEntry=reset`) |
| Supporting inventory | `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md` (draft — not committed until Tagia approves) |

---

## Communication Notebook

> Temporary owner ↔ Scout notebook. All notes live in this markdown file. The Launch Tracker page is only a readable view. Refresh the page after Scout saves updates.

### Tagia Notes

Observations, priorities, visual concerns, decisions, or instructions from Tagia.

- **2026-07-26 — Standing rule (locked):** Important Chat guidance must not live only in chat. Send it to Scout and record it in this Communication Notebook or the relevant package document. This covers decisions, priority changes, warnings, blockers, scope limits, definitions, timeline changes, owner instructions, completion evidence, and anything Scout needs to remember in the next thread. Casual conversation does not need logging.
- **2026-07-26 — Commit separation approved:** Protect the Master Launch List and the temporary Launch Tracker page as two isolated commits (`docs:` then `feat:`), then return immediately to the first launch item: Customer-Facing Room Inventory and Gap Classification.
- **2026-07-26 — Inventory accepted:** Tagia accepts the Customer-Facing Room Inventory classifications and the recommended completion order. Inventory may be marked complete. Evidence: `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md`.
- **2026-07-26 — LOCKED launch requirement:** **Purchased-room authentication and data protection must be completed and certified before Tagia begins the Customer-One trial.** Affected surfaces: Studio Board, Project Record, Review, Job Review, Final Delivery / Deliverables, and any route exposing purchased-project data. This is a required launch-order insertion. It does **not** stop the Studio Voice definition package. It **must not** move to the Parking Lot and **cannot** slip beyond Customer-One.

### Scout Notes

Progress summaries, technical discoveries, risks, unfinished work found, test findings, questions requiring Tagia's decision, schedule impact, and recommended next action.

- **2026-07-26** — Studio Launch Working Protocol protected (`e68ccbd`). Master Launch List draft includes Communication Notebook. Temporary owner-only Launch Tracker is ready for Tagia review at `/file-room/launch-tracker` (cert 18/18). Updates appear after page refresh; no separate notes database. Recommended next action after Launch Tracker is protected: Customer-Facing Room Inventory and Gap Classification.
- **2026-07-26 (later)** — Master Launch List protected (`50915da`). Temporary Launch Tracker protected (`28bc218`). Cert 18/18 · unit 11/11 · production build pass · sync 0/0. Route `/file-room/launch-tracker`. Update behavior: Scout edits markdown → Tagia refreshes page. Customer-Facing Room Inventory opened (inspection only). Supporting doc: `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md`.
- **2026-07-26 — Inventory accepted and protected:** Tagia accepted the classifications and completion order. Inventory marked **complete**. Auth Route/Data Protection **locked before Customer-One** (inserted as ordered work item 6). Five Decisions Needed answered (Auth timing · coming-soon URLs · ungated internal tooling · Voice definition scope · unified-room kickoff). **Materials dual UX remains waiting** and is carried into the Studio Board truth/completeness package. No product code changed. Next active item: **Studio Voice Definition and Customer-Presence Doctrine** — documentation only; Package 4 Voice Host remains unauthorized.
- **2026-07-26 — Inventory discoveries:** Conversation Room is the live front door; Route Map / Project Builder / Checkout / Intake standalone pages are obsolete redirects. Help Center + Lobby locked complete. Review shell + Honest Final Files certified but still separate rooms. Customer complaint/refund UI and two-way communication are **missing**. Auth Packages 5–6–8 not started — purchased rooms lack server auth gates. Substantial CR/Lobby/Owner QA/timeout dirty WIP collision risk. Recommended first construction after inventory approval: **Studio Voice definition** (docs), not room rebuild.

### Decisions Needed

Every entry includes: question · why needed · affected package · smallest options · Scout recommendation · status (`waiting` / `answered`).

1. **Auth route/data protection timing** · Affected: Auth + Board truth · **Status: answered (2026-07-26)** · **Decision:** Schedule Auth Route/Data Protection **after** Studio Board truth/completeness and **before** the Customer-One trial. May be pulled earlier if a preceding package needs safe purchased-room access for certification. **Cannot slip beyond Customer-One.**
2. **Materials We Still Need dual UX** · Why: CR Intake + Board card both say materials · Affected: Studio Board truth/completeness package · **Status: waiting** · **Handling:** Not resolved during inventory protection. Carried into the Board truth package. Inventory records both locations and the duplication risk without selecting a redesign.
3. **Coming-soon URLs** (`/account`, `/past-campaigns`, `/creative-room`) · **Status: answered (2026-07-26)** · **Decision:** Customer-facing navigation must not advertise unfinished or scaffold routes as available services. Direct placeholder routes may remain internally for development only if they are not exposed as real customer destinations. The truthfulness audit belongs to the relevant customer-room package.
4. **Ungated internal tooling URLs** (`/studio`, `/studio-board/textures`, `/decision-learner`) · **Status: answered (2026-07-26)** · **Decision:** Internal tools must remain inaccessible to signed-out and normal customer users. Include these routes in the Auth Route/Data Protection audit. Do not broaden this into a full Owner Console package.
5. **Voice definition scope** · **Status: answered (2026-07-26)** · **Decision:** The next package is **documentation and behavior definition only**. Must define: customer orientation · availability without hovering · speaking boundaries · listening boundaries · silence and waiting behavior · customer control · escalation rules · communication with customer, machine, Chat, team, and Tagia · truthfulness boundaries · handoff behavior · Voice On / Voice Off behavior · accessibility behavior · where Voice is required, optional, or absent. Must **not**: build Package 4 Voice Host · add a recommendation engine · redesign rooms · change TTS/STT architecture · modify product code unless Tagia separately approves a later construction package.
6. **Unified-room design kickoff timing** · **Status: answered (2026-07-26)** · **Decision:** Design approval occurs **after** Studio Voice definition, Conversation Room completion, customer communication access, and Studio Board truth/completeness. Do not construct or redesign the unified Review/Final/Delivery room before Tagia approves its physical layout and behavior. Slide-out tools panel and separate communication panel remain locked future requirements.

### Blocker Notes

Use only when work cannot safely continue. Visible warning must begin:

> Hey Tagia, Scout and I found something we need to fix before moving on.

- **2026-07-26 — Hey Tagia, Scout and I found something we need to fix before moving on.**
  - **What was found:** Purchased customer rooms (Studio Board, Project Record, Review, Job Review, Final Delivery / Deliverables) have no server-side auth gate. Auth Packages 5, 6, and 8 are Not started. Internal tooling routes are also ungated.
  - **Why it matters:** A signed-out or wrong-user visitor could reach purchased-project data by URL. That breaks submit / track / review / receive trust for Customer One.
  - **Scope of "before moving on":** This means **before the Customer-One trial and before exposing purchased rooms to real customers** — *not* before the approved Studio Voice documentation package. Voice definition proceeds now.
  - **Smallest correction:** Auth Route/Data Protection package covering purchased customer rooms plus internal tooling routes. No room redesign, no Owner Console expansion.
  - **Affected package:** Auth Route/Data Protection (scheduled after Board truth, before Customer-One).
  - **What remains untouched:** All product code and all dirty WIP — inventory and this checkpoint are documentation only.
  - **Where work returns:** Studio Voice Definition → Conversation Room completion → communication access → Board truth → **Auth Route/Data Protection** → unified-room design approval.

### Daily Progress Notes

| Date | Active task | Work completed | Proof | Still open | Next action |
|---|---|---|---|---|---|
| 2026-07-26 | Launch process documents | Protocol committed and pushed | `e68ccbd` · 0 ahead / 0 behind | Master Launch List draft + Launch Tracker page | Finish and protect Launch Tracker, then begin room inventory |
| 2026-07-26 | Launch Tracker protection | Master List + Launch Tracker committed and pushed | `50915da` · `28bc218` · cert 18/18 · unit 11/11 · build pass · 0/0 | Room inventory | Open Customer-Facing Room Inventory |
| 2026-07-26 | Customer-Facing Room Inventory | Inventory draft written; notebook updated; classifications complete for review | `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md` (uncommitted) · no product code changed | Tagia review of inventory · lock completion order · answer Decisions Needed | After approval: protect inventory docs, then Studio Voice definition |
| 2026-07-26 | Inventory acceptance and protection | Tagia accepted classifications and order; Auth protection locked before Customer-One; five decisions answered; inventory marked complete | Inventory + Master List protected as documentation checkpoint · no product code changed | Materials dual UX (waiting, carried to Board package) · Studio Voice definition not started | Begin Studio Voice Definition and Customer-Presence Doctrine in a new thread |

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

- [x] ~~**Studio Master Launch List**~~
  - Commit: `50915da9af39cbfad6cd1cd089649271fb37baf1`
  - Subject: `docs: add Studio master launch list`
  - Pushed: yes · Sync: 0 ahead / 0 behind
  - File: `docs/launch/STUDIO-MASTER-LAUNCH-LIST.md`

- [x] ~~**Temporary owner Launch Tracker**~~
  - Commit: `28bc218d0bf0ef294be69eb8ba24c2be88011bcd`
  - Subject: `feat: add temporary owner launch tracker`
  - Pushed: yes · Sync: 0 ahead / 0 behind
  - Route: `/file-room/launch-tracker`
  - Certification: **18/18** · Unit tests: **11/11** · Production build: pass
  - Behavior: reads Master Launch List from disk; refresh after markdown edits; owner-only

---

## 6. CURRENTLY IN PROGRESS

### ▶ Studio Voice Definition and Customer-Presence Doctrine

**Purpose:** Define how Studio Voice behaves across the customer journey so later room construction is faithful rather than invented.

**Approved boundary:** Documentation and behavior definition only.

**Files allowed:** New Voice definition document under `docs/` + this Master Launch List. No product code unless Tagia separately approves a construction package.

**Files protected:** All product code. All dirty WIP. All locked rooms. Package 4 Voice Host remains unauthorized.

**Definition of done:**

- [ ] Voice identity and role defined
- [ ] Customer-presence rules defined
- [ ] Voice On / Voice Off behavior defined
- [ ] Orientation and silence behavior defined
- [ ] Escalation boundaries defined
- [ ] Customer, machine, Chat, team, and Tagia communication defined
- [ ] Accessibility and control rules defined
- [ ] Room-by-room Voice dependency matrix completed
- [ ] No recommendation engine
- [ ] No product code or room redesign
- [ ] Tagia review and approval received

**Tests required:** None (documentation only).

**Certification required:** None (documentation only).

**Commit status:** Not started.

**Risks / blockers:** None active. Auth Route/Data Protection is locked before Customer-One but does not block this package.

---

### ✅ Previous active item — Customer-Facing Room Inventory and Gap Classification (complete)

- [x] ~~Every customer-facing room listed~~
- [x] ~~Each classified complete / partial / scaffold / missing / obsolete / internal-only~~
- [x] ~~Exact completion order locked~~ — accepted by Tagia 2026-07-26
- [x] ~~Studio Voice definition placed before further room construction where required~~
- [x] ~~First construction package selected~~ — Studio Voice Definition and Customer-Presence Doctrine
- [x] ~~No product code changed during inventory~~

Evidence: `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md` · classifications accepted by Tagia · Auth Route/Data Protection inserted before Customer-One.

---

## 7. Ordered Customer-Facing Work

1. [x] ~~**Customer-facing room inventory and gap classification**~~ — complete 2026-07-26 · evidence `docs/launch/CUSTOMER-FACING-ROOM-INVENTORY.md` · classifications and order accepted by Tagia · no product code changed
2. [ ] **Studio Voice definition and customer-presence doctrine** ← *current*
3. [ ] Conversation Room completion without recommendation engine
4. [ ] Customer communication and follow-up access
5. [ ] Studio Board customer truth and completeness
6. [ ] **Auth Route/Data Protection for purchased rooms** — *newly discovered required work; locked before Customer-One*
7. [ ] Unified Review, Final, and Delivery room **design approval**
8. [ ] Unified room construction
9. [ ] Slide-out tool panel
10. [ ] Separate slide-out communication panel
11. [ ] Complaints, requests, refunds, and issue entry
12. [ ] Customer update history
13. [ ] Cross-room progress preservation
14. [ ] Desktop and mobile certification

> **Room lock:** Items 7–10 require Tagia's approval before any physical construction of the unified Review, Final, and Delivery room.

> **Auth lock:** Item 6 must be completed and certified **before the Customer-One trial**. It may be pulled earlier if a preceding package needs safe purchased-room access for certification. It must not move to the Parking Lot and cannot slip beyond Customer-One. Scope includes Studio Board, Project Record, Review, Job Review, Final Delivery / Deliverables, any route exposing purchased-project data, and ungated internal tooling routes.

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

**Today's Finish Line:** Protect the accepted Customer-Facing Room Inventory as a documentation checkpoint and advance the active item to Studio Voice definition.

**Completed Today:** Protocol · Master Launch List (`50915da`) · Launch Tracker (`28bc218`, cert 18/18) · Customer-Facing Room Inventory written, accepted by Tagia, and marked complete · Auth Route/Data Protection locked before Customer-One · five Decisions Needed answered.

**Still Open:** Materials dual UX decision (waiting — carried into Studio Board truth package) · Studio Voice definition not started · Auth protection package not started.

**Next Thread:** Studio Voice Definition and Customer-Presence Doctrine — documentation only. Do not begin Conversation Room construction, Package 4 Voice Host, or room redesign.

**Last Updated:** 2026-07-26
