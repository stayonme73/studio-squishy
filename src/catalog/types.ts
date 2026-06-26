/**
 * Studio Service Catalog — schema types.
 * Authoritative business definition for every service The Studio offers.
 * UI, payment, and campaign flows read from here (via accessors / future engines).
 *
 * INTERNAL TERMINOLOGY — never show customers:
 * - "Service Catalog", "Recommendation Engine", "Campaign Record"
 * - Service class labels: Signature, Core, Essential
 */

import type { DiscoveryTileId } from "@/config/business-discovery-studio";
import type { StudioNeedId } from "@/config/studio-services";

/** Current catalog schema version — increment when breaking shape changes occur. */
export const CATALOG_SCHEMA_VERSION = 2 as const;

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

export type ServiceId =
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
  | "ma-001"
  | "spark"
  | "momentum"
  | "growth"
  | "email-marketing"
  | "sms-campaign"
  | "business-workflow"
  | "customer-follow-up"
  | "monthly-support";

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
  | "focus-keyword";

export type DiscoveryMappingRule = {
  signal: DiscoverySignalKind;
  /**
   * Interpretation depends on signal:
   * - need: StudioNeedId
   * - situation / challenge: exact option text from discovery tile
   * - focus-keyword: case-insensitive substring in your-focus
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
 * Full Studio Service catalog entry (schema v2).
 * Extends the v1 shape with category, service class, requirements, and governance fields.
 */
export type StudioServiceEntry = {
  schemaVersion: CatalogSchemaVersion;
  id: ServiceId;
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

  // --- v1 fields retained for Recommendation Engine and payment integration ---

  /** Legacy customer-facing description — kept for engine and summary compat. */
  customerDescription?: string;
  internalDescription?: string;
  deliverables?: readonly ServiceDeliverable[];
  pricing?: ServicePricing;
  estimatedProductionTime?: ServiceProductionTime;
  productionEffort?: ServiceProductionEffort;
  /** v1 engine reads this field — keep in sync with discoveryTriggers. */
  discoveryMapping: readonly DiscoveryMappingRule[];
  productionNotes?: string;
  /** v1 engine active filter — map from serviceStatus via compat helpers. */
  status: ServiceCatalogStatus;
};

/**
 * @deprecated Use StudioServiceEntry — alias retained for Recommendation Engine imports.
 */
export type ServiceCatalogEntry = StudioServiceEntry;

/** Typed need reference for discovery rules — re-exported for engine consumers. */
export type { StudioNeedId };
