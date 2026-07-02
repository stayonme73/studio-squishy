/**
 * Catalog V2 draft — migration helpers from live catalog (read-only).
 * Transforms existing StudioServiceEntry + Route Map metadata into V2 draft shape.
 * Does not modify live catalog or Route Map behavior.
 */

import { SERVICE_CATALOG } from "@/catalog/services";
import type {
  ExecutionMode,
  LaunchStatus,
  RouteMapLaunchServiceId,
  ServiceId,
  StudioServiceEntry,
} from "@/catalog/types";
import { PROJECT_DETAILS_GREEN_SKU_IDS } from "@/config/project-details";
import {
  getRouteMapJob,
  isRouteMapJobId,
} from "@/config/route-map-v1";
import type {
  CatalogV2Availability,
  CatalogV2DeliverableSlot,
  CatalogV2DeliveryType,
  CatalogV2Placement,
  CatalogV2ServiceEntry,
} from "@/catalog/v2/types";
import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";

const PROJECT_DETAILS_GREEN = new Set<string>(PROJECT_DETAILS_GREEN_SKU_IDS);

/**
 * Approved Catalog V2 turnaround strings for Route Map jobs.
 * Canonical source — do not derive from ROUTE_MAP_JOB_TIMING in route-map-v1.ts.
 */
const ROUTE_MAP_V2_TURNAROUND: Readonly<Record<RouteMapLaunchServiceId, string>> = {
  "rm-j001": "Usually within 1–2 business days after intake is complete.",
  "rm-j007": "Usually within 1–2 business days after intake is complete.",
  "rm-j002": "Usually within 2–3 business days after intake is complete.",
  "rm-j008": "Usually within 2–3 business days after intake is complete.",
  "rm-j003": "Usually within 2–3 business days after intake is complete.",
  "rm-j006": "Usually within 2–3 business days after intake is complete.",
  "rm-j004": "Usually within 3–5 business days after intake is complete.",
  "rm-j005": "Usually within 3–5 business days after intake is complete.",
};

function availabilityFromLaunchStatus(
  launchStatus: LaunchStatus,
  isRouteMapJob: boolean,
): CatalogV2Availability {
  // Route Map jobs are active in V2 even when live launchStatus is limited (yellow).
  if (isRouteMapJob) return "active";

  switch (launchStatus) {
    case "active":
      return "active";
    case "limited":
      return "held";
    case "paused":
      return "paused";
    case "retired":
      return "retired";
  }
}

function deliveryTypeFromExecutionMode(mode: ExecutionMode): CatalogV2DeliveryType {
  if (mode === "managed_execution_when_selected") return "post_publish";
  return "ready_to_use";
}

function turnaroundFromService(service: StudioServiceEntry): string {
  if (service.finalDeliveryWindow?.label) return service.finalDeliveryWindow.label;
  if (service.monthlyCycleWindow?.label) return service.monthlyCycleWindow.label;
  return service.firstReviewWindow.label;
}

function turnaroundForService(
  service: StudioServiceEntry,
  isRouteMapJob: boolean,
): string {
  if (isRouteMapJob && isRouteMapJobId(service.id)) {
    return ROUTE_MAP_V2_TURNAROUND[service.id as RouteMapLaunchServiceId];
  }
  return turnaroundFromService(service);
}

function includedDeliverablesFromService(service: StudioServiceEntry): readonly CatalogV2DeliverableSlot[] {
  const mappingItems = service.deliveryMapping?.items;
  if (mappingItems && mappingItems.length > 0) {
    return mappingItems.map((item) => ({
      key: item.key,
      quantity: item.quantity,
      unit: item.unit,
    }));
  }

  return service.deliverables.map((label, index) => ({
    key: `${service.id}-scope-${index}`,
    quantity: 1,
    unit: "item",
    label,
  }));
}

function derivePlacement(
  routeMapEligible: boolean,
  directExitEligible: boolean,
): CatalogV2Placement {
  if (routeMapEligible && directExitEligible) return "both";
  if (routeMapEligible) return "route_map";
  if (directExitEligible) return "direct_exit";
  return "none";
}

function intakeTemplateForService(
  serviceId: ServiceId,
  availability: CatalogV2Availability,
  isRouteMapJob: boolean,
): CatalogV2ServiceEntry["intakeTemplate"] {
  // Held, paused, retired non–Route Map SKUs — no intake until activated.
  if (availability !== "active") return "";

  if (isRouteMapJob) {
    const job = getRouteMapJob(serviceId as RouteMapLaunchServiceId);
    return job?.intakeType ?? "";
  }

  if (PROJECT_DETAILS_GREEN.has(serviceId)) return "project-details";

  return "";
}

/** Build one Catalog V2 draft entry from a live catalog service record. */
export function buildCatalogV2EntryFromLive(service: StudioServiceEntry): CatalogV2ServiceEntry {
  const isRouteMapJob = isRouteMapJobId(service.id);
  const routeMapJob = isRouteMapJob
    ? getRouteMapJob(service.id as RouteMapLaunchServiceId)
    : undefined;

  const routeMapEligible = isRouteMapJob;
  const directExitEligible = routeMapJob?.roads.includes("random-exit") ?? false;
  const availability = availabilityFromLaunchStatus(service.launchStatus, isRouteMapJob);

  return {
    schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
    sku: service.id,
    clientFacingName: service.name,
    category: service.category,
    familyId: service.familyId,
    laneEligibility: routeMapJob?.roads ?? [],
    routeMapEligible,
    directExitEligible,
    placement: derivePlacement(routeMapEligible, directExitEligible),
    deliveryType: deliveryTypeFromExecutionMode(service.executionMode),
    includedDeliverables: includedDeliverablesFromService(service),
    exclusions: [...service.exclusions],
    revisionLimit: service.includedRevisionRounds ?? null,
    turnaround: turnaroundForService(service, isRouteMapJob),
    priceCents: service.priceCents,
    billingType: service.billingType,
    intakeTemplate: intakeTemplateForService(service.id, availability, isRouteMapJob),
    availability,
    sourceLaunchStatus: service.launchStatus,
    productionLane: service.productionLane,
    sourceExecutionMode: service.executionMode,
    isRouteMapJob,
  };
}

/** Build full draft catalog from live SERVICE_CATALOG — no invented entries. */
export function buildCatalogV2DraftFromLive(): readonly CatalogV2ServiceEntry[] {
  return SERVICE_CATALOG.map(buildCatalogV2EntryFromLive);
}

/** Draft lookup by SKU. */
export function getCatalogV2DraftEntryBySku(
  sku: string,
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): CatalogV2ServiceEntry | undefined {
  return catalog.find((entry) => entry.sku === sku);
}

/** Active draft entries only — green Discovery SKUs and Route Map jobs. */
export function getActiveCatalogV2DraftEntries(
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): readonly CatalogV2ServiceEntry[] {
  return catalog.filter((entry) => entry.availability === "active");
}

/** Held draft entries — live `limited` (yellow) SKUs, excluding Route Map override. */
export function getHeldCatalogV2DraftEntries(
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): readonly CatalogV2ServiceEntry[] {
  return catalog.filter((entry) => entry.availability === "held");
}

/** Paused draft entries — live `paused` (red) SKUs. */
export function getPausedCatalogV2DraftEntries(
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): readonly CatalogV2ServiceEntry[] {
  return catalog.filter((entry) => entry.availability === "paused");
}

/** Retired draft entries — legacy packages. */
export function getRetiredCatalogV2DraftEntries(
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): readonly CatalogV2ServiceEntry[] {
  return catalog.filter((entry) => entry.availability === "retired");
}

/** Route Map V1 job mirror entries — reference only, not wired to Route Map. */
export function getRouteMapV2DraftEntries(
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): readonly CatalogV2ServiceEntry[] {
  return catalog.filter((entry) => entry.isRouteMapJob);
}

/**
 * Build-time warnings — active SKUs missing an intake template should not occur
 * for the current catalog but are flagged for review before activation.
 */
export function collectCatalogV2DraftWarnings(
  catalog: readonly CatalogV2ServiceEntry[] = buildCatalogV2DraftFromLive(),
): readonly string[] {
  const warnings: string[] = [];
  for (const entry of catalog) {
    if (entry.availability === "active" && entry.intakeTemplate === "") {
      warnings.push(`Active SKU "${entry.sku}" has no intakeTemplate defined.`);
    }
  }
  return warnings;
}
