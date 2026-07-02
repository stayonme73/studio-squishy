/**
 * Catalog V2 draft catalog — populated from live sources at build time.
 * NOT imported by Route Map, checkout, intake, Discovery, or Recommendation Engine.
 */

import { buildCatalogV2DraftFromLive } from "@/catalog/v2/build-from-live";
import type { CatalogV2DraftMeta, CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";

/** Full draft catalog mirrored from live SERVICE_CATALOG — shape migrated, data not invented. */
export const CATALOG_V2_DRAFT: readonly CatalogV2ServiceEntry[] =
  buildCatalogV2DraftFromLive();

export const CATALOG_V2_DRAFT_META: CatalogV2DraftMeta = {
  schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
  generatedAt: "2026-07-02",
  entryCount: CATALOG_V2_DRAFT.length,
  note:
    "Draft with Tagia V2 decisions applied (4 availability buckets, placement fields, canonical Route Map turnaround). Not wired to live flows.",
};
