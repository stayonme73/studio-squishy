/**
 * Short-video SKU contract truth — preserve existing catalog/production limits.
 * Do not expand the offer. Do not certify.
 */

import {
  PRODUCTION_READINESS_LABELS,
  resolveServiceProductionContract,
} from "../resolve-contract";

export const VIDEO_PRODUCTION_SKUS = ["v2-rtu-short-video"] as const;
export type VideoProductionSku = (typeof VIDEO_PRODUCTION_SKUS)[number];

/** Catalog deliverable authority (not intake lead copy). */
export const VIDEO_DURATION_MIN_SECONDS = 15 as const;
export const VIDEO_DURATION_MAX_SECONDS = 30 as const;
export const VIDEO_ALLOWED_EXTENSIONS = ["mp4"] as const;
export const VIDEO_ASPECT_RATIO_CHOICES = ["vertical", "square", "landscape"] as const;
export type VideoAspectRatioChoice = (typeof VIDEO_ASPECT_RATIO_CHOICES)[number];

export type VideoSkuContractTruth = {
  skuId: VideoProductionSku;
  clientFacingName: string;
  producerRole: string;
  readiness: string;
  readinessLabel: string;
  promisedDeliverable: string;
  videoCount: 1;
  durationSecondsMin: typeof VIDEO_DURATION_MIN_SECONDS;
  durationSecondsMax: typeof VIDEO_DURATION_MAX_SECONDS;
  aspectRatioChoices: readonly VideoAspectRatioChoice[];
  aspectRatioRule: "one_only";
  /** No numeric resolution/fps promise exists in catalog authority. */
  resolutionPromise: "unspecified";
  frameRatePromise: "unspecified";
  fileFormat: "mp4";
  captionsAndCtaRequired: true;
  voiceOverIncluded: "optional_reuse_certified_mp3";
  musicPromise: "music_licensing_outside_approved_tools_excluded";
  stockMediaPromise: "approved_studio_or_stock_or_ai_named_but_source_unapproved";
  revisionLimit: 1;
  publishingExcluded: true;
  filmingExcluded: true;
  exclusionsSummary: readonly string[];
  clientInputs: readonly string[];
  qaRequirements: readonly string[];
  primaryToolId: "capcut";
  primaryToolIntegrationState: string;
  primaryToolReadiness: string;
  /** Intake lead still says "up to 45 seconds" — explicit discrepancy, not authority. */
  intakeLeadDurationDiscrepancy: string;
};

export function videoSkuContractTruth(skuId: VideoProductionSku): VideoSkuContractTruth {
  const resolved = resolveServiceProductionContract(skuId);
  if (resolved.status !== "resolved") {
    throw new Error(`Video SKU ${skuId} did not resolve a production contract`);
  }
  const c = resolved.contract;

  return {
    skuId,
    clientFacingName: "Make Me a Short Video",
    producerRole: c.producerRole,
    readiness: c.readiness,
    readinessLabel: PRODUCTION_READINESS_LABELS[c.readiness],
    promisedDeliverable:
      "One basic short-form video, 15–30 seconds — one format only (vertical, square, or landscape); final MP4 with basic edit, on-screen captions, and CTA treatment",
    videoCount: 1,
    durationSecondsMin: VIDEO_DURATION_MIN_SECONDS,
    durationSecondsMax: VIDEO_DURATION_MAX_SECONDS,
    aspectRatioChoices: VIDEO_ASPECT_RATIO_CHOICES,
    aspectRatioRule: "one_only",
    resolutionPromise: "unspecified",
    frameRatePromise: "unspecified",
    fileFormat: "mp4",
    captionsAndCtaRequired: true,
    voiceOverIncluded: "optional_reuse_certified_mp3",
    musicPromise: "music_licensing_outside_approved_tools_excluded",
    stockMediaPromise: "approved_studio_or_stock_or_ai_named_but_source_unapproved",
    revisionLimit: 1,
    publishingExcluded: true,
    filmingExcluded: true,
    exclusionsSummary: [
      "On-site filming, drone, talent casting",
      "Outside freelancers / production vendors",
      "Photography or custom illustration source creation",
      "Advanced custom animation or motion graphics",
      "Multiple aspect ratios, cuts, or versions",
      "Video longer than 30 seconds",
      "Music licensing outside approved tools",
      "Paid ads / placement / influencer work",
      "Posting, publishing, or scheduling",
      "Ongoing edits or daily content",
      "Performance guarantees",
      "More than one revision round",
    ],
    clientInputs: [
      "Video purpose (campaign / offer / event / service / promotion)",
      "One format choice: vertical, square, or landscape",
      "Organized usable footage/photos/logo OR approved Studio/stock/AI visuals (source must be authorized)",
      "Exact on-screen text, offer details, dates, and CTA",
      "Brand colors/fonts/style references when available",
      "Client-supplied disclaimers/legal wording when required",
      "Anything that must not be shown or said",
      "Client posts/distributes the finished video",
    ],
    qaRequirements: [
      "Runtime 15–30 seconds",
      "One aspect ratio only",
      "Captions and CTA treatment present",
      "Customer footage/assets usable or approved Studio assets used",
      "Studio QC review before delivery",
    ],
    primaryToolId: "capcut",
    primaryToolIntegrationState: c.primaryTool.integrationState,
    primaryToolReadiness: c.primaryTool.toolReadiness,
    intakeLeadDurationDiscrepancy:
      'Intake lead still says "up to 45 seconds"; catalog/contract authority is 15–30 seconds with exclusion longer than 30 seconds.',
  };
}
