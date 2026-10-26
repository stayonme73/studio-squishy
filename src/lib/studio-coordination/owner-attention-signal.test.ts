import { describe, expect, it } from "vitest";

import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";

import {
  OWNER_ATTENTION_DELIVERY_PREREQUISITE,
  applyOwnerAttentionSignal,
} from "./owner-attention-signal";
import { routeCoordinationAttention, type CoordinationAttentionInput } from "./route-attention";

function exception(
  overrides: Partial<CampaignExceptionRecord> & Pick<CampaignExceptionRecord, "id" | "kind" | "status">,
): CampaignExceptionRecord {
  return {
    campaignId: "synthetic-coordination",
    title: "Synthetic exception",
    description: "customer@example.test private note",
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z",
    raisedByUserId: "staff",
    raisedByDisplayName: "Cedar Lane",
    raisedByRole: "producer_dispatcher",
    ...overrides,
  };
}

function base(overrides: Partial<CoordinationAttentionInput> = {}): CoordinationAttentionInput {
  return {
    campaignId: "synthetic-coordination",
    campaignStatus: "BUILDING_CONCEPTS",
    jobs: [
      {
        jobId: "synthetic-coordination:social_and_promo_graphics",
        skuId: "social_and_promo_graphics",
        spineStatus: "building_concepts",
      },
    ],
    tasks: [],
    qualityFindings: [],
    exceptions: [],
    ...overrides,
  };
}

describe("owner attention signal", () => {
  it("surfaces a scope exception once, ignores a repeat, and clears it when resolved", () => {
    const open = routeCoordinationAttention(
      base({ exceptions: [exception({ id: "scope-1", kind: "scope_change", status: "waiting_owner" })] }),
    );
    const first = applyOwnerAttentionSignal({ attention: open, now: "2026-10-19T21:00:00.000Z" });
    expect(first.signal).toMatchObject({
      state: "RED",
      kind: "OWNER_ACTION_REQUIRED_NOW",
      notifyKind: "owner_red_audible",
      reason: "scope_issue",
      reasonLabel: "Scope issue",
      pending: true,
      pendingCount: 1,
      duplicate: false,
      delivered: false,
      tagiaMustInterveneNow: true,
    });
    expect(first.signal.alertId).toBe("owner-desk:exception:scope-1|scope_issue");
    expect(JSON.stringify(first.signal)).not.toMatch(/@|Cedar Lane|private note/);
    expect(OWNER_ATTENTION_DELIVERY_PREREQUISITE).toMatch(/owner-attention-alert/);

    const second = applyOwnerAttentionSignal({
      attention: open,
      ledger: first.ledger,
      now: "2026-10-19T21:05:00.000Z",
    });
    expect(second.ledger.alerts).toHaveLength(1);
    expect(second.signal).toMatchObject({
      state: "RED",
      notifyKind: "none",
      pending: true,
      pendingCount: 1,
      duplicate: true,
      delivered: false,
      alertId: first.signal.alertId,
    });

    const resolved = routeCoordinationAttention(
      base({ exceptions: [exception({ id: "scope-1", kind: "scope_change", status: "resolved" })] }),
    );
    const cleared = applyOwnerAttentionSignal({
      attention: resolved,
      ledger: second.ledger,
      now: "2026-10-19T21:10:00.000Z",
    });
    expect(cleared.signal).toMatchObject({
      state: "GREEN",
      kind: "CONTINUE",
      notifyKind: "none",
      pending: false,
      pendingCount: 0,
      tagiaMustInterveneNow: false,
      delivered: false,
    });
    expect(cleared.ledger.alerts[0]).toMatchObject({ pending: false, resolvedAt: "2026-10-19T21:10:00.000Z" });
  });

  it("does not alert for a routine issue, a status mismatch, or a clean record", () => {
    const routine = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(
        base({ exceptions: [exception({ id: "routine-1", kind: "routine_internal", status: "waiting_internal" })] }),
      ),
    });
    const mismatch = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(
        base({
          campaignStatus: "READY_FOR_REVIEW",
          jobs: [
            {
              jobId: "synthetic-coordination:social_and_promo_graphics",
              skuId: "social_and_promo_graphics",
              spineStatus: "ready_for_delivery",
            },
          ],
          tasks: [{ taskId: "campaign:producer-kickoff", phase: "strategy", workflowState: "needs_revision" }],
        }),
      ),
    });
    const clean = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(
        base({
          qualityFindings: [{ taskId: "social_and_promo_graphics:qa", action: "qa_pass", category: null }],
          tasks: [{ taskId: "social_and_promo_graphics:qa", phase: "qa", workflowState: "complete" }],
        }),
      ),
    });
    for (const result of [routine, mismatch, clean]) {
      expect(result.signal.state).toBe("GREEN");
      expect(result.signal.notifyKind).toBe("none");
      expect(result.signal.pending).toBe(false);
      expect(result.signal.delivered).toBe(false);
      expect(result.ledger.alerts).toEqual([]);
    }
  });

  it("signals one direction disagreement and one compliance hold, then clears only the resolved decision", () => {
    const directionInput = base({
      qualityFindings: [
        {
          taskId: "social_and_promo_graphics:qa",
          action: "qa_block",
          category: "direction_disagreement",
        },
      ],
    });
    const direction = routeCoordinationAttention(directionInput);
    const first = applyOwnerAttentionSignal({ attention: direction, now: "2026-10-19T21:30:00.000Z" });
    expect(direction.ownerAlerts).toEqual([
      expect.objectContaining({
        source: "quality:social_and_promo_graphics:qa",
        ownerDeskReason: "direction_disagreement",
        proposedDestination: "owner_desk",
        notificationSent: false,
        jobChanged: false,
      }),
    ]);
    expect(first.signal).toMatchObject({
      state: "RED",
      reason: "direction_disagreement",
      reasonLabel: "Direction disagreement",
      pendingCount: 1,
      duplicate: false,
      delivered: false,
      notifyKind: "owner_red_audible",
    });
    expect(first.signal.alertId).toBe("owner-desk:direction_disagreement|social_and_promo_graphics:qa");
    expect(JSON.stringify(first.signal)).not.toMatch(/@|Cedar Lane|private note|scope_issue/);
    expect(first.signal.exactOwnerAction).toMatch(/not approval|Direction disagreement/);

    const repeated = applyOwnerAttentionSignal({
      attention: direction,
      ledger: first.ledger,
      now: "2026-10-19T21:31:00.000Z",
    });
    expect(repeated.ledger.alerts).toHaveLength(1);
    expect(repeated.signal).toMatchObject({ duplicate: true, notifyKind: "none", pendingCount: 1, delivered: false });

    const complianceHold = exception({
      id: "hold-1",
      kind: "compliance_hold",
      status: "waiting_owner",
      taskId: "copy:qa",
    });
    const compliance = routeCoordinationAttention(
      base({
        exceptions: [complianceHold],
        qualityFindings: [
          { taskId: "copy:qa", action: "qa_block", category: "compliance_concern" },
        ],
      }),
    );
    expect(compliance.ownerAlerts).toHaveLength(2);
    expect(compliance.jobChanged).toBe(false);
    expect(complianceHold.status).toBe("waiting_owner");
    expect(compliance.ownerAlerts.every((item) => item.attentionKey === "compliance_hold|copy:qa")).toBe(true);
    expect(compliance.ownerAlerts[0]?.evidence).toMatch(/hold remains/);
    expect(compliance.ownerAlerts[0]?.evidence).toMatch(/not approval/);
    const complianceOnce = applyOwnerAttentionSignal({ attention: compliance, now: "2026-10-19T21:32:00.000Z" });
    expect(complianceOnce.ledger.alerts).toHaveLength(1);
    expect(complianceOnce.signal).toMatchObject({
      reason: "compliance_hold",
      reasonLabel: "Compliance hold",
      pendingCount: 1,
      duplicate: false,
      delivered: false,
      notifyKind: "owner_red_audible",
    });
    expect(complianceOnce.signal.exactOwnerAction).toMatch(/hold remains/);
    expect(complianceOnce.signal.exactOwnerAction).toMatch(/not approval/);
    const complianceAgain = applyOwnerAttentionSignal({
      attention: compliance,
      ledger: complianceOnce.ledger,
      now: "2026-10-19T21:33:00.000Z",
    });
    expect(complianceAgain.ledger.alerts).toHaveLength(1);
    expect(complianceAgain.signal).toMatchObject({ duplicate: true, notifyKind: "none", pendingCount: 1 });

    const bothOpen = routeCoordinationAttention(
      base({
        exceptions: [complianceHold],
        qualityFindings: [
          { taskId: "social_and_promo_graphics:qa", action: "qa_block", category: "direction_disagreement" },
          { taskId: "copy:qa", action: "qa_block", category: "compliance_concern" },
        ],
      }),
    );
    const withBoth = applyOwnerAttentionSignal({
      attention: bothOpen,
      ledger: repeated.ledger,
      now: "2026-10-19T21:33:30.000Z",
    });
    expect(withBoth.ledger.alerts.filter((row) => row.pending)).toHaveLength(2);
    expect(withBoth.signal.reason).not.toBe("scope_issue");

    const directionResolved = applyOwnerAttentionSignal({
      attention: compliance,
      ledger: withBoth.ledger,
      now: "2026-10-19T21:34:00.000Z",
    });
    expect(directionResolved.ledger.alerts.find((row) => row.reason === "direction_disagreement")).toMatchObject({
      pending: false,
      resolvedAt: "2026-10-19T21:34:00.000Z",
    });
    expect(directionResolved.signal).toMatchObject({
      state: "RED",
      reason: "compliance_hold",
      reasonLabel: "Compliance hold",
      pendingCount: 1,
      delivered: false,
    });

    const bothClear = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(base()),
      ledger: directionResolved.ledger,
      now: "2026-10-19T21:35:00.000Z",
    });
    expect(bothClear.signal.state).toBe("GREEN");
    expect(bothClear.signal.pending).toBe(false);
    expect(bothClear.ledger.alerts.every((row) => row.pending === false)).toBe(true);
  });

  it("keeps a routine Quality correction and an unescalated compliance hold off the Owner signal", () => {
    const correction = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(
        base({
          qualityFindings: [
            {
              taskId: "social_and_promo_graphics:qa",
              action: "qa_fail",
              category: "production_correction",
            },
          ],
        }),
      ),
    });
    const unescalated = applyOwnerAttentionSignal({
      attention: routeCoordinationAttention(
        base({
          exceptions: [exception({ id: "hold-internal", kind: "compliance_hold", status: "waiting_internal" })],
        }),
      ),
    });
    expect(correction.signal.state).toBe("GREEN");
    expect(unescalated.signal.state).toBe("GREEN");
    expect(correction.ledger.alerts).toEqual([]);
    expect(unescalated.ledger.alerts).toEqual([]);
    expect(unescalated.signal.delivered).toBe(false);
  });
});
