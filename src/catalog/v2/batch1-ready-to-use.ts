/**
 * Catalog V2 — Batch 1: Ready-to-Use marketing materials (DRAFT ONLY).
 *
 * Six held draft SKUs — five launch candidates plus handout held for scope overlap.
 * NOT in live SERVICE_CATALOG. NOT wired to Route Map, checkout, intake, Discovery,
 * or Recommendation Engine.
 *
 * Legacy references: ma-001 (Promotion Pack), sm-001 (Social Media Launch Set).
 */

import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";

export const CATALOG_V2_BATCH1_READY_TO_USE_BATCH_ID = "batch1-ready-to-use" as const;

/** Shared price note — approved public V1 price for Batch 1 launch candidates (V2 draft only). */
export const CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE =
  "approved public V1 price (Batch 1 ready-to-use)";

/** Shared ready-to-use delivery rule — documented on each Batch 1 record. */
export const CATALOG_V2_RTU_DELIVERY_RULE =
  "The Studio creates finished files. Client prints, uploads, sends, schedules, or distributes unless they separately buy a scoped post/publish service.";

export const CATALOG_V2_RTU_CLIENT_RESPONSIBILITY =
  "Client prints, uploads, posts, sends, schedules, or distributes delivered files using their own tools and accounts.";

/** Optional per-SKU overrides — defaults apply when omitted (other Batch 1 SKUs unchanged). */
type Batch1BaseOverrides = {
  priceCents?: number | null;
  priceNote?: string;
  batchLaunchCandidate?: boolean;
  launchSetStatus?: CatalogV2ServiceEntry["launchSetStatus"];
  routeMapEligible?: boolean;
  directExitEligible?: boolean;
  placement?: CatalogV2ServiceEntry["placement"];
  laneEligibility?: CatalogV2ServiceEntry["laneEligibility"];
  turnaroundApprovalStatus?: CatalogV2ServiceEntry["turnaroundApprovalStatus"];
  clientResponsibilityAfterDelivery?: string;
  scopeRoutingNote?: string;
  intakeTemplate?: CatalogV2ServiceEntry["intakeTemplate"];
};

function batch1Base(
  entry: Omit<
    CatalogV2ServiceEntry,
    | "schemaVersion"
    | "availability"
    | "deliveryType"
    | "routeMapEligible"
    | "directExitEligible"
    | "placement"
    | "laneEligibility"
    | "intakeTemplate"
    | "isRouteMapJob"
    | "isDraftOnly"
    | "draftBatch"
    | "batchLaunchCandidate"
    | "launchSetStatus"
    | "deliveryRule"
    | "clientResponsibilityAfterDelivery"
    | "turnaroundApprovalStatus"
    | "priceCents"
    | "priceNote"
  > &
    Batch1BaseOverrides,
): CatalogV2ServiceEntry {
  return {
    schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
    availability: "held",
    deliveryType: "ready_to_use",
    routeMapEligible: false,
    directExitEligible: false,
    placement: "none",
    laneEligibility: [],
    intakeTemplate: "",
    isRouteMapJob: false,
    isDraftOnly: true,
    draftBatch: CATALOG_V2_BATCH1_READY_TO_USE_BATCH_ID,
    batchLaunchCandidate: true,
    launchSetStatus: "launch_candidate",
    deliveryRule: CATALOG_V2_RTU_DELIVERY_RULE,
    clientResponsibilityAfterDelivery: CATALOG_V2_RTU_CLIENT_RESPONSIBILITY,
    turnaroundApprovalStatus: "proposed",
    priceCents: null,
    priceNote: "no approved price yet",
    ...entry,
  };
}

/**
 * Batch 1 ready-to-use draft entries — held (public V1 prices approved; batch not activated).
 * Merged into CATALOG_V2_DRAFT via draft-catalog.ts; isolated from live catalog.
 */
export const CATALOG_V2_BATCH1_READY_TO_USE: readonly CatalogV2ServiceEntry[] = [
  batch1Base({
    sku: "v2-rtu-flyer",
    clientFacingName: "Make Me a Flyer",
    category: "marketing-assets",
    familyId: "marketing_assets",
    legacySourceSku: "ma-001",
    legacyPriceReferenceCents: 49500,
    legacyPriceReferenceNote:
      "ma-001 Promotion Pack is $495 for up to four marketing assets — not a per-flyer price. Approved public V1 price for this SKU is $300.",
    priceCents: 30000,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-flyer",
    clientResponsibilityAfterDelivery:
      "Client handles printing, uploading, posting, emailing, or distributing the finished files through their own printer, platform, or account.",
    scopeRoutingNote:
      "Keep complex or unclear flyer requests routed to Help Me Figure Out What I Need (rm-j001) instead of stretching single-flyer scope.",
    includedDeliverables: [
      {
        key: "flyer_design",
        quantity: 1,
        unit: "design",
        label: "One finished single-sided flyer design — one agreed size only",
      },
      {
        key: "print_ready_pdf",
        quantity: 1,
        unit: "file",
        label: "Print-ready PDF",
      },
      {
        key: "digital_share_file",
        quantity: 1,
        unit: "file",
        label: "Digital PNG or JPG version for sharing online (one agreed size)",
      },
    ],
    exclusions: [
      "Printing, shipping, or printer coordination",
      "More than one flyer",
      "Double-sided flyer",
      "Multiple sizes or platform versions",
      "Editable source files",
      "Photography, custom illustration, packaging, signage, website work",
      "Posting/publishing unless separately purchased",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 2–3 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "What is this flyer for?",
      "Exact text/details that must appear",
      "Offer, date, price, location, phone, website, or QR destination",
      "Logo, photos, colors, or brand materials",
      "Intended use: print, digital, or both",
      "Required flyer size, if known",
      "Any required wording/disclosures",
    ],
  }),
  batch1Base({
    sku: "v2-rtu-menu",
    clientFacingName: "Make Me a Menu",
    category: "marketing-assets",
    familyId: "marketing_assets",
    legacySourceSku: "ma-001",
    legacyPriceReferenceCents: 49500,
    legacyPriceReferenceNote:
      "ma-001 Promotion Pack is $495 for up to four marketing assets — menus listed as an example asset type, not a dedicated menu SKU.",
    priceCents: 45000,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-menu",
    clientResponsibilityAfterDelivery:
      "Client supplies final approved menu content and is responsible for the accuracy of prices, descriptions, dietary/allergen information, and legal wording.",
    scopeRoutingNote:
      "Anything beyond the base scope routes to Help Me Figure Out What I Need (rm-j001), not into this SKU.",
    includedDeliverables: [
      {
        key: "menu_design",
        quantity: 1,
        unit: "design",
        label:
          "One finished single-page menu — one agreed size only; up to 5 sections; up to 30 total menu/service items; client provides final item names, descriptions, prices, dietary/allergen labels, and required wording",
      },
      {
        key: "print_ready_pdf",
        quantity: 1,
        unit: "file",
        label: "Print-ready PDF",
      },
      {
        key: "digital_share_file",
        quantity: 1,
        unit: "file",
        label: "One digital PNG or JPG version",
      },
    ],
    exclusions: [
      "Bifold, trifold, booklet, multi-page, or table-service menus",
      "More than 5 sections or 30 items",
      "Price-list cleanup, rewriting, proofreading for business accuracy, or allergen verification",
      "Multiple sizes/versions",
      "Printing, shipping, vendor coordination, editable source files, photography, custom illustration, posting, or publishing",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 3–5 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Business name and type",
      "Menu sections (up to 5) and section order",
      "Complete item list with names, descriptions, prices (up to 30 items total)",
      "Dietary/allergen labels and required wording (client-supplied, client-verified)",
      "Logo, photos, colors, brand materials",
      "Intended use: print, digital, or both",
      "Required menu size, if known",
      "Any required disclaimers or legal wording (client-supplied)",
    ],
  }),
  batch1Base({
    sku: "v2-rtu-service-sheet",
    clientFacingName: "Make Me a Service Sheet",
    category: "marketing-assets",
    familyId: "marketing_assets",
    legacySourceSku: "ma-001",
    legacyPriceReferenceCents: 49500,
    legacyPriceReferenceNote:
      "ma-001 Promotion Pack is $495 for up to four marketing assets — one-page collateral listed as an example asset type, not a dedicated service-sheet SKU.",
    priceCents: 35000,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-service-sheet",
    clientResponsibilityAfterDelivery:
      "Client supplies final approved content and is responsible for the accuracy of service descriptions, starting prices, contact information, and legal wording.",
    scopeRoutingNote:
      "A client needing a long price list, packages, many service tiers, or a brochure gets routed to Help Me Figure Out What I Need (rm-j001) instead of stretching this job.",
    includedDeliverables: [
      {
        key: "service_sheet_design",
        quantity: 1,
        unit: "design",
        label:
          "One finished single-page service sheet — up to 10 services with brief descriptions only; optional starting prices or \"contact for pricing\" line; one agreed size",
      },
      {
        key: "print_ready_pdf",
        quantity: 1,
        unit: "file",
        label: "Print-ready PDF",
      },
      {
        key: "digital_share_file",
        quantity: 1,
        unit: "file",
        label: "One digital PNG or JPG",
      },
    ],
    exclusions: [
      "Food menus",
      "Detailed price lists with many line items",
      "More than 10 services",
      "Double-sided or multi-page collateral",
      "Brochures, catalogs, packages, websites, printing, or posting",
      "Editable files",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 2–3 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Final service names",
      "Accurate descriptions",
      "Any starting prices",
      "Contact details",
      "Required wording/disclosures",
      "Logo, photos, and brand materials if available",
    ],
  }),
  batch1Base({
    sku: "v2-rtu-social-posts",
    clientFacingName: "Make My Social Media Posts",
    category: "social-media",
    familyId: "social_media",
    legacySourceSku: "sm-001",
    legacyPriceReferenceCents: 39500,
    legacyPriceReferenceNote:
      "sm-001 Social Media Launch Set is $395 for up to six static posts plus calendar — this SKU is scoped to four posts with a simple posting order.",
    priceCents: 45000,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-social-posts",
    clientResponsibilityAfterDelivery:
      "Client uploads, posts, schedules, and handles replies, comments, DMs, analytics, and account activity through their own platform.",
    scopeRoutingNote:
      "Requests for multiple platforms, videos, a full monthly calendar, or ongoing posting should route to Help Me Figure Out What I Need (rm-j001) or a separate future service, not stretch this SKU.",
    includedDeliverables: [
      {
        key: "static_social_post",
        quantity: 4,
        unit: "posts",
        label:
          "Static social media post graphic — one campaign, offer, event, business focus, or message theme; built for one platform only; one caption for each post",
      },
      {
        key: "social_post_file",
        quantity: 4,
        unit: "files",
        label: "PNG or JPG post file in one agreed platform size",
      },
      {
        key: "posting_order",
        quantity: 1,
        unit: "document",
        label: "Simple recommended posting order (not a full calendar)",
      },
      {
        key: "caption_file",
        quantity: 1,
        unit: "file",
        label: "Caption document or plain-text caption file for all posts",
      },
    ],
    exclusions: [
      "Video, Reels, motion graphics, Stories, carousels, or animation",
      "More than one platform size/version",
      "Posting, scheduling, publishing, or account access",
      "Paid ads",
      "Photography or filming",
      "Daily content or ongoing management",
      "Comment/DM/community management",
      "Deep hashtag research",
      "More than 4 posts",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 3–5 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "What are these posts about?",
      "What do people need to know or do?",
      "Offer, event date, deadline, price, link, phone number, or call to action",
      "Which one platform are these for?",
      "Logo, photos, colors, or brand materials",
      "Any exact wording, required disclosures, or hashtags",
      "Anything that must not be said or shown",
    ],
  }),
  batch1Base({
    sku: "v2-rtu-promotion-graphics",
    clientFacingName: "Make My Campaign Graphics",
    category: "marketing-assets",
    familyId: "marketing_assets",
    legacySourceSku: "ma-001",
    legacyPriceReferenceCents: 49500,
    legacyPriceReferenceNote:
      "ma-001 Promotion Pack is $495 for up to four marketing assets — not a per-graphic price.",
    priceCents: 35000,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-promotion-graphics",
    clientResponsibilityAfterDelivery:
      "Client distributes finished graphics via print, social, email, or other channels through their own printer, platform, or account.",
    scopeRoutingNote:
      "Multi-campaign packs, large asset bundles, or unclear scope route to Help Me Figure Out What I Need (rm-j001) instead of stretching this SKU.",
    includedDeliverables: [
      {
        key: "campaign_graphic",
        quantity: 2,
        unit: "graphics",
        label:
          "Two branded campaign graphics for one campaign, event, offer, or launch — one agreed format/use per graphic; same campaign theme; no captions",
      },
      {
        key: "campaign_graphic_files",
        quantity: 2,
        unit: "files",
        label:
          "One finished file per campaign graphic — print-ready PDF and/or PNG or JPG (one agreed format/use per graphic)",
      },
    ],
    exclusions: [
      "More than 2 campaign graphics",
      "Multiple campaigns, offers, or themes",
      "Social post sets or captions",
      "Flyers, menus, service sheets, or handouts",
      "Video, motion graphics, or animation",
      "Photography or custom illustration",
      "Multiple size sets or format versions per graphic",
      "Printing, shipping, or vendor coordination",
      "Posting, publishing, or scheduling (unless separately purchased)",
      "Editable source files",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 3–5 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Campaign, offer, event, or launch focus",
      "Exact copy that must appear",
      "Dates, deadlines, or event details",
      "Call to action, link, phone, or QR destination",
      "Logo, photos, colors, or brand materials",
      "Intended use: print, social, email, in-store, or other",
      "Required size or format, if known",
      "Any required wording or disclosures",
    ],
  }),
  batch1Base({
    sku: "v2-rtu-handout",
    clientFacingName: "Make Me a Handout or One-Page PDF",
    batchLaunchCandidate: false,
    launchSetStatus: "held_broad_overlap",
    category: "marketing-assets",
    familyId: "marketing_assets",
    legacySourceSku: "ma-001",
    legacyPriceReferenceCents: 49500,
    legacyPriceReferenceNote:
      "ma-001 Promotion Pack is $495 for up to four marketing assets — one-page collateral listed as an example asset type, not a dedicated handout SKU.",
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    clientResponsibilityAfterDelivery:
      "Client prints, emails, uploads, or distributes the finished handout through their own tools and is responsible for the accuracy of content, contact information, and legal wording.",
    scopeRoutingNote:
      "Multi-page collateral, brochures, or packages route to Help Me Figure Out What I Need (rm-j001) instead of stretching this SKU.",
    includedDeliverables: [
      {
        key: "handout_design",
        quantity: 1,
        unit: "design",
        label: "One finished single-page handout or one-page PDF — one agreed size only",
      },
      {
        key: "print_ready_pdf",
        quantity: 1,
        unit: "file",
        label: "Print-ready PDF",
      },
      {
        key: "digital_share_file",
        quantity: 1,
        unit: "file",
        label: "One digital PNG or JPG version",
      },
    ],
    exclusions: [
      "Multi-page handouts or booklets",
      "Brochures, catalogs, or packages",
      "Double-sided beyond a single page",
      "Food menus with item/price lists (route to menu SKU)",
      "More than one handout",
      "Printing, shipping, or vendor coordination",
      "Posting, publishing, or scheduling (unless separately purchased)",
      "Editable source files",
      "Photography or custom illustration",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 2–3 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Handout purpose (event, service overview, offer summary, etc.)",
      "Content and copy (client supplies final approved content)",
      "Contact information",
      "Logo, photos, colors, or brand materials",
      "Intended use: print, digital, email, or other",
      "Required size, if known",
      "Any required disclaimers or legal wording (client-supplied)",
    ],
  }),
];

/** Batch 1 launch candidate SKUs — five services approved for launch-set review (handout excluded). */
export const CATALOG_V2_BATCH1_LAUNCH_CANDIDATE_SKUS = [
  "v2-rtu-flyer",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
] as const;

/** Batch 1 launch candidate entries — filters out held-overlap SKUs (e.g. handout). */
export const CATALOG_V2_BATCH1_LAUNCH_CANDIDATES: readonly CatalogV2ServiceEntry[] =
  CATALOG_V2_BATCH1_READY_TO_USE.filter((entry) => entry.batchLaunchCandidate !== false);

/** Batch 1 draft entries only — for review tooling (all six held SKUs). */
export function getBatch1ReadyToUseDraftEntries(): readonly CatalogV2ServiceEntry[] {
  return CATALOG_V2_BATCH1_READY_TO_USE;
}

/** Batch 1 launch candidate entries only — five SKUs for shelf/launch review. */
export function getBatch1LaunchCandidateEntries(): readonly CatalogV2ServiceEntry[] {
  return CATALOG_V2_BATCH1_LAUNCH_CANDIDATES;
}

/** All draft-only proposed entries (Batch 1 today). */
export function getDraftOnlyCatalogV2Entries(
  catalog: readonly CatalogV2ServiceEntry[],
): readonly CatalogV2ServiceEntry[] {
  return catalog.filter((entry) => entry.isDraftOnly === true);
}
