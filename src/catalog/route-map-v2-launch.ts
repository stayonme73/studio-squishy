/**
 * Route Map V2 activated SKUs — live catalog seeds bridged from approved V2 draft records.
 * Shelf placement driven by `@/catalog/activation`; prices/scope/turnaround from V2 batches.
 */

import type {
  BillingType,
  DeliveryMapping,
  ExecutionMode,
  ProductionLane,
  RouteMapV2ShelfServiceId,
  ServiceCategoryId,
  ServiceClass,
  ServiceFamilyId,
  ServiceId,
  ServiceTimingWindow,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";
import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";
import { CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS } from "@/catalog/activation";
import { CATALOG_V2_BATCH1_READY_TO_USE } from "@/catalog/v2/batch1-ready-to-use";
import { CATALOG_V2_BATCH2_READY_TO_USE } from "@/catalog/v2/batch2-ready-to-use";
import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { ROUTE_MAP_REVISION_TEMPLATE } from "@/catalog/route-map-shared-copy";

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

/** Intake template keys for activated V2 RTU shelf SKUs — catalog-owned (Phase 3A). */
const V2_INTAKE_TEMPLATE_BY_SKU: Record<RouteMapV2ShelfServiceId, RouteMapIntakeTemplateId> = {
  "v2-rtu-flyer": "rtu-flyer",
  "v2-rtu-menu": "rtu-menu",
  "v2-rtu-service-sheet": "rtu-service-sheet",
  "v2-rtu-promotion-graphics": "rtu-promotion-graphics",
  "v2-rtu-social-posts": "rtu-social-posts",
  "v2-rtu-short-video": "rtu-short-video",
  "v2-rtu-voice": "rtu-voice",
  "v2-rtu-email-kit": "rtu-email-kit",
  "v2-rtu-sms-kit": "rtu-sms-kit",
  "v2-rtu-business-card": "rtu-business-card",
};

/** Customer-facing purpose lines for Route Map shelf cards — never scopeRoutingNote or internal routing. */
const ROUTE_MAP_V2_CUSTOMER_PURPOSE: Record<string, string> = {
  "v2-rtu-flyer": "One single-sided flyer in one size — ready to print or share online.",
  "v2-rtu-menu": "One single-page menu with a defined item limit — ready to print or share.",
  "v2-rtu-service-sheet": "One page with up to ten services and brief descriptions.",
  "v2-rtu-social-posts": "Four coordinated static posts for one platform — ready for you to upload.",
  "v2-rtu-promotion-graphics": "Two coordinated static graphics for one campaign or promotion.",
  "v2-rtu-email-kit": "Up to two finished emails ready for you to send.",
  "v2-rtu-sms-kit": "Up to four text messages ready for you to send.",
  "v2-rtu-voice":
    "One short announcement — internal AI or approved Studio software voice only; no outside talent.",
  "v2-rtu-short-video":
    "One basic 15–30 second video edited from your footage or approved Studio assets — no filming.",
  "v2-rtu-business-card":
    "One double-sided business card design — design only, not printing or shipping.",
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
  options: { retired?: boolean } = {},
): StudioServiceEntry {
  const priceCents = draft.priceCents ?? 0;
  const timing = timingWindowsForLane(draft.productionLane);
  const deliverables = deliverablesFromDraft(draft);
  const executionMode: ExecutionMode =
    draft.sourceExecutionMode === "managed_execution_when_selected"
      ? "managed_execution_when_selected"
      : "creation_delivery";
  const isRetired = options.retired === true;

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: draft.sku as ServiceId,
    familyId: draft.familyId as ServiceFamilyId,
    name: draft.clientFacingName,
    category: draft.category,
    serviceClass: SERVICE_CLASS_BY_CATEGORY[draft.category] ?? "core",
    customerReceives: deliverables.join("; "),
    internalProductionNotes: isRetired
      ? "Retired Route Map SKU — historical campaign reads only."
      : "Route Map V2 activated RTU SKU — front-door checkout only.",
    dependencies: [],
    includedRevisionRounds: draft.revisionLimit ?? 1,
    canSubstitute: false,
    addOnEligible: false,
    upgradeEligible: false,
    deliveryFormats: [],
    minimumCustomerRequirements: draft.clientResponsibilities
      ? [...draft.clientResponsibilities]
      : [],
    recommendedCustomerRequirements: [],
    serviceStatus: isRetired ? "retired" : "active",
    status: isRetired ? "inactive" : "active",
    billingType: draft.billingType satisfies BillingType,
    priceCents,
    productionLane: draft.productionLane,
    firstReviewWindow: timing.firstReviewWindow,
    finalDeliveryWindow: timing.finalDeliveryWindow,
    purpose: customerPurposeForV2Sku(draft.sku, draft),
    deliverables,
    exclusions: [...draft.exclusions],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: draft.clientResponsibilities ? [...draft.clientResponsibilities] : [],
    executionMode,
    requiresClientAccess: executionMode === "managed_execution_when_selected",
    requiresClientMaterials: true,
    isRecommendable: false,
    isAddable: false,
    launchStatus: isRetired ? "retired" : "limited",
    serviceGuideFaq: [],
    deliveryMapping: deliveryMappingFromDraft(draft),
    discoveryTriggers: [],
    discoveryMapping: [],
    routeMapTurnaroundLabel: draft.turnaround,
    ...(!isRetired && V2_INTAKE_TEMPLATE_BY_SKU[draft.sku as RouteMapV2ShelfServiceId]
      ? {
          intakeTemplate: V2_INTAKE_TEMPLATE_BY_SKU[draft.sku as RouteMapV2ShelfServiceId],
        }
      : {}),
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

/** Retired post/publish add-on — catalog read-only for historical campaigns. */
export const ROUTE_MAP_V2_RETIRED_POST_PUBLISH_ADDON: StudioServiceEntry = (() => {
  const draft = V2_DRAFT_BY_SKU.get("v2-addon-post-publish");
  if (!draft) {
    throw new Error("Missing V2 draft record for v2-addon-post-publish");
  }
  return routeMapV2ServiceFromDraft(draft, { retired: true });
})();

export const ROUTE_MAP_V2_ALL_SERVICES: readonly StudioServiceEntry[] = [
  ...ROUTE_MAP_V2_LAUNCH_SERVICES,
  ROUTE_MAP_V2_RETIRED_POST_PUBLISH_ADDON,
];

export function isRouteMapV2ShelfServiceId(value: string): value is RouteMapV2ShelfServiceId {
  return CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS.includes(
    value as RouteMapV2ShelfServiceId,
  );
}

export function getRouteMapV2TurnaroundLabel(sku: RouteMapV2ShelfServiceId): string | undefined {
  const draft = V2_DRAFT_BY_SKU.get(sku);
  return draft?.turnaround;
}
