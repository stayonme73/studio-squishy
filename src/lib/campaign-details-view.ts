import type { DraftIntakeSummarySection } from "@/config/draft-room";
import { draftRoomIntakeAnswerSummary } from "@/config/draft-room";
import type { ProjectDetailsRecord } from "@/config/project-details";
import {
  projectDetails,
  resolveApprovedGreenServiceIds,
  resolveProjectDetailsMissingItems,
} from "@/config/project-details";
import type { ServiceId } from "@/catalog/types";
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

const { campaignDetails: copy, statusContent } = studioBoard;

export type DeliverablesPreview =
  | { ready: false; message: string; hint: string }
  | {
      ready: true;
      message?: string;
      links: readonly { label: string; href: string; primary?: boolean }[];
    };

export type ProjectDetailsSummarySection = {
  title: string;
  items: readonly { label: string; value: string }[];
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
  projectDetailsSummary: [],
  hasProjectDetailsSummary: false,
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

function buildProjectDetailsSummary(
  record: ProjectDetailsRecord | undefined,
  serviceIds: readonly ServiceId[],
): readonly ProjectDetailsSummarySection[] {
  if (!record) return [];
  const { form, files } = record;
  const sections: ProjectDetailsSummarySection[] = [];

  const pushSection = (title: string, items: { label: string; value: string }[]) => {
    const filled = items.filter((item) => item.value?.trim());
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

export function resolveCampaignDetailsView(
  campaign: CampaignRecord | null,
): CampaignDetailsView {
  if (!campaign) return emptyView;

  const content = statusContent[campaign.campaignStatus];
  const visionData = resolveVisionData(campaign);
  const visionSummary = visionData ? draftRoomIntakeAnswerSummary(visionData) : [];
  const hasIntake = Boolean(resolveIntake(campaign));
  const greenServiceIds = resolveApprovedGreenServiceIds(campaign.approvedStudioPlan);
  const projectDetailsSummary = buildProjectDetailsSummary(campaign.projectDetails, greenServiceIds);

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
    revisionTracker: resolveRevisionTracker(campaign),
    deliverablesRemaining: resolveDeliverablesRemaining(campaign),
    packageIncludes: resolveCampaignPlanIncludes(campaign),
    studioUpdates: resolveCampaignStudioNotes(campaign),
    deliverables: resolveDeliverables(campaign.campaignStatus),
    timeline: resolveCampaignTimeline(campaign),
  };
}
