import { studioBoard, campaignStatusIndex, type CampaignRecord, type CampaignStatus, type StudioUpdate } from "@/config/studio-board";

import {

  resolveActivityFeed,

  resolveDeliverablesRemaining,

  resolveDeliverablesRemainingCount,

  resolveDeliverablesRemainingSummary,

  resolveCampaignDisplayName,

  resolveLastStudioNote,

  resolveRevisionTracker,

  type ActivityFeedEntry,

  type DeliverableRemainingItem,

} from "@/lib/campaign-record";



const { empty, statusContent, routes, boardHeader } = studioBoard;



const defaultHeaderSubline = "Here's what's happening in the Studio today.";



export type StudioBoardView = {

  hasCampaign: boolean;

  status: CampaignStatus | null;

  campaignName: string;

  campaignTitle: string;

  packageLabel: string | null;

  campaignProgressLabel: string | null;

  statusLabel: string;

  campaignDescription: string;

  estimatedCompletion: string | null;

  revisionsRemaining: number | null;

  deliverablesRemainingCount: number | null;

  deliverablesRemainingSummary: string | null;

  deliverablesProgress: DeliverableRemainingItem[];

  activityFeed: ActivityFeedEntry[];

  lastStudioNote: StudioUpdate | null;

  studioNote: StudioNoteView | null;

  progressSteps: CampaignProgressStep[];

  headerSnapshot: BoardHeaderSnapshot;

  whatHappensNextSentence: string;

  whatHappensNextSteps: readonly string[];

  stickySelection: string | null;

  headerSubline: string;

  primaryCta: string;

  primaryRoute: (typeof studioBoard.statusContent)[CampaignStatus]["primaryRoute"] | null;

};



function campaignHeadline(name: string) {
  const base = formatCampaignTitle(name)
    .replace(/\s+campaign$/i, "")
    .trim();

  if (!base) return "Your Campaign";
  if (base.includes(":")) return base;

  return base.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}



export function formatCampaignTitle(name: string) {

  const trimmed = name.trim();

  if (!trimmed) return "Your Campaign";

  if (/campaign/i.test(trimmed)) return trimmed;

  return `${trimmed} Campaign`;

}

export type CampaignProgressStepState = "complete" | "current" | "upcoming";

export type CampaignProgressStep = {
  id: CampaignStatus;
  label: string;
  state: CampaignProgressStepState;
  detail: string | null;
  href: string | null;
  actionLabel?: string;
};

export type BoardHeaderSnapshot = {
  statusDisplay: string;
  estimatedCompletion: string;
  nextUpdate: string;
};

export type StudioNoteView = {
  date: string;
  lines: readonly string[];
};

export function resolveStudioNoteView(campaign: CampaignRecord | null): StudioNoteView | null {
  if (!campaign) return null;
  const note = resolveLastStudioNote(campaign);
  if (!note) return null;

  const content = statusContent[campaign.campaignStatus];
  const board = content.studioNoteBoard;
  const { userName, studioNote: noteCopy } = studioBoard;
  const greeting = `${noteCopy.greetingPrefix} ${userName},`;
  const bodyLines =
    board?.letterLines ??
    (content.studioNoteFollowUp ? [content.studioNoteFollowUp] : ["Thank you for trusting The Studio.", "— The Studio Team ♥"]);

  return {
    date: note.date,
    lines: [greeting, ...bodyLines],
  };
}

export function resolveEstimatedFirstConcepts(campaign: CampaignRecord | null): string | null {
  if (!campaign) return null;
  const content = statusContent[campaign.campaignStatus];
  if ("estimatedFirstConcepts" in content && typeof content.estimatedFirstConcepts === "string") {
    return content.estimatedFirstConcepts;
  }
  return formatBoardDate(campaign.targetCompletionDate) ?? null;
}

function formatBoardDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function resolveProgressStepDetail(
  stageId: CampaignStatus,
  state: CampaignProgressStepState,
  campaign: CampaignRecord | null,
): string | null {
  if (state === "upcoming") return null;

  if (state === "current") {
    if (stageId === "BUILDING_CONCEPTS") return "In Progress";
    if (stageId === "DRAFT_RECEIVED") return "Awaiting payment";
    if (stageId === "READY_FOR_REVIEW") return studioBoard.nextAction.conceptsReadyLabel;
    if (stageId === "PAYMENT_RECEIVED") return "Queued";
    if (stageId === "DELIVERED") return "Complete";
    return null;
  }

  if (!campaign) return null;

  switch (stageId) {
    case "DRAFT_RECEIVED":
      return formatBoardDate(campaign.visionSubmittedAt ?? campaign.createdAt);
    case "PAYMENT_RECEIVED":
      return formatBoardDate(campaign.paymentReceivedAt);
    case "BUILDING_CONCEPTS":
    case "READY_FOR_REVIEW":
    case "DELIVERED":
      return formatBoardDate(campaign.updatedAt);
    default:
      return null;
  }
}

function resolveProgressStepHref(
  stageId: CampaignStatus,
  state: CampaignProgressStepState,
): string | null {
  if (state === "upcoming") return null;

  const { routes } = studioBoard;
  if (stageId === "READY_FOR_REVIEW") return routes.feedbackStudio;
  if (stageId === "DELIVERED") return routes.deliverables;
  return null;
}

/** Journey rail + timeline merged — one vertical progress list with dates. */
export function resolveCampaignProgressSteps(campaign: CampaignRecord | null): CampaignProgressStep[] {
  const activeIndex = campaign ? campaignStatusIndex(campaign.campaignStatus) : -1;

  return studioBoard.journeyStages.map((stage, index) => {
    const state: CampaignProgressStepState =
      activeIndex < 0
        ? "upcoming"
        : index < activeIndex
          ? "complete"
          : index === activeIndex
            ? "current"
            : "upcoming";

    return {
      id: stage.id,
      label: stage.boardLabel,
      state,
      detail: resolveProgressStepDetail(stage.id, state, campaign),
      href: resolveProgressStepHref(stage.id, state),
      actionLabel:
        state === "current" && stage.id === "READY_FOR_REVIEW"
          ? studioBoard.nextAction.reviewMyConcepts
          : state === "current" && stage.id === "DELIVERED"
            ? studioBoard.nextAction.openFinalDelivery
            : undefined,
    };
  });
}

function resolveBoardHeaderSnapshot(campaign: CampaignRecord | null): BoardHeaderSnapshot {
  if (!campaign) {
    return {
      statusDisplay: boardHeader.notStarted.toUpperCase(),
      estimatedCompletion: boardHeader.pending,
      nextUpdate: boardHeader.pending,
    };
  }

  const content = statusContent[campaign.campaignStatus];
  const targetDate = formatBoardDate(campaign.targetCompletionDate);

  return {
    statusDisplay: content.statusLabel.toUpperCase(),
    estimatedCompletion: targetDate ?? content.estimatedCompletion,
    nextUpdate: content.nextUpdateLabel ?? boardHeader.pending,
  };
}



const whatHappensNextSentences: Record<CampaignStatus, string> = {

  DRAFT_RECEIVED: "Choose your package and complete payment to continue.",

  PAYMENT_RECEIVED: "The Studio is preparing to begin your campaign.",

  BUILDING_CONCEPTS: "The Studio is building your campaign concepts. Check back here for your review invitation.",

  READY_FOR_REVIEW: "Your concepts are ready — review them and choose your direction.",

  DELIVERED: "Your package is ready to download.",

};



export function resolveWhatHappensNextSentence(campaign: CampaignRecord | null): string {

  if (!campaign) return "Start a campaign in the Draft Room to begin.";

  return whatHappensNextSentences[campaign.campaignStatus];

}



/** Live board copy — always derived from current campaignStatus, never stale intake fields. */

export function resolveStudioBoardView(campaign: CampaignRecord | null): StudioBoardView {

  if (!campaign) {

    return {

      hasCampaign: false,

      status: null,

      campaignName: empty.campaignName,

      campaignTitle: empty.campaignNamePlaceholder,

      packageLabel: null,

      campaignProgressLabel: null,

      statusLabel: "Not started",

      campaignDescription: empty.campaignDescription,

      estimatedCompletion: null,

      revisionsRemaining: null,

      deliverablesRemainingCount: null,

      deliverablesRemainingSummary: null,

      deliverablesProgress: [],

      activityFeed: [],

      lastStudioNote: null,

      studioNote: null,

      progressSteps: resolveCampaignProgressSteps(null),

      headerSnapshot: resolveBoardHeaderSnapshot(null),

      whatHappensNextSentence: resolveWhatHappensNextSentence(null),

      whatHappensNextSteps: [

        "Start a campaign in the Draft Room.",

        "We review your request.",

        "We build your campaign concepts.",

        "You choose your favorite.",

      ],

      stickySelection: null,

      headerSubline: "Start a campaign to see your Studio journey unfold.",

      primaryCta: empty.primaryCta,

      primaryRoute: null,

    };

  }



  const content = statusContent[campaign.campaignStatus];

  const revisionTracker = resolveRevisionTracker(campaign);

  const deliverablesProgress = resolveDeliverablesRemaining(campaign);



  return {

    hasCampaign: true,

    status: campaign.campaignStatus,

    campaignName: resolveCampaignDisplayName(campaign),

    campaignTitle: campaignHeadline(resolveCampaignDisplayName(campaign)),

    packageLabel: campaign.packageLabel,

    campaignProgressLabel: content.campaignProgressLabel,

    statusLabel: content.statusLabel,

    campaignDescription: content.campaignDescription,

    estimatedCompletion: content.estimatedCompletion,

    revisionsRemaining: revisionTracker.remaining,

    deliverablesRemainingCount: resolveDeliverablesRemainingCount(campaign),

    deliverablesRemainingSummary: resolveDeliverablesRemainingSummary(campaign),

    deliverablesProgress,

    activityFeed: resolveActivityFeed(campaign),

    lastStudioNote: resolveLastStudioNote(campaign),

    studioNote: resolveStudioNoteView(campaign),

    progressSteps: resolveCampaignProgressSteps(campaign),

    headerSnapshot: resolveBoardHeaderSnapshot(campaign),

    whatHappensNextSentence: resolveWhatHappensNextSentence(campaign),

    whatHappensNextSteps: content.whatHappensNextSteps,

    stickySelection: campaign.selectedCampaignOption ?? null,

    headerSubline: defaultHeaderSubline,

    primaryCta: content.primaryCta,

    primaryRoute: content.primaryRoute,

  };

}



export type MembershipSnapshotView = {

  isActive: boolean;

  emptyHint: string;

  packageType: string;

  campaignsRemaining: number;

  campaignsTotal: number;

  campaignsUsed: number;

  emailsRemaining: number;

  smsRemaining: number;

  renewalDate: string;

};



/** Phase 1 — mock plan usage tied to whether a campaign is in progress. */

export function resolveMembershipSnapshot(

  campaign: CampaignRecord | null,

): MembershipSnapshotView {

  const base = studioBoard.membership;



  if (!campaign) {

    return {

      isActive: false,

      emptyHint: base.emptyHint,

      packageType: base.packageType,

      campaignsRemaining: base.campaignsTotal,

      campaignsTotal: base.campaignsTotal,

      campaignsUsed: 0,

      emailsRemaining: base.emailsRemaining,

      smsRemaining: base.smsRemaining,

      renewalDate: base.renewalDate,

    };

  }



  return {

    isActive: true,

    emptyHint: base.emptyHint,

    packageType: base.packageType,

    campaignsRemaining: base.campaignsRemaining,

    campaignsTotal: base.campaignsTotal,

    campaignsUsed: base.campaignsTotal - base.campaignsRemaining,

    emailsRemaining: base.emailsRemaining,

    smsRemaining: base.smsRemaining,

    renewalDate: base.renewalDate,

  };

}



export type GreetingPeriod = "morning" | "afternoon" | "evening";



export function greetingPeriodFromDate(date = new Date()): GreetingPeriod {

  const hour = date.getHours();

  if (hour < 12) return "morning";

  if (hour < 17) return "afternoon";

  return "evening";

}



export type BoardCampaignActionId =

  | "reviewConcepts"

  | "chooseDirection"

  | "choosePackage"

  | "downloadPackage"

  | "viewDeliverables";



export type BoardCampaignAction = {

  id: BoardCampaignActionId;

  label: string;

  href: string;

  isPrimary: boolean;

};



/** Status-aware shortcuts — only enabled actions, no disabled placeholders. */

export function resolveBoardCampaignActions(

  status: CampaignStatus | null,

  hasCampaign: boolean,

  options?: { studioGuideHref?: string },

): BoardCampaignAction[] {

  if (!hasCampaign || !status) return [];



  const { routes, campaignActions: copy } = studioBoard;



  switch (status) {

    case "DRAFT_RECEIVED":

      if (!options?.studioGuideHref) return [];

      return [

        {

          id: "choosePackage",

          label: copy.reviewConcepts,

          href: options.studioGuideHref,

          isPrimary: true,

        },

      ];

    case "READY_FOR_REVIEW":

      return [

        {

          id: "reviewConcepts",

          label: copy.reviewConcepts,

          href: routes.feedbackStudio,

          isPrimary: true,

        },

        {

          id: "chooseDirection",

          label: copy.chooseDirection,

          href: routes.feedbackStudio,

          isPrimary: false,

        },

      ];

    case "DELIVERED":

      return [

        {

          id: "downloadPackage",

          label: copy.downloadPackage,

          href: routes.deliverables,

          isPrimary: true,

        },

        {

          id: "viewDeliverables",

          label: copy.viewDeliverables,

          href: routes.deliverables,

          isPrimary: false,

        },

      ];

    default:

      return [];

  }

}



/** Informational status when no navigation actions are available. */

export function resolveBoardCampaignActionsMessage(

  status: CampaignStatus | null,

  hasCampaign: boolean,

): string | null {

  if (!hasCampaign || !status) return null;



  if (

    status === "DRAFT_RECEIVED" ||

    status === "PAYMENT_RECEIVED" ||

    status === "BUILDING_CONCEPTS"

  ) {

    return studioBoard.campaignActions.waitingOnStudio;

  }



  return null;

}



/** @deprecated Use board drawer — kept for legacy links that resolve primary route. */

export function resolveOpenCampaignHref(status: CampaignStatus | null): string | null {

  if (!status) return null;

  const route = statusContent[status].primaryRoute;

  return studioBoard.routes[route];

}



/** @deprecated V2 board uses resolveBoardCampaignActionsMessage instead. */

export function resolveCampaignActionsHint(status: CampaignStatus | null): string | null {

  return resolveBoardCampaignActionsMessage(status, Boolean(status));

}



/** @deprecated V2 board uses resolveBoardCampaignActions instead. */

export function resolveCampaignActions(

  status: CampaignStatus | null,

  hasCampaign: boolean,

): BoardCampaignAction[] {

  return resolveBoardCampaignActions(status, hasCampaign);

}



export type AccountPackageView = {
  isActive: boolean;
  emptyHint: string;
  packagePurchased: string;
  packagePrice: string;
  paymentStatus: string;
  paymentDate: string | null;
  billingType: string;
  renewalDisplay: string;
  campaignsRemaining: number;
  emailsRemaining: number;
  smsRemaining: number;
  revisionsRemaining: number;
};

function resolveBillingType(packageId: CampaignRecord["packageId"]): string {
  const { accountPackage: copy } = studioBoard;
  return packageId === "spark" ? copy.billingOneTime : copy.billingMonthly;
}

function resolveRenewalDisplay(
  packageId: CampaignRecord["packageId"],
  renewalDate: string,
): string {
  const { accountPackage: copy } = studioBoard;
  return packageId === "spark" ? copy.renewalNotApplicable : renewalDate;
}

function formatPaymentDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Account & Package card — replaces sidebar My Account + membership snapshot. */
export function resolveAccountPackageView(campaign: CampaignRecord | null): AccountPackageView {
  const { membership, accountPackage: copy, packagePrices } = studioBoard;

  if (!campaign) {
    return {
      isActive: false,
      emptyHint: copy.emptyHint,
      packagePurchased: membership.packageType,
      packagePrice: membership.packagePrice,
      paymentStatus: copy.paymentPending,
      paymentDate: null,
      billingType: resolveBillingType(membership.packageId),
      renewalDisplay: resolveRenewalDisplay(membership.packageId, membership.renewalDate),
      campaignsRemaining: membership.campaignsTotal,
      emailsRemaining: membership.emailsRemaining,
      smsRemaining: membership.smsRemaining,
      revisionsRemaining: 0,
    };
  }

  const paid =
    campaign.campaignStatus !== "DRAFT_RECEIVED" && Boolean(campaign.paymentReceivedAt);
  const revisionTracker = resolveRevisionTracker(campaign);

  return {
    isActive: true,
    emptyHint: copy.emptyHint,
    packagePurchased: campaign.packageLabel,
    packagePrice: packagePrices[campaign.packageId] ?? membership.packagePrice,
    paymentStatus: paid ? copy.paidInFull : copy.paymentPending,
    paymentDate: paid ? formatPaymentDate(campaign.paymentReceivedAt) : null,
    billingType: resolveBillingType(campaign.packageId),
    renewalDisplay: resolveRenewalDisplay(campaign.packageId, membership.renewalDate),
    campaignsRemaining: membership.campaignsRemaining,
    emailsRemaining: membership.emailsRemaining,
    smsRemaining: membership.smsRemaining,
    revisionsRemaining: revisionTracker.remaining,
  };
}

