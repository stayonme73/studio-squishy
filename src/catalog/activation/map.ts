/**
 * Studio Service Catalog — V2 activation map.
 * Absorbed from v2/activation-map-draft.ts; drives Route Map shelf placement.
 *
 * @see batch1-ready-to-use.ts — Batch 1 launch candidates + held handout
 * @see batch2-ready-to-use.ts — Batch 2 RTU kits + post/publish add-on
 * @see route-map-v1.ts — shelf builders reading this map
 * @see route-map-v2-launch.ts — live catalog bridge for activated V2 SKUs
 */

import type { RouteMapRoadId } from "@/config/route-map-v1";
import type { ServiceId } from "@/catalog/types";
import type { CatalogV2DraftOnlySkuId } from "@/catalog/v2/types";
import {
  CATALOG_V2_BATCH1_LAUNCH_CANDIDATE_SKUS,
  CATALOG_V2_BATCH1_READY_TO_USE,
} from "@/catalog/v2/batch1-ready-to-use";
import {
  CATALOG_V2_BATCH2_LAUNCH_CANDIDATE_SKUS,
  CATALOG_V2_BATCH2_POST_PUBLISH_ELIGIBLE_PARENT_SKUS,
  CATALOG_V2_BATCH2_READY_TO_USE,
} from "@/catalog/v2/batch2-ready-to-use";
import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";

/** Activation disposition — draft planning only; not a live catalog status. */
export type CatalogV2ActivationStatus =
  | "active_candidate"
  | "held"
  | "retired_redirect"
  | "route_start_separate"
  | "addon_only";

/** One row in the V2 activation plan — V2 SKU, continuing V1 job, or retired redirect. */
export interface CatalogV2ActivationMapEntry {
  v2Sku?: CatalogV2DraftOnlySkuId;
  routeMapSku?: ServiceId;
  clientFacingName: string;
  status: CatalogV2ActivationStatus;
  replacesRouteMapSku?: ServiceId;
  retiredRouteMapSku?: ServiceId;
  laneEligibility: RouteMapRoadId[];
  directExitEligible: boolean;
  /** True when this parent RTU job may offer v2-addon-post-publish at checkout (draft plan). */
  postPublishAddonEligible?: boolean;
  notes?: string;
}

/** Lookup draft V2 record by SKU — Batch 1 + Batch 2 held entries only. */
const DRAFT_V2_BY_SKU: ReadonlyMap<CatalogV2DraftOnlySkuId, CatalogV2ServiceEntry> = new Map(
  [...CATALOG_V2_BATCH1_READY_TO_USE, ...CATALOG_V2_BATCH2_READY_TO_USE].map((entry) => [
    entry.sku as CatalogV2DraftOnlySkuId,
    entry,
  ]),
);

/** Lanes from draft record when populated; otherwise activation-map fallback (Batch 2 today). */
function lanesFromDraftOrFallback(
  sku: CatalogV2DraftOnlySkuId,
  fallback: readonly RouteMapRoadId[],
): RouteMapRoadId[] {
  const draft = DRAFT_V2_BY_SKU.get(sku);
  if (draft && draft.laneEligibility.length > 0) {
    return [...draft.laneEligibility];
  }
  return [...fallback];
}

/** directExitEligible from draft record when explicitly set on launch candidates. */
function directExitFromDraftOrFallback(sku: CatalogV2DraftOnlySkuId, fallback: boolean): boolean {
  const draft = DRAFT_V2_BY_SKU.get(sku);
  if (draft && draft.laneEligibility.length > 0) {
    return draft.directExitEligible;
  }
  return fallback;
}

/** Shared all-lane placement for Batch 1 marketing RTU shelf items (from draft records). */
const BATCH1_RTU_LANES: RouteMapRoadId[] = ["i75", "i20", "update", "random-exit"];

/**
 * Batch 2 lane placement — email/SMS default shelf stops are i20 + Random Exit only.
 * Voice/short video keep rm-j parity (i75, i20, random-exit).
 */
const BATCH2_EMAIL_SMS_LANES: RouteMapRoadId[] = ["i20", "random-exit"];
const BATCH2_VOICE_LANES: RouteMapRoadId[] = ["i75", "i20", "random-exit"];
const BATCH2_SHORT_VIDEO_LANES: RouteMapRoadId[] = ["i75", "i20", "random-exit"];

const BATCH2_EMAIL_SMS_LANE_NOTE =
  "Default shelf stops: i20 + Random Exit only — not on i75 or update. recommendedAfterRouteStart: true (may surface after rm-j001).";

/** rm-j006 voice RTU replacement — audio only; post/publish not bundled (Tagia rule). */
const VOICE_RTU_NOTE =
  "Replaces rm-j006 creation+post bundle with ready-to-use audio only. Post/publish add-on is NOT eligible for voice — client distributes audio file.";

/** rm-j003 / rm-j004 bundled post/publish split into RTU parent + optional add-on. */
const SOCIAL_POSTS_REPLACEMENT_NOTE =
  "Replaces rm-j003. Parent delivers 4 static posts + captions (RTU); client posts unless v2-addon-post-publish purchased with parent.";

const SHORT_VIDEO_REPLACEMENT_NOTE =
  "Replaces rm-j004. Parent delivers one short MP4 (RTU); client posts unless v2-addon-post-publish purchased with parent.";

const BATCH2_VOICE_VIDEO_LANE_BACKFILL_NOTE =
  "Batch 2 voice/short-video draft records have empty laneEligibility — lanes proposed here from rm-j parity; backfill draft record on activation.";

/**
 * Full activation map — V2 launch candidates, held SKUs, add-on, Route Start, continuing V1 jobs, and retired redirects.
 * Order: V2 active → held → add-on → Route Start → continuing V1 → retired V1.
 */
export const CATALOG_V2_ACTIVATION_MAP_DRAFT: readonly CatalogV2ActivationMapEntry[] = [
  // --- Batch 1 launch candidates (5) ---
  {
    v2Sku: "v2-rtu-flyer",
    clientFacingName: "Make Me a Flyer",
    status: "active_candidate",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-flyer", BATCH1_RTU_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-flyer", true),
    notes: "New RTU shelf item — no rm-j replacement. Complex scope routes to rm-j001.",
  },
  {
    v2Sku: "v2-rtu-menu",
    clientFacingName: "Make Me a Menu",
    status: "active_candidate",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-menu", BATCH1_RTU_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-menu", true),
    notes: "New RTU shelf item — no rm-j replacement.",
  },
  {
    v2Sku: "v2-rtu-service-sheet",
    clientFacingName: "Make Me a Service Sheet",
    status: "active_candidate",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-service-sheet", BATCH1_RTU_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-service-sheet", true),
    notes: "New RTU shelf item — no rm-j replacement.",
  },
  {
    v2Sku: "v2-rtu-social-posts",
    clientFacingName: "Make My Social Media Posts",
    status: "active_candidate",
    replacesRouteMapSku: "rm-j003",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-social-posts", BATCH1_RTU_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-social-posts", true),
    postPublishAddonEligible: true,
    notes: SOCIAL_POSTS_REPLACEMENT_NOTE,
  },
  {
    v2Sku: "v2-rtu-promotion-graphics",
    clientFacingName: "Make My Campaign Graphics",
    status: "active_candidate",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-promotion-graphics", BATCH1_RTU_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-promotion-graphics", true),
    notes: "New RTU shelf item — no rm-j replacement (distinct from rm-j005 campaign page).",
  },

  // --- Batch 2 RTU launch candidates (4) ---
  {
    v2Sku: "v2-rtu-email-kit",
    clientFacingName: "Make My Email Campaign Kit",
    status: "active_candidate",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-email-kit", BATCH2_EMAIL_SMS_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-email-kit", true),
    notes: `New RTU shelf item — no rm-j replacement. ${BATCH2_EMAIL_SMS_LANE_NOTE}`,
  },
  {
    v2Sku: "v2-rtu-sms-kit",
    clientFacingName: "Make My Text Message Campaign Kit",
    status: "active_candidate",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-sms-kit", BATCH2_EMAIL_SMS_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-sms-kit", true),
    notes: `New RTU shelf item — no rm-j replacement. ${BATCH2_EMAIL_SMS_LANE_NOTE}`,
  },
  {
    v2Sku: "v2-rtu-voice",
    clientFacingName: "Make Me a Voice Announcement",
    status: "active_candidate",
    replacesRouteMapSku: "rm-j006",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-voice", BATCH2_VOICE_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-voice", true),
    postPublishAddonEligible: false,
    notes: `${VOICE_RTU_NOTE} ${BATCH2_VOICE_VIDEO_LANE_BACKFILL_NOTE}`,
  },
  {
    v2Sku: "v2-rtu-short-video",
    clientFacingName: "Make Me a Short Video",
    status: "active_candidate",
    replacesRouteMapSku: "rm-j004",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-short-video", BATCH2_SHORT_VIDEO_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-short-video", true),
    postPublishAddonEligible: true,
    notes: `${SHORT_VIDEO_REPLACEMENT_NOTE} ${BATCH2_VOICE_VIDEO_LANE_BACKFILL_NOTE}`,
  },

  // --- Held (not on Route Map shelf at activation) ---
  {
    v2Sku: "v2-rtu-handout",
    clientFacingName: "Make Me a Handout or One-Page PDF",
    status: "held",
    laneEligibility: lanesFromDraftOrFallback("v2-rtu-handout", BATCH1_RTU_LANES),
    directExitEligible: directExitFromDraftOrFallback("v2-rtu-handout", true),
    notes:
      "Held for scope overlap with flyer/service-sheet/menu — stays in draft catalog; not placed on Route Map shelf until Tagia resolves overlap.",
  },

  // --- Post/publish add-on (checkout add-on only — not standalone shelf) ---
  {
    v2Sku: "v2-addon-post-publish",
    clientFacingName: "Post/Publish for Me",
    status: "addon_only",
    laneEligibility: [],
    directExitEligible: false,
    notes:
      "Add-on only — not on Route Map shelf or Direct Exit alone. Eligible parents: v2-rtu-social-posts, v2-rtu-short-video. Replaces bundled posting scope formerly in rm-j003 and rm-j004.",
  },

  // --- Route Start — separate from V2 RTU shelf (Tagia rule) ---
  {
    routeMapSku: "rm-j001",
    clientFacingName: "Help Me Figure Out What I Need",
    status: "route_start_separate",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    directExitEligible: true,
    notes:
      "Route Start advisory job — stays rm-j001 on all lanes including Random Exit. Do NOT merge into V2 RTU shelf. V2 RTU scopeRoutingNotes steer overflow here.",
  },

  // --- Continuing V1 Route Map jobs (no V2 equivalent — keep until Batch 3) ---
  {
    routeMapSku: "rm-j002",
    clientFacingName: "Set Up My Facebook, Instagram, or TikTok",
    status: "active_candidate",
    laneEligibility: ["i75", "random-exit"],
    directExitEligible: true,
    notes:
      "Keep live rm-j002 on map — managed social profile setup with first post; no V2 RTU equivalent in Batch 1/2. Hold V2 replacement until Batch 3.",
  },
  {
    routeMapSku: "rm-j005",
    clientFacingName: "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    status: "active_candidate",
    laneEligibility: ["i75", "i20", "random-exit"],
    directExitEligible: true,
    notes:
      "Keep live rm-j005 on map — campaign landing page with publish; no V2 equivalent in Batch 1/2. Distinct from v2-rtu-promotion-graphics (static graphics only). Hold until Batch 3.",
  },
  {
    routeMapSku: "rm-j007",
    clientFacingName: "Update My Existing Promotion",
    status: "active_candidate",
    laneEligibility: ["i20", "update", "random-exit"],
    directExitEligible: true,
    notes:
      "Keep live rm-j007 on map — update/republish of one existing live item; no V2 RTU equivalent. Hold V2 replacement until Batch 3.",
  },
  {
    routeMapSku: "rm-j008",
    clientFacingName: "Update My Facebook, Instagram, or TikTok",
    status: "active_candidate",
    laneEligibility: ["update", "random-exit"],
    directExitEligible: true,
    notes:
      "Keep live rm-j008 until Batch 3. Update Exit + Random Exit (Direct Exit eligible). Profile refresh; no V2 equivalent until Batch 3.",
  },

  // --- Retired / redirect — bundled post/publish jobs replaced by V2 RTU + optional add-on ---
  {
    routeMapSku: "rm-j003",
    clientFacingName: "Make and Post My Social Media Promotion",
    status: "retired_redirect",
    retiredRouteMapSku: "rm-j003",
    replacesRouteMapSku: "rm-j003",
    laneEligibility: ["i75", "i20", "random-exit"],
    directExitEligible: true,
    notes:
      "Retire from Route Map shelf on V2 activation. Redirect: v2-rtu-social-posts (RTU) + optional v2-addon-post-publish. Legacy SKU may remain in catalog as retired for checkout history.",
  },
  {
    routeMapSku: "rm-j004",
    clientFacingName: "Make Me a Short Video and Post It",
    status: "retired_redirect",
    retiredRouteMapSku: "rm-j004",
    replacesRouteMapSku: "rm-j004",
    laneEligibility: ["i75", "i20", "random-exit"],
    directExitEligible: true,
    notes:
      "Retire from Route Map shelf on V2 activation. Redirect: v2-rtu-short-video (RTU) + optional v2-addon-post-publish.",
  },
  {
    routeMapSku: "rm-j006",
    clientFacingName: "Make and Post My Voice Announcement",
    status: "retired_redirect",
    retiredRouteMapSku: "rm-j006",
    replacesRouteMapSku: "rm-j006",
    laneEligibility: ["i75", "i20", "random-exit"],
    directExitEligible: true,
    notes:
      "Retire from Route Map shelf on V2 activation. Redirect: v2-rtu-voice (audio-only RTU). Post/publish add-on NOT offered — client distributes audio.",
  },
] as const;

/** Approved V2 launch-candidate SKU IDs referenced by this activation map (excludes held handout and add-on). */
export const CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS = [
  ...CATALOG_V2_BATCH1_LAUNCH_CANDIDATE_SKUS,
  ...CATALOG_V2_BATCH2_LAUNCH_CANDIDATE_SKUS,
] as const;

/** Parent SKUs eligible for v2-addon-post-publish per Batch 2 draft + activation plan. */
export const CATALOG_V2_ACTIVATION_POST_PUBLISH_PARENT_SKUS =
  CATALOG_V2_BATCH2_POST_PUBLISH_ELIGIBLE_PARENT_SKUS;

/** Route Map V1 jobs slated for retirement when V2 activates. */
export const CATALOG_V2_ACTIVATION_RETIRED_ROUTE_MAP_SKUS = [
  "rm-j003",
  "rm-j004",
  "rm-j006",
] as const satisfies readonly ServiceId[];

/** Filter activation map entries by lane — includes entries whose laneEligibility contains the road. */
export function getActivationMapEntriesByLane(
  lane: RouteMapRoadId,
): readonly CatalogV2ActivationMapEntry[] {
  return CATALOG_V2_ACTIVATION_MAP_DRAFT.filter((entry) => entry.laneEligibility.includes(lane));
}

/** Filter activation map entries by activation status. */
export function getActivationMapEntriesByStatus(
  status: CatalogV2ActivationStatus,
): readonly CatalogV2ActivationMapEntry[] {
  return CATALOG_V2_ACTIVATION_MAP_DRAFT.filter((entry) => entry.status === status);
}

/** Shelf-eligible entries for a lane — active V2 RTU + continuing V1 jobs; excludes Route Start, add-on, held, retired. */
export function getActivationMapShelfEntriesForLane(
  lane: RouteMapRoadId,
): readonly CatalogV2ActivationMapEntry[] {
  return CATALOG_V2_ACTIVATION_MAP_DRAFT.filter(
    (entry) =>
      entry.status === "active_candidate" &&
      entry.laneEligibility.includes(lane) &&
      (entry.v2Sku !== undefined ||
        (entry.routeMapSku !== undefined && entry.replacesRouteMapSku === undefined)),
  );
}

/** Lookup one activation map row by V2 draft SKU or rm-j Route Map SKU. */
export function getActivationMapEntryBySku(
  sku: CatalogV2DraftOnlySkuId | ServiceId,
): CatalogV2ActivationMapEntry | undefined {
  return CATALOG_V2_ACTIVATION_MAP_DRAFT.find(
    (entry) => entry.v2Sku === sku || entry.routeMapSku === sku,
  );
}
