/**
 * Studio Service Catalog — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Payment → Campaign Record
 * Import from `@/catalog` only; do not reach into submodules from UI.
 *
 * Schema v2 adds StudioServiceEntry with category, service class, discovery triggers,
 * requirements, and governance fields. ServiceCatalogEntry remains an alias for engine compat.
 */

export {
  CATALOG_SCHEMA_VERSION,
} from "@/catalog/types";

export type {
  CatalogSchemaVersion,
  DeliveryFormatId,
  DiscoveryMappingRule,
  DiscoverySignalKind,
  DiscoveryTrigger,
  ServiceBillingModel,
  ServiceCatalogEntry,
  ServiceCatalogStatus,
  ServiceCategoryId,
  ServiceClass,
  ServiceDeliverable,
  ServiceId,
  ServicePricing,
  ServiceProductionEffort,
  ServiceProductionEffortTier,
  ServiceProductionTime,
  StudioNeedId,
  StudioServiceEntry,
  StudioServiceStatus,
} from "@/catalog/types";

export {
  getServiceCategories,
  getServiceCategoryById,
  isServiceCategoryId,
  SERVICE_CATEGORIES,
} from "@/catalog/categories";
export type { ServiceCategoryDefinition } from "@/catalog/categories";

export {
  effortTierToServiceClass,
  getDiscoveryMappingForEngine,
  serviceStatusToCatalogStatus,
} from "@/catalog/compat";

export { SERVICE_CATALOG } from "@/catalog/services";

export {
  CORE_MAX_INCLUDED,
  CUSTOMER_SECTION_LABELS,
  ESSENTIAL_MAX_INCLUDED,
  PRODUCTION_ALLOCATION_LIMITS,
  SERVICE_CLASS_BY_ID,
  SIGNATURE_MAX_INCLUDED,
  addingBeyondIncludedAllocation,
  classifyServiceSubstitution,
  substitutionRequiresUpgrade,
} from "@/catalog/production-allocation";
export type { SubstitutionSwapKind, CustomerSectionLabels } from "@/catalog/production-allocation";

export {
  getActiveServices,
  getAddOnEligibleServices,
  getDiscoveryRulesForService,
  getDiscoveryTriggersForService,
  getServiceById,
  getServiceCatalog,
  getServiceDependencies,
  getServiceIds,
  getServicesByCategory,
  getServicesByServiceClass,
  getServicesByServiceStatus,
  getServicesByStatus,
  getServicesForNeed,
  getStudioServices,
  getUpgradeEligibleServices,
  isServiceId,
} from "@/catalog/accessors";

export { ServiceCatalogValidationError, validateServiceCatalog } from "@/catalog/validate";
