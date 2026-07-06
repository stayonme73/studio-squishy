# Owner Folder Workflow — Review Gate V1 Proof

**Status:** Workflow proof — 2026-07-06  
**Template folder:** Ready for Review / Needs My Approval (`approval_before_review`)  
**Route:** `/file-room/owner-console`  
**No visuals:** No room art, Squishy sprite, outfit, or animation in this proof.

**Related:** `docs/owner-console-responsibility-map-v1-planned.md` §8.2 · `src/config/owner-console.ts` (`reviewGate`) · `src/studio-coordinator/briefings/owner-desk.ts`

---

## Purpose

Prove one complete folder loop — **closed → open → decision → destination** — that can become the template for every other tray type. Squishy is a **traffic controller**: folders arrive sorted; folders **leave the desk** after a decision.

---

## Reference item (seeded)

| Field | Value |
|-------|-------|
| Campaign | `production-workspace-v1` (seed: `node scripts/seed-production-workspace-v1.mjs`) |
| Job | `production-workspace-v1:sm-001` |
| Desk reason | `approval_before_review` |
| Tray | **Needs My Approval** (`needs_my_approval`) |
| Gate flag | `ownerApprovalPending: "before_review"` |
| Title pattern | `Review gate — {serviceName}` |

---

## State machine (this folder)

```
CLOSED on desk (Needs My Approval tray, sorted first among approvals)
  ↓ Tagia clicks Review Folder
OPEN — OWNER REVIEWING
  ↓ Tagia chooses business outcome
OWNER DECISION
  ↓ Decision Core + job mutators route (Tagia does not pick destination manually)
FOLDER LEAVES DESK
  ↓
Client Review Room · Production · Needs Clarification · Waiting on Client (by outcome)
```

---

## 1. Why this folder is first

**Squishy desk greeting (closed folder, before open):**

> The first item needs your approval before the client can review it.

When multiple approvals exist:

> {N} clients are waiting on Owner approval. This one is the oldest.

**Squishy says (closed + open folder):**

> Production has finished this campaign. Your approval is required before the client can see it.

**Why reached (coordinator panel):**

> Approval before review. Owner approval required before client review.

**Coordinator trace:**

> Production gate requires Owner sign-off before the next client-visible step.

**Sort rule:** `approval_before_review` urgency rank **3** in the sequential desk — after final release (2), before scope/revision exceptions (5+). Oldest `updatedAt` within the same rank wins.

---

## 2. What Tagia reviews

**Decision question:**

> Is this creative ready for the client to see in Review Room?

**Review checklist (Owner Console open folder):**

> Review concepts, prepared deliverables, and internal production notes. The client cannot open Review Room until you approve.

**Drill-down:** Production Workspace (`/file-room/{campaignId}/production/{jobId}`) for deliverable prep, internal notes, file registry, and activity timeline.

---

## 3. Actions Tagia has

| Action | Wired in Owner Console | Where folder goes after |
|--------|------------------------|-------------------------|
| **Approve for client review** | Yes | **Client Review Room** — `ownerApprovalPending` cleared; spine `ready_for_review`; Squishy `ready_for_review` comms |
| **Send back for revision** | Yes | **Production** — spine `building_concepts`; deliverable prep cleared; internal note; client does not see |
| **Hold** | Yes | **Needs Clarification** — internal note; `ownerApprovalPending` cleared; production continues internally |
| **Ask team** | Yes | **Back to assignee** — internal note; `ownerApprovalPending` cleared |
| **Ask client** | Yes | **Waiting on Client** — spine `waiting_on_client`; approved client message stored; `ownerApprovalPending` cleared |

---

## 4. If she approves

**UI:** Approve for client review → confirm dialog → job PATCH `owner_approve_for_review`.

**System effects (existing mutator):**

- `ownerApprovalPending` → `null`
- Spine → `ready_for_review`
- Activity event: Owner approved — ready for client review
- Communication: `ready_for_review` (or `revision_ready_again` if returning from revision)

**Squishy after (status banner):**

> Routed to the client Review Room. This folder left your desk — Squishy will notify the client that review is ready.

**Desk:** Item **removed** from Owner Desk queue (gate only appears while `ownerApprovalPending === "before_review"`).

**Client destination:** Review Room (`/feedback-studio?jobId=…`) — client turn.

---

## 5. If she sends it back

**Planned outcome** (wired in Owner Console — job PATCH `owner_send_back_for_review`):

| Effect | Detail |
|--------|--------|
| Destination | Production rework |
| Client visibility | No — client does not see Review Room |
| Campaign Record | Internal QA hold logged |
| Return path | Production resubmits → folder may return to **Needs My Approval** |

**Squishy after:**

> Routed back to production for revision. This folder left your desk — the client will not see this work until you approve again.

**Job PATCH:** `owner_send_back_for_review` with required `note`.

---

## 6. If she asks the team or client

| Outcome | Destination | Client sees? | Squishy comms |
|---------|-------------|--------------|---------------|
| **Ask team** | Assignee Team Office | No | Internal notes only |
| **Ask client** | Waiting on Client | Yes — approved wording only | Client input requested template |
| **Hold** | Needs Clarification | No | Internal review hold |

**Squishy after:**

> Held for internal clarification. This folder left your desk — QA and production will follow up internally.  
> Routed to the assignee. This folder left your desk — the team will act from their office.  
> Routed to the client queue. This folder left your desk — Squishy will track the response.

**Job PATCH:** `owner_hold_review_gate` · `owner_ask_team_review_gate` · `owner_ask_client_review_gate`

---

## 7. Folder destinations summary

| Outcome | Leaves desk? | Next home | Returns to Owner desk when |
|---------|--------------|-----------|----------------------------|
| Approve | Yes | Client Review Room | Client approves for delivery → **Ready to Release** |
| Send back | Yes | Production | Production resubmits for Owner approval |
| Hold | Yes | Needs Clarification | Internal resolution or resubmit |
| Ask team | Yes | Team Office | Assignee resolves or resubmits |
| Ask client | Yes | Waiting on Client | Response received or stale escalation |

---

## 8. Squishy copy — before and after

| Moment | Squishy channel | Copy |
|--------|-----------------|------|
| Desk closed | Greeting + Squishy says | See §1 |
| Folder open | Squishy says + why reached | Same squishy says; expanded why |
| After approve | Status banner | See §4 |
| After send back (planned) | Status banner | See §5 |
| After ask/hold (planned) | Status banner | See §6 |

---

## 9. Proof commands

```bash
# Seed review-gate fixture
node scripts/seed-production-workspace-v1.mjs

# Coordinator briefing unit tests
npx vitest run src/studio-coordinator/briefings/owner-desk.test.ts

# Desk routing — folder leaves after approve
npx vitest run src/lib/job-control/job-control.test.ts -t "approval_before_review"

# End-to-end folder workflow (requires dev server)
node scripts/prove-owner-folder-review-gate.mjs
```

**Manual check:** Login `tagia@local.dev` / `dev-only` → Owner Console → closed folder shows Squishy says → Review Folder → Approve for client review → status banner → desk advances to next folder or clears.

---

## 10. Template for other folder types

Reuse this structure for each tray:

1. **Why first** — desk greeting + `squishySays` + sort rank  
2. **What Tagia reviews** — decision question + checklist  
3. **Actions** — wired vs planned with `whereAfter` destinations  
4. **Per-outcome routing** — leaves desk, destination, Squishy before/after  
5. **Proof script** — seed + vitest + optional browser check  

**Next folders to proof:** `approval_before_delivery` (Ready to Release), then exception kinds in **Needs My Decision**.

---

## Gap log (intentional — no art chase)

| Gap | Notes |
|-----|-------|
| Auto-enqueue client comms on ask-client | Message stored + spine routed; outbox send remains manual in V1 |
| Recently Handled includes job gate decisions | Scan bucket exceptions only today |
| StayOnMeVoice Squishy sprite | Deferred — coordinator text only in this repo |
