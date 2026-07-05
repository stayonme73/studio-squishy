/**
 * Studio Service Catalog — schema types.
 * Authoritative business definition for every service The Studio offers.
 * UI, payment, and campaign flows read from here (via accessors / future engines).
 *
 * INTERNAL TERMINOLOGY — never show customers:
 * - "Service Catalog", "Recommendation Engine", "Campaign Record"
 * - Service class labels: Signature, Core, Essential
 */

import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";
import type { DiscoveryTileId } from "@/config/business-discovery-studio";
import type { StudioNeedId } from "@/config/studio-services";

/** Current catalog schema version — increment when breaking shape changes occur. */
export const CATALOG_SCHEMA_VERSION = 3 as const;

export type CatalogSchemaVersion = typeof CATALOG_SCHEMA_VERSION;

/** Version 1 service categories — stable slug IDs. */
export type ServiceCategoryId =
  | "brand-foundation"
  | "campaign-services"
  | "social-media"
  | "email-marketing"
  | "sms-marketing"
  | "content-copywriting"
  | "design-services"
  | "video-production"
  | "audio-production"
  | "landing-pages-web-content"
  | "planning-strategy"
  | "review-optimization"
  | "marketing-optimization"
  | "marketing-assets"
  | "add-on-services";

/** v2 service family slugs — group one-time, monthly, and execution variants. */
export type ServiceFamilyId =
  | "brand_identity"
  | "brand_messaging"
  | "campaign"
  | "social_media"
  | "email_marketing"
  | "sms_marketing"
  | "marketing_copywriting"
  | "content_writing"
  | "marketing_video"
  | "ai_voice_over"
  | "landing_page_content"
  | "marketing_optimization"
  | "marketing_assets";

/**
 * Internal service class — replaces legacy Heavy/Medium/Light terminology.
 * Never surface Signature / Core / Essential in customer-facing copy.
 */
export type ServiceClass = "signature" | "core" | "essential";

/** Lifecycle status for catalog governance and rollout planning. */
export type StudioServiceStatus = "active" | "planned" | "beta" | "retired";

/**
 * Legacy availability flag used by the Recommendation Engine (v1).
 * Prefer `serviceStatus` for new catalog work; keep `status` in sync for engine compat.
 */
export type ServiceCatalogStatus = "active" | "inactive";

/** Canonical billing type for v2 catalog SKUs. */
export type BillingType = "one_time" | "monthly";

/** Production lane from locked catalog doc §2. */
export type ProductionLane =
  | "quick_turn"
  | "standard_build"
  | "complex_build"
  | "ongoing_monthly";

/** Customer-facing review or delivery window — business days unless noted. */
export type ServiceTimingWindow = {
  minDays: number;
  maxDays: number;
  /** Verbatim or condensed customer-facing label from approved catalog. */
  label: string;
};

/** Monthly recurring production window — no fixed final delivery. */
export type MonthlyCycleWindow = {
  label: string;
};

/** How execution responsibility is described for checkout / Service Guide. */
export type ExecutionMode =
  | "creation_delivery"
  | "strategy_direction"
  | "managed_execution_when_selected";

/**
 * Launch rollout availability — distinct from legacy serviceStatus for governance.
 * - `active` (green): visible, recommendable, purchasable
 * - `limited` (yellow): in catalog, hidden from clients and recommendation
 * - `paused` (red): in catalog, hidden from clients and recommendation
 * - `retired`: legacy packages kept for campaign reads only
 */
export type LaunchStatus = "active" | "limited" | "paused" | "retired";

/** Client-facing green / yellow / red rollout states for v2 launch SKUs. */
export type LaunchAvailability = "active" | "limited" | "paused";

export type FulfillmentMode = "project" | "monthly_cycle";

export type ExecutionChannel = "social" | "email" | "sms";

export type DeliveryMappingItem = {
  key: string;
  quantity: number;
  unit: string;
};

/** Catalog metadata for fulfillment — not wired to Campaign Record in slice 1. */
export type DeliveryMapping = {
  fulfillmentMode: FulfillmentMode;
  items: readonly DeliveryMappingItem[];
  executionChannel?: ExecutionChannel;
};

export type ServiceGuideFaqItem = {
  question: string;
  answer: string;
};

/** One-time base service IDs preserved from v1. */
export type OneTimeServiceId =
  | "bf-001"
  | "bf-002"
  | "cp-001"
  | "sm-001"
  | "em-001"
  | "sms-001"
  | "cc-001"
  | "cc-002"
  | "vp-001"
  | "ap-001"
  | "lp-001"
  | "mo-001"
  | "ma-001";

/** Monthly variant IDs — `<family-base-id>-monthly`. */
export type MonthlyServiceId =
  | "cp-001-monthly"
  | "sm-001-monthly"
  | "em-001-monthly"
  | "sms-001-monthly"
  | "cc-001-monthly"
  | "cc-002-monthly"
  | "vp-001-monthly"
  | "mo-001-monthly"
  | "ma-001-monthly";

/** Service families with priced execution add-on SKUs. */
export type ExecutionAddOnFamilyId = "social_media" | "email_marketing" | "sms_marketing";

/** Execution add-on IDs — `<family-id>-execution` or `<family-id>-execution-monthly`. */
export type ExecutionAddOnServiceId =
  | "social_media-execution"
  | "social_media-execution-monthly"
  | "email_marketing-execution"
  | "email_marketing-execution-monthly"
  | "sms_marketing-execution"
  | "sms_marketing-execution-monthly";

/** Route Map V1 launch job SKUs — front-door checkout only (packet pricing). */
export type RouteMapLaunchServiceId =
  | "rm-j001"
  | "rm-j002"
  | "rm-j003"
  | "rm-j004"
  | "rm-j005"
  | "rm-j006"
  | "rm-j007"
  | "rm-j008";

/** Route Map V2 activated ready-to-use shelf SKUs — front-door checkout only. */
export type RouteMapV2ShelfServiceId =
  | "v2-rtu-flyer"
  | "v2-rtu-menu"
  | "v2-rtu-service-sheet"
  | "v2-rtu-social-posts"
  | "v2-rtu-promotion-graphics"
  | "v2-rtu-email-kit"
  | "v2-rtu-sms-kit"
  | "v2-rtu-voice"
  | "v2-rtu-short-video";

/** Route Map V2 checkout add-on — not a standalone shelf item. */
export type RouteMapV2AddonServiceId = "v2-addon-post-publish";

export type RouteMapV2ServiceId = RouteMapV2ShelfServiceId | RouteMapV2AddonServiceId;

/** All purchasable Route Map shelf job IDs — V1 legacy + V2 activated RTU. */
export type RouteMapShelfJobId = RouteMapLaunchServiceId | RouteMapV2ShelfServiceId;

/** Retired package and add-on IDs kept for campaign / localStorage reads. */
export type LegacyRetiredServiceId =
  | "spark"
  | "momentum"
  | "growth"
  | "email-marketing"
  | "sms-campaign"
  | "business-workflow"
  | "customer-follow-up"
  | "monthly-support";

export type ServiceId =
  | OneTimeServiceId
  | MonthlyServiceId
  | ExecutionAddOnServiceId
  | RouteMapLaunchServiceId
  | RouteMapV2ServiceId
  | LegacyRetiredServiceId;

export type ServiceBillingModel = "one-time" | "monthly";

export type ServicePricing = {
  /** Customer-facing price label, e.g. "$299" or "$499 per month". */
  display: string;
  /** Whole currency units (USD) for calculations and payment integration. */
  amountUsd: number;
  billing: ServiceBillingModel;
};

export type ServiceDeliverable = {
  /** Stable deliverable key — aligns with studio-guide quota IDs where applicable. */
  id: string;
  label: string;
  quantity: number;
  /** Optional quota ID for campaign-record tracking. */
  quotaId?: string;
};

export type ServiceProductionTime = {
  /** Customer-facing timeline copy. */
  customerLabel: string;
  /** Internal estimate in business days from campaign start. */
  businessDays: number;
};

/**
 * Legacy production effort tier (low / medium / high).
 * Retained for backward compatibility with v1 recommendation and capacity fields.
 * New catalog work should use `serviceClass` (signature / core / essential).
 */
export type ServiceProductionEffortTier = "low" | "medium" | "high";

export type ServiceProductionEffort = {
  tier: ServiceProductionEffortTier;
  /** Internal hours estimate for capacity planning. */
  hoursEstimate: number;
};

/** Delivery format identifiers — extensible union; audio-production supports AI voice-over. */
export type DeliveryFormatId =
  | "campaign-package"
  | "social-posts"
  | "email-sequence"
  | "sms-messages"
  | "marketing-calendar"
  | "video-scripts"
  | "strategy-session"
  | "workflow-documentation"
  | "follow-up-sequence"
  | "ai-voice-over"
  | "produced-audio"
  | "landing-page"
  | "static-design"
  | "written-copy";

/** How discovery answers surface a service to the Recommendation Engine. */
export type DiscoverySignalKind =
  | "need"
  | "situation"
  | "challenge"
  | "focus-keyword"
  | "tools";

export type DiscoveryMappingRule = {
  signal: DiscoverySignalKind;
  /**
   * Interpretation depends on signal:
   * - need: StudioNeedId
   * - situation / challenge: exact option text from discovery tile
   * - focus-keyword: case-insensitive substring in your-focus
   * - tools: exact option label from your-current-tools multiselect
   */
  value: string;
  /** Optional discovery tile that must be answered for this rule to apply. */
  tileId?: Exclude<DiscoveryTileId, "submit-project">;
  /** Relative weight for ranking (default 1). */
  weight?: number;
};

/**
 * Discovery trigger — future-facing alias for discovery mapping rules.
 * The v1 Recommendation Engine still reads `discoveryMapping`; new engines may read `discoveryTriggers`.
 */
export type DiscoveryTrigger = DiscoveryMappingRule;

/**
 * How client review and sign-off are modeled for this SKU.
 * V2-ready — populated by normalize; consumers wire in Phase 3+.
 */
export type ServiceReviewType =
  | "standard_production_review"
  | "strategy_direction_review"
  | "ready_to_use_handoff"
  | "managed_execution_review"
  | "monthly_batch_review"
  | "advisory_handoff"
  | "no_review";

/**
 * What the customer receives at final delivery — distinct from deliverables list copy.
 * V2-ready — aligns with Review Room and Final Delivery routing when wired.
 */
export type ServiceDeliveryPackage =
  | "project_deliverables"
  | "monthly_batch"
  | "ready_to_use_files"
  | "execution_handoff"
  | "advisory_recommendation";

/**
 * How price is rendered in customer-facing surfaces.
 * V2-ready — Route Map per-platform labels migrate here from route-map-v1 overrides.
 */
export type ServicePricingDisplayType =
  | "standard"
  | "per_platform"
  | "per_month"
  | "bundle_package"
  | "addon_line_item"
  | "quoted_legacy";

/**
 * QA checklist item IDs — align with `campaignTasksConfig.qaChecklistLabels` keys.
 * V2-ready — production task plan reads template + items when wired.
 */
export type ServiceQaChecklistItemId =
  | "scope_match"
  | "factual_accuracy"
  | "direction_match"
  | "usability"
  | "client_safe_packaging"
  | "strategy_alignment"
  | "scope_clarity"
  | "direction_alignment"
  | "brand_fit"
  | "review_complete"
  | "recommendations_clear"
  | "copy_accuracy"
  | "brand_voice"
  | "grammar"
  | "visual_quality"
  | "brand_alignment"
  | "specs_met"
  | "production_quality"
  | "deliverable_complete"
  | "production_complete"
  | "deliverable_specs"
  | "client_requirements"
  | "package_complete"
  | "fingerprint_match"
  | "no_internal_leaks";

/** QA checklist template reference — not the checklist UI itself. */
export type ServiceQaChecklist = {
  /** Template key for production QA — maps to task-family checklists when wired. */
  templateKey: string;
  items: readonly ServiceQaChecklistItemId[];
};

/** Stable AI prompt template reference — prompt text lives outside the catalog. */
export type ServiceAiPromptRef = {
  templateKey: string;
  version?: string;
};

/**
 * Full Studio Service catalog entry (schema v3).
 * Extends v2 with V2-ready optional fields; normalize fills defaults at export.
 */
export type StudioServiceEntry = {
  schemaVersion: CatalogSchemaVersion;
  id: ServiceId;
  /** v2 family slug — groups one-time, monthly, and execution variants. */
  familyId: ServiceFamilyId;
  /** Studio Service Name — internal catalog label. */
  name: string;
  category: ServiceCategoryId;
  /** What customer problem this service solves — internal definition; surface via Discovery Summary copy. */
  customerProblemSolved?: string;
  /** What the customer receives — deliverable-oriented summary for ops and future engines. */
  customerReceives?: string;
  /** Internal service class — never customer-facing. */
  serviceClass: ServiceClass;
  /**
   * Planned production hours for capacity planning.
   * Field exists in schema; values populated during service rollout — not required at foundation stage.
   */
  plannedProductionHours?: number;
  /** Future-facing discovery signals — mirrors discoveryMapping until engine migration. */
  discoveryTriggers: readonly DiscoveryTrigger[];
  dependencies: readonly ServiceId[];
  includedRevisionRounds?: number;
  /** Whether this service can substitute for another, or which service IDs it may replace. */
  canSubstitute: boolean | readonly ServiceId[];
  addOnEligible: boolean;
  upgradeEligible: boolean;
  deliveryFormats: readonly DeliveryFormatId[];
  minimumCustomerRequirements: readonly string[];
  recommendedCustomerRequirements: readonly string[];
  internalProductionNotes?: string;
  sopReference?: string;
  serviceStatus: StudioServiceStatus;

  // --- v2 launch SKU fields (required for active purchasable services) ---

  billingType: BillingType;
  /** Canonical price in USD cents — authoritative for all pricing derivation. */
  priceCents: number;
  productionLane: ProductionLane;
  firstReviewWindow: ServiceTimingWindow;
  /** Present for one-time / project fulfillment SKUs. */
  finalDeliveryWindow?: ServiceTimingWindow;
  /** Present for monthly recurring SKUs. */
  monthlyCycleWindow?: MonthlyCycleWindow;
  purpose: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  revisionRule: string;
  clientResponsibilities: readonly string[];
  executionMode: ExecutionMode;
  requiresClientAccess: boolean;
  requiresClientMaterials: boolean;
  isRecommendable: boolean;
  isAddable: boolean;
  launchStatus: LaunchStatus;
  serviceGuideFaq: readonly ServiceGuideFaqItem[];
  deliveryMapping: DeliveryMapping;

  /** True for execution add-on SKUs that require a matching base family in the plan. */
  isExecutionAddOn?: boolean;
  /** Parent families eligible for this execution add-on — required when isExecutionAddOn is true. */
  eligibleParentFamilyIds?: readonly ServiceFamilyId[];

  // --- v1 fields retained for Recommendation Engine and payment integration ---

  /** Legacy customer-facing description — kept for engine and summary compat. */
  customerDescription?: string;
  internalDescription?: string;
  /** Legacy structured deliverables — optional; v2 uses string[] deliverables. */
  legacyDeliverables?: readonly ServiceDeliverable[];
  /** @deprecated Derive via compat helpers from priceCents — do not author in active seeds. */
  pricing?: ServicePricing;
  estimatedProductionTime?: ServiceProductionTime;
  productionEffort?: ServiceProductionEffort;
  /** v1 engine reads this field — keep in sync with discoveryTriggers. */
  discoveryMapping: readonly DiscoveryMappingRule[];
  productionNotes?: string;
  /** v1 engine active filter — map from serviceStatus via compat helpers. */
  status: ServiceCatalogStatus;

  // --- v3 V2-ready fields (optional at seed time; normalize fills defaults) ---

  /** Client review / sign-off model for Review Room when wired. */
  reviewType?: ServiceReviewType;
  /** Final delivery package shape for Final Delivery when wired. */
  deliveryPackage?: ServiceDeliveryPackage;
  /** Customer-facing price display strategy — supersedes route-map local overrides when wired. */
  pricingDisplayType?: ServicePricingDisplayType;
  /** Production QA checklist template reference — not wired to File Room yet. */
  qaChecklist?: ServiceQaChecklist;
  /** AI production prompt template reference — prompt bodies live outside catalog. */
  aiPromptRef?: ServiceAiPromptRef;

  // --- Route Map consumer fields (Phase 3A — seeded on shelf SKUs) ---

  /** Exact customer-facing price label on Route Map shelf and job detail. */
  routeMapPriceDisplay?: string;
  /** Exact customer-facing turnaround copy on Route Map job detail. */
  routeMapTurnaroundLabel?: string;
  /** Intake form template key — maps to @/catalog/intake schemas. */
  intakeTemplate?: RouteMapIntakeTemplateId;
};

/**
 * @deprecated Use StudioServiceEntry — alias retained for Recommendation Engine imports.
 */
export type ServiceCatalogEntry = StudioServiceEntry;

/** Typed need reference for discovery rules — re-exported for engine consumers. */
export type { StudioNeedId };
