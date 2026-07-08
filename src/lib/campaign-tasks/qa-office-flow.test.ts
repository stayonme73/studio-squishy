import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import { applyQaPass } from "./actions";
import { buildKitchenCopyStageFixture } from "./kitchen-test-fixtures";
import { requiredChecksForPhase } from "./qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-06-30T20:00:00.000Z";

const qaStaff: StudioUser = {
  id: "staff-qa-capture",
  email: "qa-capture@local.dev",
  displayName: "QA Capture",
  roles: ["staff"],
};

const owner: StudioUser = {
  id: "tagia",
  email: "tagia@local.dev",
  displayName: "Owner",
  roles: ["owner", "client"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-qa-capture": ["qa-office-v1-proof"] },
  staffCapabilities: { "staff-qa-capture": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: "qa-office-v1-proof",
  campaignName: "QA Office Proof",
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
    status: "ready_for_qa",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:strategy_content_direction"],
    workflowState: "ready_for_qa",
    responsibleRole: "copy",
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

const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, qaStaff, now);

describe("qa office flow", () => {
  it("qa_pass from ready_for_qa completes inline kitchen copy task", () => {
    const readyCopy = copyTask();
    const result = applyQaPass(
      envelope([readyCopy]),
      {
        action: "qa_pass",
        taskId: readyCopy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      qaStaff,
      {
        campaign,
        materials: [],
        assignments,
        production: kitchenCopyFixture.production,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.tasks.find((t) => t.id === readyCopy.id)?.workflowState).toBe(
        "complete",
      );
    }
  });

  it("owner may also perform qa_pass on ready_for_qa tasks", () => {
    const readyCopy = copyTask();
    const result = applyQaPass(
      envelope([readyCopy]),
      {
        action: "qa_pass",
        taskId: readyCopy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      owner,
      {
        campaign,
        materials: [],
        assignments,
        production: kitchenCopyFixture.production,
      },
    );

    expect(result.ok).toBe(true);
  });
});
