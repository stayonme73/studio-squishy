import { getServiceById } from "@/catalog/accessors";
import type { ServiceFamilyId, ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan, ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { resolveBlockedReason } from "./blocking";
import { resolveProductionFamilyId } from "./families";
import {
  applyMaterialBlock,
  buildReadinessContext,
  resolveBaseTaskStatus,
} from "./readiness";
import {
  CAMPAIGN_LEVEL_TASKS,
  FAMILY_TASK_PIPELINES,
  type TaskBlueprint,
} from "./templates";
import type { CampaignTaskItem, CampaignTasksRecord, ProductionTaskFamilyId } from "./types";

const CURRENT_CYCLE_LABEL = "Current cycle";

function lineSkuId(line: ApprovedStudioPlanLineItem): ServiceId {
  return (line.skuId ?? line.serviceId!) as ServiceId;
}

export function computePlanFingerprint(plan: ApprovedStudioPlan): string {
  const parts = filterProductionPlanLineItems(plan)
    .map((line) => `${lineSkuId(line)}:${line.billingType}`)
    .sort();
  return parts.join("|");
}

function taskIdFor(serviceId: ServiceId, phase: string): string {
  return `${serviceId}:${phase}`;
}

function buildPipelineTasks(
  line: ApprovedStudioPlanLineItem,
  familyId: ProductionTaskFamilyId,
  catalogFamilyId: ServiceFamilyId,
  pipeline: readonly TaskBlueprint[],
): CampaignTaskItem[] {
  const serviceId = lineSkuId(line);
  const serviceName = line.serviceName ?? line.name ?? serviceId;
  const cycleLabel = line.billingType === "monthly" ? CURRENT_CYCLE_LABEL : undefined;
  const tasks: CampaignTaskItem[] = [];

  for (let index = 0; index < pipeline.length; index += 1) {
    const blueprint = pipeline[index];
    const id = taskIdFor(serviceId, blueprint.phase);
    const prevId = index > 0 ? taskIdFor(serviceId, pipeline[index - 1].phase) : undefined;

    tasks.push({
      id,
      title: `${serviceName} — ${blueprint.titleSuffix}`,
      phase: blueprint.phase,
      status: "not_ready",
      relatedServiceIds: [serviceId],
      familyId,
      catalogFamilyId,
      serviceName,
      dependsOn: prevId ? [prevId] : [],
      cycleLabel,
    });
  }

  return tasks;
}

function resolveCatalogFamilyId(line: ApprovedStudioPlanLineItem): ServiceFamilyId | null {
  const catalog = getServiceById(lineSkuId(line));
  return catalog?.familyId ?? null;
}

function shouldIncludeCampaignKickoff(lines: ApprovedStudioPlanLineItem[]): boolean {
  return lines.length > 0;
}

function shouldIncludeFinalAssembly(lines: ApprovedStudioPlanLineItem[]): boolean {
  const families = new Set(
    lines
      .map(resolveCatalogFamilyId)
      .filter((familyId): familyId is ServiceFamilyId => familyId !== null),
  );
  return lines.length >= 2 || families.size >= 2;
}

function buildCampaignLevelTasks(
  lines: ApprovedStudioPlanLineItem[],
  deliveryPrepTaskIds: string[],
): CampaignTaskItem[] {
  const tasks: CampaignTaskItem[] = [];

  if (shouldIncludeCampaignKickoff(lines)) {
    tasks.push({
      id: CAMPAIGN_LEVEL_TASKS.producerKickoff.id,
      title: CAMPAIGN_LEVEL_TASKS.producerKickoff.title,
      phase: CAMPAIGN_LEVEL_TASKS.producerKickoff.phase,
      status: "not_ready",
      relatedServiceIds: lines.map(lineSkuId),
      familyId: "campaign_launch_monthly",
      catalogFamilyId: "campaign",
      serviceName: "Campaign",
      dependsOn: [],
    });
  }

  if (shouldIncludeFinalAssembly(lines)) {
    tasks.push({
      id: CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.id,
      title: CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.title,
      phase: CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.phase,
      status: "not_ready",
      relatedServiceIds: lines.map(lineSkuId),
      familyId: "campaign_launch_monthly",
      catalogFamilyId: "campaign",
      serviceName: "Campaign",
      dependsOn: deliveryPrepTaskIds,
    });
  }

  return tasks;
}

function applyStatuses(
  tasks: CampaignTaskItem[],
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): CampaignTaskItem[] {
  const context = buildReadinessContext(campaign);

  return tasks.map((task) => {
    const baseStatus = resolveBaseTaskStatus(task, context);
    const blockedReason = resolveBlockedReason(task, materials);
    const { status, blockedReason: reason } = applyMaterialBlock(baseStatus, blockedReason);
    return { ...task, status, blockedReason: reason };
  });
}

/** Generate production tasks from frozen plan — excludes execution add-ons. */
export function generateCampaignTasks(
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[] = [],
): CampaignTasksRecord {
  const plan = campaign.approvedStudioPlan;
  const now = new Date().toISOString();

  if (!plan?.lineItems.length) {
    return {
      campaignId: campaign.campaignId,
      tasks: [],
      planFingerprint: "",
      updatedAt: now,
      version: 1,
    };
  }

  const productionLines = filterProductionPlanLineItems(plan);
  const pipelineTasks: CampaignTaskItem[] = [];

  for (const line of productionLines) {
    const catalogFamilyId = resolveCatalogFamilyId(line);
    if (!catalogFamilyId) continue;

    const familyId = resolveProductionFamilyId(catalogFamilyId);
    const pipeline = FAMILY_TASK_PIPELINES[familyId];
    pipelineTasks.push(...buildPipelineTasks(line, familyId, catalogFamilyId, pipeline));
  }

  const deliveryPrepIds = pipelineTasks
    .filter((task) => task.phase === "delivery_prep")
    .map((task) => task.id);

  const campaignTasks = buildCampaignLevelTasks(productionLines, deliveryPrepIds);
  const allTasks = [...campaignTasks, ...pipelineTasks];
  const tasksWithStatus = applyStatuses(allTasks, campaign, materials);

  return {
    campaignId: campaign.campaignId,
    tasks: tasksWithStatus,
    planFingerprint: computePlanFingerprint(plan),
    updatedAt: now,
    version: 1,
  };
}

export function regenerateIfPlanChanged(
  existing: CampaignTasksRecord | null,
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): CampaignTasksRecord {
  const plan = campaign.approvedStudioPlan;
  const fingerprint = plan ? computePlanFingerprint(plan) : "";

  if (existing && existing.planFingerprint === fingerprint && existing.tasks.length > 0) {
    const refreshed = applyStatuses(existing.tasks, campaign, materials);
    return {
      ...existing,
      tasks: refreshed,
      updatedAt: new Date().toISOString(),
    };
  }

  return generateCampaignTasks(campaign, materials);
}
