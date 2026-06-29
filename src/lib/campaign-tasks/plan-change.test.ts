import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan, CampaignRecord } from "@/config/studio-board";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";

import {
  generateCampaignTasks,
  regenerateIfPlanChanged,
} from "./generate";
import { mergePlanChangeTasks } from "./plan-change";
import type { CampaignTaskItem, CampaignTasksRecord } from "./types";

const now = "2026-06-28T12:00:00.000Z";

function buildPlan(serviceIds: readonly ServiceId[]): ApprovedStudioPlan {
  const lineItems = buildServiceScopeSnapshot(serviceIds);
  const oneTimeTotalCents = lineItems.reduce((sum, line) => sum + line.exactPriceCents, 0);
  return {
    selectedServiceIds: [...serviceIds],
    includedServiceIds: [...serviceIds],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: oneTimeTotalCents,
    lineItems,
    approvedAt: now,
  };
}

function campaignWithPlan(
  serviceIds: readonly ServiceId[],
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  return {
    campaignId: "tasks-test",
    campaignName: "Tasks Test Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: buildPlan(serviceIds),
    projectDetailsSubmittedAt: now,
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function withWorkflowState(
  record: CampaignTasksRecord,
  taskId: string,
  workflowState: CampaignTaskItem["workflowState"],
): CampaignTasksRecord {
  return {
    ...record,
    tasks: record.tasks.map((task) =>
      task.id === taskId ? { ...task, workflowState } : task,
    ),
  };
}

describe("mergePlanChangeTasks", () => {
  it("preserves completed tasks across fingerprint change", () => {
    const campaignA = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const existing = generateCampaignTasks(campaignA);
    const completedStrategy = existing.tasks.find((task) => task.id === "bf-001:strategy")!;
    const withComplete = withWorkflowState(existing, completedStrategy.id, "complete");

    const campaignB = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(withComplete, fresh, { ownerApproved: true });

    const preserved = merged.tasks.find((task) => task.id === "bf-001:strategy");
    expect(preserved?.workflowState).toBe("complete");
  });

  it("cancels non-terminal tasks for removed SKU", () => {
    const campaignA = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const existing = generateCampaignTasks(campaignA);
    const inProgressSocial = existing.tasks.find(
      (task) => task.id === "sm-001:strategy_content_direction",
    )!;
    const withProgress = withWorkflowState(
      existing,
      inProgressSocial.id,
      "in_progress",
    );

    const campaignB = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(withProgress, fresh);

    const cancelledSocial = merged.tasks.find(
      (task) => task.id === "sm-001:strategy_content_direction",
    );
    expect(cancelledSocial?.workflowState).toBe("cancelled");
  });

  it("adds unstarted tasks for newly added SKU", () => {
    const campaignA = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const existing = generateCampaignTasks(campaignA);
    const campaignB = campaignWithPlan(["bf-001", "em-001"], {
      selectedCampaignOption: "Option A",
    });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(existing, fresh);

    expect(merged.tasks.some((task) => task.id.startsWith("em-001:"))).toBe(true);
    const added = merged.tasks.find((task) => task.id === "em-001:copy");
    expect(added?.workflowState).toBe("unstarted");
  });

  it("appends frozenPlanSnapshots and increments planVersion", () => {
    const campaignA = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const existing = generateCampaignTasks(campaignA);
    const campaignB = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(existing, fresh);

    expect(merged.planVersion).toBe(2);
    expect(merged.frozenPlanSnapshots).toHaveLength(1);
    expect(merged.frozenPlanSnapshots?.[0]?.planFingerprint).toBe(existing.planFingerprint);
  });

  it("sets planChangePendingOwnerApproval when ownerApproved false", () => {
    const campaignA = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const existing = generateCampaignTasks(campaignA);
    const campaignB = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(existing, fresh, { ownerApproved: false });
    expect(merged.planChangePendingOwnerApproval).toBe(true);
  });

  it("clears planChangePendingOwnerApproval when ownerApproved true", () => {
    const campaignA = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const existing = {
      ...generateCampaignTasks(campaignA),
      planChangePendingOwnerApproval: true,
    };
    const campaignB = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(existing, fresh, { ownerApproved: true });
    expect(merged.planChangePendingOwnerApproval).toBe(false);
  });

  it("does not delete completed work from audit when task id removed", () => {
    const campaignA = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const existing = generateCampaignTasks(campaignA);
    const completed = existing.tasks.find((task) => task.id === "sm-001:copy")!;
    const withComplete = withWorkflowState(existing, completed.id, "complete");

    const campaignB = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const fresh = generateCampaignTasks(campaignB);
    const merged = mergePlanChangeTasks(withComplete, fresh);

    expect(merged.tasks.some((task) => task.id === "sm-001:copy")).toBe(true);
    expect(merged.tasks.find((task) => task.id === "sm-001:copy")?.workflowState).toBe(
      "complete",
    );
  });
});

describe("regenerateIfPlanChanged integration", () => {
  it("uses mergePlanChangeTasks when fingerprint changes and existing record present", () => {
    const campaignA = campaignWithPlan(["bf-001"], { selectedCampaignOption: "Option A" });
    const first = generateCampaignTasks(campaignA);
    const campaignB = campaignWithPlan(["bf-001", "em-001"], {
      selectedCampaignOption: "Option A",
    });
    const second = regenerateIfPlanChanged(first, campaignB, []);

    expect(second.planVersion).toBe(2);
    expect(second.tasks.some((task) => task.id.startsWith("em-001:"))).toBe(true);
  });

  it("still refreshes statuses only when fingerprint unchanged", () => {
    const campaign = campaignWithPlan(["bf-001", "sm-001"], {
      selectedCampaignOption: "Option A",
    });
    const first = generateCampaignTasks(campaign);
    const second = regenerateIfPlanChanged(first, campaign, []);

    expect(second.planFingerprint).toBe(first.planFingerprint);
    expect(second.planVersion).toBe(first.planVersion);
  });
});
