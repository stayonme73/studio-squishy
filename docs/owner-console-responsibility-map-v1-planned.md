# Owner Console — Responsibility Map V1 (planned)

**Status:** Locked 2026-07-06 — behavior rules approved; sequential Owner Desk V1 build in progress.  
**Route today:** `/file-room/owner-console`  
**Philosophy:** The Owner Console is a **decision desk, not an information dashboard**. Tagia does not manage folders; she manages **states**. The **trays / file cabinet store work**; the **desk presents work** — one decision at a time. The next decision comes to her; she should not hunt for it. *The Owner Desk is a working surface, not a storage surface.*

**Related (existing):** `src/config/owner-console.ts` · `src/config/campaign-exceptions.ts` · `src/config/job-control.ts` · `docs/studio-decision-core-foundation-v1-locked.md` · `docs/help-center-v1-locked.md`

---

## 1. What Tagia is responsible for

Tagia owns **judgment calls the system cannot safely automate** — even when templates and rules exist, someone must confirm the Studio’s position.

| Responsibility | What it means | Typical trigger |
|----------------|---------------|-----------------|
| **Final creative approval** | Client may see work only after Owner clears review/delivery gates. | Job reaches `ready_for_review` or `ready_for_delivery`; `ownerApprovalPending` set. |
| **Exceptions** | Blockers that stop linked workflow until Owner resolves, assigns, or approves promotion. | `CampaignExceptionRecord` in `waiting_owner` / owner-held kinds (`OWNER_HELD_EXCEPTION_KINDS`). |
| **Scope changes** | Deliverable or service changes outside the approved plan. | `scope_change` exception; client asks for work not on the plan. |
| **Refund / payment-sensitive decisions** | Refunds, cancellations, or goodwill outside template eligibility. | 14-day Waiting on Client eligibility, production-not-started path, complaints, partial refund discretion. |
| **Revision-limit decisions** | Client wants another round after included revisions are used. | `revision_exhausted` exception; QA bridge from revision policy. |
| **Final QA / release** | Last Owner sign-off before Final Delivery is client-visible. | Client approved in Review Room; `owner_final_release` / `approval_before_delivery`. |
| **Client issues policy cannot answer** | Ambiguous, emotional, or edge-case messages that need a human Studio voice. | Incoming interaction classified as complaint, refund request, or escalation — not covered by Help Center FAQ/policy auto-reply. |

**Principle:** If the answer is already in **Help Center** (`docs/help-center-v1-locked.md`) and the **Decision Core** can apply a locked rule + template with no discretion, it does **not** belong on Tagia’s desk.

---

## 2. What should NOT land on Tagia’s desk

These are **real events** in the system — they belong in activity logs, client journey, team queues, or automated outbox — not in front of Tagia for a decision.

| Item | Why it stays off the desk | Where it goes instead |
|------|---------------------------|------------------------|
| **Normal payment received** | Acknowledgment only; no judgment. | `payment_received` communication template → outbox (test-send / future send); Studio Board milestone. |
| **Routine status updates** | “Building concepts,” “In review,” etc. | Campaign Record + `jobActivityEvents`; client-facing journey steps. |
| **Normal missing-material reminders** | 48h / 72h rules are policy-driven (`JOB_CONTROL_POLICY`). | `reminder_48_hour`, `waiting_on_client_72_hour` templates; **Needs Client** tray (awareness only). |
| **Routine “we received your file”** | Materials accepted → queue resumes. | `materials_received_returned_to_queue`; production lane / team office. |
| **Template + rule outcomes** | Squishy applies locked policy; owner send may still be required for outbox but **not a decision**. | Needs Communication outbox (staff/system); not **Needs My Decision**. |
| **Producer-resolvable internal blockers** | No owner-held dimension. | `routine_internal` → assignee in Team Office (`PRODUCER_RESOLVABLE_KINDS`). |
| **Lane occupancy / throughput** | Informational unless it forces a capacity judgment. | Production lanes (scan); only **heavy lane full** when Tagia must choose bump vs wait rises to desk. |

**Anti-pattern:** Showing every campaign, every job, or every communication as if it needs Owner action. That turns the decision desk into a generic admin dashboard.

---

## 3. Tray model — storage vs desk

**Trays store work. The desk presents work.**

Trays (file cabinet / bookshelf) organize everything waiting for Owner attention or awareness. The **desk itself is sequential** — it shows **one current folder** at a time (§5.5). Tagia can open a tray to browse or jump ahead, but the system **manages the queue**; she is not forced to manage it.

The Owner Console organizes stored work into **five trays**. Each tray answers one question when Tagia chooses to look inside.

| Tray | Question Tagia asks | Owner action required? |
|------|---------------------|-------------------------|
| **Needs My Decision** | What requires my judgment today? | **Yes** — resolve, assign, or choose a non-template path. |
| **Needs My Approval** | What must I approve before clients or production proceed? | **Yes** — approve, hold, decline, or release. |
| **Needs Client** | What is blocked on the client, and is policy doing its job? | **No** — monitor only; Squishy sends reminders per rules. |
| **Ready to Release** | What is finished and waiting for my final release? | **Yes** — final QA / delivery release. |
| **Recently Handled** | What did I already clear? | **No** — audit and confidence; undo is not assumed. |

**Today vs planned:** The live UI mixes exception queue (“Waiting on you”), Owner Control Room desk, scan buckets, and communication outbox. This doc defines the **target tray semantics**; reorganizing the UI into these trays is **future work** (not started).

**Missing rule (V1 add-on):** Every tray item is a **folder** in **exactly one state** with a **decision outcome path**. Opening a folder must make obvious what Tagia decides, what happens if she approves, what happens if she does not, and what happens if she needs more information. After she acts, the folder **leaves the Owner Desk immediately** — it does not linger. See §4.

---

## 4. Core operating principles — states, routing, no linger

### 4.1 You manage states, not folders

Trays are **views** into work. Underneath, every item is a **state machine**.

**Every folder on the Owner Desk must answer one question:**

> **Why is this on my desk instead of someone else’s?**

If the system cannot answer that in one sentence, the item should not be on the desk.

| If the answer is… | It belongs on… |
|-------------------|----------------|
| Only Owner judgment can unblock this | **Owner Desk** (active) |
| Team can fix this without Owner | **Team Office / Production** |
| Client must respond | **Waiting on Client** (Owner may glance in **Needs Client**) |
| Policy + template handles this | **Squishy / outbox** — not Owner Desk |
| Owner already decided; waiting on external condition | **Off desk** with return condition — not sitting in queue |

### 4.2 How the Studio fits together

| Layer | Job |
|-------|-----|
| **Service Catalog** | Decides what was sold. |
| **Decision Core** | Decides where work goes next after an Owner **business outcome**. |
| **Campaign Record** | Remembers what happened. |
| **Squishy** | Communicates what people need to know (routine + templated). |
| **Owner Desk** | Exists for **human judgment only**. |

**Core routing principle:**

> **The Owner decides the business outcome. The Decision Core determines the operational routing.**

Tagia never chooses “Production vs Campaign Record vs Client vs Team” as separate UI steps. She chooses **Approve Scope Change**, **Send Back for Revision**, **Approve & Send to Client**, etc. The **Decision Core** maps that outcome to production lanes, client visibility, communications, and Campaign Record events.

Squishy sends routine communication. Tagia does not manually route messages after deciding.

### 4.3 Folder state machine

Every folder is in **exactly one state** at all times. Nothing sits on the Owner Desk forever — it always has a destination.

```
NEW
  ↓
WAITING FOR OWNER          ← appears on Owner Desk (tray by type)
  ↓
OWNER REVIEWING            ← Tagia opened the folder
  ↓
OWNER DECISION             ← Tagia chose a business outcome
  ↓
DECISION CORE ROUTES       ← automatic — Tagia does not pick destination
  ↓
(one of)
  → TO PRODUCTION
  → TO CLIENT
  → WAITING ON CLIENT
  → NEEDS TEAM CLARIFICATION
  → READY FOR REVIEW         (resubmit path — returns when production resubmits)
  → READY FOR FINAL RELEASE
  → CLOSED / ARCHIVED
  → WAITING ON OWNER (deferred) ← off active desk; returns when condition met
```

**Return to Owner Desk:** When a future Owner decision becomes necessary, the system creates a **new folder** (or re-raises with a new event) — it does **not** resurrect an old queue entry. Tagia should never see the same decided item unless **something new happened**.

**Quick approval:** If all it needs is approval, Tagia approves once — the folder **disappears from the active desk instantly**. She does not see it again unless a new event requires Owner judgment.

### 4.4 No folder left behind

**Operating principle:** The Owner Desk is a **decision desk, not a storage area.**

No folder may linger on the Owner Desk indefinitely. Every folder that reaches Tagia’s desk must **leave with a defined destination and a defined next action**.

When Tagia makes a decision, the folder **immediately** moves to its next state. Examples:

- Production  
- Waiting on Client  
- Client communication (via Squishy, after approval)  
- Needs Team Clarification  
- Ready for Review (internal resubmit queue)  
- Ready for Final Release  
- Final Delivery  
- Closed / Archived  

**Deferred Owner dependency** — if something still depends on Tagia **later**, it must **not** remain on the active desk. It leaves with:

| Field | Required |
|-------|----------|
| **Why it left** | e.g. waiting on legal review, vendor quote, scheduled review date |
| **Where it went** | off-desk state (not “still in my queue”) |
| **Return condition** | what event brings it back |
| **Who is responsible now** | team, client, vendor, or future Owner |
| **Next expected action** | what should happen before it returns |

Examples of valid **off-desk** waits (not linger on desk):

- Waiting on client response  
- Waiting on producer clarification  
- Waiting on vendor  
- Waiting on legal  
- Waiting on scheduled review date  

Only when the **return condition** is met does a **new** Owner Desk item appear.

**The system must always know:** why the folder left · where it went · what event brings it back · who is currently responsible · what the next expected action is.

**Anti-pattern:** “I’ll get to this later” with the folder still sitting in **Waiting on you**. That turns the decision desk into a cluttered inbox.

### 4.5 “Do not approve” is not one thing

Declining or not approving is **not** a single destination. Tagia chooses the **business meaning**; Decision Core routes.

| What Tagia means | Business outcome | Routes to | Squishy | Production |
|------------------|------------------|-----------|---------|------------|
| **Team must fix this** | Send back — quality / standards | **Back to Team / Production** | No | Receives work + notes |
| **Client must answer** | Need client input | **Waiting on Client** | Yes — approved client ask | Pauses |
| **I need this later** | Deferred Owner dependency | **Waiting on Owner (deferred)** — off desk | No | Per notes |
| **Both** | Split: team action + client ask | **Two routed items** — one to Production, one to Client | Client path only | Team path only |

**Example — team:** “This graphic doesn’t meet our standards.” → Production receives it. Squishy says nothing. Folder leaves Owner Desk.

**Example — client:** “I need your logo.” → Waiting on Client. Squishy contacts client. Production pauses. Folder leaves Owner Desk.

**Example — deferred Owner:** Waiting on legal / vendor / pricing → off desk with return condition and reminder — **not** left in active queue.

**Example — both:** Client owes files **and** production needs clarification → folder **splits**. One task → Production. One communication → Client. Tagia does not track both manually; Campaign Record shows both threads.

### 4.6 Decision desk, not waiting room

> **The Owner Desk is a decision desk, not a waiting room.**

- Nothing sits on the desk without an **active reason** requiring Owner judgment **now**.  
- Nothing stays on the desk **after** a decision has been made.  
- Awareness of client timers belongs in **Needs Client** — not guilt items in the action queue.  
- **Recently Handled** is audit memory, not a backlog.

This principle prevents the console from slowly becoming a cluttered inbox and gives the whole team a clear rule: **if Owner already decided, it left.**

---

## 5. Decision desk workflow — folders move, not lists

The Owner Console is an **operating system for Tagia’s day**, not organized information.

### 5.1 Arrival → action → destination

1. **Most urgent folder appears first** (see §7 urgency order — not creation time alone).  
2. Tagia **opens the folder** (state → **OWNER REVIEWING**).  
3. The folder shows **exactly what decision is needed** (five questions below) and **why it is on her desk**.  
4. Tagia **chooses one business outcome** (Approve, Decline, Send Back, etc.) — not a manual routing target.  
5. **Decision Core routes** the folder to its next state (§4.3).  
6. The folder **leaves the active Owner Desk immediately** — audit in **Recently Handled** or off-desk with return condition.

### 5.2 Five questions every open folder must answer

| Question | What the UI must show |
|----------|------------------------|
| **Why is this on my desk?** | One sentence — why Owner, not team/client/policy. |
| **What do I decide?** | One sentence judgment — e.g. “Is this ready for the client to review?” |
| **If I approve?** | Outcome summary — Decision Core routes; client/production impact shown. |
| **If I do not approve?** | Which path: team, client, deferred Owner, or split (§4.5) — client stays dark unless client path. |
| **If I need more information?** | Clarification path — team or client; Squishy only if client-facing ask is approved. |

Quick-approval items (promotion wording, review gate, final release) should still show all five — but default the primary action so Tagia can **review and approve in one tap** when nothing is wrong.

### 5.3 Operational destinations (Decision Core routing vocabulary)

After an owner **business outcome**, Decision Core routes to exactly one primary state (split outcomes create parallel routed items per §4.5):

| Destination | Meaning |
|-------------|---------|
| **Production** | Work returns to the production lane / assigned role; spine may rewind. |
| **Client** | Client-visible next step (Review Room, Studio Board materials, Final Delivery). |
| **Waiting on Client** | Paused on client input; appears in **Needs Client** (awareness only for Tagia). |
| **Ready to Release** | Finished work waiting for Owner final QA / delivery release. |
| **Recently Handled** | Tagia’s action is complete; audit trail only. |
| **Needs Clarification** | Blocked until team or client supplies missing info; may return to Owner desk later. |
| **Back to Team** | Assigned internal follow-up (Team Office / role queue); not on Owner desk until escalated again. |
| **Waiting on Owner (deferred)** | Off active desk; return condition set; reminder fires when due. |
| **Closed** | Exception or job closed (refund, cancel, resolved blocker); no return unless **new** event. |

**Principle:** Tagia never wonders “what happened after I clicked.” The folder leaves her active queue instantly. Campaign Record + activity show where it went and who owns the next step.

### 5.4 Main shell — one-screen-first, sequential desk

**Operating principle:** The main Owner Console shell is **one-screen-first** and **sequential, not simultaneous**. The landing view should feel like a **desk with one folder on it**, not a **webpage with stacked sections** or expanded trays.

**Page-level scrolling on the landing view is a failure mode.** Detail-level scrolling is acceptable **only inside an opened folder** (summary sheet + context that does not fit one viewport).

#### Default arrival — one folder on the desk

When Tagia opens the Owner Console:

1. She sees **one** current folder — the highest-priority item requiring judgment (§7). Not eleven cards. Not five trays expanded. **One.**
2. A compact **Today’s Decisions** count (e.g. `🔴 3`) shows how many remain — not the full queue body.
3. Trays / file cabinet remain available to **browse or jump** (e.g. open **Ready to Release** directly) — but the system does not force queue management.
4. She taps **Review Folder** (or equivalent) — the folder opens as her **working surface**.
5. She chooses a **business outcome** — folder closes, leaves the desk, Decision Core routes.
6. The **next** folder arrives — as if placed there for her. No scroll. No hunt.

**Judge / clerk model:** Case one → decision → case two → decision. Humans make one decision, then the next.

#### Landing zones (closed folder on desk)

| Zone | Content |
|------|---------|
| **Greeting + count** | e.g. “Good morning, Tagia” · **Today’s Decisions** count. |
| **Current folder** | One closed folder — client/project name, decision type, lane, due hint. Category signal via tab color (tray/type). |
| **Room context** | Squishy, window, file cabinet, desk — visible around the folder; folder is large enough to feel important, not full-screen (§5.6). |
| **Tray access** | File cabinet / tray strip — compact counts; browse on demand. |

**Not on landing:** stacked dashboard sections, full queue lists, scan buckets, communication outbox, lane grids, or simultaneous multi-folder layout.

#### Layout rules

- **Sequential by default** — desk presents the next decision; storage stays in trays.  
- **No stacked dashboard sections** on landing.  
- **Recently Handled** and **Needs Client** — tray/browse only; not expanded on landing.  
- **Opening a folder** = working surface; may scroll internally.  
- **Closing / deciding** returns to closed folder on desk, then next folder — landing never becomes a long page.

**Browser zoom standard applies:** If Tagia must change browser zoom or scroll the landing page to use the Owner Console, it is a bug.

### 5.5 Open folder — working surface

When the current folder is open, it answers:

| Question | Purpose |
|----------|---------|
| **What happened?** | Context — what triggered this. |
| **Why is this on my desk?** | Why Owner, not team/client/policy. |
| **What decision do I need to make?** | One clear judgment. |
| **What is the recommended action?** | System suggestion — Tagia may override. |
| **What happens after I decide?** | Approve path vs not-approve paths (§5.2, §4.5). |

**Summary sheet first** — client, project, decision needed, recommendation, impact. Not twenty pages before the decision.

**Owner chooses a business outcome** (not a routing target):

Approve · Send Back to Team · Ask Client · Hold · Assign · Release · Decline

Decision Core routes. Folder **immediately leaves the desk**. If it needs Tagia again later, it returns as a **new** decision (§4.3).

### 5.6 Visual & room direction (Owner Desk only)

**Scope:** This metaphor applies to the **Owner Desk / Owner Console** — not every page of The Studio.

| Element | Direction |
|---------|-----------|
| **Folder** | Premium creative-studio manila — textured cardstock, adhesive label, category tab. Functional, not gimmicky. |
| **Tab color** | Signals decision category (aligned to tray/type and design system roles — e.g. release, client wait, needs decision, creative approval, team clarification). |
| **Room** | Simple static scene: Squishy behind his desk, window (existing weather), file cabinet or bookshelf, desk, coffee mug, desk lamp. **No walking, doors, roaming, or unnecessary animation.** |
| **After decision** | Folder closes and leaves desk; next folder arrives. Subtle satisfaction (e.g. stamp / close) is optional polish — not required for V1 behavior. |

**Intent:** Squishy has placed the folder on Tagia’s desk. Context without distraction. Focus is the work.

### 5.7 Stress test — open before build

*Scout / implementer: challenge this model before coding. Resolve or accept each item.*

| Question | Notes |
|----------|-------|
| **Split outcomes** (team + client) | One desk session may spawn two routed items. Desk shows one folder at a time; split is post-decision, not on desk simultaneously. |
| **Tray jump** | Tagia must be able to override sequence (e.g. final release now) without managing full queue. |
| **Zero decisions** | Empty desk state — what shows? (Clear “no decisions today” + Needs Client glance optional.) |
| **Many quick approvals** | Sequential must not add friction — one-tap approve still required for simple gates. |
| **Mobile** | One-folder model maps cleanly to phone; tray browse via cabinet/drawer pattern. |
| **Metaphor cost** | If folder chrome ever hides decision content or slows access, simplify chrome — behavior rules (§4–§5) outrank decoration. |

---

## 6. Owner outcomes — vocabulary and side effects

### 6.1 Owner outcome actions (business — not routing)

| Outcome | When Tagia uses it |
|---------|-------------------|
| **Approve** | Yes — proceed on the recommended path (review, promotion, release, scope, refund). |
| **Decline** | No — deny promotion, scope, refund, or client-visible path; stay internal. |
| **Hold** | Pause on Owner desk internally — team verifies before client sees anything. |
| **Ask Client** | Approved client-facing ask (materials, fact, clarification). |
| **Ask Team** | Send back with notes — no client visibility. |
| **Assign** | Delegate to a named role; folder leaves Owner desk. |
| **Release** | Final delivery release (Ready to Release tray). |
| **Send Back for Revision** | Creative not ready — Production reworks; client does not see. |
| **Close / Resolve** | Exception cleared or discretion decision recorded; workflow unblocks per notes. |

### 6.2 Side-effect columns (Decision Core applies after outcome)

Each outcome path below uses these fields:

| Field | Meaning |
|-------|---------|
| **Moves to** | Operational state after Decision Core routes (§5.3). |
| **Notified** | Owner, Producer, role assignee, QA, client (push/email when wired). |
| **Squishy comms** | Templated message enqueued or sent (`ready_for_review`, `final_delivery_available`, refund notice, etc.). |
| **Production** | Lane / task / spine change. |
| **Campaign Record** | Activity event + visible status for client journey. |
| **Blocked** | Whether linked work stays blocked until another event. |

---

## 7. Urgency order — folders sorted by stakes, not FIFO

Trays and items within trays sort by **urgency**, not creation time alone.

**Suggested urgency order (highest first):**

1. Client waiting on Owner response (client blocked on Owner gate).  
2. Final delivery release (**Ready to Release**).  
3. Approval before client review (`before_review`).  
4. Refund / payment-sensitive issue.  
5. Scope change.  
6. Revision limit reached.  
7. Deadline risk / deadline commitment.  
8. Missing client fact / client material promotion.  
9. Needs Client awareness (no action).  
10. Recently Handled (collapsed; lowest).

**Within a tray:** same priority list applies to item types. **Across trays:** the console surfaces the tray containing the highest-priority open item first (e.g. if **Ready to Release (1)** and **Needs My Decision (3)** exist, **Ready to Release** tray or its item rises above lower-stakes decision items unless a client is actively blocked on Owner).

---

## 8. Item types by tray — with full outcome paths

### 8.1 Needs My Decision

Judgment, escalation, and discretion — work stays blocked until Tagia acts (or explicitly assigns).

**Decision question (tray):** *What judgment is required that policy cannot apply automatically?*

| Item type | Why it appears | What Tagia decides |
|-----------|----------------|-------------------|
| **Compliance hold** | QA flagged compliance concern; task blocked. | Clear hold or escalate path. |
| **Direction disagreement** | Strategy vs copy/production conflict. | Which direction stands. |
| **Scope change** | Work requested outside approved plan. | Approve change (with plan update) or deny. |
| **Deadline commitment** | Team or client needs a date Owner must own. | Commit or revise timeline. |
| **Deadline risk** | Schedule at risk before commitment. | Acknowledge and set path. |
| **Revision limit reached** | Included rounds exhausted; client wants more. | Allow extra round, bill, or hold firm per policy. |
| **Refund / cancellation discretion** | Policy says “may be eligible” — not automatic. | Approve refund, deny, or partial goodwill. |
| **Complaint / non-policy client issue** | Message cannot be answered from Help Center alone. | Studio response + whether to escalate. |
| **Heavy lane full** | Capacity 1/1; next job queued. | Bump, wait, or re-prioritize. |

**Exception kinds (code today):** `compliance_hold`, `direction_disagreement`, `scope_change`, `deadline_commitment`, `deadline_risk`, `revision_exhausted`, plus discretion paths for refund/complaint (Decision Core planned).

#### Compliance hold

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Close / Resolve** (cleared) | Back to Team → Production | QA, assignee | No | Task unblocks; lane resumes | Internal QA cleared event | No |
| **Assign** | Back to Team | Assignee, QA | No | Task assigned | Assignment logged | Yes — until assignee resolves |
| **Ask Team** (needs more QA) | Needs Clarification | QA, Producer | No | Hold remains | Internal QA hold | Yes |
| **Decline** (not applicable as client gate) | — | — | — | — | — | — |

#### Direction disagreement

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Close / Resolve** (direction chosen) | Production | Assigned role, Producer | No | Continues on confirmed direction | Direction decision logged | No |
| **Assign** | Back to Team | Assignee | No | Work routed to assignee | Assignment logged | Yes — until resolved |
| **Ask Team** | Needs Clarification | Producer, roles | No | Paused on linked task | Internal hold | Yes |

#### Scope change

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Approve** | Production (+ plan update) | Producer, planning | Yes — if client requested; scope outcome template | Scope adjusted; work replanned | Plan change logged | No — after replan |
| **Decline** | Closed (exception) | Producer | Yes — if client asked; denial wording | No new scope | Scope denied logged | No |
| **Ask Client** | Waiting on Client | Client | Yes — approved clarification only | Paused | Materials / fact request | Yes — client side |
| **Assign** | Back to Team | Producer | No | Planning task created | Assignment logged | Yes |
| **Hold** | Needs Clarification | Producer | No | Paused | Internal scope review | Yes |

#### Deadline commitment / deadline risk

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Close / Resolve** (date committed) | Production | Producer, assignees | Optional — if client-facing date changes | Dispatch updated | Timeline updated | No |
| **Assign** | Back to Team | Assignee | No | Lane schedule adjusted | Assignment logged | Yes — until path set |
| **Ask Team** | Needs Clarification | Producer | No | Risk acknowledged | Risk logged | Yes |
| **Ask Client** | Waiting on Client | Client | Yes — only if date needs client confirm | Paused | Waiting on client | Yes |

#### Revision limit reached

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Approve** (extra round) | Production | Production role | Yes — revision allowance outcome | Revision round opens | Revision policy exception logged | No |
| **Decline** (hold firm) | Waiting on Client or Closed | Client | Yes — firm policy outcome | Paused or complete per policy | Revision denied logged | Depends |
| **Assign** | Back to Team | Producer | No | Internal path | Assignment logged | Yes |
| **Ask Client** | Waiting on Client | Client | Yes — bill / approve extra round | Paused | Client decision pending | Yes |

#### Refund / cancellation discretion

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Approve** (refund) | Closed | Client, Producer | Yes — refund approved template | Job → `refunded_cancelled` | Refund logged | No — job closed |
| **Decline** | Production or Waiting on Client | Client | Yes — refund denied template | Job continues or waiting | Denial logged | Per spine |
| **Hold** | Needs Clarification | Producer | No | Paused | Refund under review | Yes |
| **Assign** | Back to Team | Assignee | No | Internal investigation | Assignment logged | Yes |

#### Complaint / non-policy client issue

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Close / Resolve** (reply approved) | Recently Handled | Client (reply) | Yes — owner-approved reply | Per issue | Interaction resolved | No |
| **Assign** | Back to Team | Assignee | No | Internal follow-up | Assignment logged | Yes |
| **Ask Client** | Waiting on Client | Client | Yes — approved clarification | Paused | Awaiting client | Yes |
| **Decline** (no refund / no escalation) | Closed | Client | Yes — policy-bound response | Per spine | Decision logged | No |

#### Heavy lane full

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Close / Resolve** (bump / wait decided) | Production | Producer | No | Lane assignment updated | Capacity decision logged | No |
| **Assign** | Back to Team | Producer | No | Queue reordered | Assignment logged | No |

---

### 8.2 Needs My Approval

Tagia confirms **wording or gates** before the client sees something or before the next spine step.

**Decision question (tray):** *Is this safe and correct to send to the client or advance to the next gate?*

| Item type | Why it appears | What Tagia decides |
|-----------|----------------|-------------------|
| **Client material promotion** | Team needs a fact/file from client; promotion must be client-safe. | Approve wording, hold internally, or decline. |
| **Missing client fact (promotable)** | Same as promotion; blocks creative until fact exists. | Promote to client or resolve internally. |
| **Approval before review** | Concepts ready; client must not see Review Room yet. | Creative ready for client review. |
| **Owner client-material review** | Exception panel title today for promotion review. | Same as client material promotion. |

**Exception kinds (code today):** `client_request`, `missing_client_fact` (promotion path).  
**Job gates (code today):** `ownerApprovalPending: before_review` · desk reason `approval_before_review`.

#### Client material promotion / missing client fact / owner client-material review

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Approve** (send to client) | Waiting on Client | Client, team | Yes — promoted materials prompt | Materials queue unblocks internally | Client materials slot live | Yes — until client responds |
| **Decline** | Back to Team (internal only) | Team, raiser | No | Internal path only | Promotion declined — internal | Yes — team must resolve |
| **Hold** | Needs Clarification | Assigned role | No | Internal review | On hold — internal | Yes |
| **Close / Resolve** (internal resolve) | Production | Team | No | Blocker cleared without client ask | Internal resolve logged | No |
| **Assign** | Back to Team | Assignee | No | Internal follow-up | Assignment logged | Yes |

#### Approval before review (Ready for Review)

**What do I decide?** *Is this creative ready for the client to see in Review Room?*

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Approve** | Client (Review Room) | Client, production | Yes — `ready_for_review` | Spine advances; `ownerApprovalPending` cleared | Review Room unlocked | No — client turn |
| **Send Back for Revision** | Production | Assigned role, Producer | No | Job returns to rework; client does not see | Internal QA hold logged | Yes — production |
| **Hold** | Needs Clarification | QA, Producer | No | Stays off client path | Internal review hold | Yes |
| **Ask Team** | Back to Team | Assignee | No | Notes attached | Internal notes | Yes |
| **Ask Client** | Waiting on Client | Client | Yes — only if approved client-facing question | Paused | Client input requested | Yes |

**If I do not approve:** use **Send Back for Revision** or **Hold** — folder leaves **Needs My Approval**, lands in **Production** or **Needs Clarification**; client does not see work; folder may return when production resubmits.

**If I need more information:** **Hold** or **Ask Team** → **Needs Clarification**; **Ask Client** only when client-facing wording is approved.

---

### 8.3 Needs Client

Tagia can **see** these for situational awareness on mobile (“State Farm check”) but should **not** get a decision button.

**Decision question (tray):** *Is policy running on the client side — and is anything about to need me?*

| Item type | Why it appears on tray | Squishy / system behavior | Auto-escalation (leaves this tray) |
|-----------|------------------------|-----------------------------|-------------------------------------|
| **Waiting on materials** | Required items missing or in review. | Reminders at 48h; Waiting on Client at 72h. | 14-day eligibility → **Needs My Decision** (refund discretion). |
| **Promoted request — no response** | Owner already approved client ask. | Timer tracks age. | Stale threshold → new exception or **Needs My Decision**. |
| **Waiting on Client spine** | Job paused per `JOB_CONTROL_POLICY`. | Policy timers active. | Refund eligibility → **Needs My Decision**. |
| **Client in Review Room** | Revision or approval in progress. | `revision_ready`, activity templates. | Client approves → **Ready to Release** on Owner desk. |

**Owner outcomes on this tray:** **None** — view only. Tagia does not Approve, Decline, or Assign from here.

**Today:** Partially in scan bucket `waiting_client` — planned to fold into **Needs Client** tray without action chrome.

---

### 8.4 Ready to Release

Finished work waiting for **Owner final release** before Final Delivery.

**Decision question (tray):** *Is this package ready for the client to receive as Final Delivery?*

| Item type | Why it appears | What Tagia decides |
|-----------|----------------|-------------------|
| **Approval before delivery** | Package ready; policy requires Owner release. | Final QA pass; release to client. |
| **Client approved — final release needed** | Client approved in Review Room; Owner still gates delivery. | Confirm delivery. |

**Job gates (code today):** `ownerApprovalPending: before_delivery` · `spineStatus: ready_for_delivery` / client `approved`.

#### Final delivery release

| Outcome | Moves to | Notified | Squishy comms | Production | Campaign Record | Blocked |
|---------|----------|----------|---------------|------------|-----------------|---------|
| **Release** / **Approve** | Client (Final Delivery) | Client, Producer | Yes — `final_delivery_available` | Job → delivered path; complete | Final Delivery unlocked | No — client turn |
| **Send Back for Revision** | Production | Assigned role, Producer | No | Rework required; client does not see delivery | Internal delivery hold | Yes — production |
| **Hold** | Needs Clarification | QA, Producer | No | Stays off client path | Final QA hold | Yes |
| **Ask Team** | Back to Team | Assignee | No | Notes for final QA | Internal notes | Yes |
| **Decline** (not ready to ship) | Production | Producer | No | Package held internally | Release declined — internal | Yes |

**If I do not approve:** **Send Back for Revision** or **Hold** — folder moves to **Production** or **Needs Clarification**; client does not see Final Delivery; returns to **Ready to Release** when resubmitted.

---

### 8.5 Recently Handled

Short memory so Tagia trusts the desk is not hiding work.

| Item type | Why it appears | What Tagia sees |
|-----------|----------------|-----------------|
| **Resolved exceptions** | Closed in last 14 days. | Title, campaign, resolution age, outcome taken. |
| **Approvals sent** | Promotion approved, review released, delivery released. | What went to client and when. |
| **Refund / scope decisions** | Discretion calls made. | Outcome + timestamp. |

**Owner outcomes:** **View only** — reopen is a new exception or resubmit, not undo.

**Today:** Scan bucket `recently_resolved` (exceptions only). Planned tray expands to approvals and releases with **destination** and **outcome** visible on each row.

---

## 9. Communication rules (Owner desk vs outbox)

| Communication type | Lands on decision desk? | Who sends? |
|--------------------|-------------------------|------------|
| Payment received | **No** | Template → outbox; system/Squishy |
| Materials reminder (48h / 72h) | **No** (Needs Client only) | Template per `JOB_CONTROL_POLICY` |
| Promoted materials request | **No** after approval | Approved wording → client materials |
| Ready for review / delivery | **No** after release action | Template after **Needs My Approval** / **Ready to Release** |
| Refund approved/denied | **Decision first**, then send | Template after **Needs My Decision** |
| Policy FAQ answer | **No** | Squishy / staff — not Tagia unless escalation |

**Locked policy:** Help Center production trigger and refund wording (`docs/help-center-v1-locked.md`) — Owner Console does not rewrite policy; it applies decisions that may **trigger** templated comms.

---

## 10. Daily use case — the 30-second “State Farm check”

**Scenario:** Tagia has two minutes between meetings. She opens the Owner Console on her phone (`390×844`).

**Success looks like:**

1. **One folder on the desk** (§5.4) — highest-priority decision; Today’s Decisions count; no page scroll.  
   - Highest-stakes tray or item surfaced first (e.g. **Ready to Release (1)** before lower-priority decisions).  
   - `Needs Client (4)` — grey, no action buttons  
   - `Recently Handled` — collapsed by default  

2. **She reviews the current folder** — opens working surface; five questions + summary sheet (§5.5).

3. **She decides** — one business outcome; folder closes and leaves; next folder arrives.

4. **Optional:** she glances at **Needs Client** via tray/cabinet — awareness only; no guilt taps.

5. **She closes the app** — confident the queue is managed; nothing forgotten on the desk.

**Failure modes to avoid:**

- **Page-level scroll on landing** — stacked dashboard sections, scan buckets, outbox, or lane grids that turn the desk into a long webpage (§5.4).
- Opening Owner Console and seeing 11 “waiting” items where 8 are awareness, scan, or routine comms — that trains Tagia to ignore the desk.
- Acting on a folder with no visible **destination** — “what happened after I clicked?” breaks trust in the desk.
- Folders that **linger** after decision — the desk becomes a waiting room / inbox (§4.6).

---

## 11. Mapping to current implementation (reference only)

| Planned tray | Code / UI today | Gap |
|--------------|-----------------|-----|
| Needs My Decision | Owner Console `waitingOnOwner` exceptions (subset) + some Owner Desk reasons | Refund/complaint not fully wired; tray not named; **no outcome routing UI** |
| Needs My Approval | Promotion panel + `approval_before_review` desk items | Mixed into one queue; **no “if not approve” path surfaced** |
| Needs Client | Scan `waiting_client` + waiting tray in Control Room | Shown with too much equal weight; auto-escalation not visible |
| Ready to Release | `approval_before_delivery` desk items | Buried below fold; **no urgency sort** |
| Recently Handled | Scan `recently_resolved` | Approvals/releases not included; **destination not shown** |
| **Folder routing** | Partial (exception resolve, promotion approve, review/delivery gates) | **No unified state machine; Decision Core routing not wired to Owner UI** |
| **No linger** | Items can remain in `waiting_owner` queue | **No deferred-off-desk model; no return conditions** |
| **Urgency sort** | Creation / scan order | **Not stakes-based (§7)** |
| **Not on desk** | Needs Communication, activity, lanes | Communication outbox visible in Control Room — should not compete with decisions |
| **One-screen landing** | Long vertical page; queue + detail + actions stacked | **Sequential one-folder desk not built (§5.4–§5.5)** |
| **Sequential desk** | All waiting items visible at once | **System must present next decision, not full queue** |

**Files to evolve later (not in this pass):** `owner-console-view.ts`, `owner-desk.ts`, `FileRoomOwnerConsoleScene.tsx`, `FileRoomOwnerControlRoomPanels.tsx`.

---

## 12. Out of scope for this doc

- Visual polish (frost, folder texture, stamp animation, tab colors) — **behavior locked first** (§5.4–§5.7); pixel polish follows approval.  
- Decision Core Phase 3+ implementation.  
- New business rules (refund amounts, scope pricing) — require Tagia / locked policy change.  
- Customer-facing copy changes.

---

## 13. Approval checklist (Tagia) — lock gate

Before locking this map and building Owner Console UI:

- [ ] Tray names and definitions match how you think about your day.
- [ ] “Not on desk” list is complete — nothing missing that should stay off your plate.
- [ ] **Needs My Decision** vs **Needs My Approval** split feels right.
- [ ] **Needs Client** is awareness-only — no guilt taps.
- [ ] **Every folder type** has correct outcome paths (approve, decline, hold, clarify).
- [ ] **“If I do not approve”** paths feel right — team vs client vs deferred Owner vs split (§4.5).
- [ ] **Urgency order** (§7) matches how you prioritize between meetings.
- [ ] **State machine** (§4.3) matches how work should flow.
- [ ] **No folder left behind** (§4.4) — nothing lingers; deferred items leave with return conditions.
- [ ] **Owner outcome vs Decision Core routing** (§4.2) — you choose business meaning, not destinations.
- [ ] **“Why is this on my desk?”** is answerable for every active item.
- [ ] **Decision desk, not waiting room** (§4.6) — matches how you want to run the business.
- [ ] **Sequential desk** (§5.4) — one folder at a time; trays for storage, desk for working.
- [ ] **Open folder workflow** (§5.5) — summary sheet + outcomes feel right.
- [ ] **Visual direction** (§5.6) — premium studio folder on Owner Desk only; room stays simple.
- [ ] **Stress test items** (§5.7) — split outcomes, tray jump, empty desk, quick approvals — resolved or accepted.
- [ ] **One-screen-first landing** — no page scroll; detail scroll inside folder only.
- [ ] 30-second mobile check (§10) matches reality you want.

---

*Locked 2026-07-06 — behavior rules. Build sequential Owner Desk V1 against §4–§5. Visual polish follows working loop.*
