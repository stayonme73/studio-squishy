/**
 * Studio Route Map V1 — launch job shelf, roads, and intake routing.
 * Shelf jobs driven by Catalog V2 activation map + live catalog (V1 rm-j* + V2 RTU SKUs).
 * Road placement from activation-map-draft.ts; prices/scope/turnaround from Service Catalog.
 * @see docs/customer-journey-v1-locked.md — Route Map replaces lobby → Discovery front door.
 */

import { getServiceById } from "@/catalog/accessors";
import {
  getRouteMapV2TurnaroundLabel,
  isRouteMapV2ShelfServiceId,
} from "@/catalog/route-map-v2-launch";
import type { RouteMapLaunchServiceId, RouteMapShelfJobId, RouteMapV2ShelfServiceId } from "@/catalog/types";
import {
  CATALOG_V2_ACTIVATION_RETIRED_ROUTE_MAP_SKUS,
  getActivationMapEntryBySku,
  getActivationMapShelfEntriesForLane,
} from "@/catalog/v2/activation-map-draft";
import { customerJourneyStepRoute } from "@/config/customer-journey-v1";

/** Route Map shelf job IDs — V1 continuing jobs + activated V2 RTU SKUs. */
export type RouteMapJobId = RouteMapShelfJobId;

/** Legacy alias — all rm-j001–rm-j008 remain valid for campaign history. */
export type RouteMapLaunchJobId = RouteMapLaunchServiceId;

export type RouteMapRoadId = "i75" | "i20" | "i285" | "update" | "random-exit";

/** Job-specific intake types defined in the production packet §5 + V2 RTU extensions. */
export type RouteMapIntakeType =
  | "discovery"
  | "social-setup"
  | "promotion"
  | "video"
  | "page"
  | "voice"
  | "update"
  | "rtu-flyer"
  | "rtu-menu"
  | "rtu-service-sheet"
  | "rtu-social-posts"
  | "rtu-promotion-graphics"
  | "rtu-email-kit"
  | "rtu-sms-kit"
  | "rtu-voice"
  | "rtu-short-video";

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

/** Per-job customer-facing timing — packet + production lane (no global 7-day fallback). */
const ROUTE_MAP_JOB_TIMING: Record<RouteMapLaunchServiceId, string> = {
  "rm-j001": "Route recommendation within 2 business days after intake is complete.",
  "rm-j002": "First draft within 3 business days after intake is complete.",
  "rm-j003": "First draft within 3 business days after intake is complete.",
  "rm-j004": "First draft within 5 business days after intake is complete.",
  "rm-j005": "First draft within 5 business days after intake is complete.",
  "rm-j006": "First draft within 3 business days after intake is complete.",
  "rm-j007": "First draft within 2 business days after intake is complete.",
  "rm-j008": "First draft within 3 business days after intake is complete.",
};

/** Per-job packet price labels where catalog cents alone is not sufficient. */
const ROUTE_MAP_PRICE_DISPLAY: Partial<Record<RouteMapLaunchServiceId, string>> = {
  "rm-j002": "$400 / platform",
  "rm-j003": "$450 / platform",
  "rm-j004": "$650 / platform",
  "rm-j006": "$400 / platform",
};

/** V2 RTU intake routing — one short service-specific form per activated shelf SKU. */
const V2_INTAKE_BY_SKU: Record<RouteMapV2ShelfServiceId, RouteMapIntakeType> = {
  "v2-rtu-flyer": "rtu-flyer",
  "v2-rtu-menu": "rtu-menu",
  "v2-rtu-service-sheet": "rtu-service-sheet",
  "v2-rtu-promotion-graphics": "rtu-promotion-graphics",
  "v2-rtu-social-posts": "rtu-social-posts",
  "v2-rtu-short-video": "rtu-short-video",
  "v2-rtu-voice": "rtu-voice",
  "v2-rtu-email-kit": "rtu-email-kit",
  "v2-rtu-sms-kit": "rtu-sms-kit",
};

export function getRouteMapIntakeTypeForSku(jobId: RouteMapJobId): RouteMapIntakeType | undefined {
  if (isRouteMapV2ShelfServiceId(jobId)) {
    return V2_INTAKE_BY_SKU[jobId];
  }
  return ROUTE_MAP_JOB_META[jobId as RouteMapLaunchServiceId]?.intakeType;
}

/** Retired rm-j* → V2 replacement for deep links / legacy redirects. */
const RETIRED_ROUTE_MAP_REDIRECTS: Partial<Record<RouteMapLaunchServiceId, RouteMapV2ShelfServiceId>> =
  {
    "rm-j003": "v2-rtu-social-posts",
    "rm-j004": "v2-rtu-short-video",
    "rm-j006": "v2-rtu-voice",
  };

type RouteMapJobMeta = {
  roads: readonly RouteMapRoadId[];
  isRouteStart: boolean;
  intakeType: RouteMapIntakeType;
};

const ROUTE_MAP_JOB_META: Record<RouteMapLaunchServiceId, RouteMapJobMeta> = {
  "rm-j001": {
    roads: ["i75", "i20", "update", "random-exit"],
    isRouteStart: true,
    intakeType: "discovery",
  },
  "rm-j002": {
    roads: ["i75", "random-exit"],
    isRouteStart: false,
    intakeType: "social-setup",
  },
  "rm-j003": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
    intakeType: "promotion",
  },
  "rm-j004": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
    intakeType: "video",
  },
  "rm-j005": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
    intakeType: "page",
  },
  "rm-j006": {
    roads: ["i75", "i20", "random-exit"],
    isRouteStart: false,
    intakeType: "voice",
  },
  "rm-j007": {
    roads: ["i20", "update", "random-exit"],
    isRouteStart: false,
    intakeType: "update",
  },
  "rm-j008": {
    roads: ["update", "random-exit"],
    isRouteStart: false,
    intakeType: "social-setup",
  },
};

const RETIRED_ROUTE_MAP_SKU_SET = new Set<string>(CATALOG_V2_ACTIVATION_RETIRED_ROUTE_MAP_SKUS);

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function buildRouteMapJobFromV1(id: RouteMapLaunchServiceId): RouteMapJob | undefined {
  const catalog = getServiceById(id);
  const meta = ROUTE_MAP_JOB_META[id];
  if (!catalog || !meta) return undefined;

  return {
    id,
    name: catalog.name,
    priceCents: catalog.priceCents,
    priceDisplay: ROUTE_MAP_PRICE_DISPLAY[id] ?? formatUsd(catalog.priceCents),
    billingType: "one_time",
    roads: meta.roads,
    isRouteStart: meta.isRouteStart,
    intakeType: meta.intakeType,
    purpose: catalog.purpose,
    deliverables: catalog.deliverables,
    exclusions: catalog.exclusions,
    revisionRule: catalog.revisionRule,
    timingLabel: ROUTE_MAP_JOB_TIMING[id],
    clientResponsibilities: catalog.clientResponsibilities,
  };
}

function buildRouteMapJobFromV2(id: RouteMapV2ShelfServiceId): RouteMapJob | undefined {
  const catalog = getServiceById(id);
  if (!catalog) return undefined;

  const activationEntry = getActivationMapEntryBySku(id);
  const roads = activationEntry?.laneEligibility ?? [];

  return {
    id,
    name: catalog.name,
    priceCents: catalog.priceCents,
    priceDisplay: formatUsd(catalog.priceCents),
    billingType: "one_time",
    roads,
    isRouteStart: false,
    intakeType: V2_INTAKE_BY_SKU[id],
    purpose: catalog.purpose,
    deliverables: catalog.deliverables,
    exclusions: catalog.exclusions,
    revisionRule: catalog.revisionRule,
    timingLabel:
      getRouteMapV2TurnaroundLabel(id) ??
      catalog.firstReviewWindow?.label ??
      "Timing varies by job.",
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

  /** Customer route for Route Start — existing Project Discovery flow. */
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

export function getRouteStartJob(): RouteMapJob | undefined {
  return buildRouteMapJobFromV1("rm-j001");
}

export function isRouteMapJobId(value: string): value is RouteMapLaunchServiceId {
  return value in ROUTE_MAP_JOB_META;
}

export function isRouteMapShelfJobId(value: string): value is RouteMapJobId {
  return isRouteMapJobId(value) || isRouteMapV2ShelfServiceId(value);
}
