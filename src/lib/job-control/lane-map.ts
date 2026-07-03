import type { ProductionLane } from "@/catalog/types";
import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";

import type { ProductionControlLane } from "./types";

/** Map catalog production lane to Owner Control Room lane. */
export function resolveControlLaneForSku(skuId: ServiceId): ProductionControlLane {
  const catalogLane = getServiceById(skuId)?.productionLane;
  return mapCatalogLaneToControlLane(catalogLane);
}

export function mapCatalogLaneToControlLane(
  lane: ProductionLane | undefined,
): ProductionControlLane {
  switch (lane) {
    case "quick_turn":
      return "quick";
    case "complex_build":
      return "heavy";
    case "standard_build":
    case "ongoing_monthly":
    default:
      return "standard";
  }
}

export function buildJobId(campaignId: string, skuId: ServiceId): string {
  return `${campaignId}:${skuId}`;
}

export function parseJobId(jobId: string): { campaignId: string; skuId: ServiceId } | null {
  const separator = jobId.indexOf(":");
  if (separator <= 0) return null;
  return {
    campaignId: jobId.slice(0, separator),
    skuId: jobId.slice(separator + 1) as ServiceId,
  };
}
