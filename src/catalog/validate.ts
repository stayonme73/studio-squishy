/**
 * Runtime catalog validation — no external schema library.
 * Runs at module load to catch duplicate IDs and broken dependency refs early.
 */

import type { ServiceCatalogEntry, ServiceId } from "@/catalog/types";

export class ServiceCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceCatalogValidationError";
  }
}

export function validateServiceCatalog(services: readonly ServiceCatalogEntry[]): void {
  const ids = new Set<ServiceId>();

  for (const service of services) {
    if (!service.id?.trim()) {
      throw new ServiceCatalogValidationError("Service catalog entry is missing id.");
    }
    if (!service.name?.trim()) {
      throw new ServiceCatalogValidationError(`Service "${service.id}" is missing name.`);
    }
    if (!service.customerDescription?.trim()) {
      throw new ServiceCatalogValidationError(
        `Service "${service.id}" is missing customerDescription.`,
      );
    }
    if (service.deliverables.length === 0) {
      throw new ServiceCatalogValidationError(`Service "${service.id}" has no deliverables.`);
    }
    if (ids.has(service.id)) {
      throw new ServiceCatalogValidationError(`Duplicate service id: ${service.id}`);
    }
    ids.add(service.id);
  }

  for (const service of services) {
    for (const dependencyId of service.dependencies) {
      if (!ids.has(dependencyId)) {
        throw new ServiceCatalogValidationError(
          `Service "${service.id}" depends on unknown service "${dependencyId}".`,
        );
      }
      if (dependencyId === service.id) {
        throw new ServiceCatalogValidationError(`Service "${service.id}" cannot depend on itself.`);
      }
    }
  }
}
