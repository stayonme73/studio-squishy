/**
 * Studio Service Catalog — read accessors.
 * Recommendation Engine, Payment, and Campaign Record should use these helpers.
 */

import { SERVICE_CATALOG } from "@/catalog/services";
import type {
  DiscoveryMappingRule,
  ServiceCatalogEntry,
  ServiceCatalogStatus,
  ServiceId,
} from "@/catalog/types";

const serviceById = new Map<ServiceId, ServiceCatalogEntry>(
  SERVICE_CATALOG.map((service) => [service.id, service]),
);

export function getServiceCatalog(): readonly ServiceCatalogEntry[] {
  return SERVICE_CATALOG;
}

export function getServiceById(id: ServiceId): ServiceCatalogEntry | undefined {
  return serviceById.get(id);
}

export function getServicesByStatus(status: ServiceCatalogStatus): ServiceCatalogEntry[] {
  return SERVICE_CATALOG.filter((service) => service.status === status);
}

export function getActiveServices(): ServiceCatalogEntry[] {
  return getServicesByStatus("active");
}

export function getServiceIds(): ServiceId[] {
  return SERVICE_CATALOG.map((service) => service.id);
}

export function isServiceId(value: string): value is ServiceId {
  return serviceById.has(value as ServiceId);
}

/** Services whose discovery rules match a need signal — engine building block. */
export function getServicesForNeed(needId: string): ServiceCatalogEntry[] {
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

/** Direct dependency chain (one level — does not recurse). */
export function getServiceDependencies(serviceId: ServiceId): ServiceCatalogEntry[] {
  const service = getServiceById(serviceId);
  if (!service) return [];
  return service.dependencies
    .map((id) => getServiceById(id))
    .filter((entry): entry is ServiceCatalogEntry => entry !== undefined);
}
