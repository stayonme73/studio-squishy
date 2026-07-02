/**
 * Catalog V2 draft catalog — populated from live sources at build time.
 * NOT imported by Route Map, checkout, intake, Discovery, or Recommendation Engine.
 */

import { CATALOG_V2_BATCH1_READY_TO_USE } from "@/catalog/v2/batch1-ready-to-use";
import { buildCatalogV2DraftFromLive } from "@/catalog/v2/build-from-live";
import type { CatalogV2DraftMeta, CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";

const LIVE_MIRROR_ENTRIES: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive();

/** Full draft catalog — live mirror plus Batch 1 proposed held SKUs (isolated source file). */
export const CATALOG_V2_DRAFT: readonly CatalogV2ServiceEntry[] = [
  ...LIVE_MIRROR_ENTRIES,
  ...CATALOG_V2_BATCH1_READY_TO_USE,
];

export const CATALOG_V2_DRAFT_META: CatalogV2DraftMeta = {
  schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
  generatedAt: "2026-07-02",
  entryCount: CATALOG_V2_DRAFT.length,
  note:
    "Draft with Tagia V2 decisions applied (4 availability buckets, placement fields, canonical Route Map turnaround). Batch 1 ready-to-use SKUs appended from batch1-ready-to-use.ts — six held draft records, five launch candidates (handout excluded: held_broad_overlap). Not wired to live flows.",
};
