/**
 * Catalog V2 draft schema — foundation for approved deliverables rollout.
 * Separate from live `StudioServiceEntry` (schema v2 in `@/catalog/types`).
 * Not wired to Route Map, Discovery, Recommendation Engine, or checkout.
 *
 * Status: DRAFT — pending Tagia catalog review before commit / activation.
 */

import type { RouteMapIntakeType, RouteMapRoadId } from "@/config/route-map-v1";
import type {
  BillingType,
  LaunchStatus,
  ProductionLane,
  ServiceCategoryId,
  ServiceFamilyId,
  ServiceId,
} from "@/catalog/types";

/** Draft catalog schema version — independent from CATALOG_SCHEMA_VERSION. */
export const CATALOG_V2_DRAFT_SCHEMA_VERSION = 1 as const;

export type CatalogV2DraftSchemaVersion = typeof CATALOG_V2_DRAFT_SCHEMA_VERSION;

/**
 * Customer-facing rollout gate — four distinct buckets (not one broad held bucket).
 * Mapped from live `launchStatus` with Route Map job override in build logic.
 */
export type CatalogV2Availability = "active" | "held" | "paused" | "retired";

/**
 * How finished work reaches the client.
 * - `ready_to_use` — finished files / client-ready kit
 * - `post_publish` — Studio creates and also posts/publishes where included
 *
 * Derived from live `executionMode`. Future dual-choice services should be
 * separate SKUs or priced add-ons — not a checkout toggle.
 */
export type CatalogV2DeliveryType = "ready_to_use" | "post_publish";

/**
 * Plain-English placement summary — derived from eligibility booleans, not a
 * separate availability status. Route Map shelf vs direct-exit shortcut only.
 */
export type CatalogV2Placement = "route_map" | "direct_exit" | "both" | "none";

/** Structured deliverable slot — key/qty from live deliveryMapping when present. */
export type CatalogV2DeliverableSlot = {
  key: string;
  quantity: number;
  unit: string;
  /** Verbatim scope line from live catalog when no structured mapping exists. */
  label?: string;
};

/**
 * Full Catalog V2 draft service record.
 * Fields align to production packet requirements for future catalog migration.
 */
export type CatalogV2ServiceEntry = {
  schemaVersion: CatalogV2DraftSchemaVersion;

  /** Internal ID / SKU — same as live catalog ServiceId. */
  sku: ServiceId;

  /** Client-facing service or job name. */
  clientFacingName: string;

  category: ServiceCategoryId;
  familyId: ServiceFamilyId;

  /**
   * Route Map lane IDs this SKU appears on (rm-j* jobs only).
   * Empty for Discovery-path catalog SKUs not on the Route Map shelf.
   */
  laneEligibility: readonly RouteMapRoadId[];

  /** True when the SKU appears on Route Map shelf/roads (rm-j* jobs only). */
  routeMapEligible: boolean;

  /**
   * True when the job is reachable via the Random Exit shortcut shelf.
   * Route Map rm-j* only; false for all other SKUs.
   */
  directExitEligible: boolean;

  /**
   * Derived placement summary for review — not a separate availability status.
   * Computed from `routeMapEligible` and `directExitEligible`.
   */
  placement: CatalogV2Placement;

  deliveryType: CatalogV2DeliveryType;

  /** Included deliverables — structured keys and/or verbatim scope lines from live catalog. */
  includedDeliverables: readonly CatalogV2DeliverableSlot[];

  exclusions: readonly string[];

  /** Consolidated revision rounds when live catalog specifies a number. */
  revisionLimit: number | null;

  /**
   * Customer-facing turnaround label — canonical in Catalog V2.
   * Route Map jobs: explicit approved buffer ranges (e.g. "Usually within 1–2 business days
   * after intake is complete.") — not derived from route-map-v1.ts timing table.
   * Other SKUs: derived from live catalog timing windows until separately approved.
   *
   * TODO: Route Map UI currently reads ROUTE_MAP_JOB_TIMING in route-map-v1.ts —
   * migrate Route Map cards to read `turnaround` from catalog.
   */
  turnaround: string;

  /** Canonical price in USD cents — copied from live catalog. */
  priceCents: number;
  billingType: BillingType;

  /**
   * Intake form template key.
   * Active Route Map jobs: RouteMapIntakeType.
   * Active green Discovery SKUs: "project-details".
   * Held, paused, retired: "" (empty — no intake until activated).
   */
  intakeTemplate: RouteMapIntakeType | "project-details" | "";

  availability: CatalogV2Availability;

  /** Live launchStatus preserved for migration traceability. */
  sourceLaunchStatus: LaunchStatus;
  productionLane: ProductionLane;

  /** Live execution mode — preserved for deliveryType derivation audit. */
  sourceExecutionMode: import("@/catalog/types").ExecutionMode;

  /** True for Route Map V1 launch jobs (rm-j001–rm-j008). */
  isRouteMapJob: boolean;
};

export type CatalogV2DraftMeta = {
  schemaVersion: CatalogV2DraftSchemaVersion;
  /** ISO date string — draft generation reference. */
  generatedAt: string;
  /** Live catalog entries mirrored — excludes duplicate legacy-only reads. */
  entryCount: number;
  note: string;
};
