import type { ServiceId } from "@/catalog/types";

/**
 * Locked active customer-facing service set for KITCHEN-PRODUCTION-CAPABILITY-1.
 * Authority: catalog launch status + Route Map shelf (Discovery green + limited shelf).
 * Does not change commerce.
 */

/** Discovery green — launchStatus active. */
export const DISCOVERY_GREEN_SKUS = [
  "bf-001",
  "sm-001",
  "sm-001-monthly",
  "em-001",
  "em-001-monthly",
  "cc-001",
  "ma-001",
  "ap-001",
] as const satisfies readonly ServiceId[];

/** Route Map V1 jobs still on shelf (limited). */
export const ROUTE_MAP_V1_SHELF_SKUS = [
  "rm-j002",
  "rm-j005",
  "rm-j007",
  "rm-j008",
] as const satisfies readonly ServiceId[];

/** Route Map V2 RTU shelf (limited). */
export const ROUTE_MAP_V2_RTU_SHELF_SKUS = [
  "v2-rtu-flyer",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
  "v2-rtu-business-card",
  "v2-rtu-email-kit",
  "v2-rtu-sms-kit",
  "v2-rtu-voice",
  "v2-rtu-short-video",
] as const satisfies readonly ServiceId[];

/** Union covered by this package — production contracts required. */
export const ACTIVE_CUSTOMER_FACING_SKUS = [
  ...DISCOVERY_GREEN_SKUS,
  ...ROUTE_MAP_V1_SHELF_SKUS,
  ...ROUTE_MAP_V2_RTU_SHELF_SKUS,
] as const satisfies readonly ServiceId[];

const ACTIVE_SET = new Set<string>(ACTIVE_CUSTOMER_FACING_SKUS);

/** Explicitly out of launch production-contract scope (not exhaustive of whole catalog). */
export const EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET = {
  retiredRouteMap: ["rm-j001", "rm-j003", "rm-j004", "rm-j006"] as const,
  retiredAddon: ["v2-addon-post-publish"] as const,
  heldDraft: ["v2-rtu-handout"] as const,
  retiredBundles: [
    "spark",
    "momentum",
    "growth",
    "email-marketing",
    "sms-campaign",
    "business-workflow",
    "customer-follow-up",
    "monthly-support",
  ] as const,
  yellowLimitedDiscovery: [
    "bf-002",
    "cp-001",
    "mo-001",
    "ma-001-monthly",
    "mo-001-monthly",
    "social_media-execution",
    "social_media-execution-monthly",
    "email_marketing-execution",
    "email_marketing-execution-monthly",
    "sms_marketing-execution",
    "sms_marketing-execution-monthly",
  ] as const,
  redPausedDiscovery: [
    "cp-001-monthly",
    "sms-001",
    "sms-001-monthly",
    "cc-001-monthly",
    "cc-002",
    "cc-002-monthly",
    "vp-001",
    "vp-001-monthly",
    "lp-001",
  ] as const,
} as const;

export function isActiveCustomerFacingSku(skuId: string): skuId is ServiceId {
  return ACTIVE_SET.has(skuId);
}

export function activeCustomerFacingSkuCount(): number {
  return ACTIVE_CUSTOMER_FACING_SKUS.length;
}
