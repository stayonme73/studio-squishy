# Owner Folder Workflow — Direction Disagreement V1 Proof (Folder 3B)

**Status:** Workflow proof — 2026-07-06  
**Template folder:** Needs My Decision / `direction_disagreement`  
**Route:** `/file-room/owner-console`  
**Inherits:** [`docs/owner-folder-workflow-needs-my-decision-v1-planned.md`](owner-folder-workflow-needs-my-decision-v1-planned.md) · Folder 3A compliance hold proof.

**No visuals:** No room art, Squishy sprite, outfit, or animation.

---

## Reference item (seeded)

| Field | Value |
|-------|-------|
| Campaign | `direction-disagreement-v1` (seed: `node scripts/seed-direction-disagreement-v1.mjs`) |
| Exception | `exc-direction-disagreement-v1` |
| Linked task | `sm-001:copy` |
| Tray | **Needs My Decision** |
| Exception kind | `direction_disagreement` · status `waiting_owner` |
| Title pattern | `Direction disagreement — {summary}` |

---

## Why it reached Tagia

Strategy and execution conflict; production is paused. Producer cannot resolve `direction_disagreement` — Owner direction confirmation required.

**Squishy says (closed folder):**

> Production is paused until you confirm the creative direction.

---

## What Tagia reviews

**Decision question:**

> Which creative direction stands?

**Checklist:**

> Review strategy and production notes before you confirm which direction stands.

**Owner Notes:** Tagia's reasoning — persisted on the historical record (not production notes).

---

## Actions and destinations

| Action | PATCH | Destination after |
|--------|-------|-------------------|
| **Confirm direction** | `owner_confirm_direction_disagreement` + `ownerNotes` | **Production** — exception resolved; task blocker cleared → `ready_for_qa` |
| **Hold** | `owner_hold_direction_disagreement` + `note` + `ownerNotes` | **Needs Clarification** — exception → `waiting_internal`; task stays blocked |
| **Ask team** | `owner_ask_team_direction_disagreement` + `note` + optional assignee | **Back to QA/production** — exception → `waiting_internal` |
| **Assign** | `owner_assign_direction_disagreement` + `assignToUserId` + `ownerNotes` | **Back to assignee** — exception → `waiting_internal` |

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
| Closed folder | *Production is paused until you confirm the creative direction.* |
| Open — context | *Review strategy and production notes before you confirm which direction stands.* |
| After confirm | *Direction confirmed. This folder left your desk — production and QA will continue from here.* + confirmation suffix |
| After hold | *Held for internal direction review. This folder left your desk — the team will follow up internally.* + confirmation suffix |
| After ask team | *Routed to QA or production for direction reconciliation. This folder left your desk.* + confirmation suffix |
| After assign | *Routed to the assignee. This folder left your desk — it will not return here unless re-raised.* + confirmation suffix |

---

## Proof commands

```bash
node scripts/seed-direction-disagreement-v1.mjs
npx vitest run src/lib/campaign-tasks/direction-disagreement-actions.test.ts
npx vitest run src/lib/campaign-tasks/owner-console-sequential.test.ts -t "direction_disagreement"
npx vitest run src/studio-coordinator/briefings/owner-desk.test.ts -t "direction disagreement"
node scripts/prove-owner-folder-direction-disagreement.mjs
```

---

## Template inheritance (locked)

Same mental model as Folders 1–2 and 3A:

1. Why it reached the owner  
2. What the owner reviews  
3. Owner Notes  
4. Available outcomes  
5. Destination after each outcome  
6. Squishy before/after briefing + Owner Confirmation  
7. Exception mutators + task blocker routing  
8. Folder leaves the desk  

**Next folder to proof:** Deadline commitment / risk (Folder 3C).
