import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";

import { routeCoordinationAttention, type CoordinationAttentionInput } from "./route-attention";

function exception(
  overrides: Partial<CampaignExceptionRecord> & Pick<CampaignExceptionRecord, "id" | "kind" | "status">,
): CampaignExceptionRecord {
  return {
    campaignId: "synthetic-coordination",
    title: "Synthetic exception",
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z",
    raisedByUserId: "staff",
    raisedByDisplayName: "Staff",
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

describe("synthetic coordination routing", () => {
  it("keeps a routine issue and the synthetic status mismatch off the Owner desk", () => {
    const tasks = JSON.parse(
      readFileSync("data/campaign-tasks/messy-customer-social-promo-recovery.json", "utf8"),
    ) as {
      campaignId: string;
      tasks: { id: string; phase: string; workflowState: string }[];
      jobRecords: { jobId: string; skuId: string; spineStatus: "ready_for_delivery"; ownerApprovalPending?: null }[];
      qaRecords: { taskId: string; action: "qa_pass"; category?: string | null }[];
      exceptionRecords?: CampaignExceptionRecord[];
    };
    const campaign = JSON.parse(
      readFileSync("data/campaigns/messy-customer-social-promo-recovery.json", "utf8"),
    ) as { record: { campaignStatus: "READY_FOR_REVIEW"; campaignName: string } };
    const record = tasks;
    const live = routeCoordinationAttention({
      campaignId: record.campaignId,
      campaignStatus: campaign.record.campaignStatus,
      jobs: record.jobRecords.map((job) => ({
        jobId: job.jobId,
        skuId: job.skuId,
        spineStatus: job.spineStatus,
        ownerApprovalPending: job.ownerApprovalPending ?? null,
      })),
      tasks: record.tasks.map((task) => ({
        taskId: task.id,
        phase: task.phase,
        workflowState: task.workflowState,
      })),
      qualityFindings: record.qaRecords.map((finding) => ({
        taskId: finding.taskId,
        action: finding.action,
        category: finding.category ?? null,
      })),
      exceptions: record.exceptionRecords ?? [],
    });
    const routineException = routeCoordinationAttention(
      base({
        exceptions: [exception({ id: "routine-1", kind: "routine_internal", status: "waiting_internal" })],
      }),
    );

    expect(live.ownerAlerts).toEqual([]);
    expect(live.notificationSent).toBe(false);
    expect(live.jobChanged).toBe(false);
    expect(live.routineRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "job:messy-customer-social-promo-recovery:social_and_promo_graphics:status",
          classification: "routine",
          verdict: "owner_not_required",
          proposedDestination: "machine",
          ownerDeskReason: null,
        }),
        expect.objectContaining({
          source: "task:campaign:producer-kickoff",
          classification: "routine",
          proposedDestination: "production",
          verdict: "owner_not_required",
        }),
      ]),
    );
    expect(JSON.stringify(live)).not.toContain(campaign.record.campaignName);

    expect(routineException.ownerAlerts).toEqual([]);
    expect(routineException.routineRoutes).toEqual([
      expect.objectContaining({
        source: "exception:routine-1",
        classification: "routine",
        verdict: "owner_not_required",
        proposedDestination: "production",
        notificationSent: false,
        jobChanged: false,
      }),
    ]);
    expect(routineException.routineRoutes[0]?.evidence).toMatch(/Assigned — internal follow-up/);
  });

  it("identifies a stored scope change as an Owner desk decision without sending it", () => {
    const attention = routeCoordinationAttention(
      base({
        exceptions: [exception({ id: "scope-1", kind: "scope_change", status: "waiting_owner" })],
      }),
    );

    expect(attention.ownerAlerts).toEqual([
      expect.objectContaining({
        source: "exception:scope-1",
        classification: "owner_decision",
        verdict: "owner_required",
        proposedDestination: "owner_desk",
        ownerDeskReason: "scope_issue",
        notificationSent: false,
        jobChanged: false,
      }),
    ]);
    expect(attention.notificationSent).toBe(false);
    expect(attention.jobChanged).toBe(false);
    expect(JSON.stringify(attention)).not.toMatch(/@|sk_live_|Bearer /);
  });

  it("creates no alert when the synthetic record has no issue", () => {
    const attention = routeCoordinationAttention(
      base({
        qualityFindings: [
          {
            taskId: "social_and_promo_graphics:qa",
            action: "qa_pass",
            category: null,
          },
        ],
        tasks: [
          {
            taskId: "social_and_promo_graphics:qa",
            phase: "qa",
            workflowState: "complete",
          },
        ],
      }),
    );

    expect(attention.routes).toEqual([]);
    expect(attention.ownerAlerts).toEqual([]);
    expect(attention.routineRoutes).toEqual([]);
    expect(attention.milestones).toEqual([]);
    expect(attention.notificationSent).toBe(false);
    expect(attention.jobChanged).toBe(false);
  });
});
