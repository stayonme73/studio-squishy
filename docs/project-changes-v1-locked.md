# Project Changes V1 — LOCKED (Package 3)

**Status:** Founder approved — **Package 3 Project Change architecture certified** effective 2026-07-11  
**Approved by:** Tagia (certification Block 6 + Block 5B)  
**Routes:** Project Record `/campaign-details` · File Room customer requests · Owner Desk scope actions · Project Activity API

## Change policy

Package 3 V1 is **stable**. Do not reopen for refactors, navigation work, pricing automation, or Route Map mutation paths unless explicitly requested by Tagia.

Future edits are limited to:

- verified bugs found in production or certification
- intentional business decisions approved by Tagia
- deferred items listed below when explicitly scheduled

**Do not:** add mid-project checkout, invent refund/schedule promises, expose internal Owner notes to customers, allow customer plan mutation, or route freeform request text directly into `approvedStudioPlan`.

## Architecture (locked)

| Layer | Responsibility |
|-------|----------------|
| Project Activity | Append-only audit trail; canonical request + consent state |
| Owner Desk | `scope_change` exceptions linked via `projectChangeExceptionId` |
| Decision Core | Existing `scope_request` coordinator path only (no new evaluator) |
| Apply boundary | `applyApprovedProjectChange()` — sole post-payment plan mutation path |
| Owner Desk apply | `owner_apply_project_change_scope` → `orchestrateOwnerApplyProjectChangeScope()` |
| Customer UI | Squishy explains; consent prompt uses grounded Activity copy only |

**The Studio recommends. The client decides.** Owner approves scope outcomes; customer consent is required when Owner requests approval before apply.

## Customer journey (Project Change)

1. Customer submits scope-changing request from Project Record (Squishy or Information Update freeform path).
2. Request enters Project Activity — **plan unchanged**.
3. Staff classifies as `project_change` → status `held`.
4. Staff explicitly **Escalates** → one linked `scope_change` exception; `project_change_escalated` once.
5. Owner outcomes sync Activity + Owner Desk through orchestration (hold / decline / ask approval / approve).
6. When Owner asks for customer approval → consent `pending`; Squishy shows grounded prompt; Owner Desk → `waiting_client`.
7. Customer grants consent → Activity updated; Owner Desk returns to **`waiting_owner`**; **plan unchanged**.
8. Owner applies typed delta via **`owner_apply_project_change_scope`** (Owner Desk) — plan mutates; Activity + Owner Desk resolve.
9. Customer decline → Activity + Owner Desk resolve; plan unchanged.

## Owner approve after consent (locked — Block 5B)

When customer consent is **granted**:

- Linked `scope_change` exception transitions **`waiting_client` → `waiting_owner`**
- Owner Desk surfaces **Apply project change** with typed catalog delta (not plain approve)
- `owner_approve_scope_change` is **blocked** — owner must apply with delta
- Apply constitutes owner approval when consent was required (`approval_requested` + `granted`)
- No manual Activity-state simulation is valid in production or certification

## Typed apply delta (V1 allowlist)

Server-validated only — never from client freeform text or replacement plan payloads:

| Kind | Behavior |
|------|----------|
| `remove_service` | Removes catalog SKU from `approvedStudioPlan`; preserves acknowledgment fields |
| `add_service` | **Blocked when catalog SKU has price > 0** — request stays `held` for payment/new-order handling |

## Payment / new-order rule (V1 — locked)

**Priced service additions require payment or a new order before apply.** V1 does not implement mid-project checkout, automated pricing quotes, refund automation, or schedule promises. Blocked additions leave the request in `held` with a staff-facing payment-required response — no invented customer checkout path.

## Orchestration boundaries (locked)

Dual- or triple-store writes use in-memory planning first; persist only on full success; rollback on failure:

| Boundary | Stores |
|----------|--------|
| Owner scope outcome | Project Activity + Owner Desk |
| Customer consent grant | Project Activity + Owner Desk (`waiting_client` → `waiting_owner`) |
| Customer consent decline | Project Activity + Owner Desk (resolve) |
| Approved apply | Campaign plan + Project Activity + Owner Desk/tasks |

Never emit `project_change_applied` unless the campaign plan mutation persisted. Never leave a mutated plan if Activity or Owner Desk sync fails.

## Customer-visible copy (locked)

- Consent prompt uses `customer_approval_requested` detail and request summary only.
- Grant confirmation does **not** claim the change was applied.
- Applied confirmation uses service-name summary via `project_change_applied` — no exception IDs or internal notes.

## API surfaces (locked)

| Actor | Endpoint | Actions |
|-------|----------|---------|
| Customer | `POST .../project-activity` | `submit_request`, `respond_project_change_consent` |
| Staff | `PATCH .../project-activity/[requestId]` | `classify`, `escalate`, `apply` (IU only), `apply_project_change`, `reject` |
| Owner | `PATCH .../tasks` | `owner_*_scope_change` sync actions, **`owner_apply_project_change_scope`** |

Customer PATCH on campaign remains default-deny for `approvedStudioPlan`. Route Map paid-plan mutation guards remain unchanged.

## Package 2 Information Update (frozen)

The lightweight IU path (`information_update` → classify → apply to official field) is **unchanged** by Package 3. Do not route IU requests through project-change apply.

## Certification

Certified 2026-07-11 via `src/lib/project-change/package3-certification.test.ts` (14 journeys) plus:

- `owner-apply-orchestrator.test.ts` — consent → Owner Desk actionable → typed apply
- `sync-owner-outcome.test.ts`
- `consent-response.test.ts`
- `apply-orchestrator.test.ts`

Run: `npm run test:package3-certification`

## Deferred work (not in V1)

| Item | Notes |
|------|-------|
| Mid-project checkout | Required before priced `add_service` can apply post-payment |
| Automated pricing / refund / schedule decisions | Owner Desk + human judgment in V1 |
| Navigation consolidation | Out of Package 3 scope |
| Global Squishy placement | Out of Package 3 scope |
| Decision Core impact snapshots | Minimum architecture — deferred |
| `docs/project-changes-v1-planned.md` | Superseded by this lock doc |

## Code map

| Module | Role |
|--------|------|
| `src/lib/project-change/types.ts` | Typed delta |
| `src/lib/project-change/escalate.ts` | Escalation bridge |
| `src/lib/project-change/sync-owner-outcome.ts` | Owner → Activity sync planner |
| `src/lib/project-change/owner-outcome-orchestrator.ts` | Owner dual-write |
| `src/lib/project-change/consent-*.ts` | Customer consent loop + desk handoff |
| `src/lib/project-change/owner-apply-orchestrator.ts` | Owner Desk → apply bridge |
| `src/lib/project-change/owner-apply-surface.ts` | Owner Desk apply readiness |
| `src/lib/project-change/apply-*.ts` | Plan apply orchestration |
| `src/lib/project-activity/customer-view.ts` | Customer-safe projections |

## Related locks

- [customer-journey-v1-locked.md](./customer-journey-v1-locked.md) — Project Record naming
- [recommendation-not-direction-v1-locked.md](./recommendation-not-direction-v1-locked.md) — recommend, not direct
