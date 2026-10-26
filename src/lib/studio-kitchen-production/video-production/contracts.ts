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
export const VIDEO_ASPECT_RATIO_CHOICES = ["vertical"] as const;
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
  resolutionPromise: "1080x1920" | "unspecified";
  frameRatePromise: "unspecified";
  fileFormat: "mp4";
  captionsAndCtaRequired: true;
  voiceOverIncluded: "not_sold" | "optional_reuse_certified_mp3";
  musicPromise: "not_sold" | "music_licensing_outside_approved_tools_excluded";
  stockMediaPromise: "not_sold" | "approved_studio_or_stock_or_ai_named_but_source_unapproved";
  revisionLimit: 1;
  publishingExcluded: true;
  filmingExcluded: true;
  exclusionsSummary: readonly string[];
  clientInputs: readonly string[];
  qaRequirements: readonly string[];
  primaryToolId: "shotstack" | "capcut";
  primaryToolIntegrationState: string;
  primaryToolReadiness: string;
  /** Intake lead reconciled to 15–30s in KITCHEN-VIDEO-OPERATIONAL-1 (was 45s discrepancy). */
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
      "One 15–30 second vertical video (1080×1920) assembled from your still photos with on-screen captions and a CTA. You post it. Not footage editing, voice, music, extra sizes, or Studio posting.",
    videoCount: 1,
    durationSecondsMin: VIDEO_DURATION_MIN_SECONDS,
    durationSecondsMax: VIDEO_DURATION_MAX_SECONDS,
    aspectRatioChoices: VIDEO_ASPECT_RATIO_CHOICES,
    aspectRatioRule: "one_only",
    resolutionPromise: "1080x1920",
    frameRatePromise: "unspecified",
    fileFormat: "mp4",
    captionsAndCtaRequired: true,
    voiceOverIncluded: "not_sold",
    musicPromise: "not_sold",
    stockMediaPromise: "not_sold",
    revisionLimit: 1,
    publishingExcluded: true,
    filmingExcluded: true,
    exclusionsSummary: [
      "Customer footage editing",
      "Studio-created footage",
      "Stock footage or AI visuals",
      "Narration or voice",
      "Studio music",
      "Landscape or square versions",
      "On-site filming, drone, talent casting",
      "Posting, publishing, or scheduling",
      "More than one revision round",
      "Owner or Scout finishing the video after QA exhausts",
    ],
    clientInputs: [
      "Video purpose (campaign / offer / event / service / promotion)",
      "Vertical 1080×1920 only",
      "1–4 customer-cleared still photos (PNG or JPG)",
      "Exact on-screen text, offer details, dates, and CTA",
      "Brand colors/fonts/style references when available",
      "Client-supplied disclaimers/legal wording when required",
      "Anything that must not be shown or said",
      "Client posts the finished video",
    ],
    qaRequirements: [
      "Runtime 15–30 seconds",
      "Vertical 1080×1920 only",
      "Captions and CTA treatment present",
      "1–4 customer-cleared still photos — no footage, stock, or Studio substitute",
      "Studio QC review before delivery",
    ],
    primaryToolId: c.primaryTool.toolId === "shotstack" ? "shotstack" : "capcut",
    primaryToolIntegrationState: c.primaryTool.integrationState,
    primaryToolReadiness: c.primaryTool.toolReadiness,
    intakeLeadDurationDiscrepancy:
      "Reconciled in KITCHEN-VIDEO-OPERATIONAL-1: intake lead now matches catalog authority (15–30 seconds).",
  };
}
