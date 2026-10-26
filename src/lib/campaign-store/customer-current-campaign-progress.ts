/**
 * Pure campaign-progress helpers. Safe for client hydrate — no Node I/O.
 */

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { isLocalCustomerOnePaidFlyerCampaign } from "@/lib/auth/local-customer-one-campaign";
import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";
import { PROJECT_INTAKE_SHARED_MATERIALS_KEY } from "@/lib/project-intake-plan";
import { INTAKE_MATERIALS_NONE_YET } from "@/lib/route-map-intake-materials";
import { isIntakeComplete } from "@/lib/studio-board-campaign";

export function isProtectedMayaCampaign(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaign) return false;
  if (campaign.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) return true;
  return isLocalCustomerOnePaidFlyerCampaign(campaign);
}

/** Browser current that must not be replaced by Maya’s older paid record. */
export function isPlaceholderStudioBoardName(name: string | null | undefined): boolean {
  const normalized = String(name ?? "").trim().toLowerCase();
  return normalized === "" || normalized === "studio project";
}

export function isFreshNonMayaCurrentCampaign(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaign?.campaignId) return false;
  if (isProtectedMayaCampaign(campaign)) return false;
  if (isPlaceholderStudioBoardName(campaign.campaignName) && !isIntakeComplete(campaign)) {
    return false;
  }
  return true;
}

/** A leftover "Studio Project" must not hide a named paid current. */
export function isPlaceholderLocalBlockingNamedPaid(
  local: CampaignRecord | null | undefined,
  server: CampaignRecord | null,
): boolean {
  if (!local || !server) return false;
  if (local.campaignId === server.campaignId) return false;
  if (!server.paymentReceivedAt) return false;
  if (!isPlaceholderStudioBoardName(local.campaignName)) return false;
  return !isPlaceholderStudioBoardName(server.campaignName);
}

export function selectedServiceKey(record: CampaignRecord | null | undefined): string {
  return [...(record?.approvedStudioPlan?.selectedServiceIds ?? [])].sort().join("|");
}

export function campaignProgressRank(campaign: CampaignRecord | null | undefined): number {
  if (!campaign) return 0;
  let rank = 0;
  if (campaign.paymentReceivedAt) rank += 2;
  if (isIntakeComplete(campaign)) rank += 1;
  return rank;
}

/** Keep a further-along local copy when GET current points at a different, behind record. */
export function shouldKeepLocalCampaignOverServer(
  local: CampaignRecord | null | undefined,
  server: CampaignRecord | null,
): boolean {
  if (!local) return false;
  if (isFixtureCampaignId(local.campaignId)) return false;
  if (!server) {
    return Boolean(local.paymentReceivedAt || isIntakeComplete(local));
  }
  if (local.campaignId === server.campaignId) return false;
  if (isProtectedMayaCampaign(local) && isFreshNonMayaCurrentCampaign(server)) {
    if (shouldRedirectUnpaidCurrentToPaidSibling(server, local)) {
      return campaignProgressRank(local) > campaignProgressRank(server);
    }
    return false;
  }
  if (
    isFreshNonMayaCurrentCampaign(local) &&
    isProtectedMayaCampaign(server)
  ) {
    if (shouldRedirectUnpaidCurrentToPaidSibling(local, server)) return false;
    return true;
  }
  if (isPlaceholderLocalBlockingNamedPaid(local, server)) return false;
  return campaignProgressRank(local) > campaignProgressRank(server);
}

export function shouldRedirectUnpaidCurrentToPaidSibling(
  current: CampaignRecord | null | undefined,
  paid: CampaignRecord,
): boolean {
  if (!paid.paymentReceivedAt) return false;
  if (!current) return false;
  if (current.campaignId === paid.campaignId) return false;
  if (current.paymentReceivedAt) return false;
  const paidAt = Date.parse(paid.paymentReceivedAt);
  const createdAt = Date.parse(current.createdAt ?? "");
  if (Number.isFinite(paidAt) && Number.isFinite(createdAt) && createdAt > paidAt) {
    /* A new unpaid project started after the paid job must not inherit it. */
    return false;
  }
  const services = selectedServiceKey(paid);
  return services.length > 0 && selectedServiceKey(current) === services;
}

/**
 * Board / current with no session campaign must still show the paid job
 * this client already owns. Empty current is not “start a new project.”
 * Does not replace a fresh non-Maya current. Does not remint.
 */
export function shouldBindOwnedPaidWhenCurrentMissing(
  current: CampaignRecord | null | undefined,
  paid: CampaignRecord,
): boolean {
  if (!paid.paymentReceivedAt) return false;
  return !current;
}

/**
 * Persist the owner-accepted Customer-One Intake that never reached the
 * server (local submit + 403 sync, then unpaid current overwrite).
 * Does not invent payment. Does not invent flyer copy beyond the accepted
 * materials path.
 */
export function applyCustomerOneSubmittedIntake(
  record: CampaignRecord,
  submittedAt = new Date().toISOString(),
): CampaignRecord {
  if (!isLocalCustomerOnePaidFlyerCampaign(record)) return record;
  if (isIntakeComplete(record)) return record;

  const building = studioBoard.statusContent.BUILDING_CONCEPTS;
  return {
    ...record,
    routeMapIntake: {
      answers: {
        [PROJECT_INTAKE_SHARED_MATERIALS_KEY]: INTAKE_MATERIALS_NONE_YET,
      },
      submittedAt,
    },
    routeMapIntakeDraft: undefined,
    routeMapIntakeSubmittedAt: submittedAt,
    routeMapContext: record.routeMapContext
      ? { ...record.routeMapContext, currentStep: "intake" }
      : record.routeMapContext,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: building.campaignDescription,
    estimatedCompletion: building.estimatedCompletion,
    studioNotes: [
      ...(record.studioNotes ?? []),
      { date: "Today", message: "Project Intake received." },
    ],
    updatedAt: submittedAt,
  };
}
