/**
 * Public Launch Now integration for frozen $349 Short-Form Video Editing.
 * Does not reopen the certified factory. Does not wire Clip Repurposing.
 */

import {
  SHORT_FORM_VIDEO_EDITING_SKU,
  SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE,
  studioShortFormVideoEditingBuildV1,
} from "@/config/studio-short-form-video-editing-build-v1";
import { LEARN_MORE_PURPOSE } from "@/config/studio-short-form-content-pack-public-switch-v1";

export const STUDIO_SHORT_FORM_VIDEO_EDITING_LAUNCH_INTEGRATION_PACKAGE_ID =
  "STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-LAUNCH-NOW-INTEGRATION-1" as const;

export const FOOTAGE_EDITING_INTAKE_TEMPLATE =
  "rtu-short-form-video-edit" as const;

export const FOOTAGE_EDITING_PRIMARY_TOOL_ID =
  "footage_editing_pipeline" as const;

export const studioShortFormVideoEditingLaunchIntegrationV1 = {
  packageId: STUDIO_SHORT_FORM_VIDEO_EDITING_LAUNCH_INTEGRATION_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-25" as const,
  skuId: SHORT_FORM_VIDEO_EDITING_SKU,
  notTheStillsSku: SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE,
  priceCents: studioShortFormVideoEditingBuildV1.sku.priceCents,
  customerFacingName: "Short-Form Content Pack" as const,
  publicMenuPublished: true as const,
  onLaunchMenu: true as const,
  doNotPublish: false as const,
  doNotWireLaunchNowPublicShelf: false as const,
  doNotWireClipRepurposing: true as const,
  doNotReopenCertifiedFactory: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  intakeTemplate: FOOTAGE_EDITING_INTAKE_TEMPLATE,
  primaryToolId: FOOTAGE_EDITING_PRIMARY_TOOL_ID,
  promise: LEARN_MORE_PURPOSE,
  remainingPublicPublishAuthorization: false as const,
} as const;

export function isFootageEditingLaunchSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === SHORT_FORM_VIDEO_EDITING_SKU;
}

export function allowFootageEditingCheckout(
  skuId: string | null | undefined,
): boolean {
  return skuId === SHORT_FORM_VIDEO_EDITING_SKU;
}

export function allowInternalStagingCheckout(
  skuId: string | null | undefined,
): boolean {
  return allowFootageEditingCheckout(skuId);
}
