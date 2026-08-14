/** Studio Board V3 — customer command center (LOCKED consolidation). */

import { customerJourneyStepName } from "@/config/customer-journey-v1";
import type { DraftIntakeFormValues } from "@/config/draft-room";
import type { ProjectDetailsRecord } from "@/config/project-details";
import type { FeedbackConceptPreview } from "@/config/feedback-studio";
import type { DeliverableQuotaId, StudioGuidePackageId } from "@/config/studio-guide";
import type { DiscoveryBriefAnswers } from "@/recommendation/types";
import type { BillingType, ServiceFamilyId, ServiceId } from "@/catalog/types";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import type { StudioPaymentStatus } from "@/config/studio-payment-v1";

/** Immutable scope snapshot for one approved SKU — post-approval reads this, not live catalog. */
export type ApprovedStudioPlanLineItem = {
  skuId: ServiceId;
  serviceName: string;
  billingType: BillingType;
  exactPriceCents: number;
  priceDisplay: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  timingWindowLabel: string;
  revisionRule: string;
  clientResponsibilities: readonly string[];
  executionResponsibility: string;
  parentSkuId?: ServiceId;
  parentFamilyId?: ServiceFamilyId;
  /** @deprecated use skuId — retained for backward-compat reads */
  serviceId?: ServiceId;
  /** @deprecated use serviceName */
  name?: string;
  /** @deprecated use exactPriceCents */
  priceCents?: number;
};

export type ApprovalAcknowledgment = {
  acknowledgmentVersion: string;
  acknowledgmentText: string;
  acknowledgedAt: string;
};

/** Customer-approved Studio Plan — saved after Studio Plan Review. */
export type ApprovedStudioPlan = {
  /** Ordered selection — base SKUs + execution add-ons. */
  selectedServiceIds: readonly ServiceId[];
  includedServiceIds: readonly ServiceId[];
  additionalServiceIds: readonly ServiceId[];
  /** Overflow-only — services beyond allocation limits (backward compat). */
  additionalCostUsd: number;
  oneTimeTotalCents: number;
  monthlyTotalCents: number;
  amountDueTodayCents: number;
  lineItems: readonly ApprovedStudioPlanLineItem[];
  approvedAt: string;
  acknowledgmentVersion?: string;
  acknowledgmentText?: string;
  acknowledgedAt?: string;
};

export const CAMPAIGN_STATUSES = [
  "DISCOVERY_COMPLETE",
  "DRAFT_RECEIVED",
  "PAYMENT_RECEIVED",
  "BUILDING_CONCEPTS",
  "READY_FOR_REVIEW",
  "DELIVERED",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type JourneyStageConfig = {
  id: CampaignStatus;
  label: string;
  boardLabel: string;
  hint: string;
};

export type StudioUpdate = {
  date: string;
  message: string;
};

export type CampaignIntakeSnapshot = {
  idea: string;
  audience: string;
  action: string;
  deadline: string;
  submittedAt: string;
};

export type DeliverablesDelivered = Partial<Record<DeliverableQuotaId, number>>;

/** Neutral package id — not Spark/Momentum/Growth; discovery-first custom plans use this. */
export const CUSTOM_STUDIO_PLAN_PACKAGE_ID = "custom-studio-plan" as const;

export type CustomStudioPlanPackageId = typeof CUSTOM_STUDIO_PLAN_PACKAGE_ID;

export type CampaignPackageId = StudioGuidePackageId | CustomStudioPlanPackageId;

export type RouteMapJourneyStep = "panel" | "job" | "studio-plan" | "checkout" | "intake";

export type CampaignRecord = {
  campaignId: string;
  campaignName: string;
  campaignStatus: CampaignStatus;
  campaignDescription: string;
  estimatedCompletion: string;
  selectedCampaignOption?: string;
  packageId: CampaignPackageId;
  packageLabel: string;
  intake?: CampaignIntakeSnapshot;
  /** Full Draft Room answers — single source for Vision Summary */
  visionData?: DraftIntakeFormValues;
  /** Business Discovery Studio tile answers */
  discoveryAnswers?: DiscoveryBriefAnswers;
  discoverySubmittedAt?: string;
  /** Studio Plan Review output — required before payment in the discovery flow */
  approvedStudioPlan?: ApprovedStudioPlan;
  /** Post-payment Project Details intake — green services only (V1) */
  projectDetails?: ProjectDetailsRecord;
  projectDetailsSubmittedAt?: string;
  /** Route Map V1 — selected job and road before payment. */
  routeMapContext?: {
    /** Ordered Studio Plan selection. Authoritative for Route Map plan state. */
    selectedServiceIds?: readonly ServiceId[];
    /** Legacy/derived first selected Route Map job. Retained for campaign history. */
    jobId: RouteMapJobId;
    roadId: RouteMapRoadId;
    selectedAt: string;
    currentStep?: RouteMapJourneyStep;
    /** v2-addon-post-publish included at checkout with eligible parent RTU job. */
    postPublishAddon?: boolean;
  };
  /** Route Map V1 — post-payment job-specific intake answers. */
  routeMapIntake?: {
    answers: RouteMapIntakeAnswers;
    submittedAt: string;
  };
  /** Saved client draft for post-payment job-specific intake. Does not complete intake. */
  routeMapIntakeDraft?: {
    answers: RouteMapIntakeAnswers;
    savedAt: string;
  };
  routeMapIntakeSubmittedAt?: string;
  /** Denormalized materials blocking count — updated when materials ledger changes (Slice 2c). */
  materialsSummary?: {
    blockingRequiredCount: number;
    updatedAt: string;
  };
  visionSubmittedAt?: string;
  /** Campaign directions — generated from visionData or supplied by content engine */
  concepts?: FeedbackConceptPreview[];
  conceptsGeneratedAt?: string | null;
  paymentReceivedAt?: string | null;
  /**
   * Processor-authoritative payment truth (Stripe Checkout).
   * Browser/client claims must not invent this; server webhook/reconcile writes it.
   */
  paymentTruth?: {
    processor: "stripe";
    status: StudioPaymentStatus;
    currency: "usd";
    expectedAmountCents: number;
    confirmedAmountCents?: number;
    checkoutSessionId?: string;
    paymentIntentId?: string | null;
    stripeEventId?: string | null;
    selectedServiceIds: readonly string[];
    decisionId: string;
    factFingerprint: string;
    draftRevision: number;
    initiatedAt?: string;
    confirmedAt?: string;
    cancelledAt?: string;
    failedAt?: string;
    /** Sandbox confirmations are never live money. */
    sandbox?: boolean;
  };
  /**
   * Server-owned paid-cycle purchase ledger (sm-001-monthly pay-per-cycle).
   * Supplements paymentTruth — never means “all future cycles paid.”
   * Does not mint productionCycleId.
   */
  paidCyclePurchases?: readonly import("@/lib/studio-payment/paid-cycle-types").PaidCyclePurchaseRecord[];
  /**
   * Explicit service-production-period truth per paidCyclePurchaseId.
   * Required before production cycle mint — never wall-clock inferred.
   */
  sm001MonthlyCyclePeriodTruths?: readonly import("@/lib/studio-monthly-production-cycle/types").Sm001MonthlyCyclePeriodTruth[];
  /**
   * Authoritative sm-001-monthly production cycles (one per confirmed paid purchase).
   * Created by activation seam; renderer consumes only.
   */
  sm001MonthlyProductionCycles?: readonly import("@/lib/studio-monthly-production-cycle/types").Sm001MonthlyProductionCycleRecord[];
  /**
   * Server-owned post-pay activation — eager wake after paymentTruth confirmed.
   * Browser return / File Room / Owner Console visits must not be required.
   */
  postPayActivation?: import("@/lib/studio-post-pay-activation/types").PostPayActivationRecord;
  /**
   * Server-owned routing handoff — durable per-job decisions after ready_for_routing.
   * Capability-level only; does not select vendors or execute dispatch.
   */
  routingHandoff?: import("@/lib/studio-routing-handoff/types").RoutingHandoffRecord;
  /**
   * Server-owned dispatch execution identity — durable after READY_FOR_DISPATCH.
   * Exposes production requirements; does not invoke tools or start production.
   */
  dispatchExecution?: import("@/lib/studio-dispatch/types").DispatchExecutionRecord;
  /**
   * Write-once pre-acceptance payment authorization bound at successful payment.
   * Session decision storage is live-only; this is the durable audit reference.
   */
  preAcceptancePaymentAuthorization?: {
    decisionId: string;
    outcome: "CLEAR_TO_ACCEPT";
    paymentAuthorized: true;
    evaluatedDraftRevision: number;
    selectedServiceIds: readonly string[];
    factFingerprint: string;
    decisionSchemaVersion: number;
    evaluatedAt: string;
    authorizedAt: string;
    packageId: string;
  };
  targetCompletionDate?: string | null;
  revisionRoundsIncluded?: number;
  /**
   * C8c — how write-once `revisionRoundsIncluded` was resolved.
   * Never overwrite an existing included value from live package config.
   */
  revisionRoundsIncludedSource?:
    | "campaign_field"
    | "approved_plan"
    | "package_snapshot"
    | "legacy_package_config";
  revisionRoundsUsed?: number;
  deliverablesDelivered?: DeliverablesDelivered;
  /** Persisted notes; falls back to statusContent when absent */
  studioNotes?: StudioUpdate[];
  /** Monotonic revision tokens for direct-apply customer fields (Package 2). */
  customerFieldTokens?: import("@/lib/customer-field-tokens").CustomerFieldTokenMap;
  createdAt: string;
  updatedAt: string;
};

export type MembershipRecord = {
  packageType: string;
  packageId: CampaignPackageId;
  campaignsRemaining: number;
  campaignsTotal: number;
  emailsRemaining: number;
  smsRemaining: number;
  renewalDate: string;
};

export const studioBoard = {
  userName: "Tagia",
  pageTitle: "The Studio Board",
  campaignNameLabel: "Campaign name",

  assets: {
    /**
     * Studio BOARD — city skyline hero (2220×255, LOCKED). Production: header-scene-v4.png
     */
    headerBanner: "/studio-board/studio-board-header-scene-v4.png?v=22",
    /** Sidebar Idea Wall — native 1:2 portrait brainstorm (371×744). */
    sidebarDesk: "/studio-board/studio-board-sidebar-idea-wall-v3.png?v=1",
    /** Bottom-right Studio Board panel — campaign creation wall. */
    creativeWall: "/studio-board/studio-board-creative-wall-v3.png?v=2",
    whatsNextRoom: "/studio-board/studio-board-team-v1.png?v=1",
  },

  routes: {
    studioBoard: "/studio-board",
    newCampaign: "/studio-conversation-room",
    /** @deprecated legacy URL — redirects to Project Discovery */
    draftRoom: "/studio-conversation-room?stage=intake",
    pastCampaigns: "/past-campaigns",
    account: "/account",
    helpCenter: "/help-center",
    studioGuide: "/studio-conversation-room",
    reviewRoom: "/feedback-studio",
    feedbackStudio: "/feedback-studio",
    deliverables: "/deliverables",
    campaignDetails: "/campaign-details",
    welcomeHall: "/studio-lobby",
    studioLobby: "/studio-lobby",
    projectDiscovery: "/studio-conversation-room?stage=intake",
    studioKitchen: "/studio-kitchen",
    /** @deprecated quarantined — redirects to Route Map */
    projectSummary: "/studio-conversation-room",
    /** @deprecated quarantined — use resolveIntakeEditHref / Route Map intake */
    projectDetails: "/studio-conversation-room?stage=intake",
    /** @deprecated quarantined — redirects to Route Map */
    studioPlanReview: "/studio-conversation-room",
  },

  empty: {
    campaignName: "No campaign started yet.",
    campaignNamePlaceholder: "No Active Project",
    campaignDescription:
      "You don't have an active project yet. Start a new project in the Conversation Room to begin working with The Studio.",
    studioUpdates: [] as const,
    primaryCta: "START A NEW PROJECT",
    /** Shown while campaign lookup is still running — never claim no project yet. */
    loading: {
      campaignNamePlaceholder: "Loading your project",
      campaignDescription: "One moment while we open your project on the Studio Board.",
      materialsNextStep: "Project details will appear here in a moment.",
      progressHint: "Loading your project progress.",
      snapshotHint: "Project details will appear here in a moment.",
    },
    board: {
      snapshot: {
        deliverables: "Deliverables appear here once your project begins.",
        plan: "Plan details appear once you choose a Studio Plan.",
        account: "Payment and account details appear once you start a campaign.",
      },
      materials: {
        receivedLead: "What The Studio already has for this project.",
        received: "Submitted materials appear here once your project begins.",
        stillNeed: "Outstanding material requests appear here during production.",
        awaitingProjectDetails:
          "Material requests will appear here after you complete Project Intake.",
        nextStep:
          "Start a new project in the Conversation Room to see your next step here.",
      },
    },
  },

  clientAccess: {
    noActiveProject: {
      eyebrow: "Studio Board",
      title: "No Active Project",
      message:
        "You don't have an active project yet. Start a new project in the Conversation Room to begin working with The Studio.",
      primaryCta: "START A NEW PROJECT",
      secondaryCta: "Help Center",
    },
    denied: {
      eyebrow: "Access Control",
      title: "Access Denied",
      message: "You don't have permission to access this area or project.",
      note: "If you believe you should have access, contact The Studio through the Help Center.",
    },
    loadError: {
      eyebrow: "Studio Board",
      title: "We couldn't load your project",
      message: "Something went wrong while loading your project. Try again.",
      retryCta: "Try again",
      secondaryCta: "Help Center",
    },
    authRequired: {
      eyebrow: "Client Access",
      title: "Sign in required",
      message: "Sign in with the account connected to this Studio work.",
      primaryCta: "Sign in",
      secondaryCta: "Help Center",
    },
  },

  membership: {
    packageType: "Momentum Plan",
    packageId: "momentum" as const,
    packagePrice: "$2,400",
    campaignsRemaining: 1,
    campaignsTotal: 2,
    emailsRemaining: 5,
    smsRemaining: 5,
    renewalDate: "July 1, 2025",
    emptyHint: "Your plan usage appears here once you start a campaign.",
  } satisfies MembershipRecord & { emptyHint: string; packagePrice: string },

  packagePrices: {
    spark: "$1,200",
    momentum: "$2,400",
    growth: "$4,800",
  } as const,

  journeyStages: [
    {
      id: "DISCOVERY_COMPLETE" as const,
      label: "Project Summary Ready",
      boardLabel: "Project Summary Ready",
      hint: "Review your Project Summary next.",
    },
    {
      id: "DRAFT_RECEIVED" as const,
      label: "Project Intake",
      boardLabel: "Project Intake",
      hint: "Project Intake submitted — package next.",
    },
    {
      id: "PAYMENT_RECEIVED" as const,
      label: "Payment Received",
      boardLabel: "Payment Received",
      hint: "Production can begin.",
    },
    {
      id: "BUILDING_CONCEPTS" as const,
      label: "Building Concepts",
      boardLabel: "Building Concepts",
      hint: "Our team is creating ideas.",
    },
    {
      id: "READY_FOR_REVIEW" as const,
      label: "Ready For Review",
      boardLabel: "Ready for Review",
      hint: "Open the Review Room to see what is ready.",
    },
    {
      id: "DELIVERED" as const,
      label: "Delivered",
      boardLabel: "Final Delivery",
      hint: "Your package is ready.",
    },
  ] satisfies readonly JourneyStageConfig[],

  ideaWall: {
    heading: "EVERY CAMPAIGN STARTS WITH AN IDEA",
    lead: "Every campaign starts with",
    accent: "an idea.",
  },

  statusContent: {
    DISCOVERY_COMPLETE: {
      statusLabel: "Project Summary Ready",
      nextUpdateLabel: "After Project Summary approval",
      campaignProgressLabel: "Awaiting Project Summary",
      headerSubline: "We received your discovery answers — review your Project Summary to continue.",
      campaignDescription:
        "Your Project Summary is ready. Review and confirm your Studio Plan before production begins.",
      estimatedCompletion: "Review your Project Summary",
      studioNoteFollowUp: "Review your Project Summary when you're ready.",
      studioNoteBoard: {
        letterLines: [
          "We received your discovery answers — thank you.",
          "Review your Project Summary and confirm when you're ready.",
          "We'll begin production once you approve your plan.",
          "Thank you for trusting The Studio.",
          "— The Studio Team ♥",
        ],
      },
      studioUpdates: [{ date: "Today", message: "We received your discovery answers." }],
      whatHappensNextSteps: [
        "Review what we heard from your discovery answers.",
        "Confirm the services on your Studio Plan.",
        "Make changes if needed before production begins.",
        "The Studio begins your campaign.",
      ],
      primaryCta: "START A NEW CAMPAIGN",
      primaryRoute: "newCampaign" as const,
    },
    DRAFT_RECEIVED: {
      statusLabel: "Intake Complete",
      nextUpdateLabel: "After payment",
      campaignProgressLabel: "Awaiting Package & Payment",
      headerSubline: "Your intake is saved — choose your package to continue.",
      campaignDescription:
        "Vision Intake complete. The Studio will not begin creative work until your package is selected and payment is received.",
      estimatedCompletion: "Choose a package to begin",
      studioNoteFollowUp:
        "Choose your services in the Conversation Room to continue.",
      studioNoteBoard: {
        letterLines: [
          "We received your Vision Intake — thank you.",
          "Choose your package and complete payment when you're ready to begin production.",
          "Your next update will come after payment.",
          "Thank you for trusting The Studio.",
          "— The Studio Team ♥",
        ],
      },
      studioUpdates: [{ date: "Today", message: "Vision Intake received." }],
      whatHappensNextSteps: [
        "Choose your services in the Conversation Room.",
        "Complete payment.",
        "Finish intake and materials so production can begin.",
        "You review proofs and receive released deliverables.",
      ],
      primaryCta: "OPEN CAMPAIGN",
      primaryRoute: "campaignDetails" as const,
    },
    PAYMENT_RECEIVED: {
      statusLabel: "Payment Received",
      nextUpdateLabel: "When the next project update is ready",
      campaignProgressLabel: "Campaign Queued",
      headerSubline:
        "We received your payment. Production begins after intake, materials, and the production gate are complete.",
      campaignDescription:
        "We received your payment. The Studio prepares next steps after required intake and materials are complete.",
      estimatedCompletion: "Timeline appears after production starts",
      estimatedFirstConcepts: "—",
      studioNoteFollowUp:
        "Payment is recorded. Production has not begun until intake, materials, and the production gate are complete.",
      studioNoteBoard: {
        letterLines: [
          "We received your payment.",
          "Production has not begun yet.",
          "Complete intake and materials so the production gate can open.",
          "Estimated first concepts will appear when production begins.",
          "Thank you for trusting The Studio.",
          "— The Studio Team ♥",
        ],
      },
      studioUpdates: [{ date: "Today", message: "Payment received." }],
      whatHappensNextSteps: [
        "Finish Project Intake if anything is still missing.",
        "Provide required materials for production.",
        "When the production gate opens, The Studio begins creative work.",
        "You review proofs and receive released deliverables.",
      ],
      primaryCta: "OPEN CAMPAIGN",
      primaryRoute: "campaignDetails" as const,
    },
    BUILDING_CONCEPTS: {
      statusLabel: "Building Concepts",
      nextUpdateLabel: "When the next project update is ready",
      campaignProgressLabel: "Campaign in Progress",
      headerSubline: "Your creative team is at work on campaign options.",
      campaignDescription: "The Studio is creating your campaign options with care and creativity.",
      estimatedCompletion: "In progress",
      studioNoteFollowUp: "Your creative team is building campaign concepts.",
      studioNoteBoard: {
        letterLines: [
          "Your creative team is building your campaign concepts.",
          "We're putting care into every direction for you.",
          "Estimated first concepts will appear in your next project update when ready.",
          "Thank you for trusting The Studio.",
          "— The Studio Team ♥",
        ],
      },
      studioUpdates: [
        { date: "Earlier", message: "Intake received." },
        { date: "Today", message: "Creative work in progress." },
      ],
      whatHappensNextSteps: [
        "The Studio continues creative work on your concepts.",
        "You review when proofs are ready.",
        "You choose your direction.",
        "Released deliverables appear when approved for delivery.",
      ],
      primaryCta: "OPEN CAMPAIGN",
      primaryRoute: "campaignDetails" as const,
    },
    READY_FOR_REVIEW: {
      statusLabel: "Ready for Review",
      nextUpdateLabel: "When you review",
      campaignProgressLabel: "Ready for Review",
      headerSubline: "Work is ready for your review in the Review Room.",
      campaignDescription: "Your project has work ready for review. Open the Review Room when you have a moment.",
      estimatedCompletion: "Review when ready",
      studioNoteFollowUp: "Open the Review Room to see what is ready and what happens next.",
      studioNoteBoard: {
        letterLines: [
          "Work is ready for your review.",
          "Please open Review Room when you have a moment.",
          "Review available work, leave feedback, or request revisions.",
          "Your next update follows your review.",
          "Thank you for trusting The Studio.",
          "— The Studio Team ♥",
        ],
      },
      studioUpdates: [
        { date: "June 14", message: "Intake received." },
        { date: "June 15", message: "Creative team assigned." },
        { date: "June 16", message: "Production work started." },
        { date: "June 18", message: "Work is ready for your review." },
      ],
      whatHappensNextSteps: [
        "Open the Review Room to see what is ready.",
        "Review available work, leave feedback, or request revisions.",
        "The Studio continues production after your review.",
        "We deliver your final marketing package.",
      ],
      primaryCta: "OPEN CAMPAIGN",
      primaryRoute: "feedbackStudio" as const,
    },
    DELIVERED: {
      statusLabel: "Delivered",
      nextUpdateLabel: "Complete",
      campaignProgressLabel: "Campaign Complete",
      headerSubline: "Your campaign package is complete and ready.",
      campaignDescription: "Your campaign package is complete and ready for you.",
      estimatedCompletion: "Complete",
      studioNoteFollowUp: "Your final package is ready to download.",
      studioNoteBoard: {
        letterLines: [
          "Your final marketing package is complete.",
          "Please open Final Delivery to download your deliverables.",
          "Thank you for trusting The Studio.",
          "— The Studio Team ♥",
        ],
      },
      studioUpdates: [
        { date: "June 14", message: "Intake received." },
        { date: "June 18", message: "Campaign direction selected." },
        { date: "June 22", message: "Final package delivered." },
      ],
      whatHappensNextSteps: [
        "Download your deliverables.",
        "Launch your campaign.",
        "Track results from your Studio Board.",
        "Start your next campaign when you're ready.",
      ],
      primaryCta: "OPEN CAMPAIGN",
      primaryRoute: "deliverables" as const,
    },
  },

  bottomBar: {
    headline: "Need something else marketed?",
    subline: "The Studio is here to help you grow.",
    ariaLabel: "Start a new project in the Conversation Room",
  },

  /** Sidebar logo lockup — neutral Studio branding (no bundle tier names). */
  brand: {
    theLabel: "the",
    nameLabel: "STUDIO",
  },

  sidebar: {
    welcomeHall: customerJourneyStepName("studio-lobby"),
    studioBoard: customerJourneyStepName("studio-board"),
    newCampaign: "New Campaign",
    campaignRecord: customerJourneyStepName("project-record"),
    reviewRoom: customerJourneyStepName("review-room"),
    finalDelivery: customerJourneyStepName("final-delivery"),
    helpCenter: customerJourneyStepName("help-center"),
    studioGuide: customerJourneyStepName("studio-guide"),
    pastCampaigns: "Past Campaigns",
    account: "My Account",
    managePlan: "Manage Plan",
  },

  notesCopy: {
    readOnlyHint: "Recent activity from the Studio.",
    heading: "Studio Notes",
    emptyHint: "Updates will appear here as your campaign progresses.",
    viewCampaignHistory: "View Campaign History",
  },

  campaignSnapshot: {
    revisionsRemaining: "Revisions Remaining",
    deliverablesRemaining: "Deliverables Remaining",
  },

  campaignActions: {
    heading: "Campaign Actions",
    currentAction: "Current Action",
    assignedTo: "Assigned To",
    assignedTeam: "Studio Creative Team",
    lastUpdated: "Last Updated",
    openCampaign: "Open Campaign",
    openCampaignCta: "OPEN CAMPAIGN",
    openCampaignRecord: `Open ${customerJourneyStepName("project-record")}`,
    reviewConcepts: "Open Review Room",
    chooseDirection: "Review Work",
    downloadPackage: "Download Package",
    viewDeliverables: "View Deliverables",
    waitingOnStudio: "Waiting on Studio",
    nextUpdatePrefix: "Next update:",
    reviewCampaigns: "Review Campaigns",
    viewDeliverablesLegacy: "View Deliverables",
    viewDeliverablesCta: "VIEW DELIVERABLES",
    unavailableHint: "Available when your campaign reaches this stage.",
    noActionsHint: "No actions available yet.",
  },

  nextAction: {
    conceptsReadyLabel: "Ready for Review",
    reviewMyConcepts: "Open Review Room",
    reviewConceptsHint:
      "Open the Review Room to see what is ready and what happens next.",
    choosePackage: "Choose Your Package",
    buildingConceptsLabel: "Building Concepts In Progress",
    buildingConceptsHint:
      "The Studio team is creating your campaign directions. Your Studio Board will update when concepts are ready for review.",
    paymentReceivedLabel: "Campaign Queued",
    paymentReceivedHint:
      "We received your payment. Your Studio Board will update as your project progresses.",
    waitingOnProjectIntakeLabel: "Waiting on Project Intake",
    completeProjectDetails: "Complete Project Intake",
    completeProjectDetailsHint:
      "Tell us what we need for the services in your approved Studio Plan.",
    packageReadyLabel: "Your Package Is Ready",
    openFinalDelivery: "Open Final Delivery",
  },

  activityFeed: {
    heading: "Studio Timeline",
    emptyHint: "Milestones appear here as your campaign moves forward.",
  },

  studioNote: {
    heading: "Studio Note",
    greetingPrefix: "Hi",
    emptyHint: "A handwritten note from The Studio team will appear here as your campaign moves forward.",
  },

  etaPanel: {
    heading: "ETA / Next Update",
    currentStatus: "Current Status",
    estimatedCompletion: "Estimated Completion",
    estimatedFirstConcepts: "First Concepts",
    nextUpdate: "Next Update",
    emptyHint: "Schedule details appear once your campaign begins.",
  },

  campaignRecord: {
    drawerTitle: customerJourneyStepName("project-record"),
    closeLabel: "Close",
    submittedHint: "Read-only archive of what you submitted to the Studio.",
    editableHint: "Review or update your project details before campaign development begins.",
    lockedMessage:
      "Your Project Intake is submitted and locked for reference. Additional changes should go through Review Room or feedback to The Studio.",
    emptyHint: "Your submitted project details appear here once your campaign begins.",
  },

  campaignBrief: {
    viewLabel: "View Campaign Brief",
    openRecordLabel: "View submitted project details",
    editLabel: "Edit Campaign Brief",
    editableHint: "Review or update your answers before campaign development begins.",
    lockedMessage:
      "Your Project Intake is submitted and locked for reference. Additional changes should go through Review Room or feedback to The Studio.",
    lockedTitle: "Intake locked",
    editReturnLabel: "Return to Studio Board",
  },

  deliverablesCard: {
    heading: "Deliverables",
    completeLabel: "Complete",
  },

  progressCard: {
    heading: "Campaign Progress",
    journeyHeading: "Your Campaign Journey",
    timelineHeading: "Recent Updates",
  },

  packageSummary: {
    heading: "Your Studio Plan",
    emptyHint: "Plan details appear once you choose a Studio Plan.",
    compareLink: "Quick Policy Guide",
    revisionLine: (rounds: number) =>
      `${rounds} Revision Round${rounds === 1 ? "" : "s"} Included`,
  },

  inspirationTicker: {
    pin: "📌",
    intervalMs: 5000,
    quotes: [
      "EVERY GREAT CAMPAIGN STARTS WITH AN IDEA.",
      "YOUR VISION IS NOW IN MOTION.",
      "GOOD MARKETING IS BUILT, NOT GUESSED.",
      "SMALL STEPS CREATE BIG MOMENTUM.",
      "FROM SPARK TO STRATEGY TO LAUNCH.",
      "CREATIVE WORK IS HAPPENING BEHIND THE SCENES.",
      "TURNING IDEAS INTO ACTION.",
      "BUILDING SOMETHING WORTH TALKING ABOUT.",
    ] as const,
  },

  accountPackage: {
    heading: "Account",
    packageLabel: "Package",
    paymentStatusLabel: "Payment Status",
    amountPaid: "Amount Paid",
    paymentDate: "Payment Date",
    billingType: "Billing Type",
    billingOneTime: "One-time",
    billingMonthly: "Monthly",
    renewalInformation: "Renewal Information",
    renewalNotApplicable: "N/A",
    packagePurchased: "Package Purchased",
    packagePrice: "Package Price",
    paidInFull: "Paid in Full",
    paymentPending: "Payment Pending",
    campaignsRemaining: "Campaigns Remaining",
    emailsRemaining: "Emails Remaining",
    smsRemaining: "SMS Remaining",
    revisionsRemaining: "Revisions Remaining",
    renewalDate: "Renewal Date",
    usageHeading: "Usage",
    renewalHeading: "Renewal",
    campaignLeft: "Campaign Left",
    campaignsLeft: "Campaigns Left",
    emailsLeft: "Emails Left",
    smsLeft: "SMS Left",
    emptyHint: "Payment and account details appear once you start a campaign.",
    pendingValue: "—",
  },

  boardHeader: {
    currentStatus: "Current Status",
    estimatedCompletion: "Estimated Completion",
    nextUpdate: "Next Update",
    notStarted: "Not Started",
    pending: "—",
  },

  nextStepCard: {
    heading: "Next Step",
    currentStep: "Current Step",
    nextMilestone: "Next Milestone",
    expectedUpdate: "Expected Update",
    milestonePrefix: "First concepts ready",
    emptyHint: "Your next milestone appears once your campaign begins.",
  },

  currentCampaign: {
    heading: "Current Campaign",
    package: "Package",
    status: "Current Status",
    campaignStage: "Campaign Stage",
    campaignsRemaining: "Campaigns Remaining",
    emailsRemaining: "Emails Remaining",
    smsRemaining: "SMS Remaining",
    revisionsRemaining: "Revisions Remaining",
    selectedDirection: "Selected Direction",
  },

  campaignDetails: {
    pageTitle: customerJourneyStepName("project-record"),
    eyebrow: "Your Project",
    lead: "Review the project details you submitted to The Studio.",
    backLabel: "Back to Studio Board",
    arrival: {
      message:
        "Your project is confirmed. Review the submitted details you shared for your Studio Plan.",
    },
    sections: {
      overview: "Project Overview",
      projectStatus: "Project Status",
      projectActivity: "Project Activity",
      visionSummary: "Vision Summary",
      revisionTracker: "Revision Tracker",
      packageDetails: "Package Includes",
      journey: "Project Journey",
      timeline: "Timeline",
      deliverables: "Deliverables",
      updates: "Studio Notes",
    },
    projectStatusCopy: {
      lead: "What's happening with each service you purchased.",
      pendingPayment: "Your project status will appear here after payment is confirmed.",
      waitingOnYou: "The Studio is waiting on you",
      productionStarted: "Production has started",
      productionNotStarted: "Production hasn't started yet",
      deliveredOn: "Delivered",
      requiredBy: "Needed by",
      loading: "Checking your project status...",
      error: "We couldn't load your project status right now. Try refreshing the page.",
      empty: "No purchased services yet.",
    },
    informationUpdate: {
      title: "Information Update",
      lead: "Request a correction that does not change your services, deliverables, quantity, price, or schedule.",
      prompt: "What would you like to update?",
      newValueLabel: "Requested new value",
      noteLabel: "Additional note (optional)",
      scopeDisclaimer:
        "I understand this request is for a lightweight correction and does not change services, deliverables, quantity, price, refund, or schedule.",
      reviewLabel: "Review request",
      reviewHint: "Nothing is applied until The Studio reviews and confirms this request.",
      submitLabel: "Submit request",
      submittingLabel: "Submitting...",
      submitLabelMaterials: "Use materials form",
      requestReceived: "Request received.",
      backLabel: "Back",
      activityEmpty: "Project activity will appear here as your project progresses.",
    },
    squishy: {
      title: "Ask Squishy",
      lead: "Squishy can explain your project status or guide a lightweight information update. Squishy does not apply changes directly.",
      prompt: "What would you like to know or update?",
      placeholder: "For example: What is my project status? Can I change my approver email?",
      askLabel: "Ask Squishy",
      continueLabel: "Continue",
      askAnotherLabel: "Ask another question",
    },
    overviewLabels: {
      name: "Campaign Name",
      status: "Current Status",
      estimatedCompletion: "Estimated Completion",
      createdDate: "Created Date",
      campaignType: "Campaign Type",
    },
    intakeLabels: {
      goal: "Goal",
      audience: "Audience",
      timeline: "Timeline",
      budget: "Budget",
    },
    deliverables: {
      preparing: "Deliverables are being prepared.",
      preparingHint: "Check back soon.",
      ready: "Your deliverables are ready.",
      reviewConcepts: "Open Review Room",
      viewFinalAssets: "VIEW DELIVERABLES",
    },
    notProvided: "Not provided yet",
    copyCampaignBriefLabel: "Copy Campaign Brief",
    copyCampaignBriefSuccess: "Campaign Brief Copied",
    empty: {
      title: "No campaign yet",
      body: "Start a project in the Conversation Room to see your details here.",
      cta: "Go to Studio Board",
    },
  },

  whatHappensNextCopy: {
    title: "What Happens Next?",
    intro: "Here's what happens next:",
    philosophyLabel: "TODAY'S INSPIRATION",
    generalQuotes: [
      ["Great ideas", "take shape", "in the Studio."],
      ["Progress beats", "perfection."],
      ["Every campaign starts", "with one decision."],
      ["Your team is on it.", "We've got you."],
    ] as const,
    statusQuotes: {
      DRAFT_RECEIVED: ["Every great campaign", "starts with a single idea."] as const,
      PAYMENT_RECEIVED: ["We received your payment.", "Production begins."] as const,
      BUILDING_CONCEPTS: ["Progress often begins", "before confidence arrives."] as const,
      READY_FOR_REVIEW: ["Clarity comes through", "refinement."] as const,
      DELIVERED: ["Finished and shared beats", "perfect and hidden."] as const,
    },
    stickyLabel: "Selected campaign",
  },

  placeholders: {
    pastCampaigns: "Past Campaigns — coming soon.",
    account: "My Account — coming soon.",
    /** Unused residue — Help Center is live; do not surface this string. */
    helpCenter: "Help Center",
    /** Unused residue — Project Record is live; do not surface this string. */
    campaignDetails: "Project Record",
  },
} as const;

export type StudioBoardPrimaryRoute =
  (typeof studioBoard.statusContent)[CampaignStatus]["primaryRoute"];

/** New Campaign — Conversation Room is the sole live client entry. */
export function studioBoardDraftRoomHref() {
  return studioBoard.routes.newCampaign;
}

export function studioBoardStudioGuideHref(
  _packageId: MembershipRecord["packageId"] = studioBoard.membership.packageId,
) {
  return studioBoard.routes.newCampaign;
}

export function studioBoardPrimaryHref(route: StudioBoardPrimaryRoute | "newCampaign") {
  return studioBoard.routes[route];
}

export function campaignStatusIndex(status: CampaignStatus) {
  return CAMPAIGN_STATUSES.indexOf(status);
}
