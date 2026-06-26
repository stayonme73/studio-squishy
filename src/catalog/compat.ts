/**
 * Studio Service Catalog — v1 / v2 compatibility helpers.
 * Keeps Recommendation Engine imports working without modification.
 */

import type {
  DiscoveryMappingRule,
  ServiceCatalogStatus,
  ServiceProductionEffortTier,
  ServiceClass,
  StudioServiceStatus,
  StudioServiceEntry,
} from "@/catalog/types";

/** Maps legacy production effort tier to internal service class. */
export function effortTierToServiceClass(tier: ServiceProductionEffortTier): ServiceClass {
  switch (tier) {
    case "high":
      return "signature";
    case "medium":
      return "core";
    case "low":
      return "essential";
  }
}

/** Maps studio service lifecycle status to v1 catalog active/inactive flag. */
export function serviceStatusToCatalogStatus(status: StudioServiceStatus): ServiceCatalogStatus {
  return status === "active" || status === "beta" ? "active" : "inactive";
}

/** Discovery rules for v1 engine — prefers discoveryMapping, falls back to discoveryTriggers. */
export function getDiscoveryMappingForEngine(
  service: StudioServiceEntry,
): readonly DiscoveryMappingRule[] {
  return service.discoveryMapping.length > 0
    ? service.discoveryMapping
    : service.discoveryTriggers;
}
