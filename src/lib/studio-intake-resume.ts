/**
 * Board → Project Intake resume.
 * The Complete Project Intake button must open the paid campaign on the
 * Board, restore that campaign’s saved draft, and keep sandbox. It must not
 * depend on a leftover Conversation Room working draft or silently open Maya.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";
import {
  persistAddService,
  persistRemoveService,
  persistSelectedRoute,
  readSelectedRoute,
  readSelectedServices,
} from "@/lib/conversation-room-draft";
import { needsFlyerProductionIntakeCorrection } from "@/lib/project-intake-flyer-production";
import { mergeCampaignPreferLocalIntakeDraft } from "@/lib/route-map-intake-continuity";
import {
  readCurrentCampaignHydrated,
  saveCurrentCampaign,
  isIntakeComplete,
} from "@/lib/studio-board-campaign";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft";

type CampaignEnvelopeResponse = {
  campaign?: {
    record?: CampaignRecord;
  } | null;
};

function isRoadId(value: unknown): value is RouteMapRoadId {
  return (
    value === "i75" ||
    value === "i20" ||
    value === "update" ||
    value === "random-exit" ||
    value === "i285"
  );
}

export function intakeCampaignIdFromSearch(
  search: string | null | undefined,
): string | null {
  if (!search) return null;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const id = params.get("campaignId")?.trim();
  return id || null;
}

/**
 * A Stripe success return names the campaign that was just paid. Until that
 * record is the current campaign, Intake must not open whatever project was
 * already stored in this browser.
 */
export function paymentReturnOwnsDifferentCampaign(
  search: string | null | undefined,
  localCampaignId: string | null | undefined,
): boolean {
  if (!search) return false;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (params.get("payment") !== "return" || !params.get("session_id")?.trim()) {
    return false;
  }
  const requestedId = params.get("campaignId")?.trim();
  if (!requestedId) return false;
  return localCampaignId !== requestedId;
}

/** Paid campaign whose Intake form may open. Does not submit. */
export function canOpenIntakeForCampaign(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaign?.paymentReceivedAt) return false;
  if (campaign.condensedOffer && !isIntakeComplete(campaign)) return true;
  if (!isRoadId(campaign.routeMapContext?.roadId)) return false;
  if (typeof campaign.routeMapContext?.jobId !== "string") return false;
  if (needsFlyerProductionIntakeCorrection(campaign)) return true;
  return !isIntakeComplete(campaign);
}

export async function bindPaidIntakeCampaignForResume(
  search: string,
): Promise<CampaignRecord | null> {
  if (typeof window === "undefined") return readCurrentCampaignHydrated();

  const requestedId = intakeCampaignIdFromSearch(search);
  const local = readCurrentCampaignHydrated();
  const endpoint = requestedId
    ? `/api/campaigns/${encodeURIComponent(requestedId)}`
    : "/api/campaigns/current";
  const boardingId = requestedId ?? local?.campaignId ?? "";
  const headers = new Headers();
  if (boardingId) {
    headers.set(
      studioCustomerIdentitySafetyGateV1.browserCampaignHeader,
      boardingId,
    );
  }

  try {
    const response = await fetch(endpoint, { credentials: "include", headers });
    if (!response.ok) {
      if (requestedId) {
        return local?.campaignId === requestedId ? local : null;
      }
      return local;
    }
    const body = (await response.json()) as CampaignEnvelopeResponse;
    const record = body.campaign?.record ?? null;
    if (!record) {
      return requestedId
        ? local?.campaignId === requestedId
          ? local
          : null
        : local;
    }
    if (requestedId && record.campaignId !== requestedId) {
      return local?.campaignId === requestedId ? local : null;
    }
    const merged =
      local && local.campaignId === record.campaignId
        ? mergeCampaignPreferLocalIntakeDraft(record, local)
        : record;
    saveCurrentCampaign(merged);
    return merged;
  } catch {
    if (requestedId) {
      return local?.campaignId === requestedId ? local : null;
    }
    return local;
  }
}

/** Copy purchased route/services onto the working draft. Never creates a campaign. */
export function hydrateWorkingDraftFromPaidIntakeCampaign(
  draft: WorkingDraftRecord,
  campaign: CampaignRecord | null,
): WorkingDraftRecord {
  if (!canOpenIntakeForCampaign(campaign)) return draft;
  const ctx = campaign?.routeMapContext;
  if (!ctx || !isRoadId(ctx.roadId) || typeof ctx.jobId !== "string") {
    return draft;
  }

  let next = draft;
  const route = readSelectedRoute(next);
  if (!route || route.roadId !== ctx.roadId) {
    next = persistSelectedRoute(next, ctx.roadId, "system");
  }

  const neededIds = (
    ctx.selectedServiceIds && ctx.selectedServiceIds.length > 0
      ? ctx.selectedServiceIds
      : [ctx.jobId]
  ) as RouteMapJobId[];
  const existing = readSelectedServices(next);
  const needed = new Set(neededIds);
  const extra = existing.filter((service) => !needed.has(service.jobId));
  const missing = neededIds.filter(
    (jobId) => !existing.some((service) => service.jobId === jobId),
  );
  for (const service of extra) {
    next = persistRemoveService(next, service.jobId, "system");
  }
  for (const jobId of missing) {
    next = persistAddService(next, jobId, ctx.roadId, "system");
  }
  return next;
}
