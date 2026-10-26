/**
 * Unpublished Clip Repurposing customer-journey integration.
 * Does not reopen the certified set factory. Does not publish.
 */

import {
  CLIP_REPURPOSING_SKU,
  studioClipRepurposingBuildV1,
} from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

export const STUDIO_CLIP_REPURPOSING_STAGING_JOURNEY_PACKAGE_ID =
  "STUDIO-OPERATING-CLIP-REPURPOSING-STAGING-JOURNEY-1" as const;

export const CLIP_REPURPOSING_INTAKE_TEMPLATE = "rtu-clip-repurposing" as const;

export const CLIP_REPURPOSING_PRIMARY_TOOL_ID =
  "clip_repurposing_pipeline" as const;

export const studioClipRepurposingLaunchIntegrationV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_STAGING_JOURNEY_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-25" as const,
  skuId: CLIP_REPURPOSING_SKU,
  notTheFootageSku: SHORT_FORM_VIDEO_EDITING_SKU,
  notTheStillsSku: "v2-rtu-short-video",
  priceCents: studioClipRepurposingBuildV1.sku.priceCents,
  oneClipCents: 34900,
  twoClipCents: 44900,
  fullPackageCents: 54900,
  customerFacingName: studioClipRepurposingBuildV1.sku.customerFacingName,
  publicMenuPublished: true as const,
  onLaunchMenu: true as const,
  doNotPublish: false as const,
  doNotWireLaunchNowPublicShelf: false as const,
  doNotReopenCertifiedFactory: true as const,
  doNotReopenShortFormEditing: true as const,
  doNotReopenStillsVideo: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  intakeTemplate: CLIP_REPURPOSING_INTAKE_TEMPLATE,
  primaryToolId: CLIP_REPURPOSING_PRIMARY_TOOL_ID,
  promise:
    "One 15–60 minute native-vertical English talking-head. The Studio finds three distinct 15–30 second 1080×1920 shorts with captions, finished audio, and your CTA. You post them. One included set revision." as const,
} as const;

export function isClipRepurposingLaunchSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === CLIP_REPURPOSING_SKU;
}

export function allowClipRepurposingStagingCheckout(
  skuId: string | null | undefined,
): boolean {
  return skuId === CLIP_REPURPOSING_SKU;
}
