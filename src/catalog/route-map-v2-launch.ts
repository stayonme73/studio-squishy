/**
 * Route Map V2 activated SKUs — live catalog seeds bridged from approved V2 draft records.
 * Shelf placement driven by activation-map-draft.ts; prices/scope/turnaround from V2 batches.
 */

import type {
  BillingType,
  DeliveryMapping,
  ExecutionMode,
  ProductionLane,
  RouteMapV2AddonServiceId,
  RouteMapV2ShelfServiceId,
  ServiceCategoryId,
  ServiceClass,
  ServiceFamilyId,
  ServiceId,
  ServiceTimingWindow,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";
import {
  CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS,
  CATALOG_V2_ACTIVATION_POST_PUBLISH_PARENT_SKUS,
} from "@/catalog/v2/activation-map-draft";
import { CATALOG_V2_BATCH1_READY_TO_USE } from "@/catalog/v2/batch1-ready-to-use";
import { CATALOG_V2_BATCH2_READY_TO_USE } from "@/catalog/v2/batch2-ready-to-use";
import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";

const REVISION_ONE_TIME = "One consolidated revision round.";

const QUICK_FIRST: ServiceTimingWindow = {
  minDays: 3,
  maxDays: 5,
  label: "3–5 business days after intake",
};

const QUICK_FINAL: ServiceTimingWindow = {
  minDays: 5,
  maxDays: 8,
  label: "5–8 business days after intake is complete",
};

const STANDARD_FIRST: ServiceTimingWindow = {
  minDays: 6,
  maxDays: 8,
  label: "6–8 business days after intake",
};

const STANDARD_FINAL: ServiceTimingWindow = {
  minDays: 12,
  maxDays: 17,
  label: "12–17 business days after intake is complete",
};

const COMPLEX_FIRST: ServiceTimingWindow = {
  minDays: 8,
  maxDays: 11,
  label: "8–11 business days after intake",
};

const COMPLEX_FINAL: ServiceTimingWindow = {
  minDays: 18,
  maxDays: 24,
  label: "18–24 business days after intake is complete",
};

function timingWindowsForLane(lane: ProductionLane): {
  firstReviewWindow: ServiceTimingWindow;
  finalDeliveryWindow: ServiceTimingWindow;
} {
  if (lane === "complex_build") {
    return { firstReviewWindow: COMPLEX_FIRST, finalDeliveryWindow: COMPLEX_FINAL };
  }
  if (lane === "standard_build") {
    return { firstReviewWindow: STANDARD_FIRST, finalDeliveryWindow: STANDARD_FINAL };
  }
  return { firstReviewWindow: QUICK_FIRST, finalDeliveryWindow: QUICK_FINAL };
}

const V2_DRAFT_BY_SKU = new Map<string, CatalogV2ServiceEntry>(
  [...CATALOG_V2_BATCH1_READY_TO_USE, ...CATALOG_V2_BATCH2_READY_TO_USE].map((entry) => [
    entry.sku,
    entry,
  ]),
);

/** Customer-facing purpose lines for Route Map shelf cards — never scopeRoutingNote or internal routing. */
const ROUTE_MAP_V2_CUSTOMER_PURPOSE: Record<string, string> = {
  "v2-rtu-flyer": "One finished single-sided flyer you can print or share online.",
  "v2-rtu-menu": "One single-page menu with your items and prices, ready to print.",
  "v2-rtu-service-sheet": "One page listing your services for customers to read.",
  "v2-rtu-social-posts": "Four social post graphics with captions for one platform.",
  "v2-rtu-promotion-graphics": "Two branded graphics for one campaign or promotion.",
  "v2-rtu-email-kit": "Up to two finished emails ready for you to send.",
  "v2-rtu-sms-kit": "Up to four text messages ready for you to send.",
  "v2-rtu-voice": "One short voice announcement we write and produce for you.",
  "v2-rtu-short-video": "One short video edit with captions, ready for you to post.",
  "v2-addon-post-publish":
    "We schedule or publish one finished piece on one connected platform for you.",
};

function customerPurposeForV2Sku(sku: string, draft: CatalogV2ServiceEntry): string {
  return ROUTE_MAP_V2_CUSTOMER_PURPOSE[sku] ?? draft.clientFacingName;
}

const SERVICE_CLASS_BY_CATEGORY: Partial<Record<ServiceCategoryId, ServiceClass>> = {
  "marketing-assets": "core",
  "social-media": "core",
  "video-production": "signature",
  "audio-production": "core",
  "email-marketing": "core",
  "sms-marketing": "core",
  "add-on-services": "core",
};

function deliverablesFromDraft(entry: CatalogV2ServiceEntry): string[] {
  return entry.includedDeliverables.map((slot) => {
    const qty = slot.quantity > 1 ? `${slot.quantity}× ` : "";
    return `${qty}${slot.label}`;
  });
}

function deliveryMappingFromDraft(entry: CatalogV2ServiceEntry): DeliveryMapping {
  const items = entry.includedDeliverables.map((slot) => ({
    key: slot.key,
    quantity: slot.quantity,
    unit: slot.unit,
  }));
  const executionChannel =
    entry.familyId === "social_media"
      ? ("social" as const)
      : entry.familyId === "email_marketing"
        ? ("email" as const)
        : entry.familyId === "sms_marketing"
          ? ("sms" as const)
          : undefined;
  return {
    fulfillmentMode: "project",
    ...(executionChannel ? { executionChannel } : {}),
    items,
  };
}

function routeMapV2ServiceFromDraft(
  draft: CatalogV2ServiceEntry,
  options: { isAddOn?: boolean } = {},
): StudioServiceEntry {
  const priceCents = draft.priceCents ?? 0;
  const timing = timingWindowsForLane(draft.productionLane);
  const deliverables = deliverablesFromDraft(draft);
  const executionMode: ExecutionMode =
    draft.sourceExecutionMode === "managed_execution_when_selected"
      ? "managed_execution_when_selected"
      : "creation_delivery";

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: draft.sku as ServiceId,
    familyId: draft.familyId as ServiceFamilyId,
    name: draft.clientFacingName,
    category: draft.category,
    serviceClass: SERVICE_CLASS_BY_CATEGORY[draft.category] ?? "core",
    customerReceives: deliverables.join("; "),
    internalProductionNotes: options.isAddOn
      ? "Route Map V2 post/publish add-on — checkout with eligible parent RTU job only."
      : "Route Map V2 activated RTU SKU — front-door checkout only.",
    dependencies: [],
    includedRevisionRounds: draft.revisionLimit ?? 1,
    canSubstitute: false,
    addOnEligible: Boolean(options.isAddOn),
    upgradeEligible: false,
    deliveryFormats: [],
    minimumCustomerRequirements: draft.clientResponsibilityAfterDelivery
      ? [draft.clientResponsibilityAfterDelivery]
      : [],
    recommendedCustomerRequirements: [],
    serviceStatus: "active",
    status: "active",
    billingType: draft.billingType satisfies BillingType,
    priceCents,
    productionLane: draft.productionLane,
    firstReviewWindow: timing.firstReviewWindow,
    finalDeliveryWindow: timing.finalDeliveryWindow,
    purpose: customerPurposeForV2Sku(draft.sku, draft),
    deliverables,
    exclusions: [...draft.exclusions],
    revisionRule: REVISION_ONE_TIME,
    clientResponsibilities: draft.clientResponsibilityAfterDelivery
      ? [draft.clientResponsibilityAfterDelivery]
      : [],
    executionMode,
    requiresClientAccess: executionMode === "managed_execution_when_selected",
    requiresClientMaterials: true,
    isRecommendable: false,
    isAddable: Boolean(options.isAddOn),
    launchStatus: "limited",
    serviceGuideFaq: [],
    deliveryMapping: deliveryMappingFromDraft(draft),
    discoveryTriggers: [],
    discoveryMapping: [],
  };
}

/** Live catalog entries for activated V2 RTU shelf SKUs. */
export const ROUTE_MAP_V2_LAUNCH_SERVICES: readonly StudioServiceEntry[] =
  CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS.map((sku) => {
    const draft = V2_DRAFT_BY_SKU.get(sku);
    if (!draft) {
      throw new Error(`Missing V2 draft record for activated shelf SKU: ${sku}`);
    }
    return routeMapV2ServiceFromDraft(draft);
  });

/** Post/publish add-on — not on Route Map shelf; offered at checkout with eligible parents. */
export const ROUTE_MAP_V2_POST_PUBLISH_ADDON: StudioServiceEntry = (() => {
  const draft = V2_DRAFT_BY_SKU.get("v2-addon-post-publish");
  if (!draft) {
    throw new Error("Missing V2 draft record for v2-addon-post-publish");
  }
  return routeMapV2ServiceFromDraft(draft, { isAddOn: true });
})();

export const ROUTE_MAP_V2_ALL_SERVICES: readonly StudioServiceEntry[] = [
  ...ROUTE_MAP_V2_LAUNCH_SERVICES,
  ROUTE_MAP_V2_POST_PUBLISH_ADDON,
];

export function isRouteMapV2ShelfServiceId(value: string): value is RouteMapV2ShelfServiceId {
  return CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS.includes(
    value as RouteMapV2ShelfServiceId,
  );
}

export function isRouteMapV2AddonServiceId(value: string): value is RouteMapV2AddonServiceId {
  return value === "v2-addon-post-publish";
}

/** Parent RTU jobs that may offer v2-addon-post-publish at Route Map checkout. */
export function isPostPublishAddonEligibleParent(jobId: string): boolean {
  return CATALOG_V2_ACTIVATION_POST_PUBLISH_PARENT_SKUS.includes(
    jobId as (typeof CATALOG_V2_ACTIVATION_POST_PUBLISH_PARENT_SKUS)[number],
  );
}

export function getRouteMapV2TurnaroundLabel(sku: RouteMapV2ShelfServiceId): string | undefined {
  return V2_DRAFT_BY_SKU.get(sku)?.turnaround;
}
