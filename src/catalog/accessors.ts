/**
 * Studio Service Catalog — read accessors.
 * Recommendation Engine, Payment, and Campaign Record should use these helpers.
 */

import { SERVICE_CATALOG } from "@/catalog/services";
import type {
  DiscoveryMappingRule,
  DiscoveryTrigger,
  ServiceCatalogEntry,
  ServiceCatalogStatus,
  ServiceCategoryId,
  ServiceClass,
  ServiceId,
  StudioServiceEntry,
  StudioServiceStatus,
} from "@/catalog/types";

const serviceById = new Map<ServiceId, StudioServiceEntry>(
  SERVICE_CATALOG.map((service) => [service.id, service]),
);

export function getServiceCatalog(): readonly StudioServiceEntry[] {
  return SERVICE_CATALOG;
}

export function getStudioServices(): readonly StudioServiceEntry[] {
  return SERVICE_CATALOG;
}

export function getServiceById(id: ServiceId): StudioServiceEntry | undefined {
  return serviceById.get(id);
}

export function getServicesByStatus(status: ServiceCatalogStatus): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.status === status);
}

export function getServicesByServiceStatus(
  serviceStatus: StudioServiceStatus,
): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.serviceStatus === serviceStatus);
}

export function getServicesByCategory(categoryId: ServiceCategoryId): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.category === categoryId);
}

export function getServicesByServiceClass(serviceClass: ServiceClass): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.serviceClass === serviceClass);
}

export function getAddOnEligibleServices(): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.addOnEligible);
}

export function getUpgradeEligibleServices(): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) => service.upgradeEligible);
}

export function getActiveServices(): StudioServiceEntry[] {
  return getServicesByStatus("active");
}

export function getServiceIds(): ServiceId[] {
  return SERVICE_CATALOG.map((service) => service.id);
}

export function isServiceId(value: string): value is ServiceId {
  return serviceById.has(value as ServiceId);
}

/** Services whose discovery rules match a need signal — engine building block. */
export function getServicesForNeed(needId: string): StudioServiceEntry[] {
  return SERVICE_CATALOG.filter((service) =>
    service.discoveryMapping.some(
      (rule) => rule.signal === "need" && rule.value === needId,
    ),
  );
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
