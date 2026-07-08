# Owner Folder Workflow — Needs My Decision V1 Planned

**Status:** Planning only — 2026-07-06
**Template folder:** Needs My Decision / `needs_my_decision` tray
**Route:** `/file-room/owner-console`
**Inherits:** [`docs/owner-folder-workflow-review-gate-v1-proof.md`](owner-folder-workflow-review-gate-v1-proof.md) · [`docs/owner-folder-workflow-release-gate-v1-proof.md`](owner-folder-workflow-release-gate-v1-proof.md) — same interaction model, different judgment surface.

**No code. No UI. No visuals.** Approve this plan first; wire **one decision type at a time** into proof docs and scripts (same pattern as Folders 1–2).

**Related:** [`docs/owner-console-responsibility-map-v1-planned.md`](owner-console-responsibility-map-v1-planned.md) §8.1 · [`docs/help-center-v1-locked.md`](help-center-v1-locked.md) (refund wording) · `src/config/campaign-exceptions.ts` · `src/decision-core/types.ts`

---

## Purpose

Folder 3 is **judgment and discretion** — work policy cannot close without Tagia. Unlike Folders 1–2 (gate approvals with fixed spine steps), this tray mixes exception kinds and job-level discretion (refunds, complaints). Squishy still **orchestrates**: folders arrive sorted; folders **leave the desk** after each decision; destinations are **deterministic from the outcome Tagia chooses**, not manually picked.

**Tray decision question:**

> What judgment is required that policy cannot apply automatically?

**No Folder Left Behind:** Every folder has an owner (Tagia), a named destination after each outcome, and a recorded final state. Nothing lingers on the active desk after a decision.

---

## State machine (this tray)

```
CLOSED on desk (Needs My Decision tray, sorted by urgency rank)
  ↓ Tagia opens folder
OPEN — OWNER REVIEWING
  ↓ Tagia chooses business outcome (Approve / Deny / Hold / Ask Team / Ask Client / Assign) + optional Owner Notes
OWNER DECISION
  ↓ Decision Core + exception/job mutators route (Tagia does not pick destination manually)
FOLDER LEAVES DESK
  ↓
Production · Waiting on Client · Needs Clarification · Recently Handled · Job closed (by outcome)
```

**Not in this tray (Folder 4 / other trays):**

| Item | Correct tray |
|------|----------------|
| Client material promotion / missing client fact | **Needs My Approval** |
| Approval before review / before delivery | **Needs My Approval** / **Ready to Release** |
| Waiting on materials, promoted request stale, client in Review Room | **Needs Client** (awareness only) |

---

## Urgency order within Needs My Decision

Lower rank = surfaced first (matches responsibility map §7; code today in `resolveExceptionUrgencyRank` / `resolveDeskUrgencyRank`):

| Rank | Decision type | Desk / exception signal |
|------|---------------|-------------------------|
| 4 | Refund / payment-sensitive issue | `refund_eligible` job · `refund_request` interaction |
| 5 | Scope change | `scope_change` exception · desk `scope_issue` |
| 6 | Client boundary review | legacy `revision_exhausted` exception · desk `revision_limit_reached` compatibility |
| 7 | Deadline commitment / deadline risk | `deadline_commitment` · `deadline_risk` · desk `deadline_exception` · `at_risk_job` |
| 8 | Complaint / non-policy client issue | `complaint` incoming interaction |
| 9 | Compliance hold / direction disagreement | `compliance_hold` · `direction_disagreement` |
| 10 | Heavy lane full | desk `heavy_lane_full` |
| 10 | Routine internal (owner-held) | `routine_internal` |

**Cross-tray rule:** If **Ready to Release** or **Needs My Approval** items exist, they still outrank most decision items unless the client is **actively blocked waiting on Owner** for a refund or complaint reply (rank 4 / 8).

---

## Shared rules (all decision types)

### What must stay deterministic

| Rule | Source | Behavior |
|------|--------|----------|
| Production trigger (four conditions) | Help Center V1 locked | Production-started jobs are **non-refundable** — system enforces; Owner cannot override via UI. |
| Refund eligibility clock | `JOB_CONTROL_POLICY.refundEligibleDays` (14) | System computes `refund_eligible` from waiting-on-client timers — not Owner guesswork. |
| Refund / denial **wording** | Help Center V1 locked | Templates use **“may be approved”** / **“may be eligible”** — never “will receive.” |
| Per-job scope | Help Center + job spine | Refunds, pauses, production, and revision limits are **per job**, not per account. |
| Revision rounds in plan | Approved plan / catalog | Included revision count is read from the locked plan — Owner does not invent round numbers in UI. |
| Exception audit trail | `CampaignExceptionEvent` | History is append-only; status updates forward, never rewritten. |
| Folder leaves desk | Owner desk contract | Any terminal Owner action clears `waiting_owner` / desk presence — same as Folders 1–2. |
| Destination routing | Decision Core + mutators | Tagia picks **business outcome**; system picks **route** (Production, Waiting on Client, etc.). |
| Client-visible comms | Owner-approved only | Squishy sends client templates **after** Owner decision on sensitive paths (refund, scope denial, revision firm hold, complaint reply). |
| Owner Notes persistence | Decision folder contract | Tagia reasoning stored on historical record when supplied — distinct from audit events and team notes. |
| Owner Confirmation | Post-decision briefing | Every action confirms destination, notifications, Campaign Record, and desk clearance. |

### What must never be auto-resolved

| Never automatic | Why |
|-----------------|-----|
| Refund approval or denial | Policy says “may be eligible” — discretion is Owner-only. |
| Partial refund / goodwill amount | No pricing engine guess; Tagia decides or defers. |
| Scope change approval or denial | Changes approved plan and potentially billable work. |
| Boundary exception vs hold boundary | Affects client relationship and production allocation. |
| Complaint response content | Non-template client issues require Owner judgment. |
| Compliance hold clearance | QA flagged concern — legal/brand risk. |
| Direction disagreement resolution | Strategy vs execution conflict — Owner owns brand direction. |
| Deadline **commitment** to client | Owner-owned date promises; system may flag risk, not commit. |
| Heavy lane bump / re-prioritize | Capacity tradeoff across clients. |
| Production trigger override | Four conditions are locked; system does not start production or waive non-refundable without all four. |
| Auto-deny refund because client “seems unhappy” | Preference alone is not grounds — Decision Core defers, does not deny eligible cases silently. |
| Complaint → refund | A complaint **never** automatically becomes a refund decision — separate folder required. |

**Producer may resolve:** `routine_internal` only (when not owner-held). All kinds in this plan require Owner or explicit Owner assign-then-return.

### Owner Notes (every decision folder)

**Owner Notes** are Tagia’s reasoning at decision time — not production notes, not team internal notes, and not the append-only system audit trail alone.

| Field | Purpose |
|-------|---------|
| **Owner Notes** | Why you chose this outcome — your judgment in your words. |
| **Production / team notes** | Operational context for assignees (separate field where applicable). |
| **Audit trail** | System events (`CampaignExceptionEvent`, job activity) — immutable, machine-generated. |

**Example Owner Note:**

> Approved because client originally supplied the wrong logo.

**Rules:**

- Optional on Hold and Assign; **encouraged on every terminal outcome** (approve, deny, resolve, hold boundary, escalate handoff).
- Stored on the exception record, job decision event, or interaction resolution — **readable months later** in Recently Handled and Campaign Record.
- Never shown to the client unless Tagia explicitly copies wording into an approved client message field.
- Proof scripts and vitest will assert Owner Notes persist when supplied.

### Ask Client — two distinct paths

When a decision type contacts the client, use the path that matches intent:

| Path | When to use | Example client-facing intent |
|------|-------------|------------------------------|
| **Ask Client — Need Information** | Missing fact, file, or clarification — no commitment requested | “Please upload the missing logo.” |
| **Ask Client — Need Approval** | Client must confirm a change, charge, or commitment | “Please confirm you want to upgrade your package.” |

Each decision type below documents which path(s) apply. If only one applies, the other is **not offered** on that folder.

### Owner Confirmation principle

After **every** Owner action, Tagia must know the decision **actually took effect**. Squishy confirms all four before the folder closes:

| Confirmation | Meaning |
|--------------|---------|
| **Destination assigned** | Named route applied (Production, Waiting on Client, Needs Clarification, Recently Handled, job closed). |
| **Notifications queued** | Internal and client notifications enqueued per outcome table (or explicitly none). |
| **Campaign Record updated** | Activity event written — visible on Studio Board / job timeline. |
| **Folder left the desk** | Item removed from active Owner Desk queue; next folder may surface. |

**Squishy after-decision copy** always states destination + desk clearance (same pattern as Folders 1–2). If any confirmation fails, the action must **not** report success — Tagia should never wonder whether the decision landed.

---

## Decision type 1 — Scope change

**Exception kind:** `scope_change` · **Desk reason:** `scope_issue`

### Why it reaches Tagia

Work was requested **outside the approved Studio plan**. Production cannot replan or bill adjusted scope until Owner approves or denies. Team raised the exception (or QA flagged `scope_change`).

**Coordinator trace:** Policy requires Owner sign-off before plan or production scope changes.

### What Tagia reviews

**Decision question:**

> Should this work proceed outside the approved plan?

**Checklist:**

- What was purchased vs what is being asked now.
- Who requested the change (client, team, or both).
- Impact on timeline, deliverables, and price (read-only plan context — Tagia applies business judgment; Pricing Engine wires later).
- Whether the change can be handled as clarification without a plan change.

**Drill-down:** File Room task + approved plan snapshot + linked QA notes (read-only).

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Approve scope change** | Accept change; plan/production may update. |
| **Decline** | Stay within approved scope; no plan expansion. |
| **Hold** | Internal scope review; not ready to approve or deny. |
| **Ask team** | Need Producer/planning analysis before decision. |
| **Ask Client — Need Information** | Missing fact or file before scope can be judged (approved wording only). |
| **Ask Client — Need Approval** | Client must confirm they want the scope change (approved wording only). |
| **Assign** | Delegate investigation to a specific role (folder leaves desk; returns only if re-raised). |

**Ask Client on this folder:** Both paths available. Use **Need Information** when facts are missing; use **Need Approval** when the client must confirm the change.

### Where the folder goes after each outcome

| Outcome | Destination | Desk / exception state |
|---------|-------------|------------------------|
| **Approve** | **Production** (+ plan update path) | Exception resolved; blocker cleared; replan logged. |
| **Decline** | **Recently Handled** (exception closed) | No new scope; production continues within plan. |
| **Hold** | **Needs Clarification** (internal) | Exception → `waiting_internal`; task stays blocked. |
| **Ask team** | **Needs Clarification** → assignee Team Office | Exception assigned or internal hold. |
| **Ask Client — Need Information** | **Waiting on Client** | Exception → `waiting_client`; awaiting fact/file. |
| **Ask Client — Need Approval** | **Waiting on Client** | Exception → `waiting_client`; awaiting client confirm. |
| **Assign** | **Back to Team** (assignee) | Exception → `waiting_internal`; Owner desk clear. |

### Who gets notified

| Outcome | Producer | Planning / assignee | Client | QA |
|---------|----------|---------------------|--------|-----|
| Approve | Yes | Yes | Yes — if client requested change | If linked |
| Decline | Yes | — | Yes — if client asked; denial template | — |
| Hold | Yes | Assignee if set | No | — |
| Ask team | Yes | Assignee | No | — |
| Ask Client — Need Information | Yes | — | Yes — approved wording only | — |
| Ask Client — Need Approval | Yes | — | Yes — approved wording only | — |
| Assign | — | Assignee | No | — |

### Owner Notes

Record why you approved or declined scope — especially when the request looks reasonable but policy or plan boundaries apply.

**Examples:**

> Declined — request adds deliverable not in approved plan; client can purchase add-on separately.

> Approved — client supplied wrong dimensions in Project Details; correction is in-scope clarification.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder | *A scope change needs your decision before production can continue.* |
| Desk greeting (multiple) | *{N} decisions need you. I sorted them by urgency — this folder is first.* |
| Open — context | *The team cannot expand scope without your approval. Review what was purchased and what is being requested now.* |
| After approve | *Scope change approved. This folder left your desk — production will replan and continue. Squishy will notify the client if they requested this change.* |
| After decline | *Scope change declined. This folder left your desk — work stays within the approved plan. Squishy will send the policy-bound outcome if the client asked.* |
| After hold | *Held for internal scope review. This folder left your desk — Producer will follow up internally.* |
| After ask team | *Routed to the team for scope analysis. This folder left your desk — they will act from their office.* |
| After Ask Client — Need Information | *Routed to the client queue for missing information. This folder left your desk — Squishy will track the response.* |
| After Ask Client — Need Approval | *Routed to the client queue for scope confirmation. This folder left your desk — Squishy will track the response.* |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| Blocker stays until Owner resolves or assigns | Approve/deny scope |
| Exception kind → tray = Needs My Decision | Plan price / SKU changes |
| Audit event on every outcome | Client-facing denial wording without Owner |

---

## Decision type 2 — Client boundary review

**Exception kind:** legacy `revision_exhausted` · **Desk reason:** legacy `revision_limit_reached`

### Why it reaches Tagia

Routine revision policy is owned by Squishy and Decision Core. This folder reaches Tagia only when the issue is no longer a normal revision request and has become business judgment: client boundary, scope, goodwill, or relationship decision.

**Coordinator trace:** Routine revision handling completed by Squishy and Decision Core; Owner review is only for the reframed business judgment issue.

### What Tagia reviews

**Decision question:**

> Should this job receive another revision round, and on what terms?

**Checklist:**

- Included rounds used vs plan allowance (read-only).
- Client revision message and production notes.
- Whether the request is in-scope rework vs new scope.
- Whether to hold the Studio boundary, approve a business exception, or route to client for approved boundary confirmation.

**Drill-down:** Review Room activity + job spine + revision history (read-only).

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Approve exception** | Approve the business exception and record the boundary. |
| **Hold boundary** | Hold the Studio boundary with a policy-bound client message. |
| **Hold** | Internal review before deciding the boundary, scope, goodwill, or relationship path. |
| **Ask team** | Production/QA assesses boundary or scope context before decision. |
| **Ask Client — Need Approval** | Client must accept boundary terms or provide missing context (approved wording only). |
| **Assign** | Route internal assessment to assignee. |

**Ask Client on this folder:** **Need Approval only.** Client is not being asked for missing files — they are being asked to confirm terms (included round vs billable round). **Need Information** is not offered on this folder.

### Where the folder goes after each outcome

| Outcome | Destination | Desk / job state |
|---------|-------------|------------------|
| **Approve exception** | **Production** | Exception resolved; business judgment path recorded; spine returns to the appropriate work path. |
| **Hold boundary** | **Waiting on Client** or **Recently Handled** | Client informed; job paused or complete per policy; exception resolved. |
| **Hold** | **Needs Clarification** | Internal; task blocked. |
| **Ask team** | **Back to Team** | Internal notes; exception assigned or waiting_internal. |
| **Ask Client — Need Approval** | **Waiting on Client** | Paused pending client accept/decline of terms. |
| **Assign** | **Back to Team** | Assignee investigates; desk clear. |

### Who gets notified

| Outcome | Production role | Client | Producer |
|---------|-----------------|--------|----------|
| Approve exception | Yes | Yes — approved boundary outcome | Yes |
| Hold boundary | Yes | Yes — firm policy template | Yes |
| Hold | Assignee | No | Yes |
| Ask team | Assignee | No | Yes |
| Ask Client — Need Approval | — | Yes — approved wording | Yes |
| Assign | Assignee | No | — |

### Owner Notes

Record why you approved the exception or held the Studio boundary — future you should understand the call without re-reading the thread.

**Examples:**

> Approved business exception — request is minor copy tweak; relationship preservation.

> Held firm — third substantive direction change; plan allowance exhausted fairly.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder | *A legacy revision path now needs business judgment: boundary, scope, goodwill, or client relationship.* |
| Open — context | *Routine revision policy has already been handled by Squishy and Decision Core. Review only the business judgment issue.* |
| After approve exception | *Business exception approved. This folder left your desk — production will continue under the approved boundary. Squishy will notify the client.* |
| After hold boundary | *Studio boundary held. This folder left your desk — Squishy will send the policy-bound message to the client.* |
| After hold | *Held for internal boundary review. This folder left your desk — the team will follow up internally.* |
| After ask team | *Routed to production for boundary or scope assessment. This folder left your desk — the team will act from their office.* |
| After Ask Client — Need Approval | *Routed to the client queue for boundary confirmation. This folder left your desk — Squishy will track the response.* |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| Round count from approved plan | Business exception vs hold boundary |
| Legacy `revision_exhausted` compatibility | Billable amount, goodwill, or relationship exception |
| Job spine rules for paused vs continue | Client message wording |

---

## Decision type 3 — Refund / payment issues

**Signals:** Job `refund_eligible` (14-day path) · incoming `refund_request` · payment_question escalation · desk/control-room `refund_eligible` label

**Not one exception kind today** — planned as **job-level desk item** + optional interaction record; proof will seed one path at a time.

### Why it reaches Tagia

Policy determines the job **may be eligible** for refund (production not started, timers met, per-job) — but **approval is never automatic**. Alternatively, the client asked for refund or raised a payment issue Squishy cannot answer from Help Center alone.

**Coordinator trace:** `help-center:refund-policy` + `JOB_CONTROL_POLICY.refundEligibleDays` → human review required.

### What Tagia reviews

**Decision question:**

> Should this job receive a refund, continue, or need more internal review?

**Checklist:**

- Production started? (If yes — **deny path only**; system blocks `issue_refund`.)
- 14-day / waiting-on-client facts (read-only timer state).
- Payment received and job identity (per-job).
- Client stated reason vs policy paths.
- Whether partial goodwill is appropriate (Owner discretion — no auto amount).

**Drill-down:** Studio Board job row + activity timeline + Help Center refund policy (read-only link).

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Approve refund** | Issue refund; close job `refunded_cancelled`. |
| **Deny refund** | Job continues or stays waiting; policy-bound client message. |
| **Hold** | Internal review (finance/producer) before decide. |
| **Ask team** | Need Producer investigation (payment evidence, materials state). |
| **Ask Client — Need Information** | Need documentation or clarification before decide (approved wording only). |
| **Assign** | Delegate investigation. |

**Ask Client on this folder:** **Need Information only.** Refund approve/deny is Owner’s decision — client is not asked to “approve” the refund itself. **Need Approval** is not offered on this folder.

### Where the folder goes after each outcome

| Outcome | Destination | Desk / job state |
|---------|-------------|------------------|
| **Approve refund** | **Job closed** — `refunded_cancelled` | Folder leaves desk; **Recently Handled** audit; no production. |
| **Deny refund** | **Production** or **Waiting on Client** | Spine per facts; refund eligibility cleared or superseded by decision event. |
| **Hold** | **Needs Clarification** | Job paused internal; refund decision pending. |
| **Ask team** | **Back to Team** | Internal investigation; desk clear. |
| **Ask Client — Need Information** | **Waiting on Client** | Paused; awaiting documentation or clarification. |
| **Assign** | **Back to Team** | Assignee owns follow-up; desk clear. |

### Who gets notified

| Outcome | Client | Producer | Finance / Owner |
|---------|--------|----------|-----------------|
| Approve refund | Yes — refund approved template | Yes | Owner (activity) |
| Deny refund | Yes — refund denied template | Yes | — |
| Hold | No | Yes | — |
| Ask team | No | Assignee | — |
| Ask Client — Need Information | Yes — approved wording | Yes | — |
| Assign | No | Assignee | — |

### Owner Notes

Record why you approved or denied — especially on edge cases (materials delay, client ghosting, goodwill).

**Examples:**

> Approved — production never started; 14-day waiting-on-client path met; client unresponsive.

> Denied — client approved concepts in Review Room; refund request is preference only.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder | *A refund decision needs you. Policy says this job may be eligible — approval is yours.* |
| Open — context | *Review production status and waiting-on-client history before you approve or deny. Production-started jobs cannot be refunded through this desk.* |
| After approve | *Refund approved. This folder left your desk — the job is closed and Squishy will notify the client with the approved template.* |
| After deny | *Refund denied. This folder left your desk — the job continues under policy and Squishy will notify the client.* |
| After hold | *Refund held for internal review. This folder left your desk — Producer will follow up internally.* |
| After ask team | *Routed to the team for payment and materials review. This folder left your desk.* |
| After Ask Client — Need Information | *Routed to the client queue for documentation. This folder left your desk — Squishy will track the response.* |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| `productionStartedAt` / `nonRefundable` gate on `issue_refund` | Approve vs deny refund |
| 14-day eligibility **detection** | Refund amount or partial credit |
| Locked “may be eligible” / “may be approved” wording in templates | Waive non-refundable after production trigger |
| Per-job refund eligibility | Auto-refund on timer alone |

---

## Decision type 4 — Complaint / non-policy client issue

**Signal:** incoming interaction `complaint` (and escalated `support_request` / `general_inquiry` when Help Center insufficient)

**Planned desk item:** interaction-backed folder (may link job + campaign); not the same as `routine_internal`.

### Complaint is its own folder — never a refund shortcut

| Rule | Behavior |
|------|----------|
| **Complaint ≠ refund** | A complaint **never** automatically becomes a refund decision. Sentiment, frustration, or refund language in a complaint does not route to approve/deny refund on this folder. |
| **One folder, one decision** | This folder resolves **the complaint response** (or hands off). Refund, scope, and revision are **separate folders** in their own trays. |
| **Escalate = new folder** | If review shows the real issue is refund, scope, or revisions, Tagia **escalates** — system **creates a new folder** for that decision type. This complaint folder closes with handoff recorded. |
| **No bundled outcomes** | Tagia cannot approve refund and send complaint reply in one action. |

### Why it reaches Tagia

Client message cannot be answered from **Help Center V1** templates alone, or Squishy escalated per Decision Core (`humanReviewRequired`). Relationship or policy discretion required.

**Coordinator trace:** Customer interaction → escalation domain → Owner review before client reply.

### What Tagia reviews

**Decision question:**

> What is the Studio response to this complaint — and does it require a **separate** refund, scope, or boundary review?

**Checklist:**

- Full client message and thread context.
- Whether issue maps to locked policy (if yes — route to template path, not ad-hoc promise).
- Linked job(s) and journey state.
- Whether underlying issue is refund, scope, or revision — if yes, **escalate** to new folder; do not decide here.
- Distinguish **Need Information** (missing context) from resolving with a direct reply.

**Drill-down:** Interaction record + Campaign Record activity + linked job (read-only).

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Resolve with reply** | Owner-approved client response to the complaint; no refund/scope/boundary action on this folder. |
| **Escalate to refund folder** | New **Refund / payment** desk item created — this complaint folder closes with handoff. |
| **Escalate to scope folder** | New **Scope change** exception/folder created — this complaint folder closes with handoff. |
| **Escalate to boundary review** | New **Client boundary review** folder created — this complaint folder closes with handoff. |
| **Hold** | Internal investigation before replying. |
| **Ask team** | Need Producer/QA context for accurate reply. |
| **Ask Client — Need Information** | Need more context before reply or escalate (approved wording only). |
| **Assign** | Delegate internal investigation or draft reply. |
| **Decline escalation** | Policy-bound response; no refund, scope change, or extra work. |

**Ask Client on this folder:** **Need Information only.** The client is not asked to approve a package change or refund on a complaint folder. If approval is required, escalate to the appropriate folder first. **Need Approval** is not offered on this folder.

### Where the folder goes after each outcome

| Outcome | Destination | Desk state |
|---------|-------------|------------|
| **Resolve with reply** | **Recently Handled** | Interaction resolved; client reply queued from approved text. |
| **Escalate to refund / scope / revision** | **Recently Handled** (complaint) + **new folder** in correct tray | Complaint folder **closes**; new typed folder appears on desk — **one decision per folder**. |
| **Hold** | **Needs Clarification** | Interaction pending internal. |
| **Ask team** | **Back to Team** | Internal draft; desk clear. |
| **Ask Client — Need Information** | **Waiting on Client** | Awaiting client reply. |
| **Assign** | **Back to Team** | Assignee owns; desk clear. |
| **Decline escalation** | **Recently Handled** | Client receives policy-bound reply; job spine unchanged unless separate folder opened. |

### Who gets notified

| Outcome | Client | Producer | Assignee |
|---------|--------|----------|----------|
| Resolve with reply | Yes — owner-approved reply | Yes | — |
| Escalate | No — until new folder decided | Yes — handoff noted | — |
| Hold | No | Yes | Optional |
| Ask team | No | Assignee | Yes |
| Ask Client — Need Information | Yes — approved wording | Yes | — |
| Assign | No | — | Yes |
| Decline escalation | Yes — policy template | Yes | — |

### Owner Notes

Record your read of the complaint and why you replied, escalated, or declined.

**Examples:**

> Resolved — client frustrated by timeline; provided status summary and revised internal dispatch. No refund warranted.

> Escalated to refund folder — client cites 14-day no-response; complaint folder closed pending refund decision.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder | *A client issue needs your judgment before Squishy can respond.* |
| Open — context | *This is a complaint folder — not a refund folder. Review the message and linked job context. If the real issue is refund, scope, or revisions, escalate to a new folder. Use a policy template when one applies.* |
| After resolve | *Response approved. This folder left your desk — Squishy will send your reply to the client.* |
| After escalate | *Handed off to a new decision folder. This complaint folder left your desk — resolve refund, scope, or revision on the next folder.* |
| After hold | *Held for internal review. This folder left your desk — the team will follow up internally.* |
| After ask team | *Routed to the team for context. This folder left your desk — they will act from their office.* |
| After Ask Client — Need Information | *Routed to the client queue for more information. This folder left your desk — Squishy will track the response.* |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* |
| After decline escalation | *Policy-bound response recorded. This folder left your desk — Squishy will notify the client.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| Help Center FAQ match → no Owner desk | Complaint reply content |
| Escalate always creates **separate** typed folder | Complaint → refund without new folder |
| Interaction audit append-only | Bundle refund + complaint in one action |
| Complaint folder closes on escalate | Auto-refund from complaint sentiment |
| Owner Confirmation on every outcome | Auto-deny or auto-approve refund from complaint text |

---

## Decision type 5 — Deadline commitment / deadline risk

**Exception kinds:** `deadline_commitment` · `deadline_risk` · **Desk reasons:** `deadline_exception` · `at_risk_job`

### Why it reaches Tagia

The team or client needs an **Owner-owned date** or acknowledgment of schedule risk before work continues or a client-facing promise is made. Policy does not auto-commit dates.

**Coordinator trace:** Deadline exception raised — Owner sign-off required before dispatch commits.

### What Tagia reviews

**Decision question:**

> What date or path should the team and client rely on?

**Checklist:**

- Requested vs realistic delivery given lane capacity.
- Whether commitment is client-facing or internal only.
- Linked job spine and heavy-lane position.
- Whether scope or materials block the date (may reference other folders).

**Drill-down:** Production dispatch view + lane capacity (read-only) + task timeline.

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Commit date** | Owner-owned deadline recorded; production proceeds. |
| **Revise timeline** | Adjust date/path; may be internal only. |
| **Hold** | Cannot commit yet — internal scheduling review. |
| **Ask team** | Producer provides options before commit. |
| **Ask Client — Need Approval** | Client must confirm date or priority (approved wording only). |
| **Assign** | Route scheduling analysis to assignee. |

**Ask Client on this folder:** **Need Approval only.** Used when a client-facing date or priority commitment requires confirm. **Need Information** is not offered — if facts are missing, use **Ask team** or **Hold** first.

### Where the folder goes after each outcome

| Outcome | Destination | Desk / exception state |
|---------|-------------|------------------------|
| **Commit / resolve** | **Production** | Exception resolved; dispatch updated; activity logged. |
| **Hold** | **Needs Clarification** | Blocked pending schedule. |
| **Ask team** | **Back to Team** | Internal options gathering. |
| **Ask Client — Need Approval** | **Waiting on Client** | Paused pending client confirm. |
| **Assign** | **Back to Team** | Assignee owns scheduling task. |

### Who gets notified

| Outcome | Producer | Assignees | Client |
|---------|----------|-----------|--------|
| Commit / resolve | Yes | Yes | Only if client-facing date changes |
| Hold | Yes | Assignee | No |
| Ask team | Assignee | Yes | No |
| Ask Client — Need Approval | Yes | — | Yes — approved wording |
| Assign | — | Assignee | No |

### Owner Notes

Record the date or path you committed and why — especially when overriding team recommendation.

**Example:**

> Committed Friday delivery — client event date immovable; heavy lane bump approved for this job.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder | *A deadline needs your judgment before the team commits further.* |
| Open — context | *Review lane capacity and job state before you commit a client-facing date. Internal-only updates do not need client notification.* |
| After commit | *Timeline committed. This folder left your desk — production will update dispatch.* |
| After hold | *Held for scheduling review. This folder left your desk — Producer will follow up internally.* |
| After ask team | *Routed to the team for schedule options. This folder left your desk.* |
| After Ask Client — Need Approval | *Routed to the client queue for date confirmation. This folder left your desk — Squishy will track the response.* |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| Exception blocks until Owner acts | Client-facing commit date |
| Lane capacity facts (read-only) | Bump other clients’ jobs without Owner |
| Activity log on commit | Promise delivery inside impossible window |

---

## Decision type 6 — Compliance hold / direction disagreement

**Exception kinds:** `compliance_hold` · `direction_disagreement`
**Often auto-created from QA** (`qaRecordId` on exception)

### Why it reaches Tagia

**Compliance hold:** QA flagged a compliance concern; linked task is blocked.
**Direction disagreement:** Strategy and execution conflict; production paused until Owner confirms direction.

**Coordinator trace:** QA fail → owner-held exception; task `workflowBlockedReason` includes `compliance_hold` or `owner_escalation`.

### What Tagia reviews

**Decision question (compliance):**

> Is this work cleared to continue, or does it need a different path?

**Decision question (direction):**

> Which creative direction stands?

**Checklist:**

- QA notes and evidence (read-only).
- Compliance category vs direction conflict details.
- Whether fix is internal-only or affects client-visible deliverables.
- Assigned role and production state.

**Drill-down:** QA panel history + linked task + deliverable prep (read-only).

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Resolve / clear** | Hold cleared; direction chosen; work continues. |
| **Hold** | Needs more internal QA or legal review. |
| **Ask team** | QA or Producer must investigate before clear. |
| **Assign** | Route to specific role for fix. |
| **Decline** | Not applicable as client gate — use **Hold** or **Ask team** instead. |

*No Ask Client on this folder* — client should not see compliance investigation unless a separate promotion path applies. Use **Ask team** or **Hold** for internal investigation.

### Where the folder goes after each outcome

| Outcome | Destination | Desk / task state |
|---------|-------------|-------------------|
| **Resolve / clear** | **Production** | Blocker cleared; task → `ready_for_qa` or continues; exception resolved. |
| **Hold** | **Needs Clarification** | Task stays blocked; internal QA hold. |
| **Ask team** | **Back to Team** | QA / assignee acts; exception waiting_internal. |
| **Assign** | **Back to Team** | Assignee owns fix; desk clear. |

### Who gets notified

| Outcome | QA | Assignee | Producer | Client |
|---------|-----|----------|----------|--------|
| Resolve / clear | Yes | Yes | Yes | No |
| Hold | Yes | Assignee | Yes | No |
| Ask team | Yes | Assignee | Yes | No |
| Assign | — | Assignee | Yes | No |

### Owner Notes

Record why you cleared the hold or chose a direction — QA and production will reference this later.

**Examples:**

> Cleared — claim substantiated with client-provided documentation on file.

> Direction B stands — strategy brief overrides production alternate per brand guide.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder (compliance) | *Compliance needs your review before QA can pass this work.* |
| Closed folder (direction) | *Production is paused until you confirm the creative direction.* |
| Open — compliance | *Review the QA compliance flag and notes before you clear the hold or send it back for investigation.* |
| Open — direction | *Review strategy and production notes before you confirm which direction stands.* |
| After resolve | *Hold cleared. This folder left your desk — production and QA will continue from here.* |
| After hold | *Held for internal QA review. This folder left your desk — the team will follow up internally.* |
| After ask team | *Routed to QA or production for investigation. This folder left your desk.* |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| QA fail → exception kind mapping | Clear compliance without Owner |
| Task stays blocked while `waiting_owner` | Pick winning direction without Owner |
| Producer cannot resolve `compliance_hold` | Client notification of compliance detail |

---

## Decision type 7 — Heavy lane full (capacity)

**Desk reason:** `heavy_lane_full` · **Lower urgency (rank 10)**

### Why it reaches Tagia

Heavy production lane is at capacity (1/1); next job is queued. Owner must choose bump, wait, or re-prioritize — capacity tradeoff across clients.

### What Tagia reviews

**Decision question:**

> Which job should run next in the heavy lane?

**Checklist:** Queued job vs active job; client deadlines; contractual priority (read-only).

### Available outcomes

| Outcome | Owner meaning |
|---------|---------------|
| **Resolve** (bump / wait decided) | Lane assignment updated. |
| **Assign** | Producer reorders queue with Owner note. |

### Where the folder goes after each outcome

| Outcome | Destination |
|---------|-------------|
| **Resolve** | **Production** — lane updated; desk clear. |
| **Assign** | **Back to Team** — Producer acts; desk clear. |

### Who gets notified

Producer only (no client template).

### Owner Notes

Record bump/wait rationale for capacity disputes later.

**Example:**

> Wait — active job is one day from client Review Room; queued job can slip 48 hours.

### What Squishy says

| Moment | Copy |
|--------|------|
| Closed folder | *The heavy lane is full. Your call sets which job runs next.* |
| After resolve | *Lane order updated. This folder left your desk — production will dispatch accordingly.* |
| After assign | *Routed to Producer. This folder left your desk — they will reorder the queue.* |

### Deterministic vs never auto

| Deterministic | Never auto |
|---------------|------------|
| Capacity 1/1 detection | Bump without Owner |
| Next-up job surfaced | Auto-priority across campaigns |

---

## Wiring order (after plan approval)

Wire **one decision type at a time** — each gets its own proof doc sibling and `prove-owner-folder-*.mjs` script before moving on.

| Order | Decision type | Rationale |
|-------|---------------|-----------|
| 1 | **Compliance hold** (Folder 3A) | Smallest blast radius; QA path exists; no client money. |
| 2 | **Direction disagreement** | Same QA/office pattern as compliance. |
| 3 | **Deadline commitment / risk** | Scheduling only; no client refund language. |
| 4 | **Client boundary review** | Uses legacy revision compatibility only when the issue has become business judgment. |
| 5 | **Scope change** | Touches pricing, deliverables, recommendations, and timeline — after revision proved. |
| 6 | **Refund / payment** | Money + locked Help Center wording — highest policy risk. |
| 7 | **Complaint** | Own folder; may fork into 6 — wire after refund path exists. |
| 8 | **Heavy lane full** | Capacity; lowest daily volume. |

**Per-type delivery checklist (same as Folders 1–2):**

1. Proof doc (`docs/owner-folder-workflow-<kind>-v1-proof.md`)
2. Seed fixture script
3. Outcome-specific mutators (exception PATCH and/or job PATCH)
4. Squishy before/after copy in `owner-desk.ts`
5. `owner-console.ts` config block (`decisionGate.<kind>`)
6. Owner Notes field on working surface (persisted to historical record)
7. Owner Confirmation in post-decision briefing (destination, notifications, Campaign Record, desk cleared)
8. Sequential desk working surface (when UI phase starts — **not in this pass**)
9. Vitest + `prove-owner-folder-*.mjs`

---

## Implementation gaps (reference — do not build yet)

| Area | Today | Planned |
|------|-------|---------|
| Tray wiring | Generic resolve/assign on exception cards | Per-kind outcomes (approve scope, deny refund, allow revision, …) |
| Refund folder | `issue_refund` job PATCH; eligibility evaluator | Owner desk item + decision surface + post-decision briefing |
| Complaint folder | Decision Core interaction types | Desk item linked to interaction + resolve/escalate paths |
| Compliance / direction | On desk via exceptions; resolve only | Full outcome matrix + Ask team + Hold |
| Post-decision copy | Generic `resolveOwnerPostDecisionBriefing` | Per-kind messages + Owner Confirmation four-point check |
| Recently Handled | Exceptions only in scan | Include refund/scope/revision decisions with destination + Owner Notes |
| Client comms | Templates after gate folders | Refund/scope/revision/complaint templates after Owner acts |
| Owner Notes | Not on decision folders | Persisted reasoning field on every decision type |
| Ask Client split | Single “ask client” in places | Need Information vs Need Approval per decision type |

---

## Approval checklist (Tagia) — lock before wiring

- [ ] All seven decision families match how you think about discretion day-to-day.
- [ ] Outcome sets per type are complete — nothing missing you would need in the field.
- [ ] **Refund** and **complaint** paths preserve Help Center “may be eligible” / “may be approved” wording.
- [ ] **One folder, one decision** — complaint never becomes refund; escalate creates new folder.
- [ ] **Never auto-resolve** list matches your non-negotiables.
- [ ] **Wiring order** — revision before scope; compliance first (Folder 3A).
- [ ] **Owner Notes** — reasoning captured for historical record on every folder type.
- [ ] **Ask Client split** — Need Information vs Need Approval correct per type.
- [ ] **Owner Confirmation** — four-point check after every action.
- [ ] Squishy copy tone is right — instructive, complete sentences, no ellipses.
- [ ] Urgency ranks feel right when mixed with Ready to Release and Needs My Approval.

---

## After approval

1. Tagia approves this plan (edit in place if needed).
2. Scout wires **Folder 3A — Compliance hold** first proof only (`docs/owner-folder-workflow-compliance-hold-v1-proof.md`).
3. No parallel Folder 3 coding until that proof passes and is committed.
4. Repeat per wiring order table.

---

*Planned 2026-07-06 — refined 2026-07-06 (Owner Notes, Ask Client split, Owner Confirmation, complaint hardening, wiring order). Behavior and routing only. No visuals. No new business rules beyond locked Help Center, job control policy, and responsibility map.*
