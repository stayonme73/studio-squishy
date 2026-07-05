/**
 * Studio Service Catalog — seed assembly layer.
 *
 * Composition:
 * - core-services + route-map-launch + route-map-v2-launch (via services.ts raw seeds)
 * - retired legacy packages (via services.ts raw seeds)
 *
 * Normalization applies v3 V2-ready fields at export — seeds may omit them.
 * Consumer wiring: Route Map + Checkout (3A/3B), Studio Board (3C), Review/Delivery frozen helpers (4).
 */

import { normalizeServiceCatalog } from "@/catalog/normalize";
import { RAW_SERVICE_CATALOG } from "@/catalog/services";
import { validateServiceCatalog } from "@/catalog/validate";

export const SERVICE_CATALOG = normalizeServiceCatalog(RAW_SERVICE_CATALOG);

validateServiceCatalog(SERVICE_CATALOG);
