/**
 * Live publish draft for $349 Short-Form Content Pack.
 * Not Clip Repurposing. Not the $149 stills short video.
 */

import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";
import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { CATALOG_V2_SCOPE_OVERFLOW_NOTE } from "@/catalog/v2/batch1-ready-to-use";
import { CATALOG_V2_BATCH2_DELIVERY_RULE } from "@/catalog/v2/batch2-ready-to-use";
import { FOOTAGE_EDITING_INTAKE_TEMPLATE } from "@/config/studio-short-form-video-editing-launch-integration-v1";
import { shortFormContentPackContractV1 } from "@/config/studio-short-form-content-pack-v1";

export const SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT: CatalogV2ServiceEntry = {
  schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
  sku: "v2-rtu-short-form-video-edit",
  clientFacingName: shortFormContentPackContractV1.customerFacingName,
  category: "video-production",
  familyId: "marketing_video",
  laneEligibility: ["i75", "i20", "random-exit"],
  routeMapEligible: true,
  directExitEligible: true,
  placement: "both",
  deliveryType: "ready_to_use",
  includedDeliverables: [
    {
      key: "content_pack_set",
      quantity: 1,
      unit: "set",
      label: "Up to 3 polished 15–30 second shorts with captions, music where appropriate, relevant B-roll where appropriate, pacing, audio finish, and your CTA",
    },
    {
      key: "post_captions",
      quantity: 1,
      unit: "set",
      label: "3 matching post captions",
    },
    {
      key: "cover_graphics",
      quantity: 1,
      unit: "set",
      label: "3 cover or title graphics",
    },
    {
      key: "use_guide",
      quantity: 1,
      unit: "guide",
      label: "1 simple posting and use guide",
    },
  ],
  exclusions: [
    ...shortFormContentPackContractV1.whatsNotIncluded,
    "Landscape-to-vertical intelligent reframing",
    "Narration",
    "Non-English editing",
    "Multiple aspect ratios",
    "Stills-to-video assembly",
  ],
  revisionLimit: 1,
  turnaround: "3–5 business days after intake",
  priceCents: 34900,
  priceNote: "certified public price",
  billingType: "one_time",
  intakeTemplate: FOOTAGE_EDITING_INTAKE_TEMPLATE,
  availability: "active",
  sourceLaunchStatus: "limited",
  productionLane: "complex_build",
  sourceExecutionMode: "creation_delivery",
  isRouteMapJob: true,
  isDraftOnly: false,
  draftBatch: "short-form-video-edit-public-publish",
  batchLaunchCandidate: true,
  launchSetStatus: "launch_candidate",
  deliveryRule: CATALOG_V2_BATCH2_DELIVERY_RULE,
  clientResponsibilities: [...shortFormContentPackContractV1.youProvide],
  turnaroundApprovalStatus: "approved",
  scopeRoutingNote: CATALOG_V2_SCOPE_OVERFLOW_NOTE,
};

export const SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFTS = [
  SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT,
] as const;
