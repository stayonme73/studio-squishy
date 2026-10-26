import type { DraftIntakeSummarySection } from "@/config/draft-room";
import { draftRoomIntakeAnswerSummary } from "@/config/draft-room";
import { resolveApprovedGreenServiceIds } from "@/config/project-details";
import type { CampaignRecord } from "@/config/studio-board";
import { readLastDraftIntake } from "@/lib/draft-intake";
import {
  resolveCampaignStudioNotes,
  resolveCampaignTimeline,
  resolveCampaignDisplayName,
  resolveDeliverablesRemaining,
  resolveRevisionTracker,
  resolveVisionData,
  type CampaignTimelineEntry,
  type DeliverableRemainingItem,
  type RevisionTrackerView,
} from "@/lib/campaign-record";
import {
  studioBoard,
  type CampaignIntakeSnapshot,
  type CampaignStatus,
  type StudioUpdate,
} from "@/config/studio-board";
import {
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
} from "@/lib/approved-plan-display";
import {
  resolveRouteMapClientSummary,
  type RouteMapClientSummary,
} from "@/lib/route-map-production-brief";
import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import {
  buildProjectDetailsSummary,
  type ProjectDetailsSummarySection,
} from "@/lib/project-details-summary";
import {
  formatRecordFieldValue,
} from "@/lib/project-record-client-copy";
import {
  resolveCampaignProgressSteps,
  resolveStudioBoardView,
  type CampaignProgressStep,
} from "@/lib/studio-board-view";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";
import {
  alignCustomerFacingJobStatusLabel,
  resolveCustomerCurrentStatusOverlay,
  type CustomerCurrentStatusOverlay,
} from "@/lib/studio-customer-current-status";
import type { ServiceId } from "@/catalog/types";

const { campaignDetails: copy } = studioBoard;

export type { ProjectDetailsSummarySection };

export type DeliverablesPreview =
  | { ready: false; message: string; hint: string }
  | {
      ready: true;
      message?: string;
      links: readonly { label: string; href: string; primary?: boolean }[];
    };

export type CampaignDetailsView = {
  hasCampaign: boolean;
  campaignName: string;
  statusLabel: string;
  status: CampaignStatus | null;
  estimatedCompletion: string;
  createdDate: string;
  campaignType: string;
  visionSummary: readonly DraftIntakeSummarySection[];
  hasVisionSummary: boolean;
  projectDetailsSummary: readonly ProjectDetailsSummarySection[];
  hasProjectDetailsSummary: boolean;
  routeMapClientSummary: RouteMapClientSummary | null;
  hasRouteMapClientSummary: boolean;
  revisionTracker: RevisionTrackerView | null;
  deliverablesRemaining: DeliverableRemainingItem[];
  packageIncludes: readonly string[];
  studioUpdates: readonly StudioUpdate[];
  deliverables: DeliverablesPreview;
  timeline: CampaignTimelineEntry[];
  progressSteps: readonly CampaignProgressStep[];
  statusJobs: readonly CustomerJobStatusSummary[];
};

function formatCreatedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return copy.notProvided;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function resolveIntake(campaign: CampaignRecord): CampaignIntakeSnapshot | undefined {
  const stored = campaign.intake;
  const hasStored =
    stored &&
    (stored.idea.trim() ||
      stored.audience.trim() ||
      stored.action.trim() ||
      stored.deadline.trim());

  if (hasStored) return stored;

  if (campaign.approvedStudioPlan) return stored;

  const draft = readLastDraftIntake();
  if (!draft) return stored;

  return {
    idea: draft.idea.trim(),
    audience: draft.audience.trim(),
    action: draft.action.trim(),
    deadline: draft.deadline.trim(),
    submittedAt: draft.submittedAt,
  };
}

function resolveDeliverables(
  status: CampaignStatus,
  finalDelivery?: FinalDeliveryView | null,
  overlay?: { suppressReviewCta: boolean; preferDeliveryCta: boolean } | null,
): DeliverablesPreview {
  const preparing = {
    ready: false as const,
    message: copy.deliverables.preparing,
    hint: copy.deliverables.preparingHint,
  };

  if (finalDelivery?.state === "ready" && finalDelivery.jobs.some((job) => job.files.length > 0)) {
    return {
      ready: true,
      message: finalDelivery.hasDeliveredJobs ? copy.deliverables.ready : copy.deliverables.preparing,
      links: [
        {
          label: copy.deliverables.viewFinalAssets,
          href: studioBoard.routes.deliverables,
          primary: true,
        },
      ],
    };
  }

  if (overlay?.preferDeliveryCta || status === "DELIVERED") {
    return {
      ready: true,
      message: copy.deliverables.ready,
      links: [
        {
          label: copy.deliverables.viewFinalAssets,
          href: studioBoard.routes.deliverables,
          primary: true,
        },
      ],
    };
  }

  if (overlay?.suppressReviewCta) {
    return preparing;
  }

  if (status === "READY_FOR_REVIEW") {
    return {
      ready: true,
      links: [{ label: copy.deliverables.reviewConcepts, href: studioBoard.routes.feedbackStudio }],
    };
  }

  return preparing;
}

const emptyView: CampaignDetailsView = {
  hasCampaign: false,
  campaignName: copy.notProvided,
  statusLabel: copy.notProvided,
  status: null,
  estimatedCompletion: copy.notProvided,
  createdDate: copy.notProvided,
  campaignType: copy.notProvided,
  visionSummary: [],
  hasVisionSummary: false,
  projectDetailsSummary: [],
  hasProjectDetailsSummary: false,
  routeMapClientSummary: null,
  hasRouteMapClientSummary: false,
  revisionTracker: null,
  deliverablesRemaining: [],
  packageIncludes: [],
  studioUpdates: studioBoard.empty.studioUpdates,
  deliverables: {
    ready: false,
    message: copy.deliverables.preparing,
    hint: copy.deliverables.preparingHint,
  },
  timeline: [],
  progressSteps: [],
  statusJobs: [],
};

const ETA_PROGRESS_MASQUERADE = /^(in progress|soon|tbd|—|-)$/i;

/** Estimated completion is a date or a truthful wait state — never a progress label. */
export function resolveRecordEstimatedCompletion(
  campaign: CampaignRecord,
  overlay: CustomerCurrentStatusOverlay | null,
): string {
  if (campaign.targetCompletionDate) {
    const formatted = formatCreatedDate(campaign.targetCompletionDate);
    if (formatted !== copy.notProvided) return formatted;
  }

  const raw = campaign.estimatedCompletion?.trim() ?? "";
  if (raw && !ETA_PROGRESS_MASQUERADE.test(raw)) return raw;

  if (overlay?.kind === "delivery_ready" || campaign.campaignStatus === "DELIVERED") {
    return studioBoard.statusContent.DELIVERED.estimatedCompletion;
  }

  if (
    overlay?.kind === "intake_received" ||
    overlay?.kind === "intake_needed" ||
    overlay?.kind === "identity_verifying"
  ) {
    return studioBoard.statusContent.PAYMENT_RECEIVED.estimatedCompletion;
  }

  return "Not scheduled yet";
}

export function fallbackRecordStatusJobs(
  campaign: CampaignRecord,
  statusLabel: string,
): CustomerJobStatusSummary[] {
  const items = campaign.approvedStudioPlan?.lineItems ?? [];
  return items.map((item, index) => ({
    jobId: `record-plan-${campaign.campaignId}-${item.skuId}-${index}`,
    campaignId: campaign.campaignId,
    skuId: item.skuId as ServiceId,
    serviceName: item.serviceName,
    statusLabel,
    isWaitingOnClient: false,
    hasProductionStarted: false,
    deliveredAt: null,
    clientDeadline: null,
  }));
}

export function alignRecordJobStatusWithOverlay(
  jobs: readonly CustomerJobStatusSummary[],
  overlay: CustomerCurrentStatusOverlay | null,
): CustomerJobStatusSummary[] {
  if (!overlay) return [...jobs];
  return jobs.map((job) => ({
    ...job,
    statusLabel: alignCustomerFacingJobStatusLabel(job.statusLabel, overlay.statusLabel),
  }));
}

function normalizeVisionSummaryForRecord(
  sections: readonly DraftIntakeSummarySection[],
): readonly DraftIntakeSummarySection[] {
  return sections.map((section) => ({
    ...section,
    entries: section.entries.map((entry) => ({
      ...entry,
      value: formatRecordFieldValue(entry.value),
    })),
  }));
}

function normalizeRouteMapSummaryForRecord(
  summary: RouteMapClientSummary,
): RouteMapClientSummary {
  return {
    ...summary,
    items: summary.items.map((item) => ({
      ...item,
      value: formatRecordFieldValue(item.value),
    })),
  };
}

export function resolveCampaignDetailsView(
  campaign: CampaignRecord | null,
  options?: {
    finalDelivery?: FinalDeliveryView | null;
    jobs?: readonly CustomerJobStatusSummary[];
  },
): CampaignDetailsView {
  if (!campaign) return emptyView;

  const visionData = resolveVisionData(campaign);
  const visionRaw = visionData ? draftRoomIntakeAnswerSummary(visionData) : [];
  const visionSummary = normalizeVisionSummaryForRecord(visionRaw);
  const hasIntake = Boolean(resolveIntake(campaign));
  const greenServiceIds = resolveApprovedGreenServiceIds(campaign.approvedStudioPlan);
  const projectDetailsSummary = buildProjectDetailsSummary(
    campaign.projectDetails,
    greenServiceIds,
    "client-record",
  );
  const routeMapRaw = resolveRouteMapClientSummary(campaign);
  const routeMapClientSummary = routeMapRaw ? normalizeRouteMapSummaryForRecord(routeMapRaw) : null;

  const movedToProduction = Boolean(options?.jobs?.some((job) => job.hasProductionStarted));
  const boardView = resolveStudioBoardView(campaign, {
    jobs: options?.jobs,
    movedToProduction,
    blockingRequiredCount: campaign.materialsSummary?.blockingRequiredCount ?? 0,
  });
  const overlay = resolveCustomerCurrentStatusOverlay(
    campaign,
    {
      productionGatePassed: movedToProduction,
      blockingRequiredCount: campaign.materialsSummary?.blockingRequiredCount ?? 0,
    },
    options?.jobs,
  );

  return {
    hasCampaign: true,
    campaignName: resolveCampaignDisplayName(campaign),
    statusLabel: boardView.statusLabel,
    status: campaign.campaignStatus,
    createdDate: formatCreatedDate(campaign.createdAt),
    campaignType: resolveCampaignPlanLabel(campaign),
    visionSummary,
    hasVisionSummary: visionSummary.length > 0 || hasIntake,
    projectDetailsSummary,
    hasProjectDetailsSummary: projectDetailsSummary.length > 0,
    routeMapClientSummary,
    hasRouteMapClientSummary: routeMapClientSummary !== null,
    revisionTracker: resolveRevisionTracker(campaign),
    deliverablesRemaining: resolveDeliverablesRemaining(campaign),
    packageIncludes: resolveCampaignPlanIncludes(campaign),
    studioUpdates: resolveCampaignStudioNotes(campaign),
    deliverables: resolveDeliverables(campaign.campaignStatus, options?.finalDelivery, overlay),
    timeline: resolveCampaignTimeline(campaign).map((entry) =>
      entry.label === "Current status" ? { ...entry, date: boardView.statusLabel } : entry,
    ),
    progressSteps: resolveCampaignProgressSteps(campaign, {
      jobs: options?.jobs,
      movedToProduction,
      blockingRequiredCount: campaign.materialsSummary?.blockingRequiredCount ?? 0,
    }),
    statusJobs: alignRecordJobStatusWithOverlay(
      options?.jobs?.length
        ? options.jobs
        : fallbackRecordStatusJobs(campaign, boardView.statusLabel),
      overlay,
    ),
    estimatedCompletion: resolveRecordEstimatedCompletion(campaign, overlay),
  };
}
