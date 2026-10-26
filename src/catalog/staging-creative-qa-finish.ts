/**
 * Internal production row for Creative QA & Finish.
 * The customer buys it through the condensed package door.
 * This row is not a recommendation and not a Route Map shelf item.
 */

import type { StudioServiceEntry } from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";

import { CREATIVE_QA_FINISH_SKU } from "@/lib/studio-creative-qa-finish/contract";

export const STAGING_CREATIVE_QA_FINISH_SERVICE: StudioServiceEntry = {
  schemaVersion: CATALOG_SCHEMA_VERSION,
  id: CREATIVE_QA_FINISH_SKU,
  familyId: "marketing_assets",
  name: "Creative QA & Finish",
  category: "design-services",
  serviceClass: "essential",
  customerReceives:
    "A 1080 by 1080 PNG of each existing static file you supplied, one or two files, with the artwork kept whole.",
  internalProductionNotes:
    "Source-agnostic static finish. Contain the customer's raster on a 1080 square with a margin. Do not redraw type, color, font, or layout, and do not route through another design SKU.",
  dependencies: [],
  includedRevisionRounds: 3,
  canSubstitute: false,
  addOnEligible: false,
  upgradeEligible: false,
  deliveryFormats: ["static-design"],
  minimumCustomerRequirements: [
    "One or two existing static assets",
    "The facts, prices, dates, or claims that must stay as written",
    "Permission to use and adapt the supplied creative",
  ],
  recommendedCustomerRequirements: [],
  serviceStatus: "active",
  status: "inactive",
  billingType: "one_time",
  priceCents: 12900,
  productionLane: "standard_build",
  firstReviewWindow: {
    minDays: 2,
    maxDays: 4,
    label: "2–4 business days after the assets and facts are in",
  },
  finalDeliveryWindow: {
    minDays: 1,
    maxDays: 3,
    label: "1–3 business days after approval",
  },
  purpose:
    "Finish one or two existing static files on a 1080 square with a margin. Keep the words and prices as supplied. Do not rebuild the file.",
  deliverables: [
    "1080 by 1080 PNG for each static file you supplied",
    "What We Fixed summary",
  ],
  exclusions: [
    "Video",
    "A net-new campaign",
    "Printing coordination",
    "More than two static assets",
    "Rewriting headlines, prices, or other wording",
    "Brand-color, font, or layout changes inside the artwork",
    "Full reconstruction",
    "Business card, flyer, menu, or social-post production",
  ],
  revisionRule: "Three revision rounds. A revision may ask for more margin, less margin, or the same finish.",
  clientResponsibilities: [
    "Supply one or two existing static assets",
    "Confirm the facts, prices, dates, or claims that must stay as written",
    "Confirm permission to use and adapt the creative",
  ],
  executionMode: "creation_delivery",
  requiresClientAccess: false,
  requiresClientMaterials: true,
  isRecommendable: false,
  isAddable: false,
  launchStatus: "limited",
  serviceGuideFaq: [],
  deliveryMapping: {
    fulfillmentMode: "project",
    items: [{ key: "creative_qa_finish_file", quantity: 1, unit: "design" }],
  },
  discoveryTriggers: [],
  discoveryMapping: [],
};

export const STAGING_CREATIVE_QA_FINISH_SERVICES: readonly StudioServiceEntry[] = [
  STAGING_CREATIVE_QA_FINISH_SERVICE,
];
