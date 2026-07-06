# Studio Decision Core — Foundation (V1 Locked)

**Status:** Locked — foundational architecture approved by Tagia effective 2026-07-06.  
**Implementation motto:** *Use the Decision Core to orchestrate existing systems, not replace them.* Before any change, ask: **“Can I accomplish this by orchestrating existing code instead of moving or rewriting it?”**  
**Approved scope:** Phase 1–2 implemented in `src/decision-core/`. Phase 3+ requires Studio Self-Test findings.  
**Code reference:** `src/decision-core/`  
**Purpose:** Unify how The Studio applies owner-defined rules across Discovery, production, customer conversations, and escalations — without duplicating logic or forking business rules.  
**Philosophy (unchanged):** **The owner defines the rules. The Studio consistently applies those rules.**

**Related docs:** [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) · [Recommendation Engine Philosophy](recommendation-engine-philosophy-v1-locked.md) · [Help Center V1](help-center-v1-locked.md) · [Customer Journey V1](customer-journey-v1-locked.md) · [Discovery decision matrix](discovery-decision-matrix.md)  
**Related prototypes (today):** `src/lib/decision-learner/` · `src/recommendation/` · `src/lib/job-control/` · `src/lib/campaign-tasks/`

**Last updated:** 2026-07-06  
**Supersedes:** `docs/studio-decision-core-foundation-v1-planned.md`

---

## Why this document exists

The Studio already contains **multiple decision systems** built at different times:

| System | Role today |
|--------|------------|
| **Recommendation Engine** | Deterministic Discovery → service recommendations |
| **Job Control** | Deterministic job spine, reminders, communication templates, Owner Desk items |
| **Campaign Exceptions** | Deterministic escalation routing → Owner Console |
| **Help Center policies** | Locked customer-facing refund / production rules |
| **Decision Learner** | Research prototype — policy + precedent + LLM advisory (isolated) |

These were not designed as one module, but they **share the same philosophy**. Customer conversations, communication, and Owner Desk escalations are now understood as **inputs and outputs of rule evaluation** — not separate ad-hoc features.

This document defines the **Decision Core** — the architectural layer that coordinates rule evaluation, precedents, advisory suggestions, and downstream effects (record updates, communication, escalations). It does **not** replace working code on approval; it defines how V1 should be built so future work does not fork business logic.

---

## Executive summary

The Decision Core is a **coordination architecture**, not a single LLM prompt.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DECISION CORE                                 │
│  Receives: DecisionContext (domain, facts, signals, actor)           │
│  Returns:  DecisionOutcome (determination, effects, trace, warnings)   │
├──────────────────────────────────────────────────────────────────────┤
│  Layer 1 — Rule Evaluators (deterministic, authoritative)            │
│  Layer 2 — Precedent Store (owner cases, searchable, auditable)      │
│  Layer 3 — Advisory (LLM suggestions — never overrides Layer 1)        │
├──────────────────────────────────────────────────────────────────────┤
│  Effects (downstream, idempotent):                                   │
│    · Campaign Record fields / studioNotes                              │
│    · ServerTasksEnvelope (jobs, exceptions, communications, activity)  │
│    · Owner Desk / Owner Console queue items (derived views)          │
│    · Outgoing: customer communication outbox (pending owner send)    │
│    · Incoming: classified customer interaction → respond or escalate │
└──────────────────────────────────────────────────────────────────────┘
```

**Golden rules:**

1. **Frozen business rules stay deterministic.** Discovery scoring, refund eligibility windows, revision limits, production triggers, and escalation kinds do not move into free-text policy or LLM judgment.
2. **Customer conversations are bidirectional.** Incoming customer messages and actions are `DecisionContext` events — same as outgoing notices. The Core classifies, applies rules, and plans effects. This is **not** a chat product; it is an interaction model.
3. **Outgoing communication is an effect, not a decision.** The Core decides *whether* and *what kind* of notice applies; templates render the message; the outbox holds it until the owner sends.
4. **Owner Desk receives escalations from rule evaluation + workflow state** — not from AI inference.
5. **Advisory AI explains and suggests** on ambiguous discretionary cases; it never silently changes production state.
6. **One precedent library** (Phase 3+, post Self-Test) grows from owner confirmations — evolved from Decision Learner, Studio-scoped.

---

## Approved V1 scope

| Phase | Status | Scope |
|-------|--------|-------|
| **Phase 0** | Approved | This blueprint |
| **Phase 1** | Approved for implementation | Core shell, Discovery + communication/interaction event registration, parity tests |
| **Phase 2** | Approved for implementation | Escalation, refund, production-trigger registration, parity tests, dev trace |
| **Studio Self-Test** | Required gate after Phase 2 | Validate operational readiness before expanding scope |
| **Phase 3** | **Not approved yet** | Precedent store migration — enter only if Self-Test shows precedents improve consistency |
| **Phase 4+** | Deferred | Advisory wiring, Discovery Mapping, live messaging |

---

## Decision Core responsibilities

The Decision Core **owns the contract** between “something happened” and “what The Studio does next.” It does **not** own UI rendering, file storage, or payment processing.

### In scope

| Responsibility | Description |
|----------------|-------------|
| **Domain routing** | Route a `DecisionContext` to the correct evaluator(s) — Discovery, job-control, customer interaction, refund, escalation, scope, etc. |
| **Rule evaluation** | Run deterministic evaluators against structured inputs; produce traceable matched rules (like catalog `discoveryMapping` or `JOB_CONTROL_POLICY`). |
| **Interaction classification** | Classify incoming customer messages and actions into typed interaction kinds before applying rules. |
| **Outcome assembly** | Merge evaluator results into a single `DecisionOutcome`: primary determination, warnings, human-review flags, and **effect list**. |
| **Precedent lookup** | Retrieve similar past owner decisions (Phase 3+; optional input to advisory). |
| **Advisory invocation** | When domain policy allows (Phase 4+), request an LLM suggestion with citations — clearly labeled non-authoritative. |
| **Effect planning** | Declare intended side effects (record patch, communication enqueue, exception raise) without executing them inline in UI. |
| **Audit trace** | Every outcome carries *why*: matched rule ids, policy refs, case ids, or explicit “no rule matched — human required.” |
| **Idempotency guidance** | Effects must be safe to retry (communication keys, activity event ids, exception de-duplication). |

### Out of scope

| Not Decision Core | Owned by |
|-------------------|----------|
| Page layout, room copy, customer journey names | Config + UI components |
| Catalog service definitions, pricing amounts | Service Catalog (`src/catalog/`) |
| Rendering Project Summary / Discovery Summary copy | Discovery Summary Model |
| Auth, File Room sessions, campaign file I/O | Campaign store / proxy |
| Real-time chat UI or messaging transport | Future product surface (V1: structured events via existing rooms/APIs) |
| Actual email/SMS delivery | Future messaging integration (V1: in-app outbox + test-send) |
| Owner clicking Approve / Resolve / Test-send | File Room actions (consume Core outcomes later) |

---

## Layer 1 — What remains deterministic

These domains **must** remain rule-based evaluators. They may be *registered* with the Decision Core but **must not** be replaced by LLM inference while business rules are frozen.

### Discovery & pre-purchase

| Domain | Authoritative source today | Decision Core V1 role |
|--------|---------------------------|------------------------|
| Service recommendations | `src/recommendation/engine.ts` + catalog `discoveryMapping` | **Register** `evaluateDiscovery()` — wrap existing engine; do not rewrite |
| Production allocation limits | `src/catalog/production-allocation.ts` | Pass-through guardrail on recommendation output |
| Low-confidence / requires approval | `requiresApproval` in `RecommendationResult` | Surface as `humanReviewRequired` effect |
| Bundle shortcuts (Spark / Momentum / Growth) | Locked bundles doc | Deterministic optional layer on top of service list |
| Pricing display guardrails | Catalog pricing fields (quoted vs fixed) | Future `evaluatePricingGuardrails()` — structured rules only |

**Locked principle preserved:** [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) — engine recommends; client decides. The Core does not force purchase.

### Production & job spine

| Domain | Authoritative source today | Decision Core V1 role |
|--------|---------------------------|------------------------|
| Job spine transitions | `src/lib/job-control/` mutators | Register `evaluateJobTransition()` |
| Waiting-on-client windows | `JOB_CONTROL_POLICY` (48h reminder, 72h tray, 14-day refund eligibility) | Register `evaluateWaitingOnClient()` |
| Production trigger (4 conditions) | [Help Center V1 — production trigger](help-center-v1-locked.md) | Register `evaluateProductionTrigger()` per job |
| Non-refundable transition | Job `productionStartedAt` + policy | Deterministic effect on job record |
| Owner approval gates | `ownerApprovalPending`, spine status | Feeds Owner Desk deterministically |
| Lane capacity | `OWNER_CONTROL_ROOM_SECTION.laneCapacity` | `heavy_lane_full` desk item |

### Escalation & workflow blocking

| Domain | Authoritative source today | Decision Core V1 role |
|--------|---------------------------|------------------------|
| Exception kinds | `CampaignExceptionKind` in `exceptions-types.ts` | Register `evaluateEscalation()` |
| Owner-held kinds | `OWNER_HELD_EXCEPTION_KINDS` in `campaign-exceptions.ts` | Determines `waiting_owner` routing |
| QA block → exception bridge | `bridgeExceptionFromQaBlock`, `bridgeExceptionFromRevisionExhausted` | Rule-triggered effects |
| Workflow transition guards | `canTransitionWorkflow` in `transitions.ts` | Deterministic deny/allow with reasons |
| Client-material promotion | `PROMOTABLE_EXCEPTION_KINDS` | Owner approval before client-facing wording |

### Refund & policy

| Domain | Authoritative source today | Decision Core V1 role |
|--------|---------------------------|------------------------|
| Refund eligibility copy | `src/config/help-center.ts`, `src/config/policies.ts` | Register `evaluateRefundEligibility()` — **“may be eligible”** wording preserved |
| Refund communication event | `refund_eligibility_14_day` template | Effect when deterministic window met |
| Refund issued | `refund_issued` template + job spine `refunded_cancelled` | Terminal deterministic path |

### Revision & scope

| Domain | Authoritative source today | Decision Core V1 role |
|--------|---------------------------|------------------------|
| Revision round limits | Campaign + job revision counters | Deterministic gate; exhaustion → `revision_exhausted` |
| Scope change | `scope_change` exception kind | Owner-held escalation |
| Direction disagreement | `direction_disagreement` | Owner-held escalation |

### Communication & interaction events

| Domain | Authoritative source today | Decision Core V1 role |
|--------|---------------------------|------------------------|
| **Outgoing** — which notice fires | `syncJobCommunicationRecords()` + `JOB_COMMUNICATION_TEMPLATES` | Register `evaluateOutgoingCommunicationEvents()` |
| **Incoming** — customer message/action classification | Review Room, materials upload, Help Center routes, future message intake | Register `evaluateIncomingCustomerInteraction()` |
| Message body (outgoing) | Template functions in `communication.ts` | **Not** LLM-generated in V1 |
| Delivery gating (outgoing) | `pending_owner_send` default | Owner must send (test-send today) |
| Response routing (incoming) | Rules per interaction kind | Auto-respond, queue for staff, or escalate to Owner Desk |

**Naming note:** “Communication & interaction events” replaces “communication triggers” throughout this architecture. *Trigger* implied one-way Studio → customer. *Interaction* covers customer → Studio → customer.

---

## Layer 2 — Where precedents fit

**Phase 3+ only** — not in approved V1 scope. Documented here so Phase 1–2 do not block the migration path.

Precedents are **owner-confirmed decisions on situations** that are too contextual for a boolean rule but should stay **consistent over time**.

### Evolved from Decision Learner

The research prototype (`src/lib/decision-learner/`) established a proven pattern:

| Concept | Prototype field | Decision Core field |
|---------|-----------------|---------------------|
| Situation | `DecisionCase.situation` | `PrecedentRecord.contextSummary` + structured `facts` |
| Decision | `DecisionCase.decision` | `PrecedentRecord.outcome` |
| Rationale | `DecisionCase.rationale` | `PrecedentRecord.rationale` |
| Source | `manual` / `feedback-correct` / `feedback-correction` | Same taxonomy + `exception_resolution` / `refund_decision` (Phase 3+) |
| Domain | *(implicit — generic retail seed)* | **Required** `PrecedentDomain` tag |

### Precedent domains (Phase 3+ planned)

| `PrecedentDomain` | Example situations | Used by |
|-------------------|-------------------|---------|
| `refund_discretion` | Partial refund request with ambiguous evidence | Owner Console, refund evaluator |
| `scope_discretion` | Client asks for deliverable outside plan | Scope / exception advisory |
| `communication_tone` | How to phrase a sensitive delay notice | Advisory only — template still deterministic |
| `discovery_edge_case` | Tie scores, unusual brief combinations | Human review briefing |
| `escalation_judgment` | Whether to hold vs approve client-material promotion | Owner Console suggestion |
| `incoming_interaction_discretion` | Ambiguous customer message needing consistent handling | Incoming interaction advisory |

### Precedent rules

1. **Precedents do not override Layer 1** unless Tagia approves an explicit “precedent override” business rule for a domain (none approved).
2. **Precedents are searchable** by domain + similarity (structured facts first; text similarity second).
3. **New precedents enter via owner feedback** — same loop as Decision Learner `addFeedbackToPrediction`, extended to exception resolutions and refund decisions.
4. **Retail seed data is retired** — Studio-specific precedents replace `scripts/decision-learner-seed.json` when Phase 3 begins (post Self-Test).
5. **Precedents are auditable** — who confirmed, when, linked campaign/job if applicable.

### Storage (architectural intent)

| Phase 3 | Future |
|---------|--------|
| File-backed or campaign-store-adjacent JSON (same pattern as early Decision Learner / campaign store) | Queryable store with versioning |
| Separate from `CampaignRecord` | Linked by reference ids |

---

## Layer 3 — Where advisory AI fits

**Phase 4+ only** — not in approved V1 scope. Advisory remains **disabled by default** until explicitly enabled per domain.

Advisory AI is **Layer 3 only** — evolved from `predictDecision()` / `buildPredictionPrompt()`.

### When advisory runs

| Condition | Advisory |
|-----------|----------|
| Deterministic evaluator returns `determined` with full trace | **Skip** — no LLM cost |
| Evaluator returns `humanReviewRequired` | **Optional** — brief owner with suggestion + citations |
| Evaluator returns `ambiguous` (new outcome class) | **Run** — suggest decision + cite precedents + cite policy |
| Customer-facing copy generation | **Not in V1** — templates remain config-owned |
| Discovery service ranking | **Never** — violates traceability lock |
| Incoming message classification (clear type) | **Skip** — rules handle it |
| Incoming message classification (ambiguous) | **Optional** — suggest type + routing (Phase 4+) |

### Advisory output shape (contract)

```ts
// Architectural types only — not implemented in this doc
type AdvisorySuggestion = {
  suggestedOutcome: string;
  rationale: string;
  citations: string[];       // rule ids, precedent ids, policy excerpts
  confidence: "low" | "medium" | "high";
  authoritative: false;      // always false
};
```

### Hard boundaries

| Advisory may | Advisory may not |
|--------------|------------------|
| Suggest an owner action | Auto-approve exceptions |
| Cite precedents and policy | Change `CampaignRecord` or job spine |
| Suggest interaction classification | Enqueue customer communication without owner send |
| Power Owner Console “suggested next action” | Override `requiresApproval` or refund eligibility rules |

---

## Customer conversations (bidirectional)

Customer conversation is a **first-class architectural concern** — not an afterthought on top of outgoing templates.

**This is not a chat product.** The Studio does not need a real-time messaging UI for this architecture to be correct. What matters is that **every way a customer reaches the Studio** produces a typed `DecisionContext`, and **every Studio response** is a planned effect.

### Two directions

| Direction | What happens | V1 examples (existing surfaces) |
|-----------|--------------|--------------------------------|
| **Studio → Customer** | Rule evaluation → template → outbox → owner send → client-visible activity | Payment received notice, materials reminder, ready for review |
| **Customer → Studio** | Customer action or message → classification → rule evaluation → respond or escalate | Revision request in Review Room, file upload, delivery approval, Help Center policy question |

### Incoming customer interaction flow

```
Customer message or action
        │
        ▼
Decision Core: evaluateIncomingCustomerInteraction()
        │  classify interaction kind (deterministic rules first)
        ▼
Interaction kind (examples):
        · project_question
        · clarification_request
        · status_inquiry
        · missing_file_upload
        · revision_message
        · payment_question
        · scope_request
        · refund_request
        · complaint
        · general_inquiry
        ▼
Apply rules for that kind
        │
        ├──► Auto-response effect (template / Help Center link / status snapshot)
        │
        ├──► Staff queue (routine — no owner hold)
        │
        └──► Owner Desk / Owner Console escalation
        │
        ▼
Optional outgoing effect (Studio → Customer response)
        │  same outbox pipeline — owner send when required
        ▼
Append jobActivityEvent (audit) + update derived client visibility
```

### Interaction kind → typical outcome

| Interaction kind | Typical rule outcome | Escalate? |
|------------------|---------------------|-----------|
| `status_inquiry` | Auto-response from job/campaign state | No |
| `project_question` | Route to staff or Help Center if pre-production | Usually no |
| `clarification_request` | Staff response; may link to materials | If blocking production |
| `missing_file_upload` | Materials ledger update + confirmation effect | No |
| `revision_message` | Existing revision flow (`client_revision_request`) | If revision limit reached |
| `payment_question` | Help Center policy + status snapshot | If dispute |
| `scope_request` | Scope evaluator; may raise `scope_change` | Yes — owner-held |
| `refund_request` | Refund eligibility evaluator | Often yes — owner discretion |
| `complaint` | Owner Console or staff per severity rules | Often yes |
| `general_inquiry` | Help Center routing or staff queue | Case by case |

### What “respond” means in V1

| Response type | Mechanism |
|---------------|-----------|
| **Structured state answer** | Derived from `CampaignRecord` + job spine — no new copy invention |
| **Policy answer** | Help Center anchor / locked policy text |
| **Template reply** | Outgoing communication event (owner send) |
| **Workflow action** | Existing mutator (e.g. accept revision, accept upload) |
| **Human queue** | Staff assignment or Owner Desk item — no auto-send |

---

## Customer events & communication pipelines

### Event sources (inputs to the Core)

#### System & workflow events

| Event source | Store | Examples |
|--------------|-------|----------|
| **Campaign journey mutators** | `CampaignRecord` | payment received, project details submitted |
| **Job spine mutators** | `ServerTasksEnvelope.jobRecords` | production started, ready for review |
| **Materials ledger** | materials API + `materialsSummary` on record | blocking count cleared, promotion approved |
| **Exception lifecycle** | `exceptionRecords` + `exceptionEvents` | client request approved, promotion to materials |
| **Time-based policy** | `syncJobCommunicationRecords` with `nowMs` | 48h reminder, 72h waiting tray, 14-day refund notice |

#### Incoming customer events

These become `DecisionContext` events with `actor: client`:

| Incoming event | Typical surface today | Interaction kind |
|----------------|----------------------|------------------|
| `project_question` | Project Details, Studio Board | `project_question` |
| `clarification_request` | Materials prompt, email intake (future) | `clarification_request` |
| `status_inquiry` | Studio Board, Help Center FAQ | `status_inquiry` |
| `missing_file_upload` | Project Details / materials upload | `missing_file_upload` |
| `revision_message` | Review Room feedback | `revision_message` |
| `revision_request` | Review Room formal revision | `revision_message` |
| `delivery_approval` | Final Delivery / Review Room | workflow event (not a message) |
| `payment_question` | Help Center, Secure Checkout context | `payment_question` |
| `scope_request` | Review Room, Studio Board message | `scope_request` |
| `refund_request` | Help Center policy path | `refund_request` |
| `complaint` | Any intake surface | `complaint` |
| `support_request` | Help Center | `general_inquiry` |
| `general_inquiry` | Help Center, catch-all | `general_inquiry` |

**Architectural rule:** If a customer can do it in a customer-facing room, the Core must be able to classify it — even when V1 implements only the surfaces that exist today.

### Internal event ledger

Two append-only ledgers exist today and remain authoritative:

| Ledger | Purpose | Immutable |
|--------|---------|-----------|
| **`jobActivityEvents`** | Full audit trail per job — status changes, client actions, communication | Yes — deduped by id |
| **`exceptionEvents`** | Exception raised / assigned / resolved / promotion decisions | Yes — append-only |

Activity kinds include `client_communication`, `client_revision_request`, `client_response`, `client_upload`, etc. (`JobActivityEventKind` in `src/lib/job-control/types.ts`).

### Outgoing communication pipeline

```
Communication & interaction event (state change or time policy)
        │
        ▼
Decision Core: evaluateOutgoingCommunicationEvents()
        │  matched template + idempotency key
        ▼
Effect: enqueueJobCommunicationRecord()
        │  creates JobCommunicationRecord (outbox)
        │  appends jobActivityEvent (kind: client_communication)
        ▼
Owner Control Room: Needs Communication queue
        │  deliveryStatus: pending_owner_send
        ▼
Owner action: test-send (V1) / live send (future)
        │  deliveryStatus: test_sent | sent
        ▼
Client visibility:
        · Activity feed / Studio Board updates (derived)
        · studioNotes on CampaignRecord (milestone copy)
        · In-app notification surface (future)
```

### Outgoing communication event rules (deterministic)

| `JobCommunicationEventType` | Typical event |
|-----------------------------|---------------|
| `payment_received` | `campaign.paymentReceivedAt` set |
| `intake_incomplete_materials_needed` | Job intake incomplete or blocking materials |
| `reminder_48_hour` | No client response after `JOB_CONTROL_POLICY.reminderDueHours` |
| `waiting_on_client_72_hour` | Move to `waiting_on_client` spine after 72h |
| `materials_received_returned_to_queue` | Client materials accepted; job leaves waiting |
| `production_started` | Production begins — links to non-refundable policy |
| `ready_for_review` | Job reaches client review gate |
| `revision_requested` / `revision_ready_again` | Client revision cycle |
| `approved_for_delivery` / `final_delivery_available` | Delivery path |
| `refund_eligibility_14_day` | No response 14 days, production not started |
| `refund_issued` | Refund processed — job closed |

**Templates** live in `JOB_COMMUNICATION_TEMPLATES` — complete sentences, config-owned. Decision Core selects the template; it does not invent copy in V1.

### Communication vs escalation vs conversation

| | Outgoing communication | Incoming interaction | Escalation |
|---|------------------------|---------------------|------------|
| **Direction** | Studio → Customer | Customer → Studio | Internal |
| **Queue** | Needs Communication | Staff / auto-response rules | Owner Desk / Owner Console |
| **Blocks work?** | No | Depends on kind | Yes — when `workflowBlockedReason` set |
| **Decision owner** | Template + event rules | Classification + interaction rules | Exception kind + owner-held rules |

Some paths produce **multiple effects** — e.g. customer `revision_message` when revision limit reached: workflow block, Owner Desk item, activity audit; outgoing client notice only after owner decides.

---

## Campaign Record updates

`CampaignRecord` (`src/config/studio-board.ts`) is the **customer-journey source of truth** for what the client sees on Studio Board / Project Record.

### What belongs on Campaign Record

| Field category | Examples | Updated when |
|----------------|----------|--------------|
| **Journey milestones** | `paymentReceivedAt`, `projectDetailsSubmittedAt`, `discoverySubmittedAt` | Client completes step or owner QA seed |
| **Plan / package** | `approvedStudioPlan`, `packageId`, `routeMapContext` | Discovery / checkout / plan approval |
| **Campaign status** | `campaignStatus` | Production milestones (building, review, delivered) |
| **Client-visible notes** | `studioNotes[]` | Milestone messages — complete sentences |
| **Denormalized summaries** | `materialsSummary` | Materials ledger changes (blocking counts) |
| **Creative / delivery** | `concepts`, `selectedCampaignOption` | Production outputs |

### What does **not** belong on Campaign Record

| Belongs on `ServerTasksEnvelope` | Why |
|----------------------------------|-----|
| `jobRecords`, `jobCommunicationRecords` | Per-job production spine |
| `exceptionRecords`, `exceptionEvents` | Internal escalation |
| `jobActivityEvents` | Immutable audit |
| Task workflow states | Team Office / production |
| Raw incoming customer message text (future) | Interaction record on tasks envelope or dedicated interaction log |

### Update contract (Decision Core effects)

When the Core emits a `CampaignRecordPatch` effect:

1. **Mutator applies patch** — existing functions in `src/lib/studio-board-campaign.ts` remain the implementation surface in V1; Core plans the patch.
2. **Dual-write** — client localStorage + `upsertCampaignRecord` server sync (existing pattern).
3. **`updatedAt` always advances** on meaningful change.
4. **`studioNotes` are append-only** — customer-facing; complete sentences; no ellipses.
5. **Activity feed is derived** — `resolveActivityFeed()` reads milestones + studioNotes; do not duplicate messages in multiple shapes without reason.

### Denormalization rules

| Summary field | Source of truth | Rule |
|---------------|-----------------|------|
| `materialsSummary.blockingRequiredCount` | Materials ledger | Updated when materials change — Slice 2c pattern |
| Journey step labels on Studio Board | `resolveCustomerJourneySteps()` | Derived from record fields — not independently edited |

---

## Owner Desk & escalations

Two complementary surfaces exist today. The Decision Core **feeds both from the same evaluation results** — they are views, not separate decision systems.

### Owner Console — exception decisions

| Attribute | Detail |
|-----------|--------|
| **Route** | `/file-room/owner-console` |
| **Primary input** | `CampaignExceptionRecord` with `waiting_owner` / owner-held kinds |
| **Card fields** | What happened, why Owner, recommended next action, impact, available actions |
| **Actions** | Approve, hold, decline, resolve, assign (File Room actions) |
| **Code** | `owner-console-view.ts`, `exceptions-actions.ts`, `FileRoomOwnerDecisionCard` |

**Escalation entry points (deterministic bridges):**

| Trigger | Exception kind | Owner-held? |
|---------|----------------|-------------|
| QA compliance block | `compliance_hold` | Yes |
| QA direction disagreement | `direction_disagreement` | Yes |
| Revision rounds exhausted | `revision_exhausted` | Yes |
| Scope change raised | `scope_change` | Yes |
| Client-material promotion | `client_request`, `missing_client_fact` | Promotion requires owner approve/decline |
| Deadline risk / commitment | `deadline_risk`, `deadline_commitment` | Yes |
| Incoming: `refund_request` / `complaint` (per rules) | May raise or link to existing exception | Per evaluator |

### Owner Desk — job-level production decisions

| Attribute | Detail |
|-----------|--------|
| **Surface** | Owner Control Room (`OWNER_CONTROL_ROOM_SECTION.ownerDeskTitle`) |
| **Primary input** | `PurchasedJobRecord` gates + open exceptions + lane capacity |
| **Reasons** | `OwnerDeskReason` — approval gates, scope, revision limit, lane full, etc. |
| **Code** | `resolveOwnerDeskItems()` in `owner-desk.ts` |

**Exception kind → desk reason mapping** (existing):

| Exception kind | Desk reason |
|----------------|-------------|
| `scope_change` | `scope_issue` |
| `deadline_commitment` | `deadline_exception` |
| `deadline_risk` | `at_risk_job` |
| `revision_exhausted` | `revision_limit_reached` |

### Escalation flow (target architecture)

```
Workflow or incoming customer event
        │
        ▼
Decision Core: evaluateEscalation() and/or evaluateIncomingCustomerInteraction()
        │  determination: raise | update | no_action | respond
        ▼
Effect: buildExceptionRecord() + append exceptionEvent (when escalating)
        │  de-duplicate open exceptions (existing bridges)
        ▼
Derived views (no new state):
        · Owner Console waiting queue
        · Owner Desk items (resolveOwnerDeskItems)
        · workflowBlockedReason on linked task
        ▼
Optional: Advisory suggestion (Phase 4+)
        ▼
Owner acts → new DecisionContext → further effects
        (communication enqueue, record patch, task unblock)
```

### QA cannot override owner escalation

Existing guard: QA actors may not pass compliance or `owner_escalation` blocks (`transitions.ts`, `qa.ts`). Decision Core V1 **preserves** this — not negotiable via advisory.

---

## Data stores & boundaries

| Store | Path / type | Decision Core relationship |
|-------|-------------|---------------------------|
| **CampaignRecord** | Client + `data/campaigns/` envelope | Patch effects — journey + client-visible |
| **ServerTasksEnvelope** | `data/campaigns/{id}/tasks.json` (pattern) | Job, exception, communication, activity effects |
| **Service Catalog** | `src/catalog/` | Read-only rule source for Discovery / pricing |
| **Policy config** | `help-center.ts`, `policies.ts`, `job-control.ts`, `campaign-exceptions.ts` | Read-only rule source |
| **Precedent store** | Phase 3+ — evolved from `data/decision-learner.json` | Not in V1 scope |
| **Decision Learner store** | `data/decision-learner.json` | **Remains isolated** until Phase 3 |

**Single-writer principle per effect type:** One mutator path per store field to avoid sync conflicts.

---

## Decision context & outcome (architectural contract)

Types are **specification only** — not implemented until V1 coding begins.

### `DecisionContext`

| Field | Purpose |
|-------|---------|
| `domain` | `discovery` \| `job_control` \| `communication` \| `customer_interaction` \| `escalation` \| `refund` \| `scope` \| `revision` |
| `campaignId` | Campaign scope |
| `jobId` | Optional per-job scope |
| `actor` | `client` \| `staff` \| `owner` \| `system` |
| `trigger` | What happened — enum + payload (includes incoming customer event types) |
| `interactionKind` | When `domain` is `customer_interaction` — classified kind (see Customer conversations) |
| `facts` | Structured snapshot — brief, job spine, materials counts, exception state, message summary |
| `occurredAt` | ISO timestamp |

### `DecisionOutcome`

| Field | Purpose |
|-------|---------|
| `determination` | `allow` \| `deny` \| `defer` \| `escalate` \| `notify` \| `respond` \| `no_action` |
| `matchedRules` | Rule ids + matched values (traceability) |
| `humanReviewRequired` | Boolean — surfaces in UI banners |
| `advisory` | Optional `AdvisorySuggestion` (Phase 4+) |
| `effects` | Ordered list of planned side effects |
| `warnings` | Non-blocking issues |

### Effect types (V1)

| Effect | Target |
|--------|--------|
| `campaign_record_patch` | `CampaignRecord` partial update |
| `job_record_patch` | `PurchasedJobRecord` |
| `enqueue_communication` | `JobCommunicationRecord` (outgoing) |
| `append_activity_event` | `jobActivityEvents` |
| `raise_exception` | `CampaignExceptionRecord` |
| `resolve_exception` | Status transition + event |
| `task_workflow_block` | `workflowBlockedReason` on task |
| `record_incoming_interaction` | Interaction log entry (Phase 2+ when surface exists) |

Effects are **planned by Core, executed by existing mutators** in V1 — thin orchestration first, not a rewrite.

---

## Relationship to existing code (do not duplicate)

| Existing module | Role when Core V1 ships |
|-----------------|-------------------------|
| `src/recommendation/engine.ts` | Discovery evaluator — register, don’t replace |
| `src/lib/job-control/communication.ts` | Outgoing communication effect executor + templates |
| `src/lib/job-control/review-room-actions.ts` | Incoming revision interaction — register, don’t replace |
| `src/lib/job-control/owner-desk.ts` | Desk view — fed by evaluation results |
| `src/lib/campaign-tasks/exceptions-actions.ts` | Exception effect executor |
| `src/lib/decision-learner/` | Stays isolated until Phase 3 |
| `src/lib/studio-board-campaign.ts` | CampaignRecord mutators |
| `src/lib/campaign-store/` | Server persistence |

---

## Future integration points

Phased after blueprint approval. **Approved for implementation: Phase 1–2 only.**

### Phase 0 — Blueprint approval ✅

- This document revised for bidirectional customer conversations.
- Tagia approves Phase 1–2 for implementation.

### Phase 1 — Decision Core V1 shell (approved)

- `src/decision-core/` module with types, registry, orchestrator.
- Register `evaluateDiscovery` → existing `recommendFromDiscovery`.
- Register `evaluateOutgoingCommunicationEvents` → existing `syncJobCommunicationRecords` logic extracted.
- Register `evaluateIncomingCustomerInteraction` → classify existing client actions (revision, upload, delivery approval) with parity to current behavior.
- Unit tests: same inputs → same outputs as today (parity tests).

### Phase 2 — Escalation & refund registration (approved)

- Register `evaluateEscalation`, `evaluateRefundEligibility`, `evaluateProductionTrigger`.
- Wire incoming interaction kinds that escalate (`scope_request`, `refund_request`, `complaint`) to existing exception bridges.
- Parity tests against Owner Desk and Help Center policy cases.
- Unified `DecisionOutcome` trace in dev logs.

### Studio Self-Test gate (required before Phase 3)

- Run Studio Self-Test after Phase 2.
- Document where rule evaluation is sufficient vs where owner consistency breaks down.
- **Phase 3 enters only if Self-Test shows precedents would improve operational consistency.**

### Phase 3 — Precedent store migration (not approved)

- Migrate Decision Learner case model → `PrecedentRecord` with domains.
- Replace retail seed with Studio seed precedents.
- Owner feedback from exception resolution → new precedents.

### Phase 4 — Advisory wiring (deferred)

- Owner Console “recommended next action” reads advisory — owner still clicks to act.
- Decision Learner UI becomes **Owner Policy Lab** — training surface for precedents.
- No customer-facing AI copy.

### Phase 5 — Discovery Mapping (when unpaused)

- [Discovery Mapping](discovery-mapping-v1-planned.md) wires **after** journey verification.
- Core orchestrates Discovery evaluator; does not change locked philosophy.

### Phase 6 — Messaging & automation (future)

- Live email/in-app delivery replaces test-send.
- Scheduled interaction events — call Core with `trigger: scheduled_tick`.
- Automation may **execute deterministic effects** only; discretionary paths still owner-held.

### Explicitly deferred

| Item | Reason |
|------|--------|
| Real-time chat UI | Not required for interaction architecture |
| LLM-generated customer email copy | Violates instructional copy standards |
| AI Discovery scoring | Violates deterministic traceability lock |
| Auto-resolving owner exceptions | Violates owner authority |
| Phase 3 precedent migration | Await Studio Self-Test findings |

---

## V1 success criteria (Phase 1–2)

V1 is complete when:

1. **Parity** — All existing deterministic behaviors pass parity tests through the Core orchestrator.
2. **Trace** — Every non-trivial outcome logs matched rules in dev/staff views.
3. **No regression** — Customer journey, File Room, Owner Console behave as today.
4. **Bidirectional model documented in code** — incoming customer events and outgoing communication events both route through Core evaluators.
5. **Communication pipeline unchanged in UX** — interaction events → outbox → owner send (outgoing); existing client actions classified (incoming).
6. **Advisory disabled** — no LLM in production path.
7. **Studio Self-Test run** — findings recorded; Phase 3 go/no-go decision documented.

---

## Approval gate

| Step | Owner | Status |
|------|-------|--------|
| 1. Review blueprint (incl. bidirectional conversations) | Tagia | ✅ Approved 2026-07-06 |
| 2. Approve Phase 1–2 for implementation | Tagia | ✅ Approved |
| 3. Phase 1–2 implementation | Engineering | ✅ `src/decision-core/` |
| 4. Studio Self-Test → Phase 3 go/no-go | Tagia | Pending |
| 5. Lock document | Tagia | ✅ Complete |

**Change policy:** Do not modify Decision Core philosophy, layer boundaries, or approved V1 scope without Tagia approval.

---

## Appendix A — File inventory (reference)

### Decision Learner (prototype — isolated until Phase 3)

`src/lib/decision-learner/*` · `src/app/api/decision-learner/*` · `src/app/decision-learner/*` · `src/components/decision-learner/*` · `scripts/decision-learner-seed.json` · `scripts/seed-decision-learner.mjs`

### Deterministic engines (register with Core)

`src/recommendation/` · `src/lib/job-control/` · `src/lib/campaign-tasks/exceptions-*` · `src/config/job-control.ts` · `src/config/campaign-exceptions.ts` · `src/config/help-center.ts` · `src/config/policies.ts`

### Customer conversations, communication & events

`src/lib/job-control/communication.ts` · `src/lib/job-control/activity-log.ts` · `src/lib/job-control/review-room-actions.ts` · `src/lib/job-control/types.ts`

### Owner surfaces

`src/config/owner-console.ts` · `src/lib/campaign-tasks/owner-console-view.ts` · `src/lib/job-control/owner-desk.ts` · `src/components/file-room/FileRoomOwnerDecisionCard.tsx`

### Campaign Record

`src/config/studio-board.ts` (`CampaignRecord`) · `src/lib/studio-board-campaign.ts` · `src/lib/campaign-record.ts` (`resolveActivityFeed`) · `src/lib/campaign-store/store.ts`

---

## Appendix B — Glossary

| Term | Meaning |
|------|---------|
| **Decision Core** | Orchestration layer — context in, outcome + effects out |
| **Studio Decision Engine** | Informal name for the long-term vision; **Decision Core** is the canonical module name in code and docs |
| **Rule evaluator** | Deterministic function for one domain |
| **Communication & interaction event** | Any customer↔Studio event that may produce a Core evaluation (replaces “communication trigger”) |
| **Incoming customer event** | Customer → Studio action or message, classified into an interaction kind |
| **Outgoing communication event** | Studio → Customer notice, template-selected, outbox-queued |
| **Customer conversation** | Bidirectional interaction model — not a chat product |
| **Precedent** | Owner-confirmed past decision stored for consistency (Phase 3+) |
| **Advisory** | Non-authoritative LLM suggestion with citations (Phase 4+) |
| **Effect** | Planned side effect executed by existing mutators |
| **Owner Desk** | Job-level production decision queue in Control Room |
| **Owner Console** | Exception decision desk across campaigns |
| **Needs Communication** | Client outbox queue — pending owner send |
| **Campaign Record** | Customer journey record (`CampaignRecord`) |

---

*Locked foundation document. Phase 3+ requires Studio Self-Test and explicit Tagia approval.*
