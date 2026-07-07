import { describe, expect, it } from "vitest";

import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import { resolveOwnerDeskItems } from "./owner-desk";
import type { PurchasedJobRecord } from "./types";

const NOW = "2026-07-06T20:00:00.000Z";

function baseJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "owner-refund-v1:sm-001",
    campaignId: "owner-refund-v1",
    skuId: "sm-001",
    serviceName: "Social Media Launch Set",
    spineStatus: "waiting_on_client",
    productionLane: "standard",
    refundEligibleAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function refundInteraction(
  overrides: Partial<OwnerDecisionInteractionRecord> = {},
): OwnerDecisionInteractionRecord {
  return {
    id: "interaction-refund-v1",
    campaignId: "owner-refund-v1",
    jobId: "owner-refund-v1:sm-001",
    interactionKind: "refund_request",
    status: "waiting_owner",
    clientMessage: "Project stalled — I want out.",
    createdAt: NOW,
    updatedAt: NOW,
    refundSnapshot: {
      reason: "Project stalled — I want out.",
      requestedOutcome: "Full refund",
      productionStarted: false,
      receivedConceptsOrFiles: false,
      policyStatusLabel: "May be eligible per 14-day waiting-on-client policy — Owner approval required.",
      timelineFacts: "Waiting on client since Jun 20, 2026.",
      recommendedNextAction: "Review client reason and timeline, then approve or deny — do not auto-refund.",
      submittedAt: NOW,
    },
    ...overrides,
  };
}

describe("resolveOwnerDeskItems — refund intake gate", () => {
  it("does not surface refund folder for timer signal alone", () => {
    const items = resolveOwnerDeskItems([
      {
        campaignId: "owner-refund-v1",
        campaignName: "Refund Signal Only",
        jobs: [baseJob()],
        exceptions: [],
        laneViews: [],
        ownerDecisionInteractions: [],
      },
    ]);
    expect(items.some((item) => item.reason === "refund_eligible")).toBe(false);
  });

  it("surfaces refund folder when structured intake is complete", () => {
    const items = resolveOwnerDeskItems([
      {
        campaignId: "owner-refund-v1",
        campaignName: "Refund Intake Complete",
        jobs: [baseJob()],
        exceptions: [],
        laneViews: [],
        ownerDecisionInteractions: [refundInteraction()],
      },
    ]);
    const refund = items.find((item) => item.reason === "refund_eligible");
    expect(refund?.detail).toBe("Project stalled — I want out.");
    expect(refund?.refundSnapshot?.requestedOutcome).toBe("Full refund");
    expect(refund?.interactionId).toBe("interaction-refund-v1");
  });

  it("does not surface refund folder when snapshot is incomplete", () => {
    const items = resolveOwnerDeskItems([
      {
        campaignId: "owner-refund-v1",
        campaignName: "Incomplete Intake",
        jobs: [baseJob()],
        exceptions: [],
        laneViews: [],
        ownerDecisionInteractions: [
          refundInteraction({
            refundSnapshot: undefined,
          }),
        ],
      },
    ]);
    expect(items.some((item) => item.reason === "refund_eligible")).toBe(false);
  });
});
