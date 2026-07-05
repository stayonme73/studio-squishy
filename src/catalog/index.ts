/**
 * Studio Service Catalog — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Payment → Campaign Record
 * Import from `@/catalog` only; do not reach into submodules from UI.
 *
 * Schema v3 adds V2-ready optional fields (reviewType, deliveryPackage, pricingDisplayType,
 * qaChecklist, aiPromptRef). ServiceCatalogEntry remains an alias for engine compat.
 */

export {
  CATALOG_SCHEMA_VERSION,
} from "@/catalog/types";

export type {
  BillingType,
  CatalogSchemaVersion,
  DeliveryFormatId,
  DeliveryMapping,
  DeliveryMappingItem,
  DiscoveryMappingRule,
  DiscoverySignalKind,
  DiscoveryTrigger,
  ExecutionAddOnFamilyId,
  ExecutionAddOnServiceId,
  ExecutionChannel,
  ExecutionMode,
  FulfillmentMode,
  LaunchAvailability,
  LaunchStatus,
  MonthlyCycleWindow,
  MonthlyServiceId,
  OneTimeServiceId,
  ProductionLane,
  ServiceBillingModel,
  ServiceCatalogEntry,
  ServiceCatalogStatus,
  ServiceCategoryId,
  ServiceClass,
  ServiceDeliverable,
  ServiceFamilyId,
  ServiceGuideFaqItem,
  ServiceId,
  ServicePricing,
  ServiceProductionEffort,
  ServiceProductionEffortTier,
  ServiceProductionTime,
  ServiceQaChecklist,
  ServiceQaChecklistItemId,
  ServiceReviewType,
  ServiceDeliveryPackage,
  ServicePricingDisplayType,
  ServiceAiPromptRef,
  ServiceTimingWindow,
  StudioNeedId,
  StudioServiceEntry,
  StudioServiceStatus,
} from "@/catalog/types";

export {
  normalizeServiceCatalog,
  normalizeStudioServiceEntry,
} from "@/catalog/normalize";

export {
  getServiceCategories,
  getServiceCategoryById,
  isServiceCategoryId,
  SERVICE_CATEGORIES,
} from "@/catalog/categories";
export type { ServiceCategoryDefinition } from "@/catalog/categories";

export {
  billingTypeToServiceBillingModel,
  deriveCompatibilityPricing,
  effortTierToServiceClass,
  executionAddOnFamilyId,
  executionAddOnId,
  getDiscoveryMappingForEngine,
  getPriceCentsFromService,
  getStructuredDeliverablesForEngine,
  LEGACY_SERVICE_ID_ALIASES,
  resolveLegacyServiceId,
  serviceStatusToCatalogStatus,
} from "@/catalog/compat";

export { SERVICE_CATALOG } from "@/catalog/seeds";

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
  getActiveLaunchServices,
  getActiveServices,
  getAddOnEligibleServices,
  getDerivedServicePricing,
  getDiscoveryRulesForService,
  getDiscoveryTriggersForService,
  getRecommendableActiveServices,
  getServiceById,
  getServiceCatalog,
  getServiceDependencies,
  getServiceIds,
  getServicePriceCents,
  getServicesByCategory,
  getServicesByFamily,
  getServicesByServiceClass,
  getServicesByServiceStatus,
  getServicesByStatus,
  getServicesForNeed,
  getStudioServices,
  getUpgradeEligibleServices,
  isServiceId,
  sumPriceCentsForServices,
} from "@/catalog/accessors";

export {
  ServiceCatalogValidationError,
  canAttachExecutionAddOn,
  getActivePurchasableServices,
  validateExecutionAddOnsInPlan,
  validateServiceCatalog,
} from "@/catalog/validate";
export type { ExecutionAddOnPlanValidationResult } from "@/catalog/validate";
