# Owner Folder Workflow — Compliance Hold V1 Proof (Folder 3A)

**Status:** Workflow proof — 2026-07-06  
**Template folder:** Needs My Decision / `compliance_hold`  
**Route:** `/file-room/owner-console`  
**Inherits:** [`docs/owner-folder-workflow-needs-my-decision-v1-planned.md`](owner-folder-workflow-needs-my-decision-v1-planned.md) · Folders 1–2 review/release gate proofs.

**No visuals:** No room art, Squishy sprite, outfit, or animation.

---

## Reference item (seeded)

| Field | Value |
|-------|-------|
| Campaign | `compliance-hold-v1` (seed: `node scripts/seed-compliance-hold-v1.mjs`) |
| Exception | `exc-compliance-hold-v1` |
| Linked task | `sm-001:copy` |
| Tray | **Needs My Decision** |
| Exception kind | `compliance_hold` · status `waiting_owner` |
| Title pattern | `Compliance hold — {summary}` |

---

## Why it reached Tagia

QA flagged a compliance concern; linked task is blocked. Producer cannot resolve `compliance_hold` — Owner clearance required.

**Squishy says (closed folder):**

> Compliance needs your review before QA can pass this work.

---

## What Tagia reviews

**Decision question:**

> Is this work cleared to continue, or does it need a different path?

**Checklist:**

> Review the QA compliance flag and notes before you clear the hold or send it back for investigation.

**Owner Notes:** Tagia's reasoning — persisted on the historical record (not production notes).

---

## Actions and destinations

| Action | PATCH | Destination after |
|--------|-------|-------------------|
| **Clear / resolve** | `owner_clear_compliance_hold` + `ownerNotes` | **Production** — exception resolved; task blocker cleared → `ready_for_qa` |
| **Hold** | `owner_hold_compliance_hold` + `note` + `ownerNotes` | **Needs Clarification** — exception → `waiting_internal`; task stays blocked |
| **Ask team** | `owner_ask_team_compliance_hold` + `note` + optional assignee | **Back to QA/production** — exception → `waiting_internal` |
| **Assign** | `owner_assign_compliance_hold` + `assignToUserId` + `ownerNotes` | **Back to assignee** — exception → `waiting_internal` |

**No Ask Client** on this folder.

Every path moves exception off `waiting_owner` / `open` — **folder leaves the active Owner Desk**.

---

## Owner Confirmation

After each action, Squishy confirms:

- Destination assigned  
- Notifications queued (exception event recorded)  
- Campaign Record updated (task/exception sync)  
- Folder left the desk  

---

## Squishy copy

| Moment | Copy |
|--------|------|
| Closed folder | *Compliance needs your review before QA can pass this work.* |
| Open — context | *Review the QA compliance flag and notes before you clear the hold or send it back for investigation.* |
| After clear | *Hold cleared. This folder left your desk — production and QA will continue from here.* + confirmation suffix |
| After hold | *Held for internal QA review. This folder left your desk — the team will follow up internally.* + confirmation suffix |
| After ask team | *Routed to QA or production for investigation. This folder left your desk.* + confirmation suffix |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* + confirmation suffix |

---

## Proof commands

```bash
node scripts/seed-compliance-hold-v1.mjs
npx vitest run src/lib/campaign-tasks/compliance-hold-actions.test.ts
npx vitest run src/lib/campaign-tasks/exceptions-view.test.ts -t "waiting_internal"
npx vitest run src/studio-coordinator/briefings/owner-desk.test.ts -t "compliance hold"
node scripts/prove-owner-folder-compliance-hold.mjs
```

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

**Next folder to proof:** Direction disagreement (Folder 3B).
