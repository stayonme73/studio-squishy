/**
 * Studio Route Map V1 — launch job shelf, roads, and intake routing.
 * Shelf jobs driven by Catalog V2 activation map + live catalog (V1 rm-j* + V2 RTU SKUs).
 * Road placement from `@/catalog/activation`; prices/scope/turnaround from Service Catalog.
 * @see docs/customer-journey-v1-locked.md — Route Map replaces lobby → Discovery front door.
 */

import { getServiceById } from "@/catalog/accessors";
import {
  getRouteMapIntakeTemplate,
  getRouteMapPriceDisplay,
  getRouteMapTurnaroundLabel,
} from "@/catalog/route-map-display";
import { isRouteMapV2ShelfServiceId } from "@/catalog/route-map-v2-launch";
import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";
import type { RouteMapLaunchServiceId, RouteMapShelfJobId, RouteMapV2ShelfServiceId, ServiceId } from "@/catalog/types";
import {
  CATALOG_V2_ACTIVATION_RETIRED_ROUTE_MAP_SKUS,
  getActivationMapEntryBySku,
  getActivationMapShelfEntriesForLane,
} from "@/catalog/activation";
import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { ROUTE_MAP_GUIDANCE } from "@/config/route-map-guidance-v1";

/** Route Map shelf job IDs — V1 continuing jobs + activated V2 RTU SKUs. */
export type RouteMapJobId = RouteMapShelfJobId;

/** Legacy alias — all rm-j001–rm-j008 remain valid for campaign history. */
export type RouteMapLaunchJobId = RouteMapLaunchServiceId;

export type RouteMapRoadId = "i75" | "i20" | "i285" | "update" | "random-exit";

/** Job-specific intake types — catalog-owned; alias for RouteMapIntakeTemplateId. */
export type RouteMapIntakeType = RouteMapIntakeTemplateId;

export type RouteMapRoad = {
  id: RouteMapRoadId;
  highwayLabel: string;
  directionLabel: string;
  customerLabel: string;
  tagline: string;
  geometry: "forward" | "direct" | "loop" | "interchange" | "shortcut";
  accentClass: string;
  /** When false, road is visual/perimeter only (e.g. I-285 loop) — not a customer lane choice. */
  selectable: boolean;
};

export type RouteMapJob = {
  id: RouteMapJobId;
  name: string;
  priceCents: number;
  /** Customer-facing price label from packet — may include /platform. */
  priceDisplay: string;
  billingType: "one_time";
  roads: readonly RouteMapRoadId[];
  /** When true, this is the Route Start advisory job (still requires checkout). */
  isRouteStart: boolean;
  intakeType: RouteMapIntakeType;
  purpose: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  revisionRule: string;
  timingLabel: string;
  clientResponsibilities: readonly string[];
};

type RouteMapJobMeta = {
  roads: readonly RouteMapRoadId[];
  isRouteStart: boolean;
};

const ROUTE_MAP_JOB_META: Record<RouteMapLaunchServiceId, RouteMapJobMeta> = {
  "rm-j001": {
    roads: ["i75", "i20", "update", "random-exit"],
    isRouteStart: true,
  },
  "rm-j002": {
    roads: ["i75", "random-exit"],
    isRouteStart: false,
  },
  "rm-j003": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
  },
  "rm-j004": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
  },
  "rm-j005": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
  },
  "rm-j006": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
  },
  "rm-j007": {
    roads: ["i20", "update", "random-exit"],
    isRouteStart: false,
  },
  "rm-j008": {
    roads: ["update", "random-exit"],
    isRouteStart: false,
  },
};

/** Retired rm-j* → V2 replacement for deep links / legacy redirects. */
const RETIRED_ROUTE_MAP_REDIRECTS: Partial<Record<RouteMapLaunchServiceId, RouteMapV2ShelfServiceId>> =
  {
    "rm-j003": "v2-rtu-social-posts",
    "rm-j004": "v2-rtu-short-video",
    "rm-j006": "v2-rtu-voice",
  };

export function getRouteMapIntakeTypeForSku(jobId: RouteMapJobId): RouteMapIntakeType | undefined {
  const catalog = getServiceById(jobId as ServiceId);
  if (!catalog) return undefined;
  return getRouteMapIntakeTemplate(catalog);
}

const RETIRED_ROUTE_MAP_SKU_SET = new Set<string>(CATALOG_V2_ACTIVATION_RETIRED_ROUTE_MAP_SKUS);

function buildRouteMapJobFromV1(id: RouteMapLaunchServiceId): RouteMapJob | undefined {
  const catalog = getServiceById(id);
  const meta = ROUTE_MAP_JOB_META[id];
  if (!catalog || !meta) return undefined;

  const intakeType = getRouteMapIntakeTemplate(catalog);
  if (!intakeType) return undefined;

  return {
    id,
    name: catalog.name,
    priceCents: catalog.priceCents,
    priceDisplay: getRouteMapPriceDisplay(catalog),
    billingType: "one_time",
    roads: meta.roads,
    isRouteStart: meta.isRouteStart,
    intakeType,
    purpose: catalog.purpose,
    deliverables: catalog.deliverables,
    exclusions: catalog.exclusions,
    revisionRule: catalog.revisionRule,
    timingLabel: getRouteMapTurnaroundLabel(catalog),
    clientResponsibilities: catalog.clientResponsibilities,
  };
}

function buildRouteMapJobFromV2(id: RouteMapV2ShelfServiceId): RouteMapJob | undefined {
  const catalog = getServiceById(id);
  if (!catalog) return undefined;

  const intakeType = getRouteMapIntakeTemplate(catalog);
  if (!intakeType) return undefined;

  const activationEntry = getActivationMapEntryBySku(id);
  const roads = activationEntry?.laneEligibility ?? [];

  return {
    id,
    name: catalog.name,
    priceCents: catalog.priceCents,
    priceDisplay: getRouteMapPriceDisplay(catalog),
    billingType: "one_time",
    roads,
    isRouteStart: false,
    intakeType,
    purpose: catalog.purpose,
    deliverables: catalog.deliverables,
    exclusions: catalog.exclusions,
    revisionRule: catalog.revisionRule,
    timingLabel: getRouteMapTurnaroundLabel(catalog),
    clientResponsibilities: catalog.clientResponsibilities,
  };
}

function buildRouteMapJob(id: RouteMapJobId): RouteMapJob | undefined {
  if (isRouteMapV2ShelfServiceId(id)) {
    return buildRouteMapJobFromV2(id);
  }
  return buildRouteMapJobFromV1(id);
}

/** Active shelf jobs — activation map order, excluding Route Start. */
function buildActiveShelfJobs(): readonly RouteMapJob[] {
  const seen = new Set<RouteMapJobId>();
  const jobs: RouteMapJob[] = [];

  for (const lane of ["i75", "i20", "update", "random-exit"] as const) {
    for (const entry of getActivationMapShelfEntriesForLane(lane)) {
      const id = (entry.v2Sku ?? entry.routeMapSku) as RouteMapJobId | undefined;
      if (!id || seen.has(id)) continue;
      const job = buildRouteMapJob(id);
      if (job && !job.isRouteStart) {
        seen.add(id);
        jobs.push(job);
      }
    }
  }

  return jobs;
}

export const ROUTE_MAP_V1 = {
  pageTitle: "THE STUDIO",
  sidebarHeading: "Choose Your Way",
  promiseFooter: "Every job includes one revision round. Timing varies by job.",
  chooseJobCta: "CHOOSE THIS JOB",
  backToMapLabel: "← Back to Route Map",
  jobShelfHeading: "Launch Job Shelf",

  roads: [
    {
      id: "i75",
      highwayLabel: "I-75",
      directionLabel: "North / South",
      customerLabel: "Get My Business Started",
      tagline: "Forward route — sequential stops to build your foundation.",
      geometry: "forward",
      accentClass: "rm-road--i75",
      selectable: true,
    },
    {
      id: "i20",
      highwayLabel: "I-20",
      directionLabel: "East / West",
      customerLabel: "Promote Something Now",
      tagline: "Direct urgent route — get something live fast.",
      geometry: "direct",
      accentClass: "rm-road--i20",
      selectable: true,
    },
    {
      id: "i285",
      highwayLabel: "I-285",
      directionLabel: "Perimeter Loop",
      customerLabel: "Perimeter Loop",
      tagline: "Return loop around the map — come back later for another job, update, or new idea.",
      geometry: "loop",
      accentClass: "rm-road--i285",
      selectable: false,
    },
    {
      id: "update",
      highwayLabel: "Update Exit",
      directionLabel: "Interchange",
      customerLabel: "Update What I Already Have",
      tagline: "Exit off the loop — refresh one profile or promotion that's already live.",
      geometry: "interchange",
      accentClass: "rm-road--update",
      selectable: true,
    },
    {
      id: "random-exit",
      highwayLabel: "Random Exit",
      directionLabel: "Shortcut",
      customerLabel: "I Know What I Need",
      tagline: "Opens the job shelf directly — Route Start only if you are unsure.",
      geometry: "shortcut",
      accentClass: "rm-road--random-exit",
      selectable: true,
    },
  ] satisfies readonly RouteMapRoad[],

  jobs: buildActiveShelfJobs(),

  /** Customer route for free Squishy guidance — not a purchasable job. */
  guidance: ROUTE_MAP_GUIDANCE,

  /** Customer route for legacy discovery intake — historical campaigns only. */
  projectDiscoveryRoute: customerJourneyStepRoute("project-discovery"),

  checkout: {
    pageTitle: "Secure Checkout",
    pageLead: "Complete payment to begin your job.",
    intakeLead: "After payment, share the details we need to start production.",
  },
} as const;

export function getRouteMapRoad(id: RouteMapRoadId): RouteMapRoad | undefined {
  return ROUTE_MAP_V1.roads.find((road) => road.id === id);
}

/** Customer-selectable lanes — excludes I-285 perimeter loop. */
export function getSelectableRouteMapRoads(): readonly RouteMapRoad[] {
  return ROUTE_MAP_V1.roads.filter((road) => road.selectable);
}

export function getRouteMapJob(id: RouteMapJobId): RouteMapJob | undefined {
  return buildRouteMapJob(id);
}

/** Resolve legacy retired rm-j* shelf clicks to activated V2 replacement. */
export function resolveRouteMapShelfJobId(id: string): RouteMapJobId | undefined {
  if (isRouteMapJobId(id)) {
    if (RETIRED_ROUTE_MAP_SKU_SET.has(id)) {
      return RETIRED_ROUTE_MAP_REDIRECTS[id as RouteMapLaunchServiceId];
    }
    return id;
  }
  if (isRouteMapV2ShelfServiceId(id)) return id;
  return undefined;
}

/** Numbered lane stops — driven by activation map; excludes Route Start advisory job. */
export function getJobsForRoad(roadId: RouteMapRoadId): readonly RouteMapJob[] {
  if (roadId === "i285") return [];

  const jobs: RouteMapJob[] = [];
  for (const entry of getActivationMapShelfEntriesForLane(roadId)) {
    const rawId = (entry.v2Sku ?? entry.routeMapSku) as RouteMapJobId | undefined;
    if (!rawId) continue;
    const job = buildRouteMapJob(rawId);
    if (job && !job.isRouteStart) jobs.push(job);
  }
  return jobs;
}

export function getRouteMapGuidance(): typeof ROUTE_MAP_GUIDANCE {
  return ROUTE_MAP_GUIDANCE;
}

/** @deprecated rm-j001 is retired from commerce — use getRouteMapGuidance() for the free path. */
export function getRouteStartJob(): RouteMapJob | undefined {
  return undefined;
}

export function isRouteMapJobId(value: string): value is RouteMapLaunchServiceId {
  return value in ROUTE_MAP_JOB_META;
}

export function isRouteMapShelfJobId(value: string): value is RouteMapJobId {
  return isRouteMapJobId(value) || isRouteMapV2ShelfServiceId(value);
}
