/**
 * Runtime catalog validation — no external schema library.
 * Runs at module load to catch duplicate IDs and broken dependency refs early.
 */

import { deriveCompatibilityPricing } from "@/catalog/compat";
import { getServiceCategoryById } from "@/catalog/categories";
import type {
  ServiceCatalogEntry,
  ServiceId,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";

export class ServiceCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceCatalogValidationError";
  }
}

const QUOTED_AT_CHECKOUT = "quoted at checkout";

function isActivePurchasable(service: StudioServiceEntry): boolean {
  return (
    service.serviceStatus === "active" &&
    service.launchStatus === "active" &&
    service.status === "active"
  );
}

function validateActivePurchasableSku(service: StudioServiceEntry): void {
  if (!isActivePurchasable(service)) return;

  if (service.priceCents <= 0) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" must have priceCents > 0.`,
    );
  }

  if (!service.billingType) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing billingType.`,
    );
  }

  if (!service.productionLane) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing productionLane.`,
    );
  }

  if (!service.firstReviewWindow?.label) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing firstReviewWindow.`,
    );
  }

  const hasProjectWindow = Boolean(service.finalDeliveryWindow?.label);
  const hasMonthlyWindow = Boolean(service.monthlyCycleWindow?.label);
  if (!hasProjectWindow && !hasMonthlyWindow) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" must have finalDeliveryWindow or monthlyCycleWindow.`,
    );
  }

  if (service.deliverables.length === 0) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing deliverables.`,
    );
  }

  if (service.exclusions.length === 0) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing exclusions.`,
    );
  }

  if (!service.revisionRule?.trim()) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing revisionRule.`,
    );
  }

  if (service.clientResponsibilities.length === 0) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" is missing clientResponsibilities.`,
    );
  }

  const derived = deriveCompatibilityPricing(service);
  const legacyDisplay = service.pricing?.display ?? "";
  if (
    derived?.display.toLowerCase().includes(QUOTED_AT_CHECKOUT) ||
    legacyDisplay.toLowerCase().includes(QUOTED_AT_CHECKOUT)
  ) {
    throw new ServiceCatalogValidationError(
      `Active service "${service.id}" must not expose "Quoted at checkout".`,
    );
  }

  if (service.isExecutionAddOn) {
    if (!service.eligibleParentFamilyIds?.length) {
      throw new ServiceCatalogValidationError(
        `Execution add-on "${service.id}" must declare eligibleParentFamilyIds.`,
      );
    }
    if (service.isRecommendable || service.isAddable) {
      throw new ServiceCatalogValidationError(
        `Execution add-on "${service.id}" must not be directly recommendable or addable alone.`,
      );
    }
    if (service.dependencies.length !== 1) {
      throw new ServiceCatalogValidationError(
        `Execution add-on "${service.id}" must declare exactly one parent dependency.`,
      );
    }
  }
}

function validateExecutionAddOnParentLink(
  service: StudioServiceEntry,
  servicesById: ReadonlyMap<ServiceId, StudioServiceEntry>,
): void {
  if (!service.isExecutionAddOn) return;

  const parentId = service.dependencies[0];
  const parent = servicesById.get(parentId);
  if (!parent) return;

  if (parent.isExecutionAddOn) {
    throw new ServiceCatalogValidationError(
      `Execution add-on "${service.id}" cannot depend on another execution add-on.`,
    );
  }

  if (!service.eligibleParentFamilyIds!.includes(parent.familyId)) {
    throw new ServiceCatalogValidationError(
      `Execution add-on "${service.id}" parent "${parentId}" family "${parent.familyId}" is not eligible.`,
    );
  }

  if (parent.billingType !== service.billingType) {
    throw new ServiceCatalogValidationError(
      `Execution add-on "${service.id}" billingType "${service.billingType}" must match parent "${parentId}" billingType "${parent.billingType}".`,
    );
  }

  if (parent.familyId !== service.familyId) {
    throw new ServiceCatalogValidationError(
      `Execution add-on "${service.id}" familyId "${service.familyId}" must match parent "${parentId}" familyId "${parent.familyId}".`,
    );
  }
}

function validateV2Fields(service: StudioServiceEntry, ids: ReadonlySet<ServiceId>): void {
  if (service.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    throw new ServiceCatalogValidationError(
      `Service "${service.id}" has unsupported schemaVersion: ${String(service.schemaVersion)}.`,
    );
  }

  if (!service.familyId?.trim()) {
    throw new ServiceCatalogValidationError(`Service "${service.id}" is missing familyId.`);
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

  if (!service.launchStatus) {
    throw new ServiceCatalogValidationError(`Service "${service.id}" is missing launchStatus.`);
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

  validateActivePurchasableSku(service);
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

  const servicesById = new Map(services.map((service) => [service.id, service]));
  for (const service of services) {
    validateExecutionAddOnParentLink(service, servicesById);
  }
}

export type ExecutionAddOnPlanValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Validates execution add-ons in a plan require a matching parent family and billing type. */
export function validateExecutionAddOnsInPlan(
  selectedServiceIds: readonly ServiceId[],
  services: readonly StudioServiceEntry[],
): ExecutionAddOnPlanValidationResult {
  const selected = new Set(selectedServiceIds);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const errors: string[] = [];

  for (const serviceId of selectedServiceIds) {
    const service = servicesById.get(serviceId);
    if (!service?.isExecutionAddOn) continue;

    const parentId = service.dependencies[0];
    const parent = servicesById.get(parentId);

    if (!selected.has(parentId)) {
      errors.push(
        `Execution add-on "${serviceId}" requires parent "${parentId}" in the plan.`,
      );
      continue;
    }

    if (!parent) {
      errors.push(`Execution add-on "${serviceId}" parent "${parentId}" is unknown.`);
      continue;
    }

    if (!service.eligibleParentFamilyIds?.includes(parent.familyId)) {
      errors.push(
        `Execution add-on "${serviceId}" cannot attach to unrelated service "${parentId}".`,
      );
    }

    if (parent.billingType !== service.billingType) {
      errors.push(
        `Execution add-on "${serviceId}" billing must match parent "${parentId}" billing.`,
      );
    }
  }

  const addOnOnly =
    selectedServiceIds.length > 0 &&
    selectedServiceIds.every((id) => servicesById.get(id)?.isExecutionAddOn);
  if (addOnOnly) {
    errors.push("Execution add-ons cannot be selected without a matching parent service.");
  }

  return { valid: errors.length === 0, errors };
}

function findMatchingParentForExecutionAddOn(
  addOn: StudioServiceEntry,
  selectedServiceIds: readonly ServiceId[],
  servicesById: ReadonlyMap<ServiceId, StudioServiceEntry>,
): ServiceId | undefined {
  const parentId = addOn.dependencies[0];
  if (selectedServiceIds.includes(parentId)) return parentId;

  return selectedServiceIds.find((id) => {
    const candidate = servicesById.get(id);
    if (!candidate || candidate.isExecutionAddOn) return false;
    return (
      addOn.eligibleParentFamilyIds?.includes(candidate.familyId) &&
      candidate.billingType === addOn.billingType
    );
  });
}

/** True when an execution add-on may attach to at least one selected parent service. */
export function canAttachExecutionAddOn(
  addOnId: ServiceId,
  selectedServiceIds: readonly ServiceId[],
  services: readonly StudioServiceEntry[],
): boolean {
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const addOn = servicesById.get(addOnId);
  if (!addOn?.isExecutionAddOn) return false;
  return findMatchingParentForExecutionAddOn(addOn, selectedServiceIds, servicesById) !== undefined;
}

/** Returns active purchasable SKUs — for tests and tooling. */
export function getActivePurchasableServices(
  services: readonly StudioServiceEntry[],
): StudioServiceEntry[] {
  return services.filter(isActivePurchasable);
}
