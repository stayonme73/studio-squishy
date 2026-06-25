/**
 * Studio Service Catalog — schema types.
 * Authoritative business definition for every service The Studio offers.
 * UI, payment, and campaign flows read from here (via accessors / future engines).
 */

import type { DiscoveryTileId } from "@/config/business-discovery-studio";
import type { StudioNeedId } from "@/config/studio-services";

export type ServiceCatalogStatus = "active" | "inactive";

export type ServiceId =
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

export type ServiceProductionEffortTier = "low" | "medium" | "high";

export type ServiceProductionEffort = {
  tier: ServiceProductionEffortTier;
  /** Internal hours estimate for capacity planning. */
  hoursEstimate: number;
};

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

export type ServiceCatalogEntry = {
  id: ServiceId;
  name: string;
  customerDescription: string;
  internalDescription?: string;
  deliverables: readonly ServiceDeliverable[];
  pricing: ServicePricing;
  estimatedProductionTime: ServiceProductionTime;
  productionEffort: ServiceProductionEffort;
  /** Other catalog service IDs required or strongly recommended before purchase. */
  dependencies: readonly ServiceId[];
  discoveryMapping: readonly DiscoveryMappingRule[];
  productionNotes?: string;
  status: ServiceCatalogStatus;
};

/** Typed need reference for discovery rules — re-exported for engine consumers. */
export type { StudioNeedId };
