import { describe, expect, it } from "vitest";

import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
import { customerVisibilityContinuityV1 as copy } from "@/config/customer-visibility-continuity-v1";
import { resolveCustomerVisibilityContinuityView } from "@/lib/customer-visibility-continuity";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";

function baseCampaign(
  status: CampaignStatus,
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = "2026-08-01T12:00:00.000Z";
  return {
    campaignId: `cvc-${status}`,
    campaignName: "Make My Social Media Posts",
    campaignStatus: status,
    campaignDescription: "Test campaign",
    estimatedCompletion: "Timeline appears after production starts",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    createdAt: now,
    updatedAt: now,
    studioNotes: [],
    deliverablesDelivered: {},
    ...overrides,
  };
}

describe("resolveCustomerVisibilityContinuityView", () => {
  it("shows empty campaign guidance without inventing dates or risks", () => {
    const view = resolveCustomerVisibilityContinuityView({ campaign: null });
    expect(view.hasCampaign).toBe(false);
    expect(view.targetOrCheckpoint).toBe(copy.empty.targetNotSet);
    expect(view.riskOrBlocker).toBe(copy.empty.noRisk);
    expect(view.whoActsNext).toBe("none");
    expect(view.hasAuthoritativeTargetDate).toBe(false);
  });

  it("maps incomplete intake to customer-owned need and risk", () => {
    const view = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("PAYMENT_RECEIVED", {
        paymentReceivedAt: "2026-08-01T12:00:00.000Z",
      }),
    });
    expect(view.neededItems).toContain("Finish Project Intake");
    expect(view.whoActsNext).toBe("customer");
    expect(view.whoActsNextLabel).toBe(copy.actors.customer);
    expect(view.riskOrBlocker).toMatch(/Project Intake is incomplete/i);
    expect(view.hasAuthoritativeTargetDate).toBe(false);
    expect(view.targetOrCheckpoint).toBe(copy.empty.targetNotSet);
  });

  it("surfaces still-needed materials and received notes without inventing files", () => {
    const view = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("BUILDING_CONCEPTS", {
        paymentReceivedAt: "2026-08-01T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-08-01T13:00:00.000Z",
      }),
      materialsFacts: {
        blockingRequiredCount: 1,
        stillNeededLabels: ["Campaign goal/message"],
        receivedLabels: ["Brand assets"],
      },
      displayFacts: {
        blockingRequiredCount: 1,
        stillNeededLabel: "Campaign goal/message",
      },
    });
    expect(view.neededItems).toContain("Campaign goal/message");
    expect(view.whatWeNeedFromYou).toContain("Campaign goal/message");
    expect(view.receivedOrCompleteNotes.some((n) => /Brand assets/i.test(n))).toBe(true);
    expect(view.receivedOrCompleteNotes.some((n) => /Project Intake submitted/i.test(n))).toBe(
      true,
    );
    expect(view.whoActsNext).toBe("customer");
    expect(view.riskOrBlocker).toMatch(/Required material still needed/i);
  });

  it("uses authoritative targetCompletionDate only when present", () => {
    const withDate = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("BUILDING_CONCEPTS", {
        paymentReceivedAt: "2026-08-01T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-08-01T13:00:00.000Z",
        targetCompletionDate: "2026-08-20T00:00:00.000Z",
      }),
      materialsFacts: {
        blockingRequiredCount: 0,
        stillNeededLabels: [],
        receivedLabels: [],
      },
      displayFacts: { blockingRequiredCount: 0 },
    });
    expect(withDate.hasAuthoritativeTargetDate).toBe(true);
    expect(withDate.targetOrCheckpoint).not.toBe(copy.empty.targetNotSet);
    expect(withDate.targetOrCheckpoint).not.toMatch(/business days|guaranteed/i);

    const withoutDate = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("BUILDING_CONCEPTS", {
        paymentReceivedAt: "2026-08-01T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-08-01T13:00:00.000Z",
        targetCompletionDate: null,
      }),
      materialsFacts: {
        blockingRequiredCount: 0,
        stillNeededLabels: [],
      },
      displayFacts: { blockingRequiredCount: 0 },
      headerSnapshot: {
        statusDisplay: "IN PROGRESS",
        estimatedCompletion: "In progress",
        nextUpdate: "When the next concept step is ready",
      },
    });
    expect(withoutDate.hasAuthoritativeTargetDate).toBe(false);
    expect(withoutDate.targetOrCheckpoint).toMatch(/Checkpoint:/i);
  });

  it("marks Studio as next actor when no customer action remains", () => {
    const view = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("DISCOVERY_COMPLETE"),
    });
    expect(view.whoActsNext).toBe("studio");
    expect(view.whatWeNeedFromYou).toBe(copy.empty.nothingNeeded);
    expect(view.riskOrBlocker).toBe(copy.empty.noRisk);
  });

  it("includes waiting-on-client jobs as customer need and risk", () => {
    const jobs: CustomerJobStatusSummary[] = [
      {
        jobId: "job-1",
        campaignId: "cvc",
        skuId: "v2-rtu-social-posts",
        serviceName: "Social Posts",
        statusLabel: "Waiting on you",
        isWaitingOnClient: true,
        hasProductionStarted: true,
        deliveredAt: null,
        clientDeadline: null,
      },
    ];
    const view = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("BUILDING_CONCEPTS", {
        paymentReceivedAt: "2026-08-01T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-08-01T13:00:00.000Z",
      }),
      materialsFacts: { blockingRequiredCount: 0, stillNeededLabels: [] },
      displayFacts: { blockingRequiredCount: 0 },
      jobs,
    });
    expect(view.neededItems.some((item) => /Social Posts/i.test(item))).toBe(true);
    expect(view.whoActsNext).toBe("customer");
    expect(view.riskOrBlocker).toMatch(/waiting on you/i);
  });

  it("never invents guaranteed ETA language in the visibility story", () => {
    const view = resolveCustomerVisibilityContinuityView({
      campaign: baseCampaign("PAYMENT_RECEIVED", {
        paymentReceivedAt: "2026-08-01T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-08-01T13:00:00.000Z",
      }),
      materialsFacts: { blockingRequiredCount: 0, stillNeededLabels: [] },
      displayFacts: { blockingRequiredCount: 0 },
    });
    const blob = [
      view.whatWeNeedFromYou,
      view.whatStudioIsDoing,
      view.nextStep,
      view.targetOrCheckpoint,
      view.riskOrBlocker,
    ].join(" ");
    expect(blob).not.toMatch(/guaranteed|Within 2 business days|Approximately 7 business days/i);
  });
});
