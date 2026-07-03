import type { DraftIntakeSummarySection } from "@/config/draft-room";
import { draftRoomIntakeAnswerSummary } from "@/config/draft-room";
import { discoveryTileConfig } from "@/config/business-discovery-studio";
import type { ProjectDetailsRecord } from "@/config/project-details";
import {
  projectDetails,
  resolveApprovedGreenServiceIds,
  resolveProjectDetailsMissingItems,
} from "@/config/project-details";
import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import {
  resolveCampaignCreativeBrief,
  type CampaignCreativeBrief,
} from "@/lib/campaign-brief-source";
import {
  resolveRouteMapClientSummary,
  resolveRouteMapProductionBrief,
  type RouteMapClientSummary,
  type RouteMapProductionBrief,
} from "@/lib/route-map-production-brief";
import {
  resolveCampaignDisplayName,
  resolveVisionData,
} from "@/lib/campaign-record";
import {
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
} from "@/lib/approved-plan-display";
import { formatBusinessTileAnswerForDisplay } from "@/lib/business-discovery-completion";
import { resolveDeliverableScopeFromCampaign } from "@/lib/deliverable-scope";
import {
  resolveCampaignProgressSteps,
  type CampaignProgressStep,
} from "@/lib/studio-board-view";
import type { FileRoomMaterialsView } from "@/lib/materials/materials-view";
import type { FileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";
import type { FileRoomExceptionsView } from "@/lib/campaign-tasks/exceptions-view";

const { statusContent } = studioBoard;

export type FileRoomDiscoveryItem = {
  label: string;
  value: string;
};

export type FileRoomProjectDetailsSection = {
  title: string;
  items: readonly { label: string; value: string }[];
};

export type FileRoomDeliverableScopeGroup = {
  serviceName: string;
  deliverables: readonly string[];
};

export type FileRoomSyncMeta = {
  campaignId: string;
  syncVersion: number;
  syncedAt: string;
  sourcePath: string;
};

export type FileRoomRecordHealth = {
  isPartial: boolean;
  missing: readonly string[];
};

export type FileRoomListItemView = {
  campaignId: string;
  campaignName: string;
  statusLabel: string;
  businessLabel: string;
  syncVersion: number;
  syncedAt: string;
  hasDiscovery: boolean;
  hasApprovedPlan: boolean;
  hasPayment: boolean;
  hasProjectDetails: boolean;
};

export type FileRoomCampaignView = {
  campaignId: string;
  campaignName: string;
  statusLabel: string;
  businessLabel: string;
  planLabel: string;
  planIncludes: readonly string[];
  discoveryItems: readonly FileRoomDiscoveryItem[];
  visionSummary: readonly DraftIntakeSummarySection[];
  projectDetailsSections: readonly FileRoomProjectDetailsSection[];
  deliverableScope: readonly FileRoomDeliverableScopeGroup[];
  approvedDirection: string | null;
  creativeBrief: CampaignCreativeBrief | null;
  routeMapClientSummary: RouteMapClientSummary | null;
  routeMapProductionBrief: RouteMapProductionBrief | null;
  progressSteps: readonly CampaignProgressStep[];
  sync: FileRoomSyncMeta;
  health: FileRoomRecordHealth;
  materials: FileRoomMaterialsView;
  productionTasks: FileRoomProductionTasksView;
  exceptions: FileRoomExceptionsView;
};

function buildProjectDetailsSummary(
  record: ProjectDetailsRecord | undefined,
  serviceIds: readonly ServiceId[],
): readonly FileRoomProjectDetailsSection[] {
  if (!record) return [];
  const { form, files } = record;
  const sections: FileRoomProjectDetailsSection[] = [];

  const pushSection = (title: string, items: { label: string; value: string | undefined }[]) => {
    const filled = items
      .map((item) => ({ label: item.label, value: (item.value ?? "").trim() }))
      .filter((item) => item.value);
    if (filled.length) sections.push({ title, items: filled });
  };

  pushSection(projectDetails.steps["working-on"].title, [
    { label: projectDetails.fields.workingOn.label, value: form.workingOn },
    { label: projectDetails.fields.mainOffer.label, value: form.mainOffer },
    { label: projectDetails.fields.importantDates.label, value: form.importantDates },
    { label: projectDetails.fields.callToAction.label, value: form.callToAction },
    { label: projectDetails.fields.destinationLink.label, value: form.destinationLink },
    { label: projectDetails.fields.mustIncludeExactly.label, value: form.mustIncludeExactly },
  ]);

  if (files.length) {
    sections.push({
      title: projectDetails.steps["brand-materials"].title,
      items: files.map((file) => ({
        label: projectDetails.fileCategories[file.category],
        value: file.fileName,
      })),
    });
  }

  pushSection(projectDetails.steps["approval-contact"].title, [
    { label: projectDetails.fields.primaryApproverName.label, value: form.primaryApproverName },
    { label: projectDetails.fields.primaryApproverEmail.label, value: form.primaryApproverEmail },
    { label: projectDetails.fields.secondaryApproverName.label, value: form.secondaryApproverName },
    { label: projectDetails.fields.secondaryApproverEmail.label, value: form.secondaryApproverEmail },
  ]);

  if (serviceIds.length) {
    const missing = resolveProjectDetailsMissingItems(form, files, serviceIds);
    if (missing.length) {
      sections.push({
        title: "Missing at submission",
        items: missing.map((item) => ({ label: item.label, value: "Required" })),
      });
    }
  }

  return sections;
}

function resolveDiscoveryItems(campaign: CampaignRecord): readonly FileRoomDiscoveryItem[] {
  const answers = campaign.discoveryAnswers;
  if (!answers) return [];

  return Object.entries(answers)
    .filter(([, value]) => Boolean(value?.trim()))
    .map(([tileId, value]) => {
      const config = discoveryTileConfig[tileId as keyof typeof discoveryTileConfig];
      const label = config?.title ?? tileId;
      const displayValue =
        tileId === "your-business" ? formatBusinessTileAnswerForDisplay(value) : value.trim();
      return { label, value: displayValue };
    });
}

function resolveBusinessLabel(campaign: CampaignRecord): string {
  const businessRaw = campaign.discoveryAnswers?.["your-business"];
  if (businessRaw?.trim()) return formatBusinessTileAnswerForDisplay(businessRaw);
  return resolveCampaignDisplayName(campaign);
}

function resolveRecordHealth(campaign: CampaignRecord): FileRoomRecordHealth {
  const missing: string[] = [];
  if (!campaign.discoverySubmittedAt) missing.push("Discovery");
  if (!campaign.approvedStudioPlan) missing.push("Approved Studio Plan");
  if (!campaign.paymentReceivedAt) missing.push("Payment");
  if (!campaign.projectDetailsSubmittedAt) missing.push("Project Details");
  return { isPartial: missing.length > 0, missing };
}

function resolveDeliverableScopeGroups(
  campaign: CampaignRecord,
): readonly FileRoomDeliverableScopeGroup[] {
  const scope = resolveDeliverableScopeFromCampaign(campaign);
  return scope.map((group) => ({
    serviceName: group.title,
    deliverables: group.deliverables,
  }));
}

export function resolveFileRoomListItemView(
  envelope: ServerCampaignEnvelope,
): FileRoomListItemView {
  const { record } = envelope;
  const content = statusContent[record.campaignStatus];
  return {
    campaignId: envelope.campaignId,
    campaignName: resolveCampaignDisplayName(record),
    statusLabel: content.statusLabel,
    businessLabel: resolveBusinessLabel(record),
    syncVersion: envelope.syncVersion,
    syncedAt: envelope.syncedAt,
    hasDiscovery: Boolean(record.discoverySubmittedAt),
    hasApprovedPlan: Boolean(record.approvedStudioPlan),
    hasPayment: Boolean(record.paymentReceivedAt),
    hasProjectDetails: Boolean(record.projectDetailsSubmittedAt),
  };
}

export function resolveFileRoomCampaignView(
  envelope: ServerCampaignEnvelope,
  materials: FileRoomMaterialsView,
  productionTasks: FileRoomProductionTasksView,
  exceptions: FileRoomExceptionsView,
): FileRoomCampaignView {
  const { record } = envelope;
  const content = statusContent[record.campaignStatus];
  const visionData = resolveVisionData(record);
  const visionSummary = visionData ? draftRoomIntakeAnswerSummary(visionData) : [];
  const greenServiceIds = resolveApprovedGreenServiceIds(record.approvedStudioPlan);

  return {
    campaignId: envelope.campaignId,
    campaignName: resolveCampaignDisplayName(record),
    statusLabel: content.statusLabel,
    businessLabel: resolveBusinessLabel(record),
    planLabel: resolveCampaignPlanLabel(record),
    planIncludes: resolveCampaignPlanIncludes(record),
    discoveryItems: resolveDiscoveryItems(record),
    visionSummary,
    projectDetailsSections: buildProjectDetailsSummary(record.projectDetails, greenServiceIds),
    deliverableScope: resolveDeliverableScopeGroups(record),
    approvedDirection: record.selectedCampaignOption?.trim() || null,
    creativeBrief: resolveCampaignCreativeBrief(record),
    routeMapClientSummary: resolveRouteMapClientSummary(record),
    routeMapProductionBrief: resolveRouteMapProductionBrief(record),
    progressSteps: resolveCampaignProgressSteps(record),
    sync: {
      campaignId: envelope.campaignId,
      syncVersion: envelope.syncVersion,
      syncedAt: envelope.syncedAt,
      sourcePath: "data/campaigns/",
    },
    health: resolveRecordHealth(record),
    materials,
    productionTasks,
    exceptions,
  };
}
