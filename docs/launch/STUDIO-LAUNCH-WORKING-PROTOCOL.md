# The Studio — Launch Working Protocol

**Status:** Approved by Tagia · Owner working protocol
**Scope:** How Scout and Chat work every day until launch.
**Companion document:** the Master Launch List (created separately) is the day-by-day checklist. This document is the rules; that document is the work.

> **Read this file at the start of every thread.** Every new thread suitcase must point here and must carry the current Master Launch List with it.

---

## Locked working principle

We do not measure progress by how much we touched.

We measure progress by how much is **finished, proven, protected, and crossed off**.

---

## Anti-Loop / First-Date Prevention Rule

**Status:** NON-NEGOTIABLE · Tagia locked 2026-07-26  
**Purpose:** Protect launch time. Do not burn days reopening settled work.

Before Scout acts on **every** future Chat instruction, check:

1. Is this already completed?
2. Is this already protected by commit?
3. Is this already tested or certified?
4. Is this already locked in the Master Launch List, Working Protocol, doctrine, inventory, or package evidence?
5. Is Chat reopening a settled decision instead of addressing the actual remaining gap?

**If yes to any of the above — stop before repeating the work** and say:

> **Hey Chat — this is repetitive if we re-open work already completed or locks already on the books.**

Then report only:

- what is already finished
- where it is recorded
- commit, test, or certification evidence
- what remains genuinely open
- the smallest next action
- whether no action is required

### Locked behaviors

- Inherited locks are **not** re-debated
- Completed inspections are **not** rerun without a new reason
- Protected packages are **not** reconstructed
- Prior test evidence is **reused** unless integration or code changes require a rerun
- Chat must distinguish a **new gap** from an already completed package
- Scout must identify repetition **before** acting
- Tagia should **not** have to step in to stop repeated work
- Time protection is a **launch requirement**

Do **not** perform the repeated task merely because Chat supplied a long instruction.

---

## 1. One Road at a Time

We work in the approved order.

- One active task or package at a time
- No parallel construction
- No silent detours
- No beginning the next package before the current one is protected
- New ideas go to the **Parking Lot** unless they pass the launch gate

**Launch gate:**

> Is this required for Tagia to submit, track, review, resolve issues with, and receive a real project successfully?

If no, park it until after launch.

### Room-completion rule (LOCKED · Tagia 2026-08-01)

Sequencing is **room by room**, not feature by feature.

> Once a customer-facing room becomes active, we complete and certify all known launch-critical work for that room before opening construction in another room. We do not leave known gaps behind merely because another feature appears easier or more urgent.

**Active room now:** Unified Review / Final / Delivery Room.

**Room-completion order (this room):**

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1
2. VERSION-COMPARE-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `b0bd5e5…` (metadata compare only)
3. HIGHLIGHTER-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `96b6a39…` (version-bound `proof_markup_board_v1`; not source-proof pixels)
4. REVIEW-TEXT-TOOLS-INSPECT-1 — **COMPLETE / CLOSED** (inspect together · build separately)
5. TEXT-COMMENT-1 — **SEALED · BROWSER-CERTIFIED WITH LIMITS** @ `071c2b1…` (proof-version text; not in-proof location)
6. **PAGE-TABS-1** — **deferred** pending truthful page/location identity (or explicit Tagia remap without inventing document pages)
7. **UR-PROOF-READINESS-INSPECT-1** — **COMPLETE / CLOSED** · Choice **A** accepted · session-gated **link/list** proof viewing for Customer-One · **no** renderer required before room cert (`docs/launch/UR-PROOF-READINESS-INSPECT-1.md`)
8. **UR-ROOM-CERT-1** — **SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS** · browser **98/98** · focused unit **32/32** · desktop 1440 · phone 390 · **360 room requirement passed** · temp harness removed (`docs/launch/UR-ROOM-CERT-1.md`)
9. **Payment room / Refund UI** — next active room sequence (separate definition + authorization)

Sealed Review tools and room cert share this sequence but **not** the same construction packages. Page Tabs remains deferred. Proof viewing for Customer-One is an accepted **link/list** certified limit — do **not** open renderer construction unless Tagia explicitly reopens Choice B. The Unified Review / Final / Delivery room is **certified for Customer-One with explicit limits**. Do **not** inspect or build Refund UI until Tagia opens the Payment room.

---

## 2. Master Launch List Follows Every Thread

The launch list travels with us thread by thread. It must always show:

- deadline phases
- completed items crossed out
- current active item
- remaining items in order
- newly discovered required work
- blocked items
- **Visual Quality Queue** (see §18)
- Parking Lot items
- protected commit or checkpoint for finished work
- test and certification evidence

Nothing disappears because we changed threads.

---

## 3. Completed Items Stay Visible

We do not erase completed work from the list. Finished items stay crossed out so we can see progress.

Under every completed item, record:

- completion date
- commit hash
- push and sync status
- tests passed
- certification result
- important behavior protected
- anything intentionally deferred

**Example:**

~~Package 7B2: Retire Legacy Concept Review~~

**Completed:**

- Commit: `5b95e121...`
- Pushed: yes
- Sync: 0 ahead / 0 behind
- Package cert: 125/125
- Review Room regression: 44/44
- Honest Final Files: 67/67
- Production build: green

---

## 4. Current Item Must Be Obvious

Only one item is marked:

**CURRENTLY IN PROGRESS**

Under it, show:

- purpose
- approved boundary
- files allowed
- files protected
- definition of done
- tests required
- certification required
- commit status
- risks or blockers

No vague "working on Studio stuff."

---

## 5. Definition of Done Before Construction

Before Scout edits anything, we agree on what finished means.

Every package needs:

- exact customer behavior
- exact file boundary
- protected systems
- tests
- desktop proof
- phone proof
- production build result when applicable
- certification
- commit and push requirements

A task is not complete because code was written. It is complete when it is:

1. built
2. tested
3. certified
4. reviewed
5. committed
6. pushed
7. synchronized
8. recorded on the master list

---

## 6. Required Blocker Warning

When Scout and Chat discover something that must be fixed before moving forward, Chat must say plainly:

> Hey Tagia, Scout and I found something we need to fix before moving on.

Then explain:

- what was found
- why it matters
- whether the customer can see it
- whether it blocks the current package
- the smallest safe fix
- what will remain untouched
- how much it changes the launch order

No technical side quest begins over Tagia's head.

---

## 7. No Silent Scope Expansion

Scout must not add:

- extra files
- cleanup
- refactors
- new features
- copy changes
- room redesign
- architecture changes
- dependency upgrades

without reporting why they are required.

When an extra file becomes necessary:

1. Stop
2. Explain it
3. Add it to the package boundary
4. Receive approval
5. Continue

**Exception:** a directly affected test may be updated only when it proves the approved behavior, and it must be reported.

---

## 8. Daily Opening Check

At the beginning of each work session, verify:

- repository
- branch
- current HEAD
- ahead / behind
- staged files
- dirty files
- active package
- last protected commit
- current tests and certifications
- unrelated WIP to protect
- today's definition of done

Then present the carried Master Launch List.

---

## 9. Daily Closing Check

We do not casually stop with mystery work floating loose.

Before ending the day:

- finish the active functional slice
- run required tests
- run certification when required
- inspect the diff
- protect the work through the approved commit process
- push when approved
- confirm 0 ahead / 0 behind
- confirm nothing unintended was committed
- record remaining dirty WIP
- update the master list
- identify the exact next task

If the entire package cannot be safely completed, create a truthful protected checkpoint **only when approved** and document exactly what remains. Never pretend unfinished work is complete.

---

## 10. Thread Closing Rule

After a task is finished and protected:

1. Report the final commit
2. Report tests and certifications
3. Update the master list
4. State the next item, but do not begin it
5. Say good night or close the work session
6. Start a new thread for the next package

One finished room, then close the door.

---

## 11. Pack the Suitcase for Every New Thread

### Lean Scout package vs governing truth

The Flight Manual / Master Launch List / Working Protocol are **governing truth**. Scout’s immediate package must stay **narrow and action-ready**.

Do **not** dump the full governing corpus into Scout’s lap as if it were construction authorization. Background context is not permission to build.

Scout’s package must include, at minimum:

- Protected tip · branch · expected sync (ahead/behind) · expected staging
- Open package (or **none**)
- Latest sealed work relevant to the resume
- Gate / readiness status that affects the next decision
- Known open customer-facing items (not a full inventory dump)
- Explicit instruction: do **not** begin construction until one package is selected and authorized
- Anti-loop authority to stop if requested work is already complete
- Requirement to inspect the repo before proposing changes
- Requirement to identify affected files, tests, certification path, and risks before editing
- Rule against touching unrelated dirty work or cleanup outside the package
- Rule that commit and push happen only after owner approval

When no package is authorized, Scout’s truthful status is:

> **Stand by. Verify the protected control point only. Do not begin a new package.**

Canonical lean resume template: [`SCOUT-CONTROL-POINT-HANDOFF.md`](./SCOUT-CONTROL-POINT-HANDOFF.md).

### Suitcase contents (governing references — consult, do not dump wholesale)

The suitcase must contain:

- **ANTI-LOOP RULE:** Before acting, verify whether the requested work is already completed, locked, tested, certified, or protected. If it is, red-flag the repetition, provide the existing evidence, and identify only the genuine remaining gap.
- Studio launch goal
- current timeline
- master launch list
- latest protected commit
- branch and sync status
- completed packages
- current customer journey
- locked owner decisions
- active product principles
- dirty WIP warnings
- files that must not be touched
- current package objective
- exact next step
- certification history
- Visual Quality Queue
- Parking Lot

### Currently inherited settled locks (carry every thread)

- Live Host discontinued
- Package 4 Voice Host dead
- recommendation engine discontinued for launch
- Lobby silent (Conversation Room Voice does not speak in Lobby)
- Conversation Room Voice preference before first speech
- Presence System already established
- Guidance Doctrine already established
- page counts locked at **16** current / **15** Customer-One / **14** Lobby intermediate only / **13** later unified room
- Auth Route/Data Protection required before Customer-One
- archive before delete
- important Chat guidance must be recorded in the repo

### Important locked principles

- Tagia is Customer One
- no fake recommendation engine
- finish customer-facing rooms first
- define Studio Voice before production wiring
- one unified room for Review, Final, and Delivery
- slide-out tools panel
- separate communication panel
- ask Tagia before physically creating that room
- team and production follow customer-room completion
- intensive repeated testing follows production wiring
- Owner Console follows proven customer and production operation
- **anti-loop rule is non-negotiable**

---

## 12. Scout Must Report Work, Not Repeat Plans

Once construction is approved, Scout must construct.

Scout must not repeatedly return:

- the same inspection
- the same boundary plan
- another request for approval
- a reformatted version of an already approved report

When this happens, Chat sends Scout back with direct execution instructions.

---

## 13. Proof Over Confidence

"Looks good" is not proof.

Required evidence may include:

- targeted unit tests
- integration tests
- desktop browser certification
- phone browser certification
- 360px overflow checks
- signed-in and signed-out paths
- production build
- production server
- mutation before-and-after proof
- artifact paths
- exact pass/fail totals
- commit hash
- upstream synchronization

---

## 14. Protect Unrelated WIP

Before staging or committing:

- inspect every changed file
- use selective staging for mixed files
- do not absorb unrelated work
- do not commit screenshots, reports, `.next`, local data, tokens, or test artifacts
- do not clean or restore dirty WIP without approval
- record what remains uncommitted

---

## 15. Deadline Tracking

The master list must show these launch phases:

| Phase | Target |
|---|---|
| **August** | Finish customer-facing experience and define Studio Voice |
| **Early September** | Connect production and the team |
| **Mid-to-Late September** | Run intensive end-to-end testing |
| **Late September or Early October** | Run Tagia's Customer-One trial |
| **Mid-to-Late October** | Controlled external soft opening |

Every package should show:

- target start
- target completion
- actual completion
- schedule impact
- whether the October backstop is at risk

---

## 16. Newly Discovered Required Work

When Scout finds unfinished or broken work:

- do not hide it
- do not automatically fix it
- classify it
- explain whether it blocks the current package
- add it to the correct place in the ordered launch list
- complete it before moving forward only when it is truly required

The list may grow, but it may not become a junk drawer.

---

## 17. Daily Summary Format

### Every workday begins with

1. **Current Checkpoint** — branch · protected tip · ahead / behind · active package
2. **Launch Timeline** — August · early September · mid-to-late September · Customer-One trial · external soft opening
3. **Master Launch List** — crossed-off completed work · current item · upcoming items · blockers · Visual Quality Queue · Parking Lot
4. **Today's Finish Line** — one precise definition of what must be completed and protected before stopping

### Every workday ends with

1. **Completed Today** — behavior · files · tests · certifications · commit · push · sync
2. **Still Open** — unfinished work · blockers · dirty WIP · Visual Quality Queue updates · risks
3. **Next Thread** — suitcase summary · next package · exact first action

---

## 18. Visual Quality Queue Rule

Tagia may report visual concerns at any time, including:

- typography
- fonts
- colors
- backgrounds
- spacing
- sizing
- contrast
- alignment
- mobile layout
- desktop layout
- visual hierarchy
- consistency
- anything that feels unfinished or unlike The Studio

You do not have to wait until we are "working on design." Capture it immediately. Do not automatically abandon the current task.

Every visual concern must be recorded in the Master Launch List under the **Visual Quality Queue**.

### Required fields for each entry

- page or room
- device (desktop, phone, or both)
- screenshot or clear description
- exact concern
- desired outcome
- priority
- owner
- status
- completion proof after it is fixed

### Priority levels

1. **Blocker** — Fix immediately before continuing when it:
   - prevents reading
   - breaks navigation
   - hides buttons
   - causes overlap
   - creates accessibility problems
   - looks broken or unfinished
   - makes the customer distrust the page

   This interrupts the current order. Chat must say:

   > Hey Tagia, Scout and I found a visual issue we need to fix before moving on.

2. **Must Fix Before Customer-One Trial** — Important visual problems that do not break the page but would stop Tagia from trusting the experience:
   - wrong font direction
   - weak hierarchy
   - unattractive background
   - poor room balance
   - inconsistent buttons
   - awkward spacing
   - colors that do not feel like The Studio
   - desktop and phone looking like different products

3. **Must Fix Before External Soft Opening** — Polish acceptable during internal proofing, but should be corrected before outside customers arrive.

4. **Post-Launch Polish** — Small visual refinements that do not affect clarity, trust, accessibility, or function. These go to the Parking Lot.

### Interrupt rule

A visual issue interrupts the current task only when it:

- blocks customer action
- harms readability
- creates an accessibility problem
- breaks mobile or desktop layout
- makes the product appear broken
- creates a serious trust problem

Otherwise, it is captured and completed in the proper order.

The standing decision:

> Does this need to interrupt the active package, or should it be placed in the Visual Quality Queue?

### Fonts, colors, and backgrounds need approval

Scout must not independently decide:

- a new font family
- brand colors
- background art
- room atmosphere
- major layout changes
- a different visual style

Scout may inspect and propose options, but Tagia must approve major visual changes before construction.

Visual cleanup should be completed through **narrow, named packages** rather than broad redesign passes.

### How it should appear in the Master Launch List

```text
VISUAL QUALITY QUEUE

BLOCKERS
[ ] Conversation Room phone: Continue button below fold
    Device: phone
    Issue: customer cannot see required action
    Status: must fix before current package closes

BEFORE CUSTOMER-ONE TRIAL
[ ] Studio Board typography hierarchy
    Device: desktop + phone
    Issue: headings and project status compete visually
    Desired outcome: clearer project priority and next action
    Status: queued

[ ] Lobby background calibration
    Device: desktop
    Issue: current background does not feel like approved Studio direction
    Status: awaiting Tagia visual decision

BEFORE EXTERNAL SOFT OPENING
[ ] Button spacing consistency across Intake and Board
    Status: queued

POST-LAUNCH POLISH
[ ] Minor icon alignment in Help panel
    Status: parked
```

---

## Off-list warning convention

If work drifts off this protocol — parallel construction, silent scope expansion, an unapproved file, a skipped certification, starting the next package before the current one is protected, or abandoning the active task for an unapproved visual redesign — it must be flagged immediately and unmistakably at the top of the response, before anything else:

> **⚠️ OFF THE LIST — we are going sideways.**
> What drifted · why · the smallest correction · what stays untouched.

Chat markdown does not render colored text, so this bold warning banner is the stand-in for red.
