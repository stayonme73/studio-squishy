/**
 * STUDIO-OPERATING-LIVE-SHOTSTACK-CERTIFICATION-1
 *
 * Package F: prove the live Shotstack provider path for launch short-video.
 * Captions-only unless the tested service contract requires narration.
 * Voice / ElevenLabs remain HOLD. Do not expand the launch menu.
 * Do not touch Maya. Review proof is not Final Delivery.
 */

import { LAUNCH_MENU_VIDEO_SKU } from "@/config/studio-launch-menu-production-runtime-v1";

export const studioLiveShotstackCertificationV1 = {
  packageId: "STUDIO-OPERATING-LIVE-SHOTSTACK-CERTIFICATION-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotTouchMaya: true as const,
  doNotStartVoice: true as const,
  doNotMakeVoiceADependency: true as const,
  doNotExpandLaunchMenu: true as const,
  doNotRedesignReviewRoom: true as const,
  doNotModifyRefundPolicy: true as const,
  doNotModifyCustomerRevisionPolicy: true as const,
  reviewIsNotFinalDelivery: true as const,
  openingVideoConsumesZeroRevisionRounds: true as const,
  captionsOnlyUnlessNarrationRequired: true as const,
  ownerRoutineProduction: "NONE" as const,
  scoutIsNotTheProducer: true as const,
  mockedProviderCannotEarnA: true as const,
  skuId: LAUNCH_MENU_VIDEO_SKU,
  audioMode: "captions_only" as const,
  stockAllowed: false as const,
} as const;

export const LIVE_SHOTSTACK_CERT_SKU = LAUNCH_MENU_VIDEO_SKU;
