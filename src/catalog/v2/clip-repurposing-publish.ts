/**
 * Live publish draft for $549 Clip Repurposing.
 * Not the $349 single talking-head edit. Not the $149 stills short video.
 */

import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";
import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { CATALOG_V2_SCOPE_OVERFLOW_NOTE } from "@/catalog/v2/batch1-ready-to-use";
import { CATALOG_V2_BATCH2_DELIVERY_RULE } from "@/catalog/v2/batch2-ready-to-use";
import { CLIP_REPURPOSING_INTAKE_TEMPLATE } from "@/config/studio-clip-repurposing-launch-integration-v1";
import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";

export const CLIP_REPURPOSING_PUBLISH_DRAFT: CatalogV2ServiceEntry = {
  schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
  sku: "v2-rtu-clip-repurposing",
  clientFacingName: studioClipRepurposingBuildV1.sku.customerFacingName,
  category: "video-production",
  familyId: "marketing_video",
  laneEligibility: ["i75", "i20", "random-exit"],
  routeMapEligible: true,
  directExitEligible: true,
  placement: "both",
  deliveryType: "ready_to_use",
  includedDeliverables: [
    {
      key: "clip_repurposing_set",
      quantity: 3,
      unit: "video",
      label:
        "Three distinct 15–30 second vertical MP4s 1080×1920 from one 15–60 minute native-vertical English talking-head, with spoken-word captions, finished audio, and your CTA",
    },
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
  revisionLimit: 1,
  turnaround: "3–5 business days after intake",
  priceCents: 54900,
  priceNote: "certified public price",
  billingType: "one_time",
  intakeTemplate: CLIP_REPURPOSING_INTAKE_TEMPLATE,
  availability: "active",
  sourceLaunchStatus: "limited",
  productionLane: "complex_build",
  sourceExecutionMode: "creation_delivery",
  isRouteMapJob: true,
  isDraftOnly: false,
  draftBatch: "clip-repurposing-public-publish",
  batchLaunchCandidate: true,
  launchSetStatus: "launch_candidate",
  deliveryRule: CATALOG_V2_BATCH2_DELIVERY_RULE,
  clientResponsibilities: [
    "Upload one 15–60 minute native-vertical English talking-head you own or have permission to use",
    "Confirm rights and likeness",
    "Supply the exact CTA wording",
    "Post or publish the finished MP4s yourself",
  ],
  turnaroundApprovalStatus: "approved",
  scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
};

export const CLIP_REPURPOSING_PUBLISH_DRAFTS = [
  CLIP_REPURPOSING_PUBLISH_DRAFT,
] as const;
