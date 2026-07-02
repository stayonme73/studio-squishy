/**
 * Route Map V1 launch SKUs — packet names, prices, and scope.
 * Source of truth for Route Map checkout and campaign record line items.
 * Not surfaced through Discovery / Recommendation Engine (isRecommendable: false).
 */

import type {
  BillingType,
  DeliveryMapping,
  ExecutionMode,
  ProductionLane,
  ServiceCategoryId,
  ServiceClass,
  ServiceFamilyId,
  ServiceId,
  ServiceTimingWindow,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";

const REVISION_ONE_TIME = "One consolidated revision round.";

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

function timingWindowsForLane(lane: ProductionLane): {
  firstReviewWindow: ServiceTimingWindow;
  finalDeliveryWindow: ServiceTimingWindow;
} {
  if (lane === "standard_build") {
    return { firstReviewWindow: STANDARD_FIRST, finalDeliveryWindow: STANDARD_FINAL };
  }
  return { firstReviewWindow: QUICK_FIRST, finalDeliveryWindow: QUICK_FINAL };
}

type RouteMapLaunchSeed = {
  id: ServiceId;
  familyId: ServiceFamilyId;
  name: string;
  category: ServiceCategoryId;
  serviceClass: ServiceClass;
  priceCents: number;
  productionLane: ProductionLane;
  purpose: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  revisionRule: string;
  clientResponsibilities: readonly string[];
  executionMode: ExecutionMode;
  deliveryMapping: DeliveryMapping;
  timingLabel?: string;
  /** When set, SKU stays in catalog for checkout history but is off the Route Map shelf. */
  retiredFromRouteMap?: boolean;
};

function routeMapLaunchService(seed: RouteMapLaunchSeed): StudioServiceEntry {
  const timing = timingWindowsForLane(seed.productionLane);
  const isRetired = seed.retiredFromRouteMap === true;
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: seed.id,
    familyId: seed.familyId,
    name: seed.name,
    category: seed.category,
    serviceClass: seed.serviceClass,
    customerReceives: seed.deliverables.join("; "),
    internalProductionNotes: isRetired
      ? "Route Map V1 launch SKU — retired from shelf; replaced by V2 RTU on activation."
      : "Route Map V1 launch SKU — front-door checkout only.",
    dependencies: [],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: false,
    upgradeEligible: false,
    deliveryFormats: [],
    minimumCustomerRequirements: [...seed.clientResponsibilities],
    recommendedCustomerRequirements: [],
    serviceStatus: isRetired ? "retired" : "active",
    status: isRetired ? "inactive" : "active",
    billingType: "one_time" satisfies BillingType,
    priceCents: seed.priceCents,
    productionLane: seed.productionLane,
    firstReviewWindow: timing.firstReviewWindow,
    finalDeliveryWindow: timing.finalDeliveryWindow,
    purpose: seed.purpose,
    deliverables: [...seed.deliverables],
    exclusions: [...seed.exclusions],
    revisionRule: seed.revisionRule,
    clientResponsibilities: [...seed.clientResponsibilities],
    executionMode: seed.executionMode,
    requiresClientAccess: seed.executionMode === "managed_execution_when_selected",
    requiresClientMaterials: true,
    isRecommendable: false,
    isAddable: false,
    launchStatus: isRetired ? "retired" : "limited",
    serviceGuideFaq: [],
    deliveryMapping: seed.deliveryMapping,
    discoveryTriggers: [],
    discoveryMapping: [],
  };
}

/** Eight Route Map V1 jobs — rm-j001 through rm-j008. */
export const ROUTE_MAP_LAUNCH_SERVICES: readonly StudioServiceEntry[] = [
  routeMapLaunchService({
    id: "rm-j001",
    familyId: "campaign",
    name: "Help Me Figure Out What I Need",
    category: "campaign-services",
    serviceClass: "essential",
    priceCents: 65000,
    productionLane: "quick_turn",
    purpose:
      "Not sure where to begin? We'll help you choose the right first job.",
    deliverables: [
      "Review what you are trying to do and what you already have",
      "Identify the first paid job that fits",
    ],
    exclusions: [
      "No production work included",
      "Not a strategy deck, PDF, or consultation",
    ],
    revisionRule: "One revision round on the Route Start recommendation summary.",
    clientResponsibilities: [
      "Accurate business context and goals",
      "Timely responses to clarifying questions",
      "Approval to proceed with a chosen job",
    ],
    executionMode: "strategy_direction",
    deliveryMapping: {
      fulfillmentMode: "project",
      items: [{ key: "route_start_recommendation", quantity: 1, unit: "summary" }],
    },
  }),
  routeMapLaunchService({
    id: "rm-j002",
    familyId: "social_media",
    name: "Set Up My Facebook, Instagram, or TikTok",
    category: "social-media",
    serviceClass: "core",
    priceCents: 40000,
    productionLane: "quick_turn",
    purpose: "Social setup for one platform you already control.",
    deliverables: [
      "Profile image, bio/about, links/contact details, cover where applicable",
      "One first post published",
    ],
    exclusions: [
      "No account recovery, verification, or old-admin disputes",
      "No ads, DMs, comments, or ongoing management",
      "Client must already control the account",
    ],
    revisionRule: "One revision round on profile setup.",
    clientResponsibilities: [
      "Platform login access or admin invite",
      "Logo and brand assets",
      "Accurate business info, links, and hours",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "social_profile_setup", quantity: 1, unit: "platform" }],
    },
  }),
  routeMapLaunchService({
    id: "rm-j003",
    familyId: "social_media",
    name: "Make and Post My Social Media Promotion",
    category: "social-media",
    serviceClass: "core",
    priceCents: 45000,
    productionLane: "quick_turn",
    purpose: "Social promotion on one chosen platform.",
    deliverables: [
      "Up to 3 static posts with captions",
      "One approval round",
      "Posting/scheduling to one chosen platform",
    ],
    exclusions: [
      "No video, multiple platforms, ads, comments, DMs, reporting, or ongoing posting",
    ],
    revisionRule: "One revision round before posting.",
    clientResponsibilities: [
      "Connected account access if posting is included",
      "Offer details, dates, and links",
      "Approval before publish",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "static_social_post", quantity: 3, unit: "posts" }],
    },
    retiredFromRouteMap: true,
  }),
  routeMapLaunchService({
    id: "rm-j004",
    familyId: "marketing_video",
    name: "Make Me a Short Video and Post It",
    category: "video-production",
    serviceClass: "signature",
    priceCents: 65000,
    productionLane: "standard_build",
    purpose: "One short video for one platform.",
    deliverables: [
      "One vertical video up to 30 seconds with text/captions",
      "Approved footage/stock/Studio or AI visuals",
      "One approval round and posting/scheduling",
    ],
    exclusions: [
      "No on-site filming, multiple versions, long commercials, paid ads, influencer work, or ongoing edits",
    ],
    revisionRule: "One revision round before posting.",
    clientResponsibilities: [
      "Usable footage, photos, logo, or source materials",
      "Correct offer details and required claims",
      "Platform access if posting is included",
      "Approval before publish",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      items: [{ key: "short_form_video", quantity: 1, unit: "video" }],
    },
    retiredFromRouteMap: true,
  }),
  routeMapLaunchService({
    id: "rm-j005",
    familyId: "landing_page_content",
    name: "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    category: "landing-pages-web-content",
    serviceClass: "signature",
    priceCents: 65000,
    productionLane: "standard_build",
    purpose: "One mobile-ready campaign page with one purpose and one action.",
    deliverables: [
      "One mobile-ready page with details, offer, and CTA/contact path",
      "Approved images/video",
      "QR code created and tested, then published",
    ],
    exclusions: [
      "No full website, payments, booking system, logins, CRM forms, databases, custom coding, or ongoing maintenance",
      "One page, one purpose, one action",
    ],
    revisionRule: "One revision round on page content and layout direction.",
    clientResponsibilities: [
      "Accurate offer, pricing, dates, and links",
      "Brand assets and required legal language",
      "Approval before publish",
    ],
    executionMode: "creation_delivery",
    deliveryMapping: {
      fulfillmentMode: "project",
      items: [{ key: "campaign_landing_page", quantity: 1, unit: "page" }],
    },
  }),
  routeMapLaunchService({
    id: "rm-j006",
    familyId: "ai_voice_over",
    name: "Make and Post My Voice Announcement",
    category: "audio-production",
    serviceClass: "core",
    priceCents: 40000,
    productionLane: "quick_turn",
    purpose: "One voice announcement on one platform.",
    deliverables: [
      "One short script, AI voice, simple visual or motion piece",
      "One approval round and posting/scheduling",
    ],
    exclusions: [
      "No standalone audio, long narration, radio ads, character voices, multiple languages, or multiple platforms",
    ],
    revisionRule: "One revision round before posting.",
    clientResponsibilities: [
      "Final script or approved talking points",
      "Pronunciation notes for names and offers",
      "Platform access if posting is included",
      "Approval before publish",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      items: [{ key: "voice_announcement_post", quantity: 1, unit: "post" }],
    },
    retiredFromRouteMap: true,
  }),
  routeMapLaunchService({
    id: "rm-j007",
    familyId: "social_media",
    name: "Update My Existing Promotion",
    category: "social-media",
    serviceClass: "core",
    priceCents: 25000,
    productionLane: "quick_turn",
    purpose: "Update one named existing item and verify it is current.",
    deliverables: [
      "Update one named existing item",
      "Replace or republish live version",
      "Verify it is current",
    ],
    exclusions: [
      "No broad redesign, new campaign direction, multiple locations, or fix everything",
    ],
    revisionRule: "One revision round on the update.",
    clientResponsibilities: [
      "Link or file for the existing promotion",
      "Exact changes needed",
      "Platform access if republishing is included",
      "Approval before publish",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "promotion_update", quantity: 1, unit: "item" }],
    },
  }),
  routeMapLaunchService({
    id: "rm-j008",
    familyId: "social_media",
    name: "Update My Facebook, Instagram, or TikTok",
    category: "social-media",
    serviceClass: "core",
    priceCents: 40000,
    productionLane: "quick_turn",
    purpose:
      "Refresh an existing social or business profile — bio, links, images, or basics.",
    deliverables: [
      "Updates one existing profile on one platform",
      "Refreshes bio, links, banner, or profile photo treatment",
      "Aligns profile with current offer or branding",
    ],
    exclusions: [
      "New account setup (see Set Up job)",
      "Content creation beyond profile fields",
      "Multiple platforms in one job",
      "Account recovery",
    ],
    revisionRule: "One revision round on profile updates.",
    clientResponsibilities: [
      "Platform login access",
      "Updated business info and brand assets",
      "Approval before changes go live",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "profile_update", quantity: 1, unit: "platform" }],
    },
  }),
] as const;
