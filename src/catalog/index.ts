/**
 * Studio Service Catalog — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Payment → Campaign Record
 * Import from `@/catalog` only; do not reach into submodules from UI.
 */

export type {
  DiscoveryMappingRule,
  DiscoverySignalKind,
  ServiceBillingModel,
  ServiceCatalogEntry,
  ServiceCatalogStatus,
  ServiceDeliverable,
  ServiceId,
  ServicePricing,
  ServiceProductionEffort,
  ServiceProductionEffortTier,
  ServiceProductionTime,
  StudioNeedId,
} from "@/catalog/types";

export { SERVICE_CATALOG } from "@/catalog/services";

export {
  getActiveServices,
  getDiscoveryRulesForService,
  getServiceById,
  getServiceCatalog,
  getServiceDependencies,
  getServiceIds,
  getServicesByStatus,
  getServicesForNeed,
  isServiceId,
} from "@/catalog/accessors";

export { ServiceCatalogValidationError, validateServiceCatalog } from "@/catalog/validate";
