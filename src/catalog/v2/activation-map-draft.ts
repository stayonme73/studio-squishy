/**
 * Catalog V2 activation map — compatibility re-export.
 * Canonical source: `@/catalog/activation`.
 */

export type {
  CatalogV2ActivationMapEntry,
  CatalogV2ActivationStatus,
} from "@/catalog/activation";

export {
  CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS,
  CATALOG_V2_ACTIVATION_MAP_DRAFT,
  CATALOG_V2_ACTIVATION_RETIRED_ROUTE_MAP_SKUS,
  getActivationMapEntriesByLane,
  getActivationMapEntriesByStatus,
  getActivationMapEntryBySku,
  getActivationMapShelfEntriesForLane,
} from "@/catalog/activation";
