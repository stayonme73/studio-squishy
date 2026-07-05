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

const { campaignDetails: copy, statusContent } = studioBoard;

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

  if (status === "READY_FOR_REVIEW") {
    return {
      ready: true,
      links: [{ label: copy.deliverables.reviewConcepts, href: studioBoard.routes.feedbackStudio }],
    };
  }

  if (status === "DELIVERED") {
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
};

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
  options?: { finalDelivery?: FinalDeliveryView | null },
): CampaignDetailsView {
  if (!campaign) return emptyView;

  const content = statusContent[campaign.campaignStatus];
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

  return {
    hasCampaign: true,
    campaignName: resolveCampaignDisplayName(campaign),
    statusLabel: content.statusLabel,
    status: campaign.campaignStatus,
    estimatedCompletion: campaign.estimatedCompletion,
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
    deliverables: resolveDeliverables(campaign.campaignStatus, options?.finalDelivery),
    timeline: resolveCampaignTimeline(campaign),
  };
}
