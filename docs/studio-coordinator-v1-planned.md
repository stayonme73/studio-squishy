# Studio Coordinator V1 — Squishy’s Job (Planned)

**Status:** Phase 1–2 implemented — `src/studio-coordinator/` + Owner Console briefings (no artwork). Phase 3 pending.  
**Character name (customer-facing):** Squishy  
**Module name (code):** `StudioCoordinator` (`src/studio-coordinator/` when approved)  
**Philosophy:** **Dependable before brilliant.** Squishy is a coordinator who knows exactly when to involve the owner — not an AI that occasionally makes the wrong business decision.

**Trust statement:** Squishy’s purpose is to **reduce the cognitive load on the owner** while **increasing confidence for the client** and **consistency for the production team**.

**Implementation motto:** *Build Squishy’s job before Squishy’s office.* No artwork, room redesign, or animation in Phases 1–3.

**Related (locked / in progress):**
- [Studio Decision Core — Foundation V1](studio-decision-core-foundation-v1-locked.md) — rule evaluation + effect planning (`src/decision-core/`)
- [Owner Console — Responsibility Map V1](owner-console-responsibility-map-v1-planned.md) — Owner Desk behavior (locked 2026-07-06)
- [Customer Journey V1](customer-journey-v1-locked.md) · [Help Center V1](help-center-v1-locked.md)
- Job Control · `JOB_COMMUNICATION_TEMPLATES` · `src/lib/job-control/communication.ts`

**Last updated:** 2026-07-06 (Tagia review pass — trust statement, issue detection, confidence, learning candidates)

---

## Why this document exists

This is Squishy’s **job description** — the first document that defines who keeps the whole studio moving.

The Studio’s foundational layers now divide cleanly:

| Layer | Job |
|-------|-----|
| **Decision Core** | Tells the business **what is allowed** — deterministic rules and effect planning |
| **Campaign Record** | **Remembers** what happened — client journey and milestones |
| **Owner Desk** | Where Tagia makes **judgment calls** — human discretion only |
| **Studio Coordinator (Squishy)** | **Keeps everyone moving** — receives events, routes work, briefs the owner, coordinates client and production |

The Studio has reached three commercial/architecture milestones; Squishy completes the operating picture:

| Milestone | What it unified |
|-----------|-----------------|
| **Service Catalog** | What The Studio sells |
| **Decision Core** | How deterministic rules evaluate events and plan effects |
| **Studio Coordinator V1** *(this doc)* | How people, decisions, and communication **move** through the business |

Squishy is not a fourth decision engine. He is the **operating layer** that receives events, invokes the right systems, and produces the right next step — for clients, production, and Tagia.

**Pause point:** Owner Console visual polish (manilla folder, room scene) is intentionally **deferred** until this coordination model is approved and Phase 1 wiring is proven.

---

## Executive summary

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Client     │────▶│  Studio Coordinator │────▶│  Decision Core   │
│  interactions│     │  (Squishy)          │     │  (rules/effects) │
└──────────────┘     │                     │     └────────┬─────────┘
                     │  · classify         │              │
┌──────────────┐     │  · route            │              ▼
│    Owner     │────▶│  · observe          │     ┌──────────────────┐
│  decisions   │     │  · notify           │     │ Effect executors │
└──────────────┘     │  · brief            │     │ (existing mutators)│
                     └──────────┬──────────┘     └────────┬─────────┘
┌──────────────┐                │                         │
│  Production  │◀───────────────┴─────────────────────────┤
│  team queues │                                          ▼
└──────────────┘                               ┌──────────────────┐
                                               │ Campaign Record  │
                                               │ + tasks envelope │
                                               └──────────────────┘
```

**Squishy coordinates. He does not decide business rules.**

---

## What Squishy is — and is not

| Squishy **is** | Squishy **is not** |
|----------------|-------------------|
| The Studio’s **single coordination entry point** for client events, owner outcomes, and routine follow-through | The **Decision Core** — he calls it; he does not replace evaluators |
| A **router** between Client · Production · Owner Desk · Campaign Record · templates | The **Recommendation Engine** — Discovery scoring stays deterministic |
| A **briefing layer** for Tagia (“why this folder is on your desk”) | The **Campaign Record** — he reads and triggers patches; he does not own journey state |
| A **dependable classifier** of routine vs owner-required work | A chatbot or free-text copy generator in V1 |
| An **observer** of unusual patterns (issue detection) — surfaces observations, not verdicts | A decision-maker on observations — he flags; rules or Tagia decide |
| A **collector** of learning candidates for future precedent review (V1: store only) | An auto-learning system — nothing is applied without Tagia review |
| The future **customer-facing coordinator** (Phase 3+) after payment | An animation, mascot scene, or room asset (Phase 4+) |

---

## Design principle: dependable first

| Dependable (V1) | Deferred (not V1) |
|-----------------|-------------------|
| Same client event → same classification every time | LLM “understanding” of ambiguous messages |
| Clear handoff to Owner Desk when `humanReviewRequired` or owner-held escalation | Advisory suggestions that auto-act |
| Template-only client communication after rules approve | Invented email copy |
| Confident next-step language when authority ends (see **Confidence principle** below) | Blank “I don’t know” or powerless dead-ends |
| Audit trail: what Squishy received, what he called, what he queued | Personality-heavy banter |

**Tagia’s test:** If Squishy is wrong, it should be **obviously wrong in the logs** — not subtly wrong in production.

---

## Confidence principle

Squishy must **never appear confused or powerless** — to the client, to production, or to Tagia.

| Situation | Wrong (V1) | Right (V1) |
|-----------|------------|------------|
| Outside Squishy’s authority | “I don’t know.” | “This needs your review. I’ve placed it on your Owner Desk.” |
| Ambiguous client message | Guessing a business outcome | “The Studio is reviewing this. You’ll hear from us shortly.” |
| Waiting on client | Silence or vague stall | Clear status from Campaign Record + what happens next |
| Waiting on Tagia | Client sees nothing | Client-safe waiting copy; owner sees folder + briefing |

**Rules:**

1. **Internal logs** may be explicit and technical — including uncertainty and escalation reasons.
2. **Owner and client copy** always states **what happens next** and **who owns the next step** — even when Squishy cannot act.
3. Confidence is not overconfidence — Squishy does not promise outcomes Tagia has not decided or rules have not authorized.
4. Escalation is framed as **competent handoff**, not failure: *“I’ve routed this to Tagia for a judgment call.”*

---

## Responsibilities (V1 operating model)

Squishy **must** be able to perform these operations. Each maps to existing code paths — no new business rules without Tagia approval.

### 1. Receive client interactions

| Input | Source today | Coordinator action |
|-------|--------------|-------------------|
| Revision request / message | Review Room | Build `DecisionContext` → `customer_interaction` |
| Materials upload | Project Details / materials API | Classify + record activity |
| Delivery approval | Review Room / Final Delivery | Workflow event → Core |
| Status-style journey step | Studio Board (read-only query) | Respond from Campaign Record snapshot |
| Help Center policy question | Help Center | Route to policy answer or escalate |
| Future: structured message intake | TBD surface | Same pipeline — `incoming_customer_event` |

### 2. Classify routine vs owner-required

| Classification | Typical outcome | Owner folder? |
|----------------|-----------------|---------------|
| **Routine** — policy + template covers it | Core → enqueue communication or auto-response | **No** |
| **Staff queue** — production can resolve | Assign / lane update | **No** |
| **Owner judgment required** — discretion, gates, exceptions | Core → raise exception or desk item | **Yes** |
| **Ambiguous (V1)** — no rule match | Escalate with `humanReviewRequired` | **Yes** — safe default |

Squishy does **not** invent classification rules. He invokes `evaluateDecision()` with the correct domain and facts.

### 3. Check Campaign Record

| Use | Read | Write |
|-----|------|-------|
| Client status answer | Milestones, `studioNotes`, journey step derivation | Via Core **effects** only — `campaign_record_patch` |
| Briefing owner | Campaign name, client name, journey position | No direct UI mutation |
| “What happened before this folder?” | Activity feed resolution | Append-only via existing mutators |

### 4. Check Decision Core authority

For every non-trivial event:

1. Assemble `DecisionContext` (domain, actor, trigger, facts, `occurredAt`).
2. Call `evaluateDecision(context)` (`src/decision-core/orchestrator.ts`).
3. Read `DecisionOutcome`: determination, `matchedRules`, `humanReviewRequired`, `effects`, `warnings`.
4. Execute effects through **existing mutators** — never inline in UI.

Squishy **never** bypasses Core for frozen domains (Discovery scoring, refund eligibility windows, production triggers, escalation kinds).

### 5. Use approved communication templates

| Rule | Detail |
|------|--------|
| Copy source | `JOB_COMMUNICATION_TEMPLATES` in `src/lib/job-control/communication.ts` |
| Selection | Core `evaluateOutgoingCommunicationEvents` / communication domain |
| Delivery | `enqueueJobCommunicationRecord` → outbox (`pending_owner_send` in V1) |
| Squishy’s job | Queue the right template at the right time — **not** rewrite sentences |

Owner send (test-send today) remains a **human or staff action** when policy requires it.

### 6. Notify production

| Trigger | Mechanism today | Coordinator role |
|---------|-----------------|------------------|
| Owner approves review / release | Job spine mutators | Apply Core effects after owner outcome |
| Owner sends back for revision | Spine rewind + task block | Route effect bundle |
| Materials cleared | `materials_received_returned_to_queue` | Sync communication + lane |
| Exception assigned to role | `exceptions-actions` assign | Ensure desk item leaves; team queue updated |

Squishy does **not** choose lane capacity rules. He delivers **“production needs X”** as a structured effect.

### 7. Create an Owner folder when judgment is required

When Core returns `escalate`, `humanReviewRequired`, or an owner-held exception effect:

| Step | Action |
|------|--------|
| 1 | Ensure `CampaignExceptionRecord` or Owner Desk item exists (existing bridges) |
| 2 | Attach **coordinator briefing** metadata (why Owner, recommended next action — from existing card fields + Core trace) |
| 3 | Place item in correct **tray** per [Owner Console responsibility map](owner-console-responsibility-map-v1-planned.md) |
| 4 | Surface on **sequential Owner Desk** at correct urgency rank |

Squishy **creates the queue entry**; Tagia **decides the business outcome**.

### 8. Route completed owner decisions to destinations

After Tagia chooses an outcome (Approve, Send Back, Ask Client, etc.):

| Step | Actor |
|------|-------|
| 1 | File Room action → existing PATCH handlers (`useOwnerConsoleActions`, `exceptions-actions`) |
| 2 | New `DecisionContext` with `actor: owner` and outcome payload |
| 3 | Core maps business outcome → effects (production, client, waiting, closed) |
| 4 | Squishy executes effect list + removes folder from active desk |
| 5 | Campaign Record + activity reflect client-visible state |

Tagia never picks “Production vs Client” manually — that is Core routing per responsibility map §4.2.

### 9. Issue detection (observations, not decisions)

Squishy **recognizes unusual patterns** from existing Campaign Record, job spine, activity, and exception history — using **deterministic signals only** in V1 (no ML inference).

| Pattern (examples) | Signal source (today) | Squishy output |
|--------------------|----------------------|----------------|
| **Stalled project** | Job spine idle beyond policy windows; blocking materials unchanged | `CoordinatorObservation` — stalled |
| **Repeated client confusion** | Multiple clarification / status interactions in short window | `CoordinatorObservation` — repeated_confusion |
| **Frustrated customer** | Complaint interaction kind; repeated refund or scope requests | `CoordinatorObservation` — elevated_client_tone |
| **Repeated production problems** | Same exception kind or desk reason recurring on one campaign/job | `CoordinatorObservation` — recurring_production_issue |
| **Unusual delay** | Deadline risk + waiting-on-client overlap beyond thresholds | `CoordinatorObservation` — unusual_delay |

**Observation rules:**

| Rule | Detail |
|------|--------|
| Observations are **not decisions** | Squishy records and may surface in owner briefing or internal trace — he does not auto-resolve, auto-escalate, or change production state from an observation alone |
| Observations may **inform** Core | If a locked rule says “third complaint → escalate,” Core evaluates — Squishy does not invent that rule |
| Observations may **suggest** owner glance | Optional low-priority note on Owner Console — never a substitute for a proper folder when judgment is required |
| Client-facing | Confident status copy only — never alarmist or diagnostic language about “patterns detected” |

**Phase 1:** Append-only observation log + deterministic detectors wired to existing timestamps and counters. **No new business thresholds** without Tagia approval — detectors wrap policy constants already in `JOB_CONTROL_POLICY` and exception history where possible.

### 10. Learning candidates (store for review — never auto-apply)

After noteworthy owner decisions or unusual situations, Squishy may append a **LearningCandidate** for future precedent review (feeds Decision Core Phase 3+ — [precedent store](studio-decision-core-foundation-v1-locked.md)).

| Field (conceptual) | Purpose |
|------------------|---------|
| `campaignId` / `jobId` / `exceptionId` | Link to source |
| `situationSummary` | Factual snapshot — what made this unusual |
| `ownerOutcome` | What Tagia chose |
| `occurredAt` | Timestamp |
| `status` | `pending_review` only in V1 |

**Learning candidate rules:**

| Rule | Detail |
|------|--------|
| **Never auto-learn** | Candidates are not precedents, not policy, not applied to future cases in V1 |
| **Never auto-act** | No downstream effect from creating a candidate |
| **Owner-triggered or rule-flagged** | e.g. discretionary refund, scope change, complaint resolution — not every routine approve |
| **Tagia reviews later** | Phase 3+ precedent migration may promote a candidate to `PrecedentRecord` — explicit human step |

Squishy **collects memory for the Studio**; Tagia **decides what becomes precedent**.

---

## Authority boundaries

| Domain | Who decides | Squishy’s authority |
|--------|-------------|---------------------|
| Service recommendations | Recommendation Engine + client | **None** — not in coordinator path pre-purchase except journey CTA |
| Refund eligibility wording | Locked Help Center policy | **Relay** Core determination only |
| Exception resolution | Tagia | **Queue + brief** — never auto-resolve |
| Template text | Config (`communication.ts`) | **Select** template id from Core effect |
| Production spine transitions | Job Control policy | **Execute** Core effects |
| Client-visible milestone copy | Campaign Record `studioNotes` | **Append** via mutator effects |
| Discretionary refund amount | Tagia | **Escalate only** |
| Incoming message classification (clear) | Deterministic rules in Core | **Invoke** evaluator |
| Incoming message (ambiguous) | Tagia (V1 safe default) | **Escalate with confident handoff copy** — no guess |
| Issue detection observations | Tagia (if surfaced) or none | **Record only** — no state change from observation alone |
| Learning candidates | Tagia (future precedent review) | **Append candidate** — never apply |

**Hard rule:** Squishy cannot emit `campaign_record_patch`, `raise_exception`, or `enqueue_communication` without a Core `DecisionOutcome` in V1 — except for pure read/brief operations, **append-only observations**, and **append-only learning candidates** (no side effects).

---

## Relationship to Decision Core

| Question | Answer |
|----------|--------|
| Is Squishy part of Decision Core? | **No** — separate module that **calls** Core |
| Does Squishy duplicate evaluators? | **No** — register/wrap only; parity tests stay in Core |
| Who plans effects? | **Decision Core** |
| Who executes effects? | **Studio Coordinator** → existing mutators |
| Who traces “why”? | **Decision Core** `matchedRules` + coordinator audit log |
| Advisory AI (Phase 4+)? | Core Layer 3 — Squishy may **display** suggestions; never auto-act |

**Call pattern (V1):**

```ts
// Architectural — not implemented until approved
const outcome = evaluateDecision(context);
await studioCoordinator.executeEffects(outcome.effects, { idempotencyKey });
await studioCoordinator.updateDerivedViews(campaignId); // Owner Desk, client journey
```

---

## Relationship to Campaign Record

| Role | Detail |
|------|--------|
| **Read** | Journey milestones, `studioNotes`, materials summary, plan context — for answers and owner briefings |
| **Write** | Only through Core `campaign_record_patch` effects → `studio-board-campaign` mutators |
| **Never** | Duplicate job spine, exceptions, or communication outbox on the record |
| **Client answers** | “Where am I?” → derived from record + job state — complete sentences, no ellipses |

Squishy is the **narrator of state**, not the owner of state.

---

## Relationship to communication templates

| Stage | Owner |
|-------|-------|
| Template definition | `JOB_COMMUNICATION_TEMPLATES` — locked copy, complete sentences |
| Event → template match | Decision Core `communication` domain |
| Enqueue | Job Control `enqueueJobCommunicationRecord` |
| Owner send gate | Outbox `pending_owner_send` (V1) |
| Squishy | Orchestrates enqueue + notifies staff/owner when send needed; **does not** land payment acknowledgments on Tagia’s desk |

**Routine comms off Owner Desk** per [responsibility map §2](owner-console-responsibility-map-v1-planned.md): payment received, 48h/72h reminders, materials received.

---

## Relationship to Production

| Coordinator duty | Production touchpoint |
|------------------|----------------------|
| After owner “Send Back for Revision” | Spine rewind; assigned role notified via existing assignment model |
| After production submits to Review Room | Ensure the client review notice is queued and revision routing remains with Squishy + Decision Core |
| Lane / capacity | Surface `heavy_lane_full` to Owner Desk — do not silently reorder |
| Team Office queues | Staff-assigned exceptions — `PRODUCER_RESOLVABLE_KINDS` never on Owner Desk |

Squishy is the **messenger between Owner outcome and production systems** — not the production scheduler.

---

## Interaction flows

### A. Client interaction (routine)

```
Client action (e.g. materials upload)
        │
        ▼
StudioCoordinator.receiveClientEvent()
        │
        ▼
DecisionContext { domain: customer_interaction, actor: client, ... }
        │
        ▼
evaluateDecision() → determination: respond | notify | no_action
        │
        ├──► effects: append_activity, campaign_record_patch, enqueue_communication
        │
        └──► NO owner folder
        │
        ▼
Client sees updated Studio Board / activity (derived)
```

### B. Client interaction (owner required)

```
Client refund request / scope request / complaint
        │
        ▼
StudioCoordinator.receiveClientEvent()
        │
        ▼
evaluateDecision() → escalate | humanReviewRequired
        │
        ▼
effects: raise_exception (+ optional enqueue_communication after owner decides)
        │
        ▼
Owner folder created → tray (Needs My Decision) → sequential desk
        │
        ▼
Squishy briefing (Phase 2 UI): "This needs your judgment because …"
```

### C. Owner decision completed

```
Tagia chooses business outcome (Approve / Send Back / Ask Client / …)
        │
        ▼
File Room PATCH → StudioCoordinator.receiveOwnerOutcome()
        │
        ▼
DecisionContext { domain: escalation | job_control, actor: owner, ... }
        │
        ▼
evaluateDecision() → effects: route to production | client | waiting | closed
        │
        ▼
executeEffects() — mutators
        │
        ▼
Folder leaves active desk · Recently Handled · Squishy queues client comms if approved
```

### D. System time-based policy (no Squishy “judgment”)

```
Scheduled sync / job communication sync (48h, 72h, 14-day)
        │
        ▼
DecisionContext { domain: communication, actor: system, trigger: communication_sync }
        │
        ▼
evaluateDecision() → enqueue_communication (template)
        │
        ▼
Needs Communication outbox — NOT Owner Desk (unless discretion exception fires)
```

---

## Owner-side behavior (Phase 2 target)

**Today:** Sequential Owner Desk shows folder cards from `owner-console-sequential` + existing PATCH actions.

**With Studio Coordinator (no artwork change):**

| UI zone | Today | With coordinator |
|---------|-------|------------------|
| Greeting | Static copy | Coordinator-generated **briefing line** (deterministic template + facts) |
| Example | “Good morning, Tagia” | “Good morning, Tagia. **Northwind needs Owner support because review has become a scope decision.**” |
| Current folder | Exception/desk card fields | Same card + **Squishy trace summary** (why Owner, from Core `matchedRules`) |
| After decision | `router.refresh()` | Coordinator executes effects + confirms destination in status message |

**Copy rules for briefings:**

- Complete sentences — no ellipses  
- Facts from record + job spine only — no invented urgency  
- If data missing, omit the clause — do not guess  

**Explicitly not Phase 2:** Squishy avatar, desk scene, window, lamp, coffee, animation.

---

## Customer-side behavior (Phase 3 target)

**Entry point:** After payment — Studio Board / Project Details handoff.

| Capability | V1 customer coordinator |
|------------|-------------------------|
| Introduce Squishy as coordinator | One-time orientation copy (config-owned) |
| Answer “where am I?” | Campaign Record + journey derivation |
| Acknowledge uploads / submissions | Existing activity + templates |
| Policy questions | Help Center routing |
| Escalate judgment calls | Owner folder — client sees “The Studio is reviewing” not AI discretion |

**Explicitly not Phase 3:** Chat UI, LLM replies, Discovery involvement, pricing changes.

---

## Phase plan (recommended build order)

### Phase 1 — Brain and responsibilities (Now)

**Goal:** `StudioCoordinator` service with operating model — **no UI changes.**

| Deliverable | Detail |
|-------------|--------|
| `src/studio-coordinator/` module | Types, `receiveClientEvent`, `receiveOwnerOutcome`, `executeEffects`, audit log |
| Core integration | Thin wrapper over `evaluateDecision` + existing mutators |
| Effect executor map | Reuse job-control, exceptions-actions, studio-board-campaign |
| Classification table | Config mapping event types → Core domain (no new rules) |
| **Issue detection** | Deterministic `CoordinatorObservation` detectors + append-only log (no decision side effects) |
| **Learning candidates** | Append-only `LearningCandidate` store after noteworthy owner outcomes (no auto-apply) |
| **Confidence copy** | Config-owned next-step phrases for escalate / wait / handoff (owner + client-safe) |
| Unit tests | Parity: coordinator path === direct mutator path for golden cases |
| Dev trace | Log: received → context → outcome → effects executed → observations → candidates |

**Exit criteria:** Self-test script (`npm run test:studio-coordinator-self-test`) simulates client upload, revision, and owner approve without UI — effects match today.

### Phase 2 — Owner Console integration

**Goal:** Squishy briefings on sequential desk — **still no artwork.**

| Deliverable | Detail |
|-------------|--------|
| Briefing API | `resolveOwnerDeskBriefing(campaignId, itemId)` → string + structured facts |
| Wire `FileRoomOwnerConsoleSequentialDesk` | Greeting line + optional subtitle under folder label |
| Post-decision status | Coordinator confirmation: “Sent to production” / “Waiting on client” |
| Decision Core routing | Owner outcome → Core → effects (close gap in responsibility map §11) |

**Exit criteria:** Tagia can complete one real exception path and see briefing + destination message without page scroll.

### Phase 3 — Customer coordinator

**Goal:** Post-payment Squishy presence on Studio Board / Project Details.

| Deliverable | Detail |
|-------------|--------|
| Customer briefing config | Orientation + status templates |
| `resolveCustomerCoordinatorMessage(campaignId)` | Record-derived status |
| Escalation copy | When owner folder exists — client-safe waiting message |

### Phase 4 — Room, personality, artwork (Deferred)

Window · desk · file cabinet · lamp · coffee · Squishy composite · subtle polish.

**Gate:** Phases 1–3 proven in Studio Self-Test with paying-customer-shaped scenarios.

---

## Module sketch (pre-implementation)

```
src/studio-coordinator/
  index.ts                 # public API
  types.ts                 # CoordinatorEvent, Briefing, AuditEntry, Observation, LearningCandidate
  receive-client-event.ts
  receive-owner-outcome.ts
  execute-effects.ts       # dispatches to existing mutators
  issue-detection.ts       # deterministic pattern detectors → observations
  learning-candidates.ts   # append-only candidate log (no auto-apply)
  briefings/
    owner-desk.ts          # Phase 2
    customer-status.ts     # Phase 3
    confidence.ts          # next-step copy helpers
  audit.ts                 # append-only coordinator log
  studio-coordinator.test.ts
```

**Public API (draft):**

| Function | Purpose |
|----------|---------|
| `coordinateClientEvent(event)` | Classify → Core → execute → return client-safe summary |
| `coordinateOwnerOutcome(outcome)` | Post-decision routing |
| `resolveOwnerDeskBriefing(item)` | Phase 2 UI copy |
| `resolveCustomerStatus(campaignId)` | Phase 3 UI copy |

---

## What is out of scope (all phases until explicitly approved)

| Item | Reason |
|------|--------|
| New business rules | Tagia / locked policy only |
| LLM classification or copy | Dependable first; Core advisory is Phase 4+ |
| Artwork, room scene, animations | Job before office |
| Replacing Decision Core evaluators | Orchestrate only |
| Real-time chat | Interaction model is event-based |
| Discovery / Recommendation wiring | Journey build order |
| Auto-send email/SMS | Outbox + owner send remains |
| **Auto-applying learning candidates as precedents** | Phase 3+ requires Tagia review; V1 store only |
| **ML-based issue detection** | Deterministic signals only in V1 |

---

## V1 success criteria (Phase 1 + 2)

1. **Parity** — Coordinator path produces identical store state as today’s direct actions for golden paths.
2. **No new discretion** — Squishy never resolves owner exceptions without Tagia.
3. **Routine off desk** — Payment, reminders, materials ack do not create Owner folders.
4. **Trace** — Every coordination step logged with Core `matchedRules` reference.
5. **Briefing** — Owner sees one factual sentence explaining why the folder is on her desk.
6. **Destination clarity** — After owner acts, system states where the folder went (responsibility map §5.3).
7. **No regression** — Owner Console sequential desk behavior unchanged except added briefing copy.
8. **No artwork** — Zero dependency on illustration pipeline.

---

## Approval gate

| Step | Owner | Status |
|------|-------|--------|
| 1. Review this planning doc | Tagia | ✅ Approved 2026-07-06 |
| 2. Approve Phase 1 implementation | Tagia | ✅ Approved 2026-07-06 |
| 3. Pause Owner Console artwork polish | Tagia | ✅ Implied by this direction |
| 4. Phase 1 implementation | Engineering | ✅ `src/studio-coordinator/` |
| 5. Phase 2 Owner Console wiring | Engineering | ✅ Briefings on sequential desk |
| 6. Lock document → `studio-coordinator-v1-locked.md` | Tagia | After Phase 1–2 proven in use |

**Change policy:** Do not modify coordinator philosophy, authority boundaries, or phase order without Tagia approval.

---

## Appendix A — Squishy vs adjacent names

| Name | Meaning |
|------|---------|
| **Squishy** | Customer-facing coordinator persona |
| **Studio Coordinator** | Module / service name |
| **Decision Core** | Rule evaluation + effect planning |
| **Owner Desk / Owner Console** | Tagia’s judgment surface |
| **Job Control** | Production spine + templates + outbox |
| **Campaign Record** | Client journey memory |
| **CoordinatorObservation** | Issue-detection flag — pattern noticed, not a decision |
| **LearningCandidate** | Noteworthy outcome stored for future precedent review — not applied in V1 |

---

## Appendix B — Code inventory (orchestrate, do not duplicate)

| Module | Coordinator uses it for |
|--------|-------------------------|
| `src/decision-core/` | `evaluateDecision`, effect types |
| `src/lib/job-control/communication.ts` | Templates + enqueue |
| `src/lib/job-control/owner-desk.ts` | Desk item derivation |
| `src/lib/campaign-tasks/owner-console-sequential.ts` | Sequential queue + trays |
| `src/lib/campaign-tasks/exceptions-actions.ts` | Exception lifecycle |
| `src/lib/studio-board-campaign.ts` | Campaign Record patches |
| `src/lib/campaign-store/` | Server persistence |
| `src/config/owner-console.ts` | Copy strings for desk |
| `src/config/job-control.ts` | Policy constants |
| `src/config/campaign-exceptions.ts` | Owner-held kinds |

---

*Phase 1 implemented 2026-07-06. Build the job before the office.*
