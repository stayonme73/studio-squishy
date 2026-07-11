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
  ServicePricingDisplayType,
  ServiceTimingWindow,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";
import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";
import {
  ROUTE_MAP_REVISION_TEMPLATE,
  buildRouteMapTimingLabel,
} from "@/catalog/route-map-shared-copy";

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
  intakeTemplate: RouteMapIntakeTemplateId;
  routeMapTurnaroundLabel: string;
  routeMapPriceDisplay?: string;
  pricingDisplayType?: ServicePricingDisplayType;
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
    intakeTemplate: seed.intakeTemplate,
    routeMapTurnaroundLabel: seed.routeMapTurnaroundLabel,
    ...(seed.routeMapPriceDisplay
      ? {
          routeMapPriceDisplay: seed.routeMapPriceDisplay,
          pricingDisplayType: seed.pricingDisplayType ?? ("per_platform" as const),
        }
      : {}),
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
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Provide accurate business context and goals",
      "Respond promptly to clarifying questions",
      "Approve the chosen job before we proceed",
    ],
    executionMode: "strategy_direction",
    deliveryMapping: {
      fulfillmentMode: "project",
      items: [{ key: "route_start_recommendation", quantity: 1, unit: "summary" }],
    },
    intakeTemplate: "discovery",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 2 business days"),
  }),
  routeMapLaunchService({
    id: "rm-j002",
    familyId: "social_media",
    name: "Set Up My Facebook, Instagram, or TikTok",
    category: "social-media",
    serviceClass: "core",
    priceCents: 40000,
    productionLane: "quick_turn",
    purpose:
      "Social setup for one platform you already control. This service includes one platform. Additional platforms are available for $400 each.",
    deliverables: [
      "Profile image, bio/about, links/contact details, cover where applicable",
      "One first post prepared for you to publish from your account",
    ],
    exclusions: [
      "No account recovery, verification, or old-admin disputes",
      "No ads, DMs, comments, or ongoing management",
      "Client must already control the account",
    ],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Provide platform login access or send an admin invite",
      "Provide your logo and brand assets",
      "Confirm your business information, links, and hours are accurate",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "social_profile_setup", quantity: 1, unit: "platform" }],
    },
    intakeTemplate: "social-setup",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 3 business days"),
    routeMapPriceDisplay: "$400 / platform",
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
    intakeTemplate: "promotion",
    routeMapTurnaroundLabel: "First draft within 3 business days after intake is complete.",
    routeMapPriceDisplay: "$450 / platform",
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
    intakeTemplate: "video",
    routeMapTurnaroundLabel: "First draft within 5 business days after intake is complete.",
    routeMapPriceDisplay: "$650 / platform",
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
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Provide accurate offer details, pricing, dates, and links",
      "Provide brand assets and any required legal language",
      "Approve the page before it publishes",
    ],
    executionMode: "creation_delivery",
    deliveryMapping: {
      fulfillmentMode: "project",
      items: [{ key: "campaign_landing_page", quantity: 1, unit: "page" }],
    },
    intakeTemplate: "page",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 5 business days"),
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
    intakeTemplate: "voice",
    routeMapTurnaroundLabel: "First draft within 3 business days after intake is complete.",
    routeMapPriceDisplay: "$400 / platform",
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
      "No broad redesign",
      "No new campaign direction",
      "No multiple locations in one job",
      "No general troubleshooting beyond the named item",
    ],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Provide the link or file for the existing promotion",
      "Tell us exactly what changes are needed",
      "Provide platform access if we are republishing it",
      "Approve the update before it publishes",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "promotion_update", quantity: 1, unit: "item" }],
    },
    intakeTemplate: "update",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 2 business days"),
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
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Provide platform login access",
      "Provide updated business information and brand assets",
      "Approve the changes before they go live",
    ],
    executionMode: "managed_execution_when_selected",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "profile_update", quantity: 1, unit: "platform" }],
    },
    intakeTemplate: "social-setup",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 3 business days"),
  }),
] as const;
