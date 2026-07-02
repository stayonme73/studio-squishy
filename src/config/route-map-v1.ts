/**
 * Studio Route Map V1 — launch job shelf, roads, and intake routing.
 * Job names, prices, and scope read from Service Catalog (rm-j* SKUs).
 * Road placement and intake types defined here per production packet.
 * @see docs/customer-journey-v1-locked.md — Route Map replaces lobby → Discovery front door.
 */

import { getServiceById } from "@/catalog/accessors";
import type { RouteMapLaunchServiceId } from "@/catalog/types";
import { customerJourneyStepRoute } from "@/config/customer-journey-v1";

/** Route Map launch job IDs — catalog SKUs rm-j001 through rm-j008. */
export type RouteMapJobId = RouteMapLaunchServiceId;

export type RouteMapRoadId = "i75" | "i20" | "i285" | "update" | "random-exit";

/** Job-specific intake types defined in the production packet §5. */
export type RouteMapIntakeType =
  | "discovery"
  | "social-setup"
  | "promotion"
  | "video"
  | "page"
  | "voice"
  | "update";

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
const ROUTE_MAP_JOB_TIMING: Record<RouteMapJobId, string> = {
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
const ROUTE_MAP_PRICE_DISPLAY: Partial<Record<RouteMapJobId, string>> = {
  "rm-j002": "$400 / platform",
  "rm-j003": "$450 / platform",
  "rm-j004": "$650 / platform",
  "rm-j006": "$400 / platform",
};

type RouteMapJobMeta = {
  roads: readonly RouteMapRoadId[];
  isRouteStart: boolean;
  intakeType: RouteMapIntakeType;
};

const ROUTE_MAP_JOB_META: Record<RouteMapJobId, RouteMapJobMeta> = {
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
    roads: ["update"],
    isRouteStart: false,
    intakeType: "social-setup",
  },
};

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function buildRouteMapJob(id: RouteMapJobId): RouteMapJob | undefined {
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

const ROUTE_MAP_JOB_IDS = Object.keys(ROUTE_MAP_JOB_META) as RouteMapJobId[];

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

  jobs: ROUTE_MAP_JOB_IDS.map((id) => buildRouteMapJob(id)).filter(
    (job): job is RouteMapJob => job !== undefined,
  ),

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

/** Numbered lane stops — excludes Route Start advisory job (rm-j001). */
export function getJobsForRoad(roadId: RouteMapRoadId): readonly RouteMapJob[] {
  if (roadId === "random-exit") {
    return ROUTE_MAP_V1.jobs.filter((job) => !job.isRouteStart);
  }
  return ROUTE_MAP_V1.jobs.filter(
    (job) => !job.isRouteStart && job.roads.includes(roadId),
  );
}

export function getRouteStartJob(): RouteMapJob | undefined {
  return ROUTE_MAP_V1.jobs.find((job) => job.isRouteStart);
}

export function isRouteMapJobId(value: string): value is RouteMapJobId {
  return value in ROUTE_MAP_JOB_META;
}
