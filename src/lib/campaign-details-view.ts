import type { DraftIntakeSummarySection } from "@/config/draft-room";
import { draftRoomIntakeAnswerSummary } from "@/config/draft-room";
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
import { getPackageIncludes } from "@/config/studio-guide";

const { campaignDetails: copy, statusContent } = studioBoard;

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

function resolveDeliverables(status: CampaignStatus): DeliverablesPreview {
  const preparing = {
    ready: false as const,
    message: copy.deliverables.preparing,
    hint: copy.deliverables.preparingHint,
  };

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

export function resolveCampaignDetailsView(
  campaign: CampaignRecord | null,
): CampaignDetailsView {
  if (!campaign) return emptyView;

  const content = statusContent[campaign.campaignStatus];
  const visionData = resolveVisionData(campaign);
  const visionSummary = visionData ? draftRoomIntakeAnswerSummary(visionData) : [];
  const hasIntake = Boolean(resolveIntake(campaign));

  return {
    hasCampaign: true,
    campaignName: resolveCampaignDisplayName(campaign),
    statusLabel: content.statusLabel,
    status: campaign.campaignStatus,
    estimatedCompletion: campaign.estimatedCompletion,
    createdDate: formatCreatedDate(campaign.createdAt),
    campaignType: campaign.packageLabel,
    visionSummary,
    hasVisionSummary: visionSummary.length > 0 || hasIntake,
    revisionTracker: resolveRevisionTracker(campaign),
    deliverablesRemaining: resolveDeliverablesRemaining(campaign),
    packageIncludes: getPackageIncludes(campaign.packageId),
    studioUpdates: resolveCampaignStudioNotes(campaign),
    deliverables: resolveDeliverables(campaign.campaignStatus),
    timeline: resolveCampaignTimeline(campaign),
  };
}
