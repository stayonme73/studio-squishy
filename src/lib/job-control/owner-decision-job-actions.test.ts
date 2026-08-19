import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";

import {
  applyOwnerApproveRefund,
  applyOwnerDenyRefund,
  applyOwnerResolveHeavyLane,
} from "./owner-decision-job-actions";
import type { PurchasedJobRecord } from "./types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

const now = "2026-07-06T20:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const campaign: CampaignRecord = {
  campaignId: "refund-folder-3",
  campaignName: "Refund Demo",
  campaignStatus: "WAITING_ON_CLIENT",
  campaignDescription: "",
  estimatedCompletion: "",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  paymentReceivedAt: now,
  projectDetailsSubmittedAt: now,
  approvedStudioPlan: {
    selectedServiceIds: ["sm-001"],
    includedServiceIds: ["sm-001"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 30000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 30000,
    lineItems: [],
    approvedAt: now,
  },
  revisionRoundsIncluded: 1,
  revisionRoundsUsed: 0,
  createdAt: now,
  updatedAt: now,
};

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "refund-folder-3:sm-001",
    campaignId: "refund-folder-3",
    skuId: "sm-001",
    serviceName: "Social Media Launch Set",
    spineStatus: "waiting_on_client",
    productionLane: "standard",
    refundEligibleAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function envelope(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "refund-folder-3",
    tasks: [],
    planFingerprint: "fp",
    updatedAt: now,
    version: 11,
    syncedAt: now,
    jobRecords: [jobRecord],
    jobActivityEvents: [],
    exceptionRecords: [],
    exceptionEvents: [],
    qaRecords: [],
  };
}

describe("owner-decision-job-actions", () => {
  it("owner_approve_refund closes job and records decision", () => {
    const result = applyOwnerApproveRefund(
      envelope(job()),
      campaign,
      "refund-folder-3:sm-001",
      { reason: "14-day path met.", ownerNotes: "Approved." },
      owner,
      "tagia",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.spineStatus).toBe("refunded_cancelled");
    expect(result.job.refundOwnerDecisionAt).toBeTruthy();
    const replay = applyOwnerApproveRefund(
      result.envelope,
      campaign,
      "refund-folder-3:sm-001",
      { reason: "Clicked again." },
      owner,
      "tagia",
    );
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.status).toBe(409);
    }
    expect(
      (result.envelope.jobCommunicationRecords ?? []).filter((row) => row.eventType === "refund_issued"),
    ).toHaveLength(1);
  });

  it("owner_deny_refund clears eligibility and records decision", () => {
    const result = applyOwnerDenyRefund(
      envelope(job()),
      "refund-folder-3:sm-001",
      { ownerNotes: "Preference only." },
      owner,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.refundEligibleAt).toBeNull();
    expect(result.job.refundOwnerDecisionAt).toBeTruthy();
  });

  it("owner_resolve_heavy_lane records lane decision", () => {
    const result = applyOwnerResolveHeavyLane(
      envelope(job({ productionLane: "heavy" })),
      "refund-folder-3:sm-001",
      { decision: "wait", ownerNotes: "Active job almost done." },
      owner,
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.heavyLaneOwnerDecision).toBe("wait");
  });
});
