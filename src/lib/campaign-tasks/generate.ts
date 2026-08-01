import { getServiceById } from "@/catalog/accessors";
import type { ServiceFamilyId, ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan, ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import { lineSkuId } from "@/lib/approved-plan-line";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { resolveProductionFamilyId } from "./families";
import {
  CAMPAIGN_TASKS_SCHEMA_VERSION,
  applyStatusesWithWorkflow,
  mergePlanChangeTasks,
  normalizeLegacyTask,
} from "./plan-change";
import { resolveResponsibleRole } from "./roles";
import {
  CAMPAIGN_LEVEL_TASKS,
  FAMILY_TASK_PIPELINES,
  type TaskBlueprint,
} from "./templates";
import { DEFAULT_WORKFLOW_STATE } from "./workflow";
import type { CampaignTaskItem, CampaignTasksRecord, ProductionTaskFamilyId } from "./types";

const CURRENT_CYCLE_LABEL = "Current cycle";

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
  const serviceId = lineSkuId(line) as ServiceId;
  const serviceName = line.serviceName ?? line.name ?? serviceId;
  const cycleLabel = line.billingType === "monthly" ? CURRENT_CYCLE_LABEL : undefined;
  const tasks: CampaignTaskItem[] = [];

  for (let index = 0; index < pipeline.length; index += 1) {
    const blueprint = pipeline[index];
    const id = taskIdFor(serviceId, blueprint.phase);
    const prevId = index > 0 ? taskIdFor(serviceId, pipeline[index - 1].phase) : undefined;
    const task: CampaignTaskItem = {
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
      workflowState: DEFAULT_WORKFLOW_STATE,
      responsibleRole: undefined,
    };
    task.responsibleRole = resolveResponsibleRole(task);

    tasks.push(task);
  }

  return tasks;
}

function resolveCatalogFamilyId(line: ApprovedStudioPlanLineItem): ServiceFamilyId | null {
  const catalog = getServiceById(lineSkuId(line) as ServiceId);
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
    const kickoff: CampaignTaskItem = {
      id: CAMPAIGN_LEVEL_TASKS.producerKickoff.id,
      title: CAMPAIGN_LEVEL_TASKS.producerKickoff.title,
      phase: CAMPAIGN_LEVEL_TASKS.producerKickoff.phase,
      status: "not_ready",
      relatedServiceIds: lines.map((line) => lineSkuId(line) as ServiceId),
      familyId: "campaign_launch_monthly",
      catalogFamilyId: "campaign",
      serviceName: "Campaign",
      dependsOn: [],
      workflowState: DEFAULT_WORKFLOW_STATE,
    };
    kickoff.responsibleRole = resolveResponsibleRole(kickoff);
    tasks.push(kickoff);
  }

  if (shouldIncludeFinalAssembly(lines)) {
    const assembly: CampaignTaskItem = {
      id: CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.id,
      title: CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.title,
      phase: CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.phase,
      status: "not_ready",
      relatedServiceIds: lines.map((line) => lineSkuId(line) as ServiceId),
      familyId: "campaign_launch_monthly",
      catalogFamilyId: "campaign",
      serviceName: "Campaign",
      dependsOn: deliveryPrepTaskIds,
      workflowState: DEFAULT_WORKFLOW_STATE,
    };
    assembly.responsibleRole = resolveResponsibleRole(assembly);
    tasks.push(assembly);
  }

  return tasks;
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
      planVersion: 1,
      frozenPlanSnapshots: [],
      updatedAt: now,
      version: CAMPAIGN_TASKS_SCHEMA_VERSION,
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
  const tasksWithStatus = applyStatusesWithWorkflow(allTasks, campaign, materials);

  return {
    campaignId: campaign.campaignId,
    tasks: tasksWithStatus,
    planFingerprint: computePlanFingerprint(plan),
    planVersion: 1,
    frozenPlanSnapshots: [],
    updatedAt: now,
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

export function regenerateIfPlanChanged(
  existing: CampaignTasksRecord | null,
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): CampaignTasksRecord {
  const plan = campaign.approvedStudioPlan;
  const fingerprint = plan ? computePlanFingerprint(plan) : "";

  // A campaign with no approved plan legitimately has an empty task list forever (fingerprint
  // ""); that must still preserve the existing envelope's non-task fields (e.g. jobRecords,
  // ownerDecisionInteractions) instead of falling through to a fresh, stripped regeneration
  // below. Campaigns that DO have a plan but whose tasks were emptied by a prior bug/corruption
  // still self-heal via the `existing.tasks.length > 0` fallback path further down.
  const legitimatelyTaskless = !plan?.lineItems.length;
  if (
    existing &&
    existing.planFingerprint === fingerprint &&
    (existing.tasks.length > 0 || legitimatelyTaskless)
  ) {
    const normalizedTasks = existing.tasks.map(normalizeLegacyTask);
    const refreshed = applyStatusesWithWorkflow(normalizedTasks, campaign, materials);
    return {
      ...existing,
      tasks: refreshed,
      planVersion: existing.planVersion ?? 1,
      frozenPlanSnapshots: existing.frozenPlanSnapshots ?? [],
      version: existing.version ?? CAMPAIGN_TASKS_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
  }

  if (existing && existing.tasks.length > 0) {
    const fresh = generateCampaignTasks(campaign, materials);
    const merged = mergePlanChangeTasks(existing, fresh);
    const refreshed = applyStatusesWithWorkflow(merged.tasks, campaign, materials);
    return {
      ...merged,
      tasks: refreshed,
      updatedAt: new Date().toISOString(),
    };
  }

  return generateCampaignTasks(campaign, materials);
}
