# Owner Folder Workflow — Release Gate V1 Proof

**Status:** Workflow proof — 2026-07-06  
**Template folder:** Ready to Release / `approval_before_delivery`  
**Route:** `/file-room/owner-console`  
**Inherits:** [`docs/owner-folder-workflow-review-gate-v1-proof.md`](owner-folder-workflow-review-gate-v1-proof.md) — same interaction model, different decision.

**No visuals:** No room art, Squishy sprite, outfit, or animation.

---

## Decision shift (only change from Folder 1)

| Folder 1 — Review Gate | Folder 2 — Release Gate |
|------------------------|-------------------------|
| Can the client **review** this? | Can the client **receive** this final delivery? |
| `ownerApprovalPending: before_review` | `ownerApprovalPending: before_delivery` |
| Tray: **Needs My Approval** | Tray: **Ready to Release** |
| Approve → Review Room | Release → Final Delivery |

---

## Reference item (seeded)

| Field | Value |
|-------|-------|
| Campaign | `final-delivery-v1` (seed: `node scripts/seed-final-delivery-v1.mjs`) |
| Job | `final-delivery-v1:sm-001` |
| Desk reason | `approval_before_delivery` |
| Tray | **Ready to Release** |
| Gate flag | `ownerApprovalPending: "before_delivery"` · `spineStatus: "approved"` |
| Title pattern | `Final Release Needed — {serviceName}` |

---

## What Tagia reviews

**Decision question:**

> Can the client receive this final delivery?

**Checklist (open folder):**

> Confirm QA is complete, all deliverables are attached, production is finished, and every client delivery file is client-safe. The client cannot open Final Delivery until you release.

---

## Actions and destinations

| Action | PATCH | Destination after |
|--------|-------|-------------------|
| **Release to client** | `owner_final_release` (existing) | **Final Delivery** — spine `ready_for_delivery`; files released; Squishy `final_delivery_available` comms |
| **Send back to production** | `owner_send_back_for_release` + `note` | **Production** — spine `building_concepts`; client does not see delivery |
| **Hold** | `owner_hold_release_gate` + `note` | **Needs Clarification** — internal final QA hold |
| **Ask team** | `owner_ask_team_release_gate` + `note` | **Back to assignee** — internal notes for final QA |

Every path clears `ownerApprovalPending` — **folder leaves the active Owner Desk**.

---

## Squishy copy

| Moment | Copy |
|--------|------|
| Closed folder | *The client approved this package. Your final release is required before they can receive it in Final Delivery.* |
| Desk greeting | *The first item needs your sign-off before final delivery can go to the client.* |
| After release | *Routed to Final Delivery. This folder left your desk — Squishy will notify the client that delivery is ready.* |
| After send back | *Routed back to production for final package revision. This folder left your desk — the client will not see delivery until you release again.* |
| After hold | *Held for internal final QA clarification. This folder left your desk — production and QA will follow up internally.* |
| After ask team | *Routed to the assignee for final QA. This folder left your desk — the team will act from their office.* |

---

## Proof commands

```bash
node scripts/seed-final-delivery-v1.mjs
npx vitest run src/lib/job-control/production-workspace.test.ts -t "release gate"
npx vitest run src/studio-coordinator/briefings/owner-desk.test.ts -t "final release"
node scripts/prove-owner-folder-release-gate.mjs
```

---

## Template inheritance (locked)

Same mental model as Folder 1:

1. Why it reached the owner  
2. What the owner reviews  
3. Available outcomes  
4. Destination after each outcome  
5. Squishy before/after briefing  
6. Decision Core routing via existing job mutators  
7. Campaign Record activity update  
8. Folder leaves the desk  

**No Folder Left Behind:** Every folder has an owner, a destination, and a final outcome.
