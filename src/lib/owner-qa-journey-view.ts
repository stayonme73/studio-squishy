import { ownerQa, type OwnerQaJourneyPreset } from "@/config/owner-qa";
import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";

export type OwnerQaJourneyId = (typeof ownerQa.journeyPresets)[number]["id"];
export type OwnerQaStepStatus = "NOT STARTED" | "ACTIVE" | "WAITING" | "READY" | "COMPLETE";
export type OwnerQaProjectStatus = "READY" | "IN PROGRESS" | "WAITING" | "COMPLETE";

export type OwnerQaJourneyView = {
  currentId: OwnerQaJourneyId;
  current: OwnerQaJourneyPreset;
  currentIndex: number;
  projectLabel: string;
  customerName: string | null;
  stageLabel: string;
  projectStatus: OwnerQaProjectStatus;
  nextAction: string;
  stepStatus: Record<OwnerQaJourneyId, OwnerQaStepStatus>;
};

const JOURNEY_IDS = ownerQa.journeyPresets.map((preset) => preset.id);

function searchParam(search: string, key: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query).get(key);
}

export function resolveOwnerQaJourneyId(input: {
  pathname: string;
  search?: string;
  campaignStatus?: CampaignStatus | null;
}): OwnerQaJourneyId {
  const path = input.pathname.replace(/\/+$/, "") || "/";
  const search = input.search ?? "";
  const view = searchParam(search, "view");
  const step = searchParam(search, "step");
  const status = input.campaignStatus ?? null;

  if (path === "/final-delivery-room" || path === "/deliverables") return "final-delivery";
  if (path === "/feedback-studio" || path === "/review-room") return "review-room";
  if (path === "/checkout" || path === "/payment") return "checkout";
  if (path === "/project-builder" && view === "studio-plan") return "studio-plan";
  if (path === "/project-builder") return "project-builder";
  if ((path === "/route-map" || path === "/studio-guide" || path === "/studio-guide-prototype") && step === "intake") {
    return "project-intake";
  }
  if (path === "/route-map" || path === "/studio-guide" || path === "/studio-guide-prototype") {
    return "route-map";
  }
  if (path === "/studio-board") {
    if (status === "BUILDING_CONCEPTS") return "production";
    if (status === "READY_FOR_REVIEW") return "review-room";
    if (status === "DELIVERED") return "final-delivery";
    return "studio-board";
  }
  if (path === "/" || path === "/studio-lobby" || path === "/welcome-hall") return "studio-lobby";

  if (status === "DELIVERED") return "final-delivery";
  if (status === "READY_FOR_REVIEW") return "review-room";
  if (status === "BUILDING_CONCEPTS") return "production";
  if (status === "PAYMENT_RECEIVED") return "studio-board";
  return "studio-lobby";
}

function projectStatusFor(
  currentId: OwnerQaJourneyId,
  campaignStatus?: CampaignStatus | null,
): OwnerQaProjectStatus {
  if (campaignStatus === "DELIVERED" || currentId === "final-delivery") return "COMPLETE";
  if (campaignStatus === "READY_FOR_REVIEW" || currentId === "review-room") return "READY";
  if (campaignStatus === "BUILDING_CONCEPTS" || currentId === "production") return "IN PROGRESS";
  if (campaignStatus === "PAYMENT_RECEIVED") return "IN PROGRESS";
  if (currentId === "checkout" || currentId === "project-intake") return "READY";
  return "IN PROGRESS";
}

function stepStatuses(currentIndex: number): Record<OwnerQaJourneyId, OwnerQaStepStatus> {
  const out = {} as Record<OwnerQaJourneyId, OwnerQaStepStatus>;
  JOURNEY_IDS.forEach((id, index) => {
    if (index < currentIndex) out[id] = "COMPLETE";
    else if (index === currentIndex) out[id] = "ACTIVE";
    else out[id] = "NOT STARTED";
  });
  return out;
}

function serviceLabel(campaign: CampaignRecord | null, pathname: string): string {
  if (pathname === "/final-delivery-room") return "Clip Repurposing";
  const packageLabel = campaign?.packageLabel?.trim();
  if (packageLabel && packageLabel.toLowerCase() !== "custom studio plan") return packageLabel;
  const name = campaign?.campaignName?.trim();
  if (name && name !== "No project started yet.") return name;
  return "Clip Repurposing";
}

function customerLabel(campaign: CampaignRecord | null): string | null {
  const business = campaign?.visionData?.business?.trim();
  return business || null;
}

export function buildOwnerQaJourneyView(input: {
  pathname: string;
  search?: string;
  campaign?: CampaignRecord | null;
}): OwnerQaJourneyView {
  const currentId = resolveOwnerQaJourneyId({
    pathname: input.pathname,
    search: input.search,
    campaignStatus: input.campaign?.campaignStatus ?? null,
  });
  const currentIndex = JOURNEY_IDS.indexOf(currentId);
  const current = ownerQa.journeyPresets[currentIndex]!;
  const projectStatus = projectStatusFor(currentId, input.campaign?.campaignStatus ?? null);

  return {
    currentId,
    current,
    currentIndex,
    projectLabel: serviceLabel(input.campaign ?? null, input.pathname),
    customerName: customerLabel(input.campaign ?? null),
    stageLabel: current.label,
    projectStatus,
    nextAction: `Open ${current.label}`,
    stepStatus: stepStatuses(currentIndex),
  };
}
