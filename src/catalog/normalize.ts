/**
 * Studio Service Catalog — v3 normalization.
 * Fills V2-ready optional fields from existing v2 seed data without changing prices or IDs.
 * Architecture first: schema is complete; consumer wiring follows in Phase 3+.
 */

import type {
  RouteMapLaunchServiceId,
  ServiceAiPromptRef,
  ServiceDeliveryPackage,
  ServiceFamilyId,
  ServiceId,
  ServicePricingDisplayType,
  ServiceQaChecklist,
  ServiceQaChecklistItemId,
  ServiceReviewType,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";

/** Route Map V1 jobs with per-platform price labels — mirrors route-map-v1.ts until wired. */
const PER_PLATFORM_PRICE_JOBS = new Set<RouteMapLaunchServiceId>([
  "rm-j002",
  "rm-j003",
  "rm-j004",
  "rm-j006",
]);

const RETIRED_BUNDLE_IDS = new Set<ServiceId>(["spark", "momentum", "growth"]);

const PRODUCTION_QA_ITEMS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
] as const satisfies readonly ServiceQaChecklistItemId[];

const STRATEGY_QA_ITEMS = [
  "strategy_alignment",
  "scope_clarity",
  "direction_alignment",
  "brand_fit",
  "review_complete",
  "recommendations_clear",
] as const satisfies readonly ServiceQaChecklistItemId[];

const RTU_QA_ITEMS = [
  "visual_quality",
  "brand_alignment",
  "specs_met",
  "client_safe_packaging",
  "deliverable_complete",
] as const satisfies readonly ServiceQaChecklistItemId[];

const AI_PROMPT_BY_FAMILY: Partial<Record<ServiceFamilyId, ServiceAiPromptRef>> = {
  brand_identity: { templateKey: "brand_identity_production", version: "v1-draft" },
  brand_messaging: { templateKey: "brand_messaging_production", version: "v1-draft" },
  campaign: { templateKey: "campaign_launch_production", version: "v1-draft" },
  social_media: { templateKey: "social_content_production", version: "v1-draft" },
  email_marketing: { templateKey: "email_sequence_production", version: "v1-draft" },
  sms_marketing: { templateKey: "sms_sequence_production", version: "v1-draft" },
  marketing_copywriting: { templateKey: "marketing_copy_production", version: "v1-draft" },
  content_writing: { templateKey: "content_writing_production", version: "v1-draft" },
  marketing_video: { templateKey: "video_production", version: "v1-draft" },
  ai_voice_over: { templateKey: "ai_voice_production", version: "v1-draft" },
  landing_page_content: { templateKey: "landing_page_production", version: "v1-draft" },
  marketing_optimization: { templateKey: "optimization_strategy", version: "v1-draft" },
  marketing_assets: { templateKey: "marketing_assets_production", version: "v1-draft" },
};

function isRouteMapV2Rtu(id: ServiceId): boolean {
  return id.startsWith("v2-rtu-");
}

function deriveReviewType(service: StudioServiceEntry): ServiceReviewType {
  if (service.reviewType) return service.reviewType;
  if (service.serviceStatus === "retired" || service.launchStatus === "retired") {
    return "no_review";
  }
  if (service.id === "rm-j001") return "advisory_handoff";
  if (service.isExecutionAddOn) return "managed_execution_review";
  if (isRouteMapV2Rtu(service.id)) return "ready_to_use_handoff";
  if (service.executionMode === "strategy_direction") return "strategy_direction_review";
  if (service.deliveryMapping.fulfillmentMode === "monthly_cycle") {
    return "monthly_batch_review";
  }
  return "standard_production_review";
}

function deriveDeliveryPackage(service: StudioServiceEntry): ServiceDeliveryPackage {
  if (service.deliveryPackage) return service.deliveryPackage;
  if (service.id === "rm-j001") return "advisory_recommendation";
  if (service.isExecutionAddOn) return "execution_handoff";
  if (isRouteMapV2Rtu(service.id)) return "ready_to_use_files";
  if (service.deliveryMapping.fulfillmentMode === "monthly_cycle") return "monthly_batch";
  return "project_deliverables";
}

function derivePricingDisplayType(service: StudioServiceEntry): ServicePricingDisplayType {
  if (service.pricingDisplayType) return service.pricingDisplayType;
  if (service.routeMapPriceDisplay?.includes("/ platform")) return "per_platform";
  if (service.isExecutionAddOn) return "addon_line_item";
  if (RETIRED_BUNDLE_IDS.has(service.id)) return "bundle_package";
  if (service.pricing?.display?.toLowerCase().includes("quoted at checkout")) {
    return "quoted_legacy";
  }
  if (PER_PLATFORM_PRICE_JOBS.has(service.id as RouteMapLaunchServiceId)) {
    return "per_platform";
  }
  if (service.billingType === "monthly") return "per_month";
  return "standard";
}

function deriveQaChecklist(service: StudioServiceEntry): ServiceQaChecklist {
  if (service.qaChecklist) return service.qaChecklist;

  if (isRouteMapV2Rtu(service.id)) {
    return { templateKey: "ready_to_use_production", items: RTU_QA_ITEMS };
  }
  if (service.executionMode === "strategy_direction") {
    return { templateKey: "strategy_direction", items: STRATEGY_QA_ITEMS };
  }
  if (service.isExecutionAddOn) {
    return {
      templateKey: "managed_execution",
      items: ["scope_match", "client_requirements", "fingerprint_match", "no_internal_leaks"],
    };
  }
  return { templateKey: "standard_production", items: PRODUCTION_QA_ITEMS };
}

function deriveAiPromptRef(service: StudioServiceEntry): ServiceAiPromptRef | undefined {
  if (service.aiPromptRef) return service.aiPromptRef;
  if (service.serviceStatus === "retired" || service.launchStatus === "retired") {
    return undefined;
  }
  return AI_PROMPT_BY_FAMILY[service.familyId];
}

/** Apply schema v3 version stamp and V2-ready field defaults without mutating seed prices or IDs. */
export function normalizeStudioServiceEntry(service: StudioServiceEntry): StudioServiceEntry {
  return {
    ...service,
    schemaVersion: CATALOG_SCHEMA_VERSION,
    reviewType: deriveReviewType(service),
    deliveryPackage: deriveDeliveryPackage(service),
    pricingDisplayType: derivePricingDisplayType(service),
    qaChecklist: deriveQaChecklist(service),
    aiPromptRef: deriveAiPromptRef(service),
  };
}

/** Normalize a full catalog array — used at SERVICE_CATALOG export. */
export function normalizeServiceCatalog(
  services: readonly StudioServiceEntry[],
): readonly StudioServiceEntry[] {
  return services.map(normalizeStudioServiceEntry);
}
