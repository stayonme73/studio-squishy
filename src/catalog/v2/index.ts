/**
 * Catalog V2 draft — public API (draft-only namespace).
 * Import from `@/catalog/v2` for review and future migration work.
 * Live flows continue to use `@/catalog`.
 */

export {
  CATALOG_V2_DRAFT_SCHEMA_VERSION,
} from "@/catalog/v2/types";

export type {
  CatalogV2Availability,
  CatalogV2DeliverableSlot,
  CatalogV2DeliveryType,
  CatalogV2DraftMeta,
  CatalogV2DraftSchemaVersion,
  CatalogV2Placement,
  CatalogV2ServiceEntry,
} from "@/catalog/v2/types";

export {
  buildCatalogV2DraftFromLive,
  buildCatalogV2EntryFromLive,
  collectCatalogV2DraftWarnings,
  getActiveCatalogV2DraftEntries,
  getCatalogV2DraftEntryBySku,
  getHeldCatalogV2DraftEntries,
  getPausedCatalogV2DraftEntries,
  getRetiredCatalogV2DraftEntries,
  getRouteMapV2DraftEntries,
} from "@/catalog/v2/build-from-live";

export {
  CATALOG_V2_DRAFT,
  CATALOG_V2_DRAFT_META,
} from "@/catalog/v2/draft-catalog";
