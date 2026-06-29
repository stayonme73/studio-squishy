import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan, CampaignRecord } from "@/config/studio-board";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { canReadProductionTasks } from "./access";
import { isBrandCreativeTask, isEmailCopyTask, resolveBlockingMaterialsForTask } from "./blocking";
import { computePlanFingerprint, generateCampaignTasks, regenerateIfPlanChanged } from "./generate";

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

function blockingLogoMaterial(serviceIds: ServiceId[]): CampaignMaterialItem {
  return {
    id: "logo-brand-bf-001-slot",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo & brand files",
    reason: "Brand Identity Refresh",
    relatedServiceIds: serviceIds,
    uploadStatus: "none",
  };
}

describe("generateCampaignTasks", () => {
  it("Brand + Social + Email plan creates matching tasks only — no email without em-001", () => {
    const record = generateCampaignTasks(
      campaignWithPlan(["bf-001", "sm-001", "em-001"], {
        selectedCampaignOption: "Option A",
      }),
    );

    const serviceIds = new Set(record.tasks.flatMap((task) => [...task.relatedServiceIds]));
    expect(serviceIds.has("bf-001")).toBe(true);
    expect(serviceIds.has("sm-001")).toBe(true);
    expect(serviceIds.has("em-001")).toBe(true);
    expect(serviceIds.has("sms-001")).toBe(false);

    expect(record.tasks.some((task) => task.id.startsWith("em-001:"))).toBe(true);
    expect(record.tasks.some((task) => task.id.startsWith("social_media-execution"))).toBe(false);
  });

  it("Social only — no email tasks", () => {
    const record = generateCampaignTasks(
      campaignWithPlan(["sm-001"], { selectedCampaignOption: "Option A" }),
    );

    expect(record.tasks.some((task) => task.relatedServiceIds.includes("em-001"))).toBe(false);
    expect(record.tasks.some((task) => task.id.startsWith("sm-001:"))).toBe(true);
  });

  it("excludes execution add-ons from task generation", () => {
    const plan = buildPlan(["sm-001", "social_media-execution"]);
    const record = generateCampaignTasks(
      campaignWithPlan([], {
        approvedStudioPlan: plan,
        selectedCampaignOption: "Option A",
      }),
    );

    expect(record.tasks.every((task) => !task.id.includes("social_media-execution"))).toBe(true);
  });

  it("monthly SKU creates one current-cycle task set", () => {
    const record = generateCampaignTasks(
      campaignWithPlan(["sm-001-monthly"], { selectedCampaignOption: "Option A" }),
    );
    const socialTasks = record.tasks.filter(
      (task) =>
        task.relatedServiceIds.includes("sm-001-monthly") &&
        task.id.startsWith("sm-001-monthly:"),
    );

    expect(socialTasks.length).toBe(5);
    expect(socialTasks.every((task) => task.cycleLabel === "Current cycle")).toBe(true);
  });

  it("blocking logo blocks brand creative tasks not email copy", () => {
    const campaign = campaignWithPlan(["bf-001", "em-001"]);
    const materials = [blockingLogoMaterial(["bf-001"])];
    const record = generateCampaignTasks(campaign, materials);

    const brandStrategy = record.tasks.find(
      (task) => task.id === "bf-001:strategy",
    );
    const emailCopy = record.tasks.find((task) => task.id === "em-001:copy");

    expect(brandStrategy?.status).toBe("blocked");
    expect(brandStrategy?.blockedReason).toMatch(/logo/i);
    expect(emailCopy?.status).not.toBe("blocked");
    expect(isBrandCreativeTask(brandStrategy!)).toBe(true);
    expect(isEmailCopyTask(emailCopy!)).toBe(true);
    expect(resolveBlockingMaterialsForTask(emailCopy!, materials)).toHaveLength(0);
  });

  it("regenerates idempotently when planFingerprint unchanged", () => {
    const campaign = campaignWithPlan(["bf-001", "sm-001"]);
    const first = generateCampaignTasks(campaign);
    const second = regenerateIfPlanChanged(first, campaign, []);

    expect(second.planFingerprint).toBe(first.planFingerprint);
    expect(second.tasks.map((task) => task.id)).toEqual(first.tasks.map((task) => task.id));
  });

  it("regenerates task graph when planFingerprint changes", () => {
    const campaignA = campaignWithPlan(["bf-001"]);
    const first = generateCampaignTasks(campaignA);
    const campaignB = campaignWithPlan(["bf-001", "em-001"]);
    const second = regenerateIfPlanChanged(first, campaignB, []);

    expect(second.planFingerprint).not.toBe(first.planFingerprint);
    expect(second.tasks.some((task) => task.id.startsWith("em-001:"))).toBe(true);
  });

  it("computePlanFingerprint is stable for same SKUs", () => {
    const plan = buildPlan(["bf-001", "sm-001"]);
    expect(computePlanFingerprint(plan)).toBe(computePlanFingerprint(plan));
  });
});

describe("canReadProductionTasks", () => {
  const owner = {
    id: "owner-1",
    email: "owner@local.dev",
    displayName: "Owner",
    roles: ["owner"] as const,
  };

  const staff = {
    id: "staff-dev",
    email: "staff@local.dev",
    displayName: "Staff",
    roles: ["staff"] as const,
  };

  const client = {
    id: "client-1",
    email: "client@local.dev",
    displayName: "Client",
    roles: ["client"] as const,
    currentCampaignId: "campaign-a",
  };

  const assignments = {
    staffByUserId: {
      "staff-dev": ["campaign-b"],
    },
  };

  it("client GET → forbidden", () => {
    expect(canReadProductionTasks(client, "campaign-a")).toBe(false);
  });

  it("unassigned staff → forbidden", () => {
    expect(canReadProductionTasks(staff, "campaign-a", undefined, assignments)).toBe(false);
  });

  it("owner and assigned staff may read", () => {
    expect(canReadProductionTasks(owner, "campaign-a")).toBe(true);
    expect(canReadProductionTasks(staff, "campaign-b", undefined, assignments)).toBe(true);
  });
});
