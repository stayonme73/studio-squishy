import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { canEditKitchenWorkForTask } from "@/lib/campaign-production/access";

import { applySubmitForHandoff } from "./actions";
import { buildKitchenCreativeStageFixture } from "./kitchen-test-fixtures";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-06-30T20:00:00.000Z";

const creativeStaff: StudioUser = {
  id: "staff-creative-capture",
  email: "creative-capture@local.dev",
  displayName: "Creative Capture",
  roles: ["staff"],
};

const strategyStaff: StudioUser = {
  id: "staff-strategy-capture",
  email: "strategy-capture@local.dev",
  displayName: "Strategy Capture",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-creative-capture": ["creative-office-v1-proof"],
    "staff-strategy-capture": ["creative-office-v1-proof"],
  },
  staffCapabilities: {
    "staff-creative-capture": ["creative_production"],
    "staff-strategy-capture": ["strategy"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "creative-office-v1-proof",
  campaignName: "Creative Office Proof",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "Proof",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  approvedStudioPlan: {
    selectedServiceIds: ["sm-001"],
    includedServiceIds: ["sm-001"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 50000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 50000,
    lineItems: [
      {
        skuId: "sm-001",
        serviceName: "Social Media Launch Set",
        billingType: "one_time",
        exactPriceCents: 50000,
        priceDisplay: "$500",
        deliverables: ["Posts"],
        exclusions: [],
        timingWindowLabel: "2 weeks",
        revisionRule: "1 round",
        clientResponsibilities: [],
        executionResponsibility: "studio",
      },
    ],
    approvedAt: now,
  },
  projectDetailsSubmittedAt: now,
  paymentReceivedAt: now,
  selectedCampaignOption: "Option A",
  createdAt: now,
  updatedAt: now,
};

function creativeTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:creative",
    title: "Social — Creative",
    phase: "creative",
    status: "in_progress",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:copy"],
    workflowState: "in_progress",
    responsibleRole: "creative_production",
    claimedByUserId: creativeStaff.id,
    claimedAt: now,
    ...overrides,
  };
}

function envelope(tasks: CampaignTaskItem[]): ServerTasksEnvelope {
  return {
    campaignId: campaign.campaignId,
    tasks,
    planFingerprint: "sm-001:one_time",
    planVersion: 1,
    updatedAt: now,
    version: 3,
    handoffs: [],
    syncedAt: now,
  };
}

const kitchenCreativeFixture = buildKitchenCreativeStageFixture(campaign, creativeStaff, now);

describe("creative office flow", () => {
  it("submit_for_handoff moves creative to ready_for_qa with workVersionId", () => {
    const claimed = creativeTask();
    const result = applySubmitForHandoff(
      envelope([claimed]),
      {
        action: "submit_for_handoff",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: now,
        handoff: {
          completedSummary: "Creative bundle complete.",
          sourceContext: "Copy approved.",
          nextSteps: "QA review.",
          workVersionId: kitchenCreativeFixture.creativeWorkVersionId,
        },
      },
      creativeStaff,
      {
        campaign,
        materials: [],
        assignments,
        production: kitchenCreativeFixture.production,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("ready_for_qa");
      expect(result.envelope.handoffs?.[0]?.workVersionId).toBe(
        kitchenCreativeFixture.creativeWorkVersionId,
      );
    }
  });

  it("strategy staff without creative capability is denied kitchen edit access", () => {
    const claimed = creativeTask();
    expect(
      canEditKitchenWorkForTask(
        strategyStaff,
        claimed,
        assignments,
        campaign.campaignId,
        kitchenCreativeFixture.production,
      ),
    ).toBe(false);
  });
});
