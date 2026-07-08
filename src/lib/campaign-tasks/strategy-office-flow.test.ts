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
import { buildKitchenStrategyStageFixture } from "./kitchen-test-fixtures";
import { requiredChecksForPhase } from "./qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-06-30T20:00:00.000Z";

const strategyStaff: StudioUser = {
  id: "staff-strategy-capture",
  email: "strategy-capture@local.dev",
  displayName: "Strategy Capture",
  roles: ["staff"],
};

const copyStaff: StudioUser = {
  id: "staff-copy-capture",
  email: "copy-capture@local.dev",
  displayName: "Copy Capture",
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
    "staff-strategy-capture": ["strategy-office-v1-proof"],
    "staff-copy-capture": ["strategy-office-v1-proof"],
  },
  staffCapabilities: {
    "staff-strategy-capture": ["strategy"],
    "staff-copy-capture": ["copy"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "strategy-office-v1-proof",
  campaignName: "Strategy Office Proof",
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

function strategyTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:strategy_content_direction",
    title: "Social — Content direction",
    phase: "strategy_content_direction",
    status: "in_progress",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "in_progress",
    responsibleRole: "strategy",
    claimedByUserId: strategyStaff.id,
    claimedAt: now,
    ...overrides,
  };
}

function copyTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "not_ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:strategy_content_direction"],
    workflowState: "unstarted",
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

const kitchenStrategyFixture = buildKitchenStrategyStageFixture(campaign, strategyStaff, now);
const kitchenContext = {
  campaign,
  materials: [],
  assignments,
  production: kitchenStrategyFixture.production,
};

describe("strategy office flow", () => {
  it("submit_for_handoff moves strategy to ready_for_qa with workVersionId", () => {
    const claimed = strategyTask();
    const result = applySubmitForHandoff(
      envelope([claimed, copyTask()]),
      {
        action: "submit_for_handoff",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: now,
        handoff: {
          completedSummary: "Strategy direction complete.",
          sourceContext: "Discovery and plan reviewed.",
          nextSteps: "QA review.",
          workVersionId: kitchenStrategyFixture.strategyWorkVersionId,
        },
      },
      strategyStaff,
      kitchenContext,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("ready_for_qa");
      expect(result.envelope.handoffs?.[0]?.workVersionId).toBe(
        kitchenStrategyFixture.strategyWorkVersionId,
      );
    }
  });

  it("qa_pass completes strategy and unlocks copy as ready", () => {
    const readyStrategy = strategyTask({
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      claimedByUserId: undefined,
      claimedAt: undefined,
    });
    const downstreamCopy = copyTask();

    const result = applyQaPass(
      envelope([readyStrategy, downstreamCopy]),
      {
        action: "qa_pass",
        taskId: readyStrategy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("strategy_content_direction")],
        workVersionId: kitchenStrategyFixture.strategyWorkVersionId,
      },
      owner,
      kitchenContext,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const updatedStrategy = result.envelope.tasks.find((t) => t.id === readyStrategy.id);
      const updatedCopy = result.envelope.tasks.find((t) => t.id === downstreamCopy.id);
      expect(updatedStrategy?.workflowState).toBe("complete");
      expect(updatedCopy?.status).toBe("ready");
    }
  });

  it("copy staff without strategy capability is denied kitchen edit access", () => {
    const claimed = strategyTask();
    expect(
      canEditKitchenWorkForTask(
        copyStaff,
        claimed,
        assignments,
        campaign.campaignId,
        kitchenStrategyFixture.production,
      ),
    ).toBe(false);
  });

  it("qa_fail returns strategy to needs_revision; reclaim creates qa_revision version", () => {
    const readyStrategy = strategyTask({
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      claimedByUserId: undefined,
      claimedAt: undefined,
    });

    const failResult = applyQaFail(
      envelope([readyStrategy]),
      {
        action: "qa_fail",
        taskId: readyStrategy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        workVersionId: kitchenStrategyFixture.strategyWorkVersionId,
        notes: "Revise direction.",
      },
      owner,
      kitchenContext,
    );

    expect(failResult.ok).toBe(true);
    if (!failResult.ok) return;

    const claimResult = applyClaim(
      failResult.envelope,
      {
        action: "claim",
        taskId: readyStrategy.id,
        from: "needs_revision",
        claimVersion: null,
      },
      strategyStaff,
      kitchenContext,
    );
    expect(claimResult.ok).toBe(true);
    if (!claimResult.ok) return;

    const revisionVersion = applyCreateVersion(
      kitchenContext.production,
      claimResult.task!,
      { body: "Revised strategy after QA.", reason: "qa_revision" },
      strategyStaff,
    );

    expect(revisionVersion.ok).toBe(true);
    if (revisionVersion.ok) {
      expect(revisionVersion.version?.reason).toBe("qa_revision");
    }
  });
});
