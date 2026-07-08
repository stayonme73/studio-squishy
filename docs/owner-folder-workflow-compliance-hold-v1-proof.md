# Owner Folder Workflow — Compliance Hold V1 Proof (Folder 3A)

**Status:** Workflow proof — updated 2026-07-08 (routing model changed: routine holds no longer default to Owner)  
**Template folder:** Needs My Decision / `compliance_hold` — **only once escalated**  
**Route:** `/file-room/owner-console`  
**Inherits:** [`docs/owner-folder-workflow-needs-my-decision-v1-planned.md`](owner-folder-workflow-needs-my-decision-v1-planned.md) · Folders 1–2 review/release gate proofs.

**No visuals:** No room art, Squishy sprite, outfit, or animation.

**Operating model:** Machine Bot routes. Squishy communicates. Owner decides only when executive judgment is required. A compliance hold is QA/Producer's to resolve by default — it never reaches this folder unless someone explicitly escalates it.

---

## Reference item

| Field | Value |
|-------|-------|
| Exception kind | `compliance_hold` |
| Default status (raised by QA) | `waiting_internal` — QA/Producer's queue, **not** the Owner Desk |
| Escalated status | `waiting_owner` — only reachable via `applyEscalateComplianceHoldToOwner`, never by default |
| Tray (once escalated) | **Needs My Decision** |
| Title pattern | `Compliance hold — {summary}` |

---

## Before it reaches Tagia — the routine path

QA flags a compliance concern (`compliance_hold`, status `waiting_internal`). QA or Producer resolves it directly — no Owner Folder is created. This is the default for every compliance hold.

## Why it reaches Tagia — only on escalation

A compliance hold reaches the Owner Desk only when someone (QA, Producer, or Decision Core) escalates it via `applyEscalateComplianceHoldToOwner`, and only when one of these five criteria applies:

1. Client refuses to remove or revise risky content.
2. Client requests a policy exception.
3. Unresolved legal or business risk remains.
4. Missing proof or release affects a client delivery commitment.
5. Compliance issue creates refund, scope, deadline, or client relationship risk.

Escalation requires a stated reason (one of the five above, plus a note) — every folder that reaches Tagia carries a recorded justification for why it needed executive judgment rather than QA/Producer resolution.

**Squishy says (closed folder, post-escalation):**

> Compliance needs your review before QA can pass this work.

---

## What Tagia reviews

**Decision question:**

> Is this work cleared to continue, or does it need a different path?

**Checklist:**

> Review the QA compliance flag, the escalation reason, and notes before you clear the hold or send it back for investigation.

**Owner Notes:** Tagia's reasoning — persisted on the historical record (not production notes).

---

## Actions and destinations

| Action | PATCH | Destination after |
|--------|-------|-------------------|
| **Resolve (routine, pre-escalation)** | generic resolve action, by QA/Producer | **Production** — exception resolved; task blocker cleared → `ready_for_qa`. No Owner Folder ever created. |
| **Escalate to Owner** | `applyEscalateComplianceHoldToOwner` + criterion + note | **Owner Desk** — exception → `waiting_owner`; only entry point onto this folder |
| **Clear / resolve** (post-escalation) | `owner_clear_compliance_hold` + `ownerNotes` | **Production** — exception resolved; task blocker cleared → `ready_for_qa` |
| **Hold** (post-escalation) | `owner_hold_compliance_hold` + `note` + `ownerNotes` | **Needs Clarification** — exception → `waiting_internal`; task stays blocked |
| **Ask team** (post-escalation) | `owner_ask_team_compliance_hold` + `note` + optional assignee | **Back to QA/production** — exception → `waiting_internal` |
| **Assign** (post-escalation) | `owner_assign_compliance_hold` + `assignToUserId` + `ownerNotes` | **Back to assignee** — exception → `waiting_internal` |

**No Ask Client** on this folder.

Every post-escalation path moves the exception off `waiting_owner` — **folder leaves the active Owner Desk**. The routine (pre-escalation) resolve path never puts it there at all.

---

## Owner Confirmation

After each post-escalation action, Squishy confirms:

- Destination assigned  
- Notifications queued (exception event recorded)  
- Campaign Record updated (task/exception sync)  
- Folder left the desk  

---

## Squishy copy

| Moment | Copy |
|--------|------|
| Closed folder (post-escalation) | *Compliance needs your review before QA can pass this work.* |
| Open — context | *Review the QA compliance flag, the escalation reason, and notes before you clear the hold or send it back for investigation.* |
| After clear | *Hold cleared. This folder left your desk — production and QA will continue from here.* + confirmation suffix |
| After hold | *Held for internal QA review. This folder left your desk — the team will follow up internally.* + confirmation suffix |
| After ask team | *Routed to QA or production for investigation. This folder left your desk.* + confirmation suffix |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* + confirmation suffix |

---

## Proof commands

```bash
npx vitest run src/lib/campaign-tasks/exceptions.test.ts
npx vitest run src/lib/campaign-tasks/exceptions-actions.test.ts
npx vitest run src/lib/campaign-tasks/compliance-hold-actions.test.ts
```

`scripts/seed-compliance-hold-v1.mjs` and `scripts/prove-owner-folder-compliance-hold.mjs` seed/assert against the pre-escalation, always-`waiting_owner` world and have not been re-verified against the new default — treat them as stale until re-checked.

---

## Template inheritance (locked)

Same mental model as Folders 1–2:

1. Why it reached the owner  
2. What the owner reviews  
3. Owner Notes  
4. Available outcomes  
5. Destination after each outcome  
6. Squishy before/after briefing + Owner Confirmation  
7. Exception mutators + task blocker routing  
8. Folder leaves the desk  

**Next folder to proof:** Direction disagreement (Folder 3B) — see [`docs/owner-folder-workflow-direction-disagreement-v1-proof.md`](owner-folder-workflow-direction-disagreement-v1-proof.md).
