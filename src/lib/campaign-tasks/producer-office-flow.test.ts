import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { canEditKitchenWorkForTask } from "@/lib/campaign-production/access";

import { buildKitchenCopyStageFixture } from "./kitchen-test-fixtures";
import type { CampaignTaskItem } from "./types";
import type { CampaignRecord } from "@/config/studio-board";

const now = "2026-06-30T20:00:00.000Z";

const producerStaff: StudioUser = {
  id: "staff-producer-capture",
  email: "producer-capture@local.dev",
  displayName: "Producer Capture",
  roles: ["staff"],
};

const copyStaff: StudioUser = {
  id: "staff-copy-capture",
  email: "copy-capture@local.dev",
  displayName: "Copy Capture",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-producer-capture": ["producer-office-v1-proof"],
    "staff-copy-capture": ["producer-office-v1-proof"],
  },
  staffCapabilities: {
    "staff-producer-capture": ["producer_dispatcher"],
    "staff-copy-capture": ["copy"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "producer-office-v1-proof",
  campaignName: "Producer Office Proof",
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

function copyTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "in_progress",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:strategy_content_direction"],
    workflowState: "in_progress",
    responsibleRole: "copy",
    claimedByUserId: copyStaff.id,
    claimedAt: now,
    ...overrides,
  };
}

const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, copyStaff, now);

describe("producer office access", () => {
  it("producer cannot edit kitchen production body for copy tasks", () => {
    expect(
      canEditKitchenWorkForTask(
        producerStaff,
        copyTask(),
        assignments,
        campaign.campaignId,
        kitchenCopyFixture.production,
      ),
    ).toBe(false);
  });

  it("copy staff can edit when claimed and stage matches", () => {
    expect(
      canEditKitchenWorkForTask(
        copyStaff,
        copyTask(),
        assignments,
        campaign.campaignId,
        kitchenCopyFixture.production,
      ),
    ).toBe(true);
  });
});
