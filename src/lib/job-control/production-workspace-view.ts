import type { CampaignRecord } from "@/config/studio-board";
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { productionWorkspace } from "@/config/production-workspace";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { RouteMapProductionBrief } from "@/lib/route-map-production-brief";
import { resolveRouteMapProductionBrief } from "@/lib/route-map-production-brief";

import { sortActivityEvents } from "./activity-log";
import type { ProductionLaneView } from "./capacity";
import {
  allRequiredDeliverablesPrepared,
  canOwnerApproveForReview,
  canSubmitForOwnerApproval,
  canTransitionToBuildingConcepts,
  isDeliverablePrepared,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import type { JobReviewFeedback } from "./review-feedback-types";
import type { JobActivityEvent, PurchasedJobRecord } from "./types";

export type ProductionWorkspaceDeliverableRow = {
  key: string;
  label: string;
  prepared: boolean;
  preparedAt?: string;
};

export type ProductionWorkspaceMaterialRow = {
  id: string;
  label: string;
  status: "received" | "missing" | "submitted";
  submittedAt?: string;
};

export type ProductionWorkspaceView = {
  jobId: string;
  campaignId: string;
  campaignName: string;
  serviceName: string;
  skuId: string;
  spineStatus: PurchasedJobRecord["spineStatus"];
  spineStatusLabel: string;
  productionLane: PurchasedJobRecord["productionLane"];
  productionLaneLabel: string;
  clientDeadline: string | null;
  scopeSummary: string;
  requiredDeliverables: readonly ProductionWorkspaceDeliverableRow[];
  allDeliverablesPrepared: boolean;
  materials: readonly ProductionWorkspaceMaterialRow[];
  productionBrief: RouteMapProductionBrief | null;
  clientVisibleNotes: readonly string[];
  internalNotes: NonNullable<PurchasedJobRecord["internalNotes"]>;
  workingFileRefs: NonNullable<PurchasedJobRecord["workingFileRefs"]>;
  activity: readonly JobActivityEvent[];
  ownerApprovalPending: PurchasedJobRecord["ownerApprovalPending"];
  /** Client revision feedback — visible to production when job returned from Review Room. */
  clientRevisionFeedback: JobReviewFeedback | null;
  gates: {
    canStartBuildingConcepts: boolean;
    startBlockedReasons: readonly string[];
    canSubmitForOwnerApproval: boolean;
    submitBlockedReasons: readonly string[];
    canOwnerApproveForReview: boolean;
    approveBlockedReasons: readonly string[];
  };
};

function resolveScopeSummary(campaign: CampaignRecord, skuId: string, serviceName: string): string {
  const plan = campaign.approvedStudioPlan;
  const line = plan
    ? filterProductionPlanLineItems(plan).find(
        (item) => (item.skuId ?? item.serviceId) === skuId,
      )
    : undefined;

  const parts = [serviceName];
  if (line?.timingWindowLabel) parts.push(line.timingWindowLabel);
  if (line?.revisionRule) parts.push(line.revisionRule);
  return parts.join(" · ");
}

function resolveProductionBriefForJob(
  campaign: CampaignRecord,
  skuId: string,
): RouteMapProductionBrief | null {
  const brief = resolveRouteMapProductionBrief(campaign);
  if (brief && brief.skuId === skuId) return brief;
  if (campaign.routeMapContext?.jobId === skuId) {
    return resolveRouteMapProductionBrief(campaign);
  }
  return null;
}

function resolveClientVisibleNotes(campaign: CampaignRecord): string[] {
  const notes: string[] = [];
  if (campaign.studioNotes?.length) {
    notes.push(...campaign.studioNotes.map((entry) => entry.message).filter(Boolean));
  }
  return notes;
}

export function resolveProductionWorkspaceView(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  materials: readonly CampaignMaterialItem[];
  activityEvents: readonly JobActivityEvent[];
  laneViews: readonly ProductionLaneView[];
  jobReviewFeedback?: readonly JobReviewFeedback[];
}): ProductionWorkspaceView {
  const { campaign, job, materials, activityEvents, laneViews, jobReviewFeedback } = input;
  const plan = campaign.approvedStudioPlan;
  const line = plan
    ? filterProductionPlanLineItems(plan).find(
        (item) => (item.skuId ?? item.serviceId) === job.skuId,
      )
    : undefined;

  const requiredDefs = resolveRequiredDeliverableKeys(line?.deliverables ?? []);
  const requiredDeliverables: ProductionWorkspaceDeliverableRow[] = requiredDefs.map((def) => {
    const prep = (job.deliverablePrep ?? []).find((entry) => entry.deliverableKey === def.key);
    return {
      key: def.key,
      label: def.label,
      prepared: isDeliverablePrepared(job, def.key),
      preparedAt: prep?.preparedAt,
    };
  });

  const jobMaterials = materials.filter((item) =>
    item.relatedServiceIds.includes(job.skuId as never),
  );

  const materialRows: ProductionWorkspaceMaterialRow[] = jobMaterials.map((item) => ({
    id: item.id,
    label: item.label,
    status: isBlockingMaterialItem(item)
      ? "missing"
      : item.submittedAt
        ? "received"
        : "submitted",
    submittedAt: item.submittedAt,
  }));

  const jobActivity = sortActivityEvents(
    activityEvents.filter((event) => event.jobId === job.jobId),
  );

  const startGate = canTransitionToBuildingConcepts(job, materials, laneViews);
  const submitGate = canSubmitForOwnerApproval(job, line?.deliverables ?? []);
  const approveGate = canOwnerApproveForReview(job);

  const lane = job.returnLane ?? job.productionLane;

  const revisionFeedback = (jobReviewFeedback ?? []).find((entry) => entry.jobId === job.jobId);
  const clientRevisionFeedback =
    revisionFeedback?.submissionType === "revision_requested" ? revisionFeedback : null;

  return {
    jobId: job.jobId,
    campaignId: job.campaignId,
    campaignName: campaign.campaignName,
    serviceName: job.serviceName,
    skuId: job.skuId,
    spineStatus: job.spineStatus,
    spineStatusLabel: OWNER_CONTROL_ROOM_SECTION.spineStatusLabels[job.spineStatus],
    productionLane: lane,
    productionLaneLabel: OWNER_CONTROL_ROOM_SECTION.laneLabels[lane],
    clientDeadline: job.clientDeadline ?? campaign.estimatedCompletion ?? null,
    scopeSummary: resolveScopeSummary(campaign, job.skuId, job.serviceName),
    requiredDeliverables,
    allDeliverablesPrepared: allRequiredDeliverablesPrepared(job, line?.deliverables ?? []),
    materials: materialRows,
    productionBrief: resolveProductionBriefForJob(campaign, job.skuId),
    clientVisibleNotes: resolveClientVisibleNotes(campaign),
    internalNotes: job.internalNotes ?? [],
    workingFileRefs: job.workingFileRefs ?? [],
    activity: jobActivity,
    ownerApprovalPending: job.ownerApprovalPending ?? null,
    clientRevisionFeedback,
    gates: {
      canStartBuildingConcepts: startGate.allowed,
      startBlockedReasons: startGate.reasons.map((reason) => reason.message),
      canSubmitForOwnerApproval: submitGate.allowed,
      submitBlockedReasons: submitGate.reasons.map((reason) => reason.message),
      canOwnerApproveForReview: approveGate.allowed,
      approveBlockedReasons: approveGate.reasons.map((reason) => reason.message),
    },
  };
}

export function productionWorkspacePageTitle(view: ProductionWorkspaceView): string {
  return `${productionWorkspace.pageTitle} — ${view.serviceName}`;
}
