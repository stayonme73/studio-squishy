# Owner Folder Workflow — Needs My Decision V1 Proof (Folder 3 remaining)

**Status:** Workflow proof — 2026-07-06  
**Template folder:** Needs My Decision tray  
**Route:** `/file-room/owner-console`  
**Inherits:** [`docs/owner-folder-workflow-needs-my-decision-v1-planned.md`](owner-folder-workflow-needs-my-decision-v1-planned.md) · [`docs/owner-folder-workflow-compliance-hold-v1-proof.md`](owner-folder-workflow-compliance-hold-v1-proof.md) · [`docs/owner-folder-workflow-direction-disagreement-v1-proof.md`](owner-folder-workflow-direction-disagreement-v1-proof.md)

**No visuals:** No room art, Squishy sprite, outfit, or animation.

---

## Seeded campaigns

| Decision type | Campaign | Signal |
|---------------|----------|--------|
| Deadline commitment | `owner-deadline-v1` | `exc-owner-deadline-v1` · `deadline_commitment` |
| Client boundary review | `owner-revision-v1` | `exc-owner-revision-v1` · legacy `revision_exhausted` |
| Scope change | `owner-scope-v1` | `exc-owner-scope-v1` · `scope_change` |
| Refund / payment | `owner-refund-v1` | Job `owner-refund-v1:sm-001` · `refundEligibleAt` · structured intake required |

**Refund intake (V1):** [`docs/refund-request-intake-v1.md`](refund-request-intake-v1.md) — all client channels share one gate; no blank Owner Desk refund folders.
| Client complaint | `owner-complaint-v1` | `interaction-owner-complaint-v1` · `complaint` |
| Heavy lane full | `owner-heavy-lane-v1` | Queued job `owner-heavy-lane-v1:sm-002` |

Seed: `node scripts/seed-owner-folder-3-remaining.mjs`

---

## Owner Confirmation

Every action confirms destination, notifications queued, Campaign Record updated, and desk clearance — via post-decision briefing copy ending with:

> Confirmed: destination assigned, notifications queued, record updated, desk clear.

---

## Proof commands

```bash
node scripts/seed-owner-folder-3-remaining.mjs
node scripts/prove-owner-folder-3-remaining.mjs
npx vitest run src/lib/campaign-tasks/refund-request-routing.test.ts \
  src/lib/campaign-tasks/refund-request-intake.test.ts \
  src/lib/campaign-tasks/refund-request-actions.test.ts \
  src/lib/job-control/owner-desk.test.ts \
  src/lib/campaign-tasks/owner-decision-folder-actions.test.ts \
  src/lib/campaign-tasks/owner-decision-complaint-actions.test.ts \
  src/lib/job-control/owner-decision-job-actions.test.ts \
  src/studio-coordinator/briefings/owner-desk.test.ts \
  src/lib/campaign-tasks/owner-console-sequential.test.ts
```

---

## Wiring

- Exception PATCH: `src/lib/campaign-tasks/owner-decision-folder-dispatch.ts` → `applyTaskPatch`
- Complaint: `src/lib/campaign-tasks/owner-decision-complaint-actions.ts`
- Job PATCH: `src/lib/job-control/owner-decision-job-actions.ts` → `applyProductionWorkspacePatch`
- Desk: `src/lib/job-control/owner-desk.ts`
- Sequential urgency: `src/lib/campaign-tasks/owner-console-sequential.ts`
- Config: `src/config/owner-console.ts`
- Briefings: `src/studio-coordinator/briefings/owner-desk.ts`
- Surfaces: `src/components/file-room/OwnerDecisionFolderSurfaces.tsx`
