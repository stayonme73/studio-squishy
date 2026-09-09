/**
 * Pure campaign-progress helpers. Safe for client hydrate — no Node I/O.
 */

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { isLocalCustomerOnePaidFlyerCampaign } from "@/lib/auth/local-customer-one-campaign";
import { PROJECT_INTAKE_SHARED_MATERIALS_KEY } from "@/lib/project-intake-plan";
import { INTAKE_MATERIALS_NONE_YET } from "@/lib/route-map-intake-materials";
import { isIntakeComplete } from "@/lib/studio-board-campaign";

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
  if (!server) {
    return Boolean(local.paymentReceivedAt || isIntakeComplete(local));
  }
  if (local.campaignId === server.campaignId) return false;
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
  const services = selectedServiceKey(paid);
  return services.length > 0 && selectedServiceKey(current) === services;
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
      { date: "Today", message: "Route Map intake received." },
    ],
    updatedAt: submittedAt,
  };
}
