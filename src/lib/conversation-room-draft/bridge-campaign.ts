/**
 * Bridge Conversation Room working-draft selections into the Host campaign
 * store so Checkout / Intake keep working until those stages move into the panel.
 */

import type { ServiceId } from "@/catalog/types";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import {
  addRouteMapServiceToPlan,
  createCampaignFromRouteMapJob,
  saveApprovedRouteMapPlan,
  saveRouteMapJourneyStep,
  saveRouteMapPlanState,
  selectRouteMapRoad,
} from "@/lib/route-map-campaign";
import {
  readCurrentCampaign,
  saveCurrentCampaign,
} from "@/lib/studio-board-campaign";

/**
 * Host checkout refuses to overwrite a paid campaign's approved plan.
 * Conversation Room plan confirm is still pre-purchase for this working draft —
 * replace the current pointer with a fresh unpaid campaign when needed.
 */
function ensureUnpaidCampaignForBridge(
  roadId: RouteMapRoadId,
  anchorJobId: RouteMapJobId,
): boolean {
  const existing = readCurrentCampaign();
  const needsFresh =
    !existing ||
    Boolean(existing.paymentReceivedAt) ||
    Boolean(existing.routeMapIntakeSubmittedAt);

  if (needsFresh) {
    const fresh = createCampaignFromRouteMapJob(anchorJobId, roadId, {
      currentStep: "studio-plan",
    });
    if (!fresh?.routeMapContext) return false;
    return saveCurrentCampaign({
      ...fresh,
      approvedStudioPlan: undefined,
      paymentReceivedAt: null,
      routeMapIntakeSubmittedAt: undefined,
      routeMapContext: {
        ...fresh.routeMapContext,
        selectedServiceIds: [],
        jobId: anchorJobId,
        roadId,
        currentStep: "studio-plan",
      },
    });
  }

  selectRouteMapRoad(roadId);
  let campaign = readCurrentCampaign();
  if (!campaign?.routeMapContext) {
    campaign = addRouteMapServiceToPlan(anchorJobId, roadId);
  }
  return Boolean(campaign?.routeMapContext);
}

/**
 * Sync road + selected services into routeMapContext, freeze approved plan,
 * and mark journey step as checkout. Returns false if sync cannot complete.
 */
export function bridgeConversationPlanToCampaign(
  roadId: RouteMapRoadId,
  serviceIds: readonly ServiceId[],
): boolean {
  if (serviceIds.length === 0) return false;

  const anchorJobId = serviceIds[0] as RouteMapJobId;
  if (!ensureUnpaidCampaignForBridge(roadId, anchorJobId)) return false;

  const synced = saveRouteMapPlanState({
    selectedServiceIds: [...serviceIds],
  });
  if (!synced) return false;

  const approved = saveApprovedRouteMapPlan(serviceIds);
  if (!approved) return false;

  saveRouteMapJourneyStep("checkout");
  return true;
}
