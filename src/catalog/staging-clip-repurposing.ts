/**
 * Unpublished Clip Repurposing catalog row.
 * Not a Route Map shelf entry. Not a public Launch Now candidate.
 */

import type { StudioServiceEntry } from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";
import { CLIP_REPURPOSING_INTAKE_TEMPLATE } from "@/config/studio-clip-repurposing-launch-integration-v1";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";

export const STAGING_CLIP_REPURPOSING_SERVICE: StudioServiceEntry = {
  schemaVersion: CATALOG_SCHEMA_VERSION,
  id: CLIP_REPURPOSING_SKU,
  familyId: "marketing_video",
  name: "Clip Repurposing",
  category: "video-production",
  serviceClass: "core",
  customerReceives:
    "Three distinct 15–30 second vertical MP4s 1080×1920 from one 15–60 minute native-vertical English talking-head, with captions, finished audio, and your CTA",
  internalProductionNotes:
    "Unpublished internal SELL NOW. Dedicated clip_repurposing_pipeline. Not the $349 single-edit hook. Not the $149 stills hook.",
  dependencies: [],
  includedRevisionRounds: 1,
  canSubstitute: false,
  addOnEligible: false,
  upgradeEligible: false,
  deliveryFormats: [],
  minimumCustomerRequirements: [
    "Upload one 15–60 minute native-vertical English talking-head you own or have permission to use",
    "Confirm rights and likeness",
    "Supply the exact CTA wording",
    "Post or publish the finished MP4s yourself",
  ],
  recommendedCustomerRequirements: [],
  serviceStatus: "active",
  status: "active",
  billingType: "one_time",
  priceCents: 54900,
  productionLane: "complex_build",
  firstReviewWindow: { minDays: 3, maxDays: 5, label: "3–5 business days after intake" },
  finalDeliveryWindow: { minDays: 5, maxDays: 8, label: "5–8 business days after approval" },
  purpose:
    "One 15–60 minute native-vertical English talking-head. The Studio finds three distinct 15–30 second 1080×1920 shorts with spoken-word captions, finished audio, and your CTA. You post them. If fewer than three distinct shorts exist, the customer receives the frozen $349 / $449 / cannot-complete treatment instead of a quiet short set.",
  deliverables: [
    "Three distinct 15–30 second vertical MP4 1080×1920 shorts from one long talking-head",
    "Spoken-word captions burned locally",
    "Customer-supplied CTA on the end cards",
    "One included set revision",
  ],
  exclusions: [
    "Landscape-to-vertical intelligent reframing",
    "B-roll sourcing",
    "Stock footage or AI-generated footage",
    "Music selection or licensing",
    "Narration",
    "Non-English editing",
    "Multiple aspect ratios",
    "Studio posting",
    "Three independent $349 jobs",
    "Invented filler clips",
  ],
  revisionRule: "One included set revision — swap one clip, change the shared CTA, or adjust end-card hold.",
  clientResponsibilities: [
    "Upload one 15–60 minute native-vertical English talking-head you own or have permission to use",
    "Confirm rights and likeness",
    "Supply the exact CTA wording",
    "Post or publish the finished MP4s yourself",
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
    items: [
      { key: "clip_repurposing_set", quantity: 3, unit: "video" },
    ],
  },
  discoveryTriggers: [],
  discoveryMapping: [],
  intakeTemplate: CLIP_REPURPOSING_INTAKE_TEMPLATE,
};

export const STAGING_CLIP_REPURPOSING_SERVICES: readonly StudioServiceEntry[] = [];
