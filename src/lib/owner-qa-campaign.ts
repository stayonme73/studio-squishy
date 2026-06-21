import type { DraftIntakeFormValues } from "@/config/draft-room";
import {
  studioBoard,
  type CampaignRecord,
  type CampaignStatus,
} from "@/config/studio-board";
import { getStudioGuidePackage, type StudioGuidePackageId } from "@/config/studio-guide";
import { saveCurrentCampaign } from "@/lib/studio-board-campaign";
const { statusContent } = studioBoard;

/** Rich sample vision data for owner QA — not empty placeholders. */
export const OWNER_QA_VISION_DATA: DraftIntakeFormValues = {
  project: "Promotion: Summer Sale",
  projectStarter: "promotion",
  projectDetail: "Summer Sale",
  business: "Tagia Bakery — local custom cakes.",
  audienceFit: "local-community",
  audienceNotes: "Families within 10 miles",
  message: "",
  goalSelections: ["build-awareness"],
  goalNotes: "",
  brandPersonalitySelections: ["friendly"],
  brandPersonalityNotes: "",
  brandHasColors: "yes",
  brandColorList: "Cream, teal",
  brandColorSelections: [],
  brandColorNotes: "",
  visionFeel: "Welcoming and bright",
  visionRemember: "The smell of fresh bread",
  visionDesired: "More weekend visits",
  visionSuccess: "20% increase in Saturday sales",
  visionAvoid: "",
  inspirationLike:
    "Hand-drawn menu boards. Avoid cold corporate ads and generic stock photos.",
  inspirationDislike: "",
  anythingElse: "Launch before July 4. Please avoid generic stock photos.",
};

function dispatchCampaignUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }
}

/** Build a fully hydrated campaign for the requested QA status. */
export function buildOwnerQaCampaign(status: CampaignStatus): CampaignRecord {
  const now = new Date().toISOString();
  const content = statusContent[status];
  const paid =
    status === "PAYMENT_RECEIVED" ||
    status === "BUILDING_CONCEPTS" ||
    status === "READY_FOR_REVIEW" ||
    status === "DELIVERED";
  const hasSelectedOption =
    status === "BUILDING_CONCEPTS" || status === "READY_FOR_REVIEW" || status === "DELIVERED";

  return {
    campaignId: "owner-qa-dev",
    campaignName: OWNER_QA_VISION_DATA.project,
    campaignStatus: status,
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId: "growth",
    packageLabel: "GROWTH",
    intake: {
      idea: OWNER_QA_VISION_DATA.project,
      audience: "Local families",
      action: "Drive foot traffic",
      deadline: "Before July 4",
      submittedAt: now,
    },
    visionData: { ...OWNER_QA_VISION_DATA },
    visionSubmittedAt: now,
    paymentReceivedAt: paid ? now : null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 3,
    revisionRoundsUsed: status === "DELIVERED" ? 1 : 0,
    selectedCampaignOption: hasSelectedOption ? "Option B (Balanced)" : undefined,
    deliverablesDelivered:
      status === "DELIVERED"
        ? { concepts: 3, social: 10, emails: 10, sms: 10, video: 3, calendar: 1 }
        : {},
    studioNotes: [...content.studioUpdates],
    createdAt: now,
    updatedAt: now,
  };
}

/** Apply a QA status preset — seeds campaign if needed, then notifies listeners. */
export function applyOwnerQaStatus(status: CampaignStatus): CampaignRecord {
  const campaign = buildOwnerQaCampaign(status);
  saveCurrentCampaign(campaign);
  dispatchCampaignUpdated();
  return campaign;
}

/** Payment received, intake not submitted — matches Guide → Payment → Intake. */
export function applyOwnerQaPaidAwaitingIntake(
  packageId: StudioGuidePackageId = "momentum",
): CampaignRecord {
  const now = new Date().toISOString();
  const pkg = getStudioGuidePackage(packageId);
  const content = statusContent.PAYMENT_RECEIVED;

  const campaign: CampaignRecord = {
    campaignId: "owner-qa-dev",
    campaignName: pkg ? `${pkg.label} Campaign` : "New Campaign",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId,
    packageLabel: pkg?.label ?? packageId,
    paymentReceivedAt: now,
    targetCompletionDate: null,
    revisionRoundsIncluded: 3,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Payment received." }],
    createdAt: now,
    updatedAt: now,
  };

  saveCurrentCampaign(campaign);
  dispatchCampaignUpdated();
  return campaign;
}
