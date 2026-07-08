import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyCreateVersion } from "@/lib/campaign-production/actions";
import { canEditKitchenWorkForTask } from "@/lib/campaign-production/access";

import {
  applyClaim,
  applyQaFail,
  applyQaPass,
  applySubmitForHandoff,
} from "./actions";
import { buildKitchenCopyStageFixture } from "./kitchen-test-fixtures";
import { requiredChecksForPhase } from "./qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-06-30T20:00:00.000Z";

const copyStaff: StudioUser = {
  id: "staff-copy-capture",
  email: "copy-capture@local.dev",
  displayName: "Copy Capture",
  roles: ["staff"],
};

const producerStaff: StudioUser = {
  id: "staff-producer-verify-3dc",
  email: "producer-verify-3dc@local.dev",
  displayName: "Producer",
  roles: ["staff"],
};

const owner: StudioUser = {
  id: "tagia",
  email: "tagia@local.dev",
  displayName: "Owner",
  roles: ["owner", "client"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-copy-capture": ["copy-office-v1-proof"],
    "staff-producer-verify-3dc": ["copy-office-v1-proof"],
  },
  staffCapabilities: {
    "staff-copy-capture": ["copy"],
    "staff-producer-verify-3dc": ["producer_dispatcher"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "copy-office-v1-proof",
  campaignName: "Copy Office Proof",
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

function creativeTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:creative",
    title: "Social — Creative",
    phase: "creative",
    status: "not_ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:copy"],
    workflowState: "unstarted",
    responsibleRole: "creative_production",
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

const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, copyStaff, now);
const kitchenContext = {
  campaign,
  materials: [],
  assignments,
  production: kitchenCopyFixture.production,
};

describe("copy office flow", () => {
  it("submit_for_handoff moves copy to ready_for_qa with workVersionId", () => {
    const claimed = copyTask();
    const result = applySubmitForHandoff(
      envelope([claimed]),
      {
        action: "submit_for_handoff",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: now,
        handoff: {
          completedSummary: "Copy draft complete.",
          sourceContext: "Strategy approved.",
          nextSteps: "QA review.",
          workVersionId: kitchenCopyFixture.copyWorkVersionId,
        },
      },
      copyStaff,
      kitchenContext,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("ready_for_qa");
      expect(result.task!.claimedByUserId).toBeUndefined();
      expect(result.envelope.handoffs?.[0]?.workVersionId).toBe(
        kitchenCopyFixture.copyWorkVersionId,
      );
    }
  });

  it("qa_pass completes copy and unlocks creative as ready", () => {
    const readyCopy = copyTask({
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      claimedByUserId: undefined,
      claimedAt: undefined,
    });
    const creative = creativeTask();

    const result = applyQaPass(
      envelope([readyCopy, creative]),
      {
        action: "qa_pass",
        taskId: readyCopy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      owner,
      kitchenContext,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const updatedCopy = result.envelope.tasks.find((t) => t.id === readyCopy.id);
      const updatedCreative = result.envelope.tasks.find((t) => t.id === creative.id);
      expect(updatedCopy?.workflowState).toBe("complete");
      expect(updatedCreative?.status).toBe("ready");
    }
  });

  it("qa_fail returns copy to needs_revision; reclaim creates qa_revision version", () => {
    const readyCopy = copyTask({
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      claimedByUserId: undefined,
      claimedAt: undefined,
    });

    const failResult = applyQaFail(
      envelope([readyCopy]),
      {
        action: "qa_fail",
        taskId: readyCopy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
        notes: "Revise headline.",
      },
      owner,
      kitchenContext,
    );

    expect(failResult.ok).toBe(true);
    if (!failResult.ok) return;

    const needsRevision = failResult.envelope.tasks.find((t) => t.id === readyCopy.id);
    expect(needsRevision?.workflowState).toBe("needs_revision");

    const claimResult = applyClaim(
      failResult.envelope,
      {
        action: "claim",
        taskId: readyCopy.id,
        from: "needs_revision",
        claimVersion: null,
      },
      copyStaff,
      kitchenContext,
    );
    expect(claimResult.ok).toBe(true);
    if (!claimResult.ok) return;

    const claimed = claimResult.task!;
    const revisionVersion = applyCreateVersion(
      kitchenContext.production,
      claimed,
      { body: "Revised copy after QA.", reason: "qa_revision" },
      copyStaff,
    );

    expect(revisionVersion.ok).toBe(true);
    if (revisionVersion.ok) {
      expect(revisionVersion.version?.reason).toBe("qa_revision");
    }
  });

  it("producer without copy capability is denied kitchen edit access", () => {
    const claimed = copyTask();
    expect(
      canEditKitchenWorkForTask(
        producerStaff,
        claimed,
        assignments,
        campaign.campaignId,
        kitchenCopyFixture.production,
      ),
    ).toBe(false);
  });
});
