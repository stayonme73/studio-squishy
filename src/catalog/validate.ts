/**
 * Runtime catalog validation — no external schema library.
 * Runs at module load to catch duplicate IDs and broken dependency refs early.
 */

import { getServiceCategoryById } from "@/catalog/categories";
import type { ServiceCatalogEntry, ServiceId, StudioServiceEntry } from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";

export class ServiceCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceCatalogValidationError";
  }
}

function validateV2Fields(service: StudioServiceEntry, ids: ReadonlySet<ServiceId>): void {
  if (service.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    throw new ServiceCatalogValidationError(
      `Service "${service.id}" has unsupported schemaVersion: ${String(service.schemaVersion)}.`,
    );
  }

  if (!getServiceCategoryById(service.category)) {
    throw new ServiceCatalogValidationError(
      `Service "${service.id}" references unknown category "${service.category}".`,
    );
  }

  if (!service.serviceClass) {
    throw new ServiceCatalogValidationError(`Service "${service.id}" is missing serviceClass.`);
  }

  const revisionRounds = service.includedRevisionRounds ?? 0;
  if (revisionRounds < 0) {
    throw new ServiceCatalogValidationError(
      `Service "${service.id}" has invalid includedRevisionRounds.`,
    );
  }

  if (!service.serviceStatus) {
    throw new ServiceCatalogValidationError(`Service "${service.id}" is missing serviceStatus.`);
  }

  if (Array.isArray(service.canSubstitute)) {
    for (const substituteId of service.canSubstitute) {
      if (!ids.has(substituteId)) {
        throw new ServiceCatalogValidationError(
          `Service "${service.id}" canSubstitute references unknown service "${substituteId}".`,
        );
      }
    }
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
    if (ids.has(service.id)) {
      throw new ServiceCatalogValidationError(`Duplicate service id: ${service.id}`);
    }
    ids.add(service.id);
  }

  for (const service of services) {
    validateV2Fields(service, ids);
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
