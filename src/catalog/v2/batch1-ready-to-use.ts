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
import { buildRouteMapTimingLabel } from "@/catalog/route-map-shared-copy";

export const CATALOG_V2_BATCH1_READY_TO_USE_BATCH_ID = "batch1-ready-to-use" as const;

/** Shared price note — approved public V1 price for Batch 1 launch candidates (V2 draft only). */
export const CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE =
  "approved public V1 price (Batch 1 ready-to-use)";

/** Internal scope-overflow note — not customer-facing. */
export const CATALOG_V2_SCOPE_OVERFLOW_NOTE =
  "Not included in this SKU. Browse your route or ask Squishy for help choosing a verified service.";

/** Shared ready-to-use delivery rule — documented on each Batch 1 record. */
export const CATALOG_V2_RTU_DELIVERY_RULE =
  "The Studio creates finished files. You print, upload, post, send, schedule, or distribute using your own tools and accounts.";

export const CATALOG_V2_RTU_CLIENT_RESPONSIBILITY: readonly string[] = [
  "Print, upload, post, send, schedule, or distribute delivered files using your own tools and accounts.",
];

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
  clientResponsibilities?: readonly string[];
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
    | "clientResponsibilities"
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
    clientResponsibilities: CATALOG_V2_RTU_CLIENT_RESPONSIBILITY,
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
      "ma-001 Promotion Pack is $495 for up to four marketing assets — not a per-flyer price. Approved working launch price for this SKU is $69.",
    priceCents: 6900,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-flyer",
    clientResponsibilities: [
      "Final wording, prices, logo, images, and contact details you want on the flyer",
      "Print, upload, post, email, or distribute the finished files yourself",
      "Use your own printer, platform, or account for distribution",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
    includedDeliverables: [
      {
        key: "design_direction",
        quantity: 1,
        unit: "direction",
        label: "One defined design direction",
      },
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
      {
        key: "qc_review",
        quantity: 1,
        unit: "review",
        label: "Studio quality-control review before delivery",
      },
    ],
    exclusions: [
      "Printing, shipping, or printer coordination",
      "Outside freelancers, voice actors, printers, or production vendors",
      "More than one flyer",
      "Double-sided flyer",
      "Multiple sizes or platform versions",
      "Editable source files",
      "Photography, custom illustration, packaging, signage, website work",
      "Posting, publishing, or scheduling",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: buildRouteMapTimingLabel("within 2–3 business days"),
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "quick_turn",
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
    priceCents: 8900,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-menu",
    clientResponsibilities: [
      "Provide final, approved menu content",
      "Confirm prices and item descriptions are accurate",
      "Confirm dietary and allergen information is accurate",
      "Confirm any required legal wording is accurate",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
    includedDeliverables: [
      {
        key: "design_direction",
        quantity: 1,
        unit: "direction",
        label: "One defined design direction",
      },
      {
        key: "menu_design",
        quantity: 1,
        unit: "design",
        label:
          "One finished single-page menu — one agreed size only; up to 5 sections; up to 30 total items (defined item limit)",
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
      {
        key: "qc_review",
        quantity: 1,
        unit: "review",
        label: "Studio quality-control review before delivery",
      },
    ],
    exclusions: [
      "Bifold, trifold, booklet, multi-page, or table-service menus",
      "More than 5 sections or 30 items",
      "Printing, shipping, or physical menu production",
      "Outside freelancers, voice actors, printers, or production vendors",
      "Price-list cleanup, rewriting, proofreading for business accuracy, or allergen verification",
      "Multiple sizes/versions",
      "Printing, shipping, vendor coordination, editable source files, photography, custom illustration, posting, or publishing",
    ],
    revisionLimit: 1,
    turnaround: buildRouteMapTimingLabel("within 3–5 business days"),
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
    priceCents: 7900,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-service-sheet",
    clientResponsibilities: [
      "Provide final, approved service descriptions and content",
      "Confirm starting prices and contact information are accurate",
      "Confirm any required legal wording is accurate",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
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
      "Outside freelancers, voice actors, printers, or production vendors",
      "Editable files",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: buildRouteMapTimingLabel("within 2–3 business days"),
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
      "sm-001 Social Media Launch Set is $395 for up to six static posts plus calendar — approved working launch price for four coordinated static posts is $99.",
    priceCents: 9900,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-social-posts",
    clientResponsibilities: [
      "Final wording, prices, logo, images, and contact details for the posts",
      "Upload, post, and schedule the finished graphics yourself",
      "Handle replies, comments, direct messages, and other account activity",
      "Use your own platform account",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
    includedDeliverables: [
      {
        key: "static_social_post",
        quantity: 4,
        unit: "posts",
        label:
          "Four coordinated static post graphics — one campaign, offer, event, business focus, or message theme; built for one platform only; one caption for each post",
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
      "Posting, scheduling, publishing, content management, or account access",
      "Paid ads or ad management",
      "Outside freelancers, voice actors, printers, or production vendors",
      "Photography or filming",
      "Daily content or ongoing management",
      "Comment/DM/community management",
      "Deep hashtag research",
      "More than 4 posts",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: buildRouteMapTimingLabel("within 3–5 business days"),
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
      "ma-001 Promotion Pack is $495 for up to four marketing assets — approved working launch price for two coordinated static graphics is $79.",
    priceCents: 7900,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: true,
    placement: "both",
    laneEligibility: ["i75", "i20", "update", "random-exit"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-promotion-graphics",
    clientResponsibilities: [
      "Distribute the finished graphics yourself through print, social media, email, or other channels",
      "Use your own printer, platform, or account",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
    includedDeliverables: [
      {
        key: "campaign_graphic",
        quantity: 2,
        unit: "graphics",
        label:
          "Two coordinated static campaign graphics for one campaign, event, offer, or launch — same campaign theme; one agreed format/use per graphic; no captions",
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
      "Outside freelancers, voice actors, printers, or production vendors",
      "Posting, publishing, or scheduling",
      "Editable source files",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: buildRouteMapTimingLabel("within 3–5 business days"),
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
    sku: "v2-rtu-business-card",
    clientFacingName: "Make Me a Business Card",
    category: "marketing-assets",
    familyId: "marketing_assets",
    priceCents: 4900,
    priceNote: CATALOG_V2_BATCH1_PUBLIC_V1_PRICE_NOTE,
    routeMapEligible: true,
    directExitEligible: false,
    placement: "route_map",
    laneEligibility: ["i75"],
    turnaroundApprovalStatus: "approved",
    intakeTemplate: "rtu-business-card",
    clientResponsibilities: [
      "Final contact details, wording, logo, and brand colors for the card",
      "Business name, name and title, phone, email, website or social link, and address if desired",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
    includedDeliverables: [
      {
        key: "design_direction",
        quantity: 1,
        unit: "direction",
        label: "One defined design direction",
      },
      {
        key: "business_card_design",
        quantity: 1,
        unit: "design",
        label: "One double-sided business card design — design only; one person or version; one agreed size",
      },
      {
        key: "card_size",
        quantity: 1,
        unit: "size",
        label: "One agreed card size",
      },
      {
        key: "print_ready_pdf",
        quantity: 1,
        unit: "file",
        label: "Print-ready PDF",
      },
      {
        key: "digital_preview",
        quantity: 1,
        unit: "file",
        label: "Digital PNG or JPG preview",
      },
      {
        key: "qc_review",
        quantity: 1,
        unit: "review",
        label: "Studio quality-control review before delivery",
      },
    ],
    exclusions: [
      "Printing, shipping, or physical card production",
      "Outside freelancers, voice actors, printers, or production vendors",
      "Logo creation",
      "Custom illustration",
      "Multiple employee versions",
      "Multiple card sizes",
      "Editable source files",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: buildRouteMapTimingLabel("within 2–3 business days"),
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "quick_turn",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Business name",
      "Name and title for the card",
      "Phone number and email address",
      "Website or social link",
      "Business address, if desired",
      "Logo and brand colors, if available",
      "Preferred card size, if known",
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
    clientResponsibilities: [
      "Client prints, emails, uploads, or distributes the finished handout through their own tools and is responsible for the accuracy of content, contact information, and legal wording.",
    ],
    scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
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
      "Posting, publishing, or scheduling",
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
