/**
 * Studio Service Catalog — v1 / v2 compatibility helpers.
 * Keeps Recommendation Engine imports working without modification.
 */

import type {
  BillingType,
  DiscoveryMappingRule,
  ExecutionAddOnFamilyId,
  ExecutionAddOnServiceId,
  ServiceCatalogStatus,
  ServiceDeliverable,
  ServiceFamilyId,
  ServiceId,
  ServicePricing,
  ServiceProductionEffortTier,
  ServiceClass,
  StudioServiceStatus,
  StudioServiceEntry,
} from "@/catalog/types";

/** Maps legacy stored IDs to canonical catalog IDs for read-time resolution. */
export const LEGACY_SERVICE_ID_ALIASES: Readonly<Record<string, ServiceId>> = {
  "marketing-campaign": "cp-001",
  "social-media-marketing": "sm-001",
  "marketing-copywriting": "cc-001",
  "content-writing": "cc-002",
  "marketing-video-production": "vp-001",
  "landing-pages-web-content": "lp-001",
  "marketing-optimization": "mo-001",
  "marketing-assets": "ma-001",
  "monthly-campaign-support": "cp-001-monthly",
  "monthly-social-media": "sm-001-monthly",
  "monthly-email-support": "em-001-monthly",
  "monthly-sms-support": "sms-001-monthly",
  "monthly-copy-support": "cc-001-monthly",
  "monthly-content-writing": "cc-002-monthly",
  "monthly-video-support": "vp-001-monthly",
  "monthly-optimization-support": "mo-001-monthly",
  "monthly-asset-support": "ma-001-monthly",
};

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

/** Resolve a stored or legacy service ID to the canonical catalog ID. */
export function resolveLegacyServiceId(id: string): ServiceId | undefined {
  const trimmed = id.trim();
  if (!trimmed) return undefined;
  return LEGACY_SERVICE_ID_ALIASES[trimmed] ?? (trimmed as ServiceId);
}

export function billingTypeToServiceBillingModel(
  billingType: BillingType,
): ServicePricing["billing"] {
  return billingType === "monthly" ? "monthly" : "one-time";
}

/** Derive legacy ServicePricing from canonical priceCents — single source of truth. */
export function deriveCompatibilityPricing(service: StudioServiceEntry): ServicePricing | undefined {
  if (service.priceCents <= 0) {
    return service.pricing;
  }

  const amountUsd = service.priceCents / 100;
  const billing = billingTypeToServiceBillingModel(service.billingType);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);

  const display =
    billing === "monthly" ? `${formatted}/month` : formatted;

  return { display, amountUsd, billing };
}

/** Canonical price in cents — prefers priceCents, falls back to legacy pricing.amountUsd. */
export function getPriceCentsFromService(service: StudioServiceEntry): number {
  if (service.priceCents > 0) {
    return service.priceCents;
  }
  if (service.pricing && service.pricing.amountUsd > 0) {
    return Math.round(service.pricing.amountUsd * 100);
  }
  return 0;
}

/** Canonical execution add-on ID — `<family-id>-execution` or `-execution-monthly`. */
export function executionAddOnId(
  familyId: ExecutionAddOnFamilyId,
  billingType: BillingType,
): ExecutionAddOnServiceId {
  return billingType === "monthly"
    ? `${familyId}-execution-monthly`
    : `${familyId}-execution`;
}

/** @deprecated Use executionAddOnId — one-time execution add-on ID only. */
export function executionAddOnFamilyId(familyId: ServiceFamilyId): `${ServiceFamilyId}-execution` {
  return `${familyId}-execution`;
}

/** v1 engine structured deliverables — maps v2 string deliverables when legacy shape absent. */
export function getStructuredDeliverablesForEngine(
  service: StudioServiceEntry,
): readonly ServiceDeliverable[] {
  if (service.legacyDeliverables && service.legacyDeliverables.length > 0) {
    return service.legacyDeliverables;
  }
  return service.deliverables.map((label, index) => ({
    id: `${service.id}-scope-${index}`,
    label,
    quantity: 1,
  }));
}
