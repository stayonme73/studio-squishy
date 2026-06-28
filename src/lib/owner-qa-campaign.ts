import type { ServiceId } from "@/catalog/types";
import type { ProjectDetailsRecord } from "@/config/project-details";
import {
  studioBoard,
  CUSTOM_STUDIO_PLAN_PACKAGE_ID,
  type ApprovedStudioPlan,
  type CampaignRecord,
  type CampaignStatus,
} from "@/config/studio-board";
import { ensureCampaignConceptsOnRecord } from "@/lib/campaign-concepts";
import {
  saveDiscoveryAnswers,
  type DiscoveryAnswers,
} from "@/lib/business-discovery-session";
import { buildServiceScopeSnapshot, computePlanPricingTotals } from "@/lib/plan-pricing";
import { saveCurrentCampaign } from "@/lib/studio-board-campaign";
import { discoveryBriefFromAnswers } from "@/lib/discovery-brief";

const { statusContent } = studioBoard;

/** Dev-only flag — restores Discovery split-panel summary after Owner QA navigation. */
export const OWNER_QA_DISCOVERY_PREVIEW_KEY = "studio-squishy:owner-qa-discovery-panel";

export const OWNER_QA_GREEN_SERVICE_IDS = ["bf-001", "sm-001", "em-001"] as const satisfies readonly ServiceId[];

const BUSINESS_DELIM = "\n---\n";

export const OWNER_QA_DISCOVERY_ANSWERS: DiscoveryAnswers = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-situation": "Promoting an offer, event, sale, or launch",
  "your-challenge": "I need help promoting something",
  "your-current-tools": "Social media accounts",
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "A successful launch, event, sale, or promotion",
  "whats-slowing-you-down": "I am not visible enough online",
};

/** Partial discovery — Green-and-Lean tiles in progress, not submitted. */
export const OWNER_QA_DISCOVERY_IN_PROGRESS: DiscoveryAnswers = {
  "your-business": OWNER_QA_DISCOVERY_ANSWERS["your-business"],
  "your-situation": OWNER_QA_DISCOVERY_ANSWERS["your-situation"],
  "your-challenge": OWNER_QA_DISCOVERY_ANSWERS["your-challenge"],
};

export type OwnerQaJourneySeedKind =
  | "lobby"
  | "discovery-in-progress"
  | "discovery-plan-preview"
  | "project-summary-checkout"
  | "project-details"
  | "studio-board-details-needed"
  | "studio-board-building"
  | "project-record"
  | "review-room-ready"
  | "final-delivery-complete"
  | "help-center";

const STUDIO_SQUISHY_PREFIX = "studio-squishy:";

function dispatchCampaignUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }
}

function collectStudioSquishyKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(STUDIO_SQUISHY_PREFIX)) keys.push(key);
  }
  return keys;
}

/** Remove every campaign-related studio-squishy key from browser storage. */
export function clearAllOwnerQaBrowserState(): void {
  if (typeof window === "undefined") return;

  for (const key of collectStudioSquishyKeys(window.localStorage)) {
    window.localStorage.removeItem(key);
  }

  for (const key of collectStudioSquishyKeys(window.sessionStorage)) {
    window.sessionStorage.removeItem(key);
  }

  dispatchCampaignUpdated();
}

function persistCampaign(campaign: CampaignRecord): CampaignRecord {
  saveCurrentCampaign(campaign);
  dispatchCampaignUpdated();
  return campaign;
}

export function buildOwnerQaGreenApprovedPlan(): ApprovedStudioPlan {
  const lineItems = buildServiceScopeSnapshot(OWNER_QA_GREEN_SERVICE_IDS);
  const pricing = computePlanPricingTotals(OWNER_QA_GREEN_SERVICE_IDS);
  const now = new Date().toISOString();

  return {
    selectedServiceIds: [...OWNER_QA_GREEN_SERVICE_IDS],
    includedServiceIds: [...OWNER_QA_GREEN_SERVICE_IDS],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: pricing.oneTimeSubtotalCents,
    monthlyTotalCents: pricing.monthlySubtotalCents,
    amountDueTodayCents: pricing.amountDueTodayCents,
    lineItems,
    approvedAt: now,
  };
}

function discoveryBriefAnswers() {
  return discoveryBriefFromAnswers(OWNER_QA_DISCOVERY_ANSWERS).answers;
}

function buildOwnerQaProjectDetails(now: string): ProjectDetailsRecord {
  return {
    form: {
      workingOn: "Summer pastry launch",
      mainOffer: "New seasonal menu",
      importantDates: "July 4 weekend",
      callToAction: "Visit the bakery",
      destinationLink: "https://tagiabakery.example",
      mustIncludeExactly: "",
      brandColorsFonts: "",
      inspirationLinks: "",
      brandDoNotUse: "",
      brandOutdatedParts: "Old chalkboard logo",
      brandPartsToKeep: "Keep the teal accent",
      socialPlatforms: "Instagram, Facebook",
      socialAccountLinks: "@tagiabakery",
      socialPostingWindow: "",
      emailPlatform: "",
      emailSender: "",
      emailSendTiming: "",
      emailListReady: "",
      conceptIntendedUse: "",
      conceptAudience: "",
      conceptRequiredWording: "",
      marketingPieces: "Flyer, window sign, social graphic, email header",
      marketingPieceUsage: "In-store, social, and email",
      marketingFormats: "",
      adScript: "",
      adIntendedUse: "",
      adVoiceStyle: "",
      adPronunciation: "",
      primaryApproverName: "Tagia Owner",
      primaryApproverEmail: "tagia@example.com",
      hasSecondaryApprover: "",
      secondaryApproverName: "",
      secondaryApproverEmail: "",
    },
    files: [],
    submittedAt: now,
  };
}

function campaignWithStatus(campaign: CampaignRecord, status: CampaignStatus): CampaignRecord {
  const content = statusContent[status];
  return {
    ...campaign,
    campaignStatus: status,
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    updatedAt: new Date().toISOString(),
  };
}

function buildOwnerQaCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  const approvedStudioPlan = buildOwnerQaGreenApprovedPlan();
  const discoveryAnswers = discoveryBriefAnswers();
  const status: CampaignStatus = overrides.campaignStatus ?? "DISCOVERY_COMPLETE";
  const content = statusContent[status];

  return {
    campaignId: "owner-qa-dev",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: status,
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: "",
    discoveryAnswers,
    discoverySubmittedAt: now,
    approvedStudioPlan,
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [...content.studioUpdates],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildPaidAwaitingProjectDetailsCampaign(): CampaignRecord {
  const now = new Date().toISOString();
  const content = statusContent.PAYMENT_RECEIVED;

  return buildOwnerQaCampaign({
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    paymentReceivedAt: now,
    studioNotes: [{ date: "Today", message: "Payment received." }],
    projectDetails: undefined,
    projectDetailsSubmittedAt: undefined,
  });
}

function buildBuildingConceptsCampaign(): CampaignRecord {
  const now = new Date().toISOString();
  const content = statusContent.BUILDING_CONCEPTS;

  return buildOwnerQaCampaign({
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    paymentReceivedAt: now,
    projectDetails: buildOwnerQaProjectDetails(now),
    projectDetailsSubmittedAt: now,
    studioNotes: [{ date: "Today", message: "Project Details received." }],
  });
}

function buildReviewReadyCampaign(): CampaignRecord {
  let campaign = buildBuildingConceptsCampaign();
  campaign = ensureCampaignConceptsOnRecord(campaign) ?? campaign;
  campaign = campaignWithStatus(campaign, "READY_FOR_REVIEW");
  return {
    ...campaign,
    studioNotes: [
      ...(campaign.studioNotes ?? []),
      { date: "Today", message: "Campaign concepts ready for your review." },
    ],
  };
}

function buildDeliveredCampaign(): CampaignRecord {
  const campaign = buildReviewReadyCampaign();
  const delivered = campaignWithStatus(campaign, "DELIVERED");
  return {
    ...delivered,
    selectedCampaignOption: "Option B (Balanced)",
    revisionRoundsUsed: 1,
    deliverablesDelivered: {},
    studioNotes: [
      ...(delivered.studioNotes ?? []),
      { date: "Today", message: "Final delivery complete." },
    ],
  };
}

/** Apply journey seed — writes localStorage campaign + discovery state before navigation. */
export function applyOwnerQaJourneySeed(kind: OwnerQaJourneySeedKind): void {
  if (typeof window === "undefined") return;

  switch (kind) {
    case "lobby": {
      clearAllOwnerQaBrowserState();
      return;
    }
    case "discovery-in-progress": {
      clearAllOwnerQaBrowserState();
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_IN_PROGRESS);
      dispatchCampaignUpdated();
      return;
    }
    case "discovery-plan-preview": {
      const submittedAnswers = {
        ...OWNER_QA_DISCOVERY_ANSWERS,
        "submit-project": "submitted",
      };
      saveDiscoveryAnswers(submittedAnswers);
      persistCampaign(
        buildOwnerQaCampaign({
          campaignStatus: "DISCOVERY_COMPLETE",
          approvedStudioPlan: undefined,
          paymentReceivedAt: null,
        }),
      );
      window.localStorage.setItem(OWNER_QA_DISCOVERY_PREVIEW_KEY, "summary");
      return;
    }
    case "project-summary-checkout": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(
        buildOwnerQaCampaign({
          campaignStatus: "DISCOVERY_COMPLETE",
          paymentReceivedAt: null,
        }),
      );
      return;
    }
    case "project-details":
    case "studio-board-details-needed": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildPaidAwaitingProjectDetailsCampaign());
      return;
    }
    case "studio-board-building":
    case "project-record": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildBuildingConceptsCampaign());
      return;
    }
    case "review-room-ready": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildReviewReadyCampaign());
      return;
    }
    case "final-delivery-complete": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildDeliveredCampaign());
      return;
    }
    case "help-center": {
      clearAllOwnerQaBrowserState();
      return;
    }
  }
}

/** Hard reset — clear all campaign-related browser state. */
export function resetOwnerQaCampaignState(): void {
  clearAllOwnerQaBrowserState();
}
