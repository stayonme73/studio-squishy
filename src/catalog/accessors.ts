/**
 * Studio Service Catalog — read accessors.
 * Recommendation Engine, Payment, and Campaign Record should use these helpers.
 */

import {
  deriveCompatibilityPricing,
  getPriceCentsFromService,
  resolveLegacyServiceId,
} from "@/catalog/compat";
import { SERVICE_CATALOG } from "@/catalog/services";
import type {
  BillingType,
  DiscoveryMappingRule,
  DiscoveryTrigger,
  ServiceCatalogEntry,
  ServiceCatalogStatus,
  ServiceCategoryId,
  ServiceClass,
  ServiceFamilyId,
  ServiceId,
  ServicePricing,
  StudioServiceEntry,
  StudioServiceStatus,
} from "@/catalog/types";

const serviceById = new Map<ServiceId, StudioServiceEntry>(
  SERVICE_CATALOG.map((service) => [service.id, service]),
);

function withDerivedPricing(service: StudioServiceEntry): StudioServiceEntry {
  const derived = deriveCompatibilityPricing(service);
  if (!derived) return service;
  return { ...service, pricing: derived };
}

export function getServiceCatalog(): readonly StudioServiceEntry[] {
  return SERVICE_CATALOG;
}

export function getStudioServices(): readonly StudioServiceEntry[] {
  return SERVICE_CATALOG;
}

export function getServiceById(id: string): StudioServiceEntry | undefined {
  const resolved = resolveLegacyServiceId(id);
  if (!resolved) return undefined;
  const service = serviceById.get(resolved);
  return service ? withDerivedPricing(service) : undefined;
}

export function getServicesByStatus(status: ServiceCatalogStatus): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.status === status).map(withDerivedPricing);
}

export function getServicesByServiceStatus(
  serviceStatus: StudioServiceStatus,
): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.serviceStatus === serviceStatus).map(
    withDerivedPricing,
  );
}

export function getServicesByCategory(categoryId: ServiceCategoryId): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.category === categoryId).map(
    withDerivedPricing,
  );
}

export function getServicesByServiceClass(serviceClass: ServiceClass): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.serviceClass === serviceClass).map(
    withDerivedPricing,
  );
}

export function getServicesByFamily(familyId: ServiceFamilyId): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.familyId === familyId).map(
    withDerivedPricing,
  );
}

export function getAddOnEligibleServices(): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.addOnEligible).map(withDerivedPricing);
}

export function getUpgradeEligibleServices(): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.upgradeEligible).map(withDerivedPricing);
}

export function getActiveServices(): StudioServiceEntry[] {
  return getServicesByStatus("active");
}

export function getActiveLaunchServices(): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter(
    (service) =>
      service.serviceStatus === "active" &&
      service.launchStatus === "active" &&
      service.status === "active",
  ).map(withDerivedPricing);
}

export function getServiceIds(): ServiceId[] {
  return SERVICE_CATALOG.map((service) => service.id);
}

export function isServiceId(value: string): value is ServiceId {
  const resolved = resolveLegacyServiceId(value);
  return resolved !== undefined && serviceById.has(resolved);
}

/** Canonical price in USD cents for a service ID. */
export function getServicePriceCents(id: string): number {
  const service = getServiceById(id);
  if (!service) return 0;
  return getPriceCentsFromService(service);
}

/** Sum priceCents for a list of service IDs — skips unknown IDs. */
export function sumPriceCentsForServices(ids: readonly string[]): number {
  let total = 0;
  for (const id of ids) {
    total += getServicePriceCents(id);
  }
  return total;
}

/** Sum priceCents for services matching a billing type — skips unknown IDs. */
export function sumPriceCentsByBillingType(
  ids: readonly string[],
  billingType: BillingType,
): number {
  let total = 0;
  for (const id of ids) {
    const service = getServiceById(id);
    if (service?.billingType === billingType) {
      total += getServicePriceCents(id);
    }
  }
  return total;
}

/** Legacy ServicePricing derived from priceCents — for payment and summary consumers. */
export function getDerivedServicePricing(id: string): ServicePricing | undefined {
  const service = getServiceById(id);
  if (!service) return undefined;
  return deriveCompatibilityPricing(service);
}

/** Services whose discovery rules match a need signal — engine building block. */
export function getServicesForNeed(needId: string): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) =>
    service.discoveryMapping.some(
      (rule) => rule.signal === "need" && rule.value === needId,
    ),
  ).map(withDerivedPricing);
}

/** All discovery rules for a service, active or inactive. */
export function getDiscoveryRulesForService(serviceId: ServiceId): readonly DiscoveryMappingRule[] {
  return getServiceById(serviceId)?.discoveryMapping ?? [];
}

/** Future-facing discovery triggers — same data as mapping until engine migration. */
export function getDiscoveryTriggersForService(
  serviceId: ServiceId,
): readonly DiscoveryTrigger[] {
  const service = getServiceById(serviceId);
  if (!service) return [];
  return service.discoveryTriggers.length > 0
    ? service.discoveryTriggers
    : service.discoveryMapping;
}

/** Direct dependency chain (one level — does not recurse). */
export function getServiceDependencies(serviceId: ServiceId): StudioServiceEntry[] {
  const service = getServiceById(serviceId);
  if (!service) return [];
  return service.dependencies
    .map((id) => getServiceById(id))
    .filter((entry): entry is StudioServiceEntry => entry !== undefined);
}

/** @deprecated Use StudioServiceEntry — alias for engine imports. */
export type { ServiceCatalogEntry };

export { resolveLegacyServiceId };
