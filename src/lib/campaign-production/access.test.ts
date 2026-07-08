import { describe, expect, it } from "vitest";

import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { syncProductionWithPlan } from "@/lib/campaign-production/plan-sync";
import { emptyProductionRecord } from "@/lib/campaign-production/plan-sync";
import type { CampaignProductionRecord } from "@/lib/campaign-production/types";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { canEditKitchenWorkForTask } from "./access";

const now = "2026-06-30T12:00:00.000Z";

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "copy-staff": ["campaign-1"] },
  staffCapabilities: { "copy-staff": ["copy"] },
};

const producerAssignments: CampaignAssignmentsFile = {
  staffByUserId: { "producer-staff": ["campaign-1"] },
  staffCapabilities: { "producer-staff": ["producer_dispatcher"] },
};

const ownerUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"] as const,
};

const copyStaff = {
  id: "copy-staff",
  email: "copy@local.dev",
  displayName: "Copy Staff",
  roles: ["staff"] as const,
};

const producerStaff = {
  id: "producer-staff",
  email: "producer@local.dev",
  displayName: "Producer",
  roles: ["staff"] as const,
};

const campaign = {
  campaignId: "campaign-1",
  campaignName: "Kitchen Test",
  campaignStatus: "BUILDING_CONCEPTS" as const,
  campaignDescription: "Test",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan" as const,
  packageLabel: "Custom",
  approvedStudioPlan: {
    selectedServiceIds: ["sm-001"] as const,
    includedServiceIds: ["sm-001"] as const,
    additionalServiceIds: [] as const,
    additionalCostUsd: 0,
    oneTimeTotalCents: 50000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 50000,
    lineItems: [
      {
        skuId: "sm-001" as const,
        serviceName: "Social",
        billingType: "one_time" as const,
        exactPriceCents: 50000,
        priceDisplay: "$500",
        deliverables: ["Posts"],
        exclusions: [],
        timingWindowLabel: "2 weeks",
        revisionRule: "1 round",
        clientResponsibilities: [],
        executionResponsibility: "studio" as const,
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
    dependsOn: [],
    workflowState: "in_progress",
    claimedByUserId: "copy-staff",
    responsibleRole: "copy",
    ...overrides,
  };
}

function productionEnvelopeFrom(record: CampaignProductionRecord) {
  return { ...record, syncedAt: now };
}

describe("canEditKitchenWorkForTask", () => {
  it("allows owner override without claim", () => {
    const envelope = productionEnvelopeFrom(
      syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign),
    );
    expect(
      canEditKitchenWorkForTask(ownerUser, copyTask({ claimedByUserId: undefined }), assignments, "campaign-1", envelope),
    ).toBe(true);
  });

  it("denies producer without claim even when assigned to campaign", () => {
    const envelope = productionEnvelopeFrom(
      syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign),
    );
    expect(
      canEditKitchenWorkForTask(producerStaff, copyTask(), producerAssignments, "campaign-1", envelope),
    ).toBe(false);
  });

  it("allows copy staff with claim, role, and active stage", () => {
    let envelope = productionEnvelopeFrom(
      syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign),
    );
    const unit = envelope.workUnits[0]!;
    envelope = {
      ...envelope,
      workUnits: envelope.workUnits.map((entry) =>
        entry.id === unit.id
          ? { ...entry, currentStage: "copy" as const, currentTaskId: "sm-001:copy" }
          : entry,
      ),
    };
    expect(
      canEditKitchenWorkForTask(copyStaff, copyTask(), assignments, "campaign-1", envelope),
    ).toBe(true);
  });

  it("denies copy staff without active claim", () => {
    const envelope = productionEnvelopeFrom(
      syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign),
    );
    expect(
      canEditKitchenWorkForTask(
        copyStaff,
        copyTask({ claimedByUserId: "other-user" }),
        assignments,
        "campaign-1",
        envelope,
      ),
    ).toBe(false);
  });

  it("denies when work unit is at a different stage", () => {
    const envelope = productionEnvelopeFrom(
      syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign),
    );
    expect(
      canEditKitchenWorkForTask(
        copyStaff,
        copyTask({ id: "sm-001:creative", phase: "creative" }),
        assignments,
        "campaign-1",
        envelope,
      ),
    ).toBe(false);
  });

  it("denies owner and staff edit when task workflow is blocked", () => {
    const envelope = productionEnvelopeFrom(
      syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign),
    );
    const unit = envelope.workUnits[0]!;
    const blockedEnvelope = {
      ...envelope,
      workUnits: envelope.workUnits.map((entry) =>
        entry.id === unit.id
          ? { ...entry, currentStage: "copy" as const, currentTaskId: "sm-001:copy" }
          : entry,
      ),
    };
    const blockedCopy = copyTask({
      status: "blocked",
      workflowState: "blocked",
      claimedByUserId: "copy-staff",
    });

    expect(
      canEditKitchenWorkForTask(ownerUser, blockedCopy, assignments, "campaign-1", blockedEnvelope),
    ).toBe(false);
    expect(
      canEditKitchenWorkForTask(copyStaff, blockedCopy, assignments, "campaign-1", blockedEnvelope),
    ).toBe(false);
  });
});
