import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  applyClaim,
  applyQaPass,
  applyReassign,
  applyReleaseClaim,
  applySubmitForHandoff,
} from "./actions";
import { requiredChecksForPhase } from "./qa-checklists";
import { buildKitchenCopyStageFixture } from "./kitchen-test-fixtures";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-06-28T12:00:00.000Z";

const copyStaff: StudioUser = {
  id: "staff-copy",
  email: "copy@local.dev",
  displayName: "Copy Staff",
  roles: ["staff"],
};

const producerStaff: StudioUser = {
  id: "staff-producer",
  email: "producer@local.dev",
  displayName: "Producer Staff",
  roles: ["staff"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA Staff",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-copy": ["campaign-1"],
    "staff-producer": ["campaign-1"],
    "staff-qa": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-copy": ["copy"],
    "staff-producer": ["producer_dispatcher", "copy"],
    "staff-qa": ["qa"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "campaign-1",
  campaignName: "Test",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "Test",
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
        serviceName: "Social",
        billingType: "one_time",
        exactPriceCents: 50000,
        priceDisplay: "$500",
        deliverables: [],
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
    status: "ready",
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
    campaignId: "campaign-1",
    tasks,
    planFingerprint: "sm-001:one_time",
    planVersion: 1,
    updatedAt: now,
    version: 3,
    handoffs: [],
    syncedAt: now,
  };
}

const handoff = {
  completedSummary: "Finished copy draft.",
  sourceContext: "Content direction approved.",
  nextSteps: "QA review.",
};

const context = {
  campaign,
  materials: [],
  assignments,
};
const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, copyStaff, now);
const kitchenContext = { ...context, production: kitchenCopyFixture.production };
const handoffWithWorkVersion = {
  ...handoff,
  workVersionId: kitchenCopyFixture.copyWorkVersionId,
};

describe("applyClaim", () => {
  it("claims a ready task", () => {
    const upstream = copyTask({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      workflowState: "complete",
      status: "complete",
      responsibleRole: "strategy",
      dependsOn: [],
    });
    const readyCopy = copyTask({ status: "ready" });
    const result = applyClaim(
      envelope([upstream, readyCopy]),
      { action: "claim", taskId: readyCopy.id, from: "unstarted", claimVersion: null },
      copyStaff,
      context,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("in_progress");
      expect(result.task!.claimedByUserId).toBe(copyStaff.id);
      expect(result.task!.claimedAt).toBeTruthy();
    }
  });

  it("forbids non-holder from submitting handoff", () => {
    const claimed = copyTask({
      workflowState: "in_progress",
      status: "in_progress",
      claimedByUserId: "other",
      claimedAt: "2026-01-01T00:00:00.000Z",
    });
    const otherCopyStaff: StudioUser = {
      id: "staff-copy-2",
      email: "copy2@local.dev",
      displayName: "Copy Staff 2",
      roles: ["staff"],
    };
    const result = applySubmitForHandoff(
      envelope([claimed]),
      {
        action: "submit_for_handoff",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-01T00:00:00.000Z",
        handoff: handoffWithWorkVersion,
      },
      otherCopyStaff,
      {
        ...context,
        assignments: {
          ...assignments,
          staffByUserId: { ...assignments.staffByUserId, "staff-copy-2": ["campaign-1"] },
          staffCapabilities: { ...assignments.staffCapabilities, "staff-copy-2": ["copy"] },
        },
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("returns 409 on stale workflow state", () => {
    const readyCopy = copyTask({ status: "ready" });
    const result = applyClaim(
      envelope([readyCopy]),
      { action: "claim", taskId: readyCopy.id, from: "needs_revision", claimVersion: null },
      copyStaff,
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.conflict?.workflowState).toBe("unstarted");
    }
  });
});

describe("applySubmitForHandoff", () => {
  it("moves to ready_for_qa, appends handoff, clears claim", () => {
    const claimed = copyTask({
      workflowState: "in_progress",
      status: "in_progress",
      claimedByUserId: copyStaff.id,
      claimedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = applySubmitForHandoff(
      envelope([claimed]),
      {
        action: "submit_for_handoff",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-01T00:00:00.000Z",
        handoff: handoffWithWorkVersion,
      },
      copyStaff,
      kitchenContext,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("ready_for_qa");
      expect(result.task!.claimedByUserId).toBeUndefined();
      expect(result.envelope.handoffs).toHaveLength(1);
      expect(result.envelope.handoffs?.[0].action).toBe("submit_for_handoff");
    }
  });

  it("rejects missing handoff fields", () => {
    const claimed = copyTask({
      workflowState: "in_progress",
      status: "in_progress",
      claimedByUserId: copyStaff.id,
      claimedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = applySubmitForHandoff(
      envelope([claimed]),
      {
        action: "submit_for_handoff",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-01T00:00:00.000Z",
        handoff: { completedSummary: "", sourceContext: "", nextSteps: "" },
      },
      copyStaff,
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

describe("applyReleaseClaim", () => {
  it("returns task to unstarted and preserves handoff history", () => {
    const priorHandoff = {
      id: "h-1",
      taskId: "sm-001:copy",
      campaignId: "campaign-1",
      createdAt: now,
      fromUserId: copyStaff.id,
      fromDisplayName: copyStaff.displayName,
      fromRole: "copy" as const,
      toRole: "qa" as const,
      transition: { from: "in_progress" as const, to: "ready_for_qa" as const },
      completedSummary: "Earlier",
      sourceContext: "Earlier",
      nextSteps: "Earlier",
      action: "submit_for_handoff" as const,
    };
    const claimed = copyTask({
      workflowState: "in_progress",
      status: "in_progress",
      claimedByUserId: copyStaff.id,
      claimedAt: "2026-01-02T00:00:00.000Z",
    });
    const result = applyReleaseClaim(
      envelope([claimed]),
      {
        action: "release_claim",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-02T00:00:00.000Z",
        handoff: handoffWithWorkVersion,
      },
      copyStaff,
      { ...kitchenContext, assignments },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("unstarted");
      expect(result.envelope.handoffs).toHaveLength(1);
    }

    const withPrior = { ...envelope([claimed]), handoffs: [priorHandoff] };
    const second = applyReleaseClaim(
      withPrior,
      {
        action: "release_claim",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-02T00:00:00.000Z",
        handoff: handoffWithWorkVersion,
      },
      copyStaff,
      kitchenContext,
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.envelope.handoffs).toHaveLength(2);
      expect(second.envelope.handoffs?.[0].id).toBe("h-1");
    }
  });
});

describe("applyReassign", () => {
  it("allows producer to reassign to capable staff", () => {
    const claimed = copyTask({
      workflowState: "in_progress",
      status: "in_progress",
      claimedByUserId: copyStaff.id,
      claimedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = applyReassign(
      envelope([claimed]),
      {
        action: "reassign",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-01T00:00:00.000Z",
        toUserId: copyStaff.id,
        toRole: "copy",
        handoff: handoffWithWorkVersion,
      },
      producerStaff,
      { ...kitchenContext, targetUser: copyStaff },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.handoffs?.[0].action).toBe("reassign");
      expect(result.task!.claimedByUserId).toBe(copyStaff.id);
    }
  });

  it("rejects non-producer staff", () => {
    const claimed = copyTask({
      workflowState: "in_progress",
      status: "in_progress",
      claimedByUserId: copyStaff.id,
      claimedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = applyReassign(
      envelope([claimed]),
      {
        action: "reassign",
        taskId: claimed.id,
        from: "in_progress",
        claimVersion: "2026-01-01T00:00:00.000Z",
        toUserId: copyStaff.id,
        toRole: "copy",
        handoff,
      },
      copyStaff,
      { ...context, targetUser: copyStaff },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects incapable target role for family", () => {
    const readyCopy = copyTask({ status: "ready" });
    const result = applyReassign(
      envelope([readyCopy]),
      {
        action: "reassign",
        taskId: readyCopy.id,
        from: "unstarted",
        claimVersion: null,
        toUserId: copyStaff.id,
        toRole: "strategy",
        handoff: handoffWithWorkVersion,
      },
      producerStaff,
      { ...kitchenContext, targetUser: copyStaff },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});
