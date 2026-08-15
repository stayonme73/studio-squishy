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
    retiredFromRouteMap: true,
    purpose:
      "Retired advisory SKU — guidance is now free via Squishy on the Route Map. Historical records only.",
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
    name: "Make Me a Social Profile Setup Kit",
    category: "social-media",
    serviceClass: "core",
    priceCents: 9900,
    productionLane: "quick_turn",
    purpose:
      "A complete setup kit for one Facebook, Instagram, or TikTok profile — platform-ready bio/about copy, contact/URL field map, profile and cover assets where applicable, and exact field-by-field setup instructions you apply on the platform.",
    deliverables: [
      "Platform-specific bio and about copy for one platform",
      "Business/profile description and approved URL/contact field map",
      "Profile image/avatar asset",
      "Cover/banner asset where the chosen platform supports one",
      "Display-name and field recommendations for that platform",
      "Platform-specific setup sheet with exact field-by-field implementation checklist",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "The Studio logging into your account or performing platform-side profile mutations",
      "Creating the underlying Facebook, Instagram, or TikTok account for you",
      "Posting, scheduling, publishing, or content management",
      "Paid ads or ad management",
      "Comments, DMs, or ongoing account management",
      "Account recovery, verification, or old-admin disputes",
      "Outside freelancers, voice actors, printers, or production vendors",
      "More than one platform",
    ],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Own or create the social account on the chosen platform",
      "Apply the delivered kit fields and assets on the platform yourself",
      "Logo and brand assets for the profile image",
      "Accurate business information, links, and hours",
    ],
    executionMode: "creation_delivery",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "social_profile_setup_kit", quantity: 1, unit: "platform" }],
    },
    intakeTemplate: "social-setup",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 3 business days"),
    routeMapPriceDisplay: "$99 / platform",
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
    priceCents: 34900,
    productionLane: "standard_build",
    purpose:
      "One functioning responsive page for one sale, event, opening, service, or offer, built with an approved Studio structure and one clear call to action. This is not a full website, online store, or custom application.",
    deliverables: [
      "One responsive campaign page for one defined offer or purpose",
      "One clear call to action — call, email, visit a location, open an external booking or payment link, or submit one approved basic contact form only if supported by the existing Studio structure",
      "Customer-provided wording, logo, images, video, pricing, dates, and links placed into an approved Studio structure",
      "Mobile and desktop layout preparation",
      "Basic testing of page links and the approved call to action",
      "Publication through the approved Studio page-delivery method",
      "Studio quality-control review before delivery",
      "One revision round included",
    ],
    exclusions: [
      "Full website builds",
      "Additional pages",
      "More than one campaign purpose or offer",
      "Multiple independent calls to action",
      "Ecommerce systems",
      "Custom applications",
      "Customer accounts or logins",
      "Databases",
      "Custom booking systems",
      "CRM integrations",
      "Advanced forms or integrations",
      "Custom coding outside the approved Studio structure",
      "Ongoing hosting administration or maintenance unless separately included",
      "Original photography, printing, outside vendors, freelancers, or voice actors",
      "Copywriting beyond reasonable formatting and light editing of customer-supplied wording",
      "Performance, sales, traffic, or conversion guarantees",
    ],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Accurate offer details, pricing, dates, and links",
      "Brand assets and any required legal language",
      "Final wording, logo, images, and contact details",
      "Approval before the page goes live",
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
    priceCents: 6900,
    productionLane: "quick_turn",
    /**
     * Owner APPROVE B (2026-08-14) — Reference-Guided Promotion Update.
     * Not literal in-place / source-file / Canva-file editing.
     */
    purpose:
      "Reference-guided update of one existing promotional item: you supply the existing promotion as visual/content reference plus exact changes; The Studio recreates one updated final promotional item with bounded edits only — not a redesign and not a pixel-perfect edit of your original file.",
    deliverables: [
      "One recreated updated promotional item guided by your supplied existing promotion reference",
      "Bounded updates only: dates, prices, contact information, supplied wording, and optionally one customer-supplied image",
      "Export of the updated final promotional file (PNG and/or PDF)",
      "Clear change record of what was requested versus what was applied",
    ],
    exclusions: [
      "Pixel-perfect or exact-layout matching of the original file",
      "Source-file editing, Canva-file editing, or editable-layer restoration (PSD, AI, INDD, Canva project, and similar)",
      "New concept or campaign direction",
      "Redesign or structural rebuild beyond what recreation requires to apply your bounded changes",
      "Additional deliverables or changing the type of promotional item",
      "Extensive copywriting or rebuilding a page or campaign",
      "Platform management, posting, or ongoing account work",
      "Multiple locations or items in one job",
      "General troubleshooting beyond the named item",
    ],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "A clear file or durable reference for the existing promotional item (PNG, JPG, or flattened PDF preferred)",
      "Exact replacement dates, prices, contact information, wording, and optionally one image you supply",
      "Acknowledgment that The Studio recreates an updated final — it does not edit your original source file in place",
      "Platform access only if republishing is required for the named item",
      "Approval before any republish",
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
    name: "Make Me a Social Profile Update Kit",
    category: "social-media",
    serviceClass: "core",
    priceCents: 9900,
    productionLane: "quick_turn",
    purpose:
      "An update kit for one existing Facebook, Instagram, or TikTok profile — revised bio/about copy, updated profile and banner assets where applicable, URL/contact recommendations, a before→after change sheet, and exact field-replacement instructions you apply on the platform.",
    deliverables: [
      "Reviewed current-profile inputs for one existing platform profile",
      "Revised approved bio and about copy",
      "Updated platform-ready profile image/avatar",
      "Updated banner/cover asset where the chosen platform supports one",
      "Approved URL and contact-field recommendations",
      "Platform-specific before→after change sheet",
      "Exact field-replacement instructions and implementation checklist",
      "One revision round included",
    ],
    exclusions: [
      "The Studio logging into your account or performing platform-side profile mutations",
      "New account setup",
      "Account recovery or login troubleshooting",
      "Original social media content creation (posts, reels, stories)",
      "New logo creation from scratch",
      "Posting or scheduling content",
      "Ongoing profile or community management",
      "More than one platform",
      "Advertising setup or campaign management",
      "Platform performance guarantees",
    ],
    revisionRule: ROUTE_MAP_REVISION_TEMPLATE,
    clientResponsibilities: [
      "Control of the existing profile on the chosen platform",
      "Current profile details or screenshots you supply for review (The Studio does not log in or inspect your live profile)",
      "Updated business information and customer-supplied source images when available",
      "Apply the delivered Update Kit changes on the platform yourself",
      "Approval of the kit before you publish changes",
    ],
    executionMode: "creation_delivery",
    deliveryMapping: {
      fulfillmentMode: "project",
      executionChannel: "social",
      items: [{ key: "social_profile_update_kit", quantity: 1, unit: "platform" }],
    },
    intakeTemplate: "social-update",
    routeMapTurnaroundLabel: buildRouteMapTimingLabel("within 3 business days"),
    routeMapPriceDisplay: "$99 / platform",
  }),
] as const;
