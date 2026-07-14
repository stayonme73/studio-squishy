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
import {
  addRouteMapServiceToPlan,
  saveApprovedRouteMapPlan,
  saveRouteMapJourneyStep,
} from "@/lib/route-map-campaign";
import { readCurrentCampaign, saveCurrentCampaign } from "@/lib/studio-board-campaign";
import { discoveryBriefFromAnswers } from "@/lib/discovery-brief";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";

const { statusContent } = studioBoard;

/** Dev-only flag — restores Discovery split-panel summary after Owner QA navigation. */
export const OWNER_QA_DISCOVERY_PREVIEW_KEY = "studio-squishy:owner-qa-discovery-panel";
const OWNER_QA_CHECKOUT_JOB_ID = "v2-rtu-social-posts" as const satisfies RouteMapJobId;
const OWNER_QA_CHECKOUT_ROAD_ID = "i20" as const satisfies RouteMapRoadId;

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

const OWNER_QA_BUILDER_JOB_ID = "v2-rtu-flyer" as const satisfies RouteMapJobId;
const OWNER_QA_BUILDER_ROAD_ID = "i75" as const satisfies RouteMapRoadId;
const OWNER_QA_BUILDER_SECOND_JOB_ID = "v2-rtu-social-posts" as const satisfies RouteMapJobId;

export type OwnerQaJourneySeedKind =
  | "lobby"
  | "route-map"
  | "project-builder"
  | "studio-plan"
  | "checkout"
  | "project-intake"
  | "studio-board"
  | "production"
  | "review-room-ready"
  | "final-delivery";

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

function seedOwnerQaProjectBuilderPlan(currentStep: "panel" | "studio-plan") {
  addRouteMapServiceToPlan(OWNER_QA_BUILDER_JOB_ID, OWNER_QA_BUILDER_ROAD_ID);
  addRouteMapServiceToPlan(OWNER_QA_BUILDER_SECOND_JOB_ID, OWNER_QA_BUILDER_ROAD_ID);
  saveRouteMapJourneyStep(currentStep);
}

/** Apply journey seed — writes localStorage campaign + discovery state before navigation. */
export function applyOwnerQaJourneySeed(kind: OwnerQaJourneySeedKind): void {
  if (typeof window === "undefined") return;

  switch (kind) {
    case "lobby": {
      clearAllOwnerQaBrowserState();
      return;
    }
    case "route-map": {
      clearAllOwnerQaBrowserState();
      return;
    }
    case "project-builder": {
      clearAllOwnerQaBrowserState();
      seedOwnerQaProjectBuilderPlan("panel");
      return;
    }
    case "studio-plan": {
      clearAllOwnerQaBrowserState();
      seedOwnerQaProjectBuilderPlan("studio-plan");
      return;
    }
    case "checkout": {
      clearAllOwnerQaBrowserState();
      addRouteMapServiceToPlan(OWNER_QA_CHECKOUT_JOB_ID, OWNER_QA_CHECKOUT_ROAD_ID);
      saveApprovedRouteMapPlan([OWNER_QA_CHECKOUT_JOB_ID]);
      saveRouteMapJourneyStep("checkout");
      return;
    }
    case "project-intake": {
      clearAllOwnerQaBrowserState();
      addRouteMapServiceToPlan(OWNER_QA_CHECKOUT_JOB_ID, OWNER_QA_CHECKOUT_ROAD_ID);
      saveApprovedRouteMapPlan([OWNER_QA_CHECKOUT_JOB_ID]);
      saveRouteMapJourneyStep("intake");
      const seeded = readCurrentCampaign();
      if (!seeded) return;
      const now = new Date().toISOString();
      const content = statusContent.PAYMENT_RECEIVED;
      persistCampaign({
        ...seeded,
        campaignStatus: "PAYMENT_RECEIVED",
        campaignDescription: content.campaignDescription,
        estimatedCompletion: content.estimatedCompletion,
        paymentReceivedAt: now,
        projectDetails: undefined,
        projectDetailsSubmittedAt: undefined,
        studioNotes: [{ date: "Today", message: "Payment received." }],
        updatedAt: now,
      });
      return;
    }
    case "studio-board": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildBuildingConceptsCampaign());
      return;
    }
    case "production": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildBuildingConceptsCampaign());
      return;
    }
    case "review-room-ready": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildReviewReadyCampaign());
      return;
    }
    case "final-delivery": {
      saveDiscoveryAnswers(OWNER_QA_DISCOVERY_ANSWERS);
      persistCampaign(buildDeliveredCampaign());
      return;
    }
  }
}

/** Hard reset — clear browser campaign state and unlink server current campaign (dev only). */
export async function resetOwnerQaCampaignState() {
  const { performDevClientTestReset } = await import("@/lib/dev-reset-client-test-state");
  return performDevClientTestReset();
}
