import {
  CAMPAIGN_STATUSES,
  type CampaignStatus,
} from "@/config/studio-board";

/** Dev-only query param → campaign status (Phase 1 testing). */
export const DEV_STATUS_QUERY_MAP: Record<string, CampaignStatus> = {
  discovery: "DISCOVERY_COMPLETE",
  intake: "DRAFT_RECEIVED",
  draft: "DRAFT_RECEIVED",
  payment: "PAYMENT_RECEIVED",
  concepts: "BUILDING_CONCEPTS",
  review: "READY_FOR_REVIEW",
  delivered: "DELIVERED",
};

export const DEV_STATUS_OPTIONS = CAMPAIGN_STATUSES.map((status) => {
  const labels: Record<CampaignStatus, string> = {
    DISCOVERY_COMPLETE: "Discovery Complete",
    DRAFT_RECEIVED: "Intake Complete",
    PAYMENT_RECEIVED: "Payment Received",
    BUILDING_CONCEPTS: "Building Concepts",
    READY_FOR_REVIEW: "Ready For Review",
    DELIVERED: "Delivered",
  };

  const params: Record<CampaignStatus, string> = {
    DISCOVERY_COMPLETE: "discovery",
    DRAFT_RECEIVED: "intake",
    PAYMENT_RECEIVED: "payment",
    BUILDING_CONCEPTS: "concepts",
    READY_FOR_REVIEW: "review",
    DELIVERED: "delivered",
  };

  return { param: params[status], label: labels[status] };
});

export function parseDevStatusParam(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): CampaignStatus | null {
  const raw = searchParams.get("status")?.trim().toLowerCase();
  if (!raw) return null;
  return DEV_STATUS_QUERY_MAP[raw] ?? null;
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, "get">;
