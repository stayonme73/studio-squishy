import { describe, expect, it } from "vitest";

import { syncProductionWithPlan, emptyProductionRecord } from "@/lib/campaign-production/plan-sync";
import { applyCreateVersion } from "@/lib/campaign-production/actions";
import type { CampaignProductionRecord } from "@/lib/campaign-production/types";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";
import type { FileRoomTaskRow } from "@/lib/campaign-tasks/tasks-view";

import {
  filterOfficeQueueTasks,
  isOfficeTaskReadOnly,
  resolveOfficeSelectedTask,
  resolveOfficeStrategyContext,
} from "./office-view";

const now = "2026-06-30T12:00:00.000Z";

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Staff",
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

function row(
  id: string,
  role: CampaignTaskItem["responsibleRole"],
  overrides: Partial<Pick<FileRoomTaskRow, "effectiveStatus" | "workflowState" | "status" | "statusLabel">> = {},
): FileRoomTaskRow {
  const phase = id.split(":")[1] ?? "copy";
  return {
    id,
    title: id,
    phase: phase as FileRoomTaskRow["phase"],
    phaseLabel: phase,
    status: overrides.status ?? "ready",
    statusLabel: overrides.statusLabel ?? "Ready",
    effectiveStatus: overrides.effectiveStatus ?? "in_progress",
    workflowState: overrides.workflowState ?? "in_progress",
    serviceName: "Social",
    familyId: "social",
    responsibleRole: role ?? "copy",
    blockedReason: null,
    cycleLabel: null,
    dependsOnCount: 0,
    claimedByUserId: undefined,
    claimVersion: null,
    permissions: {
      canClaim: false,
      canRelease: false,
      canSubmitHandoff: false,
      canReassign: false,
      canQaPass: false,
      canQaFail: false,
      canQaBlock: false,
    },
    reassignRoles: ["copy"],
    handoffHistoryCount: 0,
    latestHandoffSummary: null,
    qaSummary: { total: 0, passes: 0, fails: 0, blocks: 0 },
    qaHistory: [],
    latestQaHistory: null,
    openExceptionCount: 0,
  };
}

describe("office-view", () => {
  it("filters default copy queue to copy-role tasks only", () => {
    const view = {
      tasks: [
        row("sm-001:strategy_content_direction", "strategy"),
        row("sm-001:copy", "copy"),
        row("sm-001:creative", "creative_production"),
      ],
      groups: [],
      isEmpty: false,
      planFingerprint: "fp",
      readyCount: 0,
      blockedCount: 0,
      notReadyCount: 0,
    };

    const queue = filterOfficeQueueTasks(view, "copy", {
      userId: "staff-1",
      canEditForTask: () => true,
    });

    expect(queue.tasks.map((task) => task.id)).toEqual(["sm-001:copy"]);
  });

  it("excludes complete and cancelled copy tasks from default queue", () => {
    const view = {
      tasks: [
        row("sm-001:copy", "copy", {
          effectiveStatus: "complete",
          workflowState: "complete",
          status: "ready",
          statusLabel: "Complete",
        }),
        row("sm-001:copy-revision", "copy", {
          effectiveStatus: "cancelled",
          workflowState: "cancelled",
          status: "blocked",
          statusLabel: "Cancelled",
        }),
        row("sm-001:copy-active", "copy"),
      ],
      groups: [],
      isEmpty: false,
      planFingerprint: "fp",
      readyCount: 0,
      blockedCount: 0,
      notReadyCount: 0,
    };

    const queue = filterOfficeQueueTasks(view, "copy", {
      userId: "staff-1",
      canEditForTask: () => true,
    });

    expect(queue.tasks.map((task) => task.id)).toEqual(["sm-001:copy-active"]);
    expect(queue.isEmpty).toBe(false);
  });

  it("includes completed copy task when deep-linked", () => {
    const completedCopy = row("sm-001:copy", "copy", {
      effectiveStatus: "complete",
      workflowState: "complete",
      status: "ready",
      statusLabel: "Complete",
    });
    const view = {
      tasks: [completedCopy, row("sm-001:creative", "creative_production")],
      groups: [],
      isEmpty: false,
      planFingerprint: "fp",
      readyCount: 0,
      blockedCount: 0,
      notReadyCount: 0,
    };

    const defaultQueue = filterOfficeQueueTasks(view, "copy", {
      userId: "staff-1",
      canEditForTask: () => true,
    });
    expect(defaultQueue.tasks).toHaveLength(0);
    expect(defaultQueue.isEmpty).toBe(true);

    const deepLinkedQueue = filterOfficeQueueTasks(view, "copy", {
      userId: "staff-1",
      canEditForTask: () => true,
      deepLinkTaskId: "sm-001:copy",
    });
    expect(deepLinkedQueue.tasks.map((task) => task.id)).toEqual(["sm-001:copy"]);
  });

  it("includes wrong-role deep link in queue as read-only", () => {
    const view = {
      tasks: [row("sm-001:copy", "copy"), row("sm-001:strategy_content_direction", "strategy")],
      groups: [],
      isEmpty: false,
      planFingerprint: "fp",
      readyCount: 0,
      blockedCount: 0,
      notReadyCount: 0,
    };

    const queue = filterOfficeQueueTasks(view, "copy", {
      userId: "staff-1",
      canEditForTask: () => true,
      deepLinkTaskId: "sm-001:strategy_content_direction",
    });

    expect(queue.tasks).toHaveLength(2);
    const strategy = queue.tasks.find((task) => task.id === "sm-001:strategy_content_direction");
    expect(strategy?.isWrongRole).toBe(true);
    expect(strategy?.isReadOnly).toBe(true);
  });

  it("marks wrong-role tasks read-only via isOfficeTaskReadOnly", () => {
    const copyRow = row("sm-001:copy", "copy");
    expect(isOfficeTaskReadOnly(copyRow, "copy", true)).toBe(false);
    expect(isOfficeTaskReadOnly(copyRow, "copy", false)).toBe(true);
    expect(isOfficeTaskReadOnly(row("sm-001:strategy_content_direction", "strategy"), "copy", true)).toBe(
      true,
    );
  });

  it("selects deep-linked task when present", () => {
    const queue = filterOfficeQueueTasks(
      {
        tasks: [row("sm-001:copy", "copy")],
        groups: [],
        isEmpty: false,
        planFingerprint: "fp",
        readyCount: 0,
        blockedCount: 0,
        notReadyCount: 0,
      },
      "copy",
      { userId: "staff-1", canEditForTask: () => true },
    );

    expect(resolveOfficeSelectedTask(queue, "sm-001:copy")?.id).toBe("sm-001:copy");
  });

  it("resolves upstream strategy context from production envelope", () => {
    let record = syncProductionWithPlan(emptyProductionRecord("campaign-1", "fp"), campaign);
    const strategyTask: CampaignTaskItem = {
      id: "sm-001:strategy_content_direction",
      title: "Strategy",
      phase: "strategy_content_direction",
      status: "in_progress",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social",
      dependsOn: [],
      workflowState: "in_progress",
    };

    const created = applyCreateVersion(
      { ...record, syncedAt: now },
      strategyTask,
      { body: "Direction notes" },
      staffUser,
    );
    if (!created.ok) throw new Error("setup failed");
    record = created.envelope;

    const context = resolveOfficeStrategyContext(
      { ...record, syncedAt: now },
      { tasks: [strategyTask], handoffs: [], qaRecords: [], planFingerprint: "fp", campaignId: "campaign-1", version: 1, updatedAt: now },
    );

    expect(context.visible).toBe(true);
    expect(context.currentBody).toBe("Direction notes");
  });
});

describe("resolveDefaultVersionReason stage scope", () => {
  it("uses initial for first copy-stage version when strategy already has versions", async () => {
    const { resolveDefaultVersionReason } = await import("@/lib/campaign-production/actions");

    let record: CampaignProductionRecord = syncProductionWithPlan(
      emptyProductionRecord("campaign-1", "fp"),
      campaign,
    );

    const strategyTask: CampaignTaskItem = {
      id: "sm-001:strategy_content_direction",
      title: "Strategy",
      phase: "strategy_content_direction",
      status: "in_progress",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social",
      dependsOn: [],
      workflowState: "in_progress",
    };

    const copyTaskItem: CampaignTaskItem = {
      id: "sm-001:copy",
      title: "Copy",
      phase: "copy",
      status: "in_progress",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social",
      dependsOn: [],
      workflowState: "in_progress",
    };

    let envelope = { ...record, syncedAt: now };
    const strategyVersion = applyCreateVersion(envelope, strategyTask, { body: "Dir" }, staffUser);
    if (!strategyVersion.ok) throw new Error("setup failed");
    envelope = strategyVersion.envelope;

    // Advance work unit to copy stage for realistic state
    const unit = envelope.workUnits[0]!;
    envelope = {
      ...envelope,
      workUnits: envelope.workUnits.map((entry) =>
        entry.id === unit.id
          ? { ...entry, currentStage: "copy", currentTaskId: "sm-001:copy" }
          : entry,
      ),
    };

    expect(resolveDefaultVersionReason(envelope, copyTaskItem)).toBe("initial");
    expect(resolveDefaultVersionReason(envelope, { ...copyTaskItem, workflowState: "needs_revision" })).toBe(
      "qa_revision",
    );
  });
});
