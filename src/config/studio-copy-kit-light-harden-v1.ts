/**
 * HARDEN #2 — EMAIL KIT + TEXT KIT (LIGHT)
 *
 * One shared copy pass. LIGHT names engineering effort, not quality.
 * Owner does not rewrite the copy. The Studio does not send.
 *
 * Authority: Tagia 2026-09-23 — authorize Email Kit + Text Kit together
 */

import { isCampaignGraphicsLightHardenSku } from "./studio-campaign-graphics-light-harden-v1";
import { isFlyerLightHardenSku } from "./studio-flyer-light-harden-v1";
import { isMenuLightHardenSku } from "./studio-menu-light-harden-v1";
import { isServiceSheetLightHardenSku } from "./studio-service-sheet-light-harden-v1";
import { isBusinessCardLightHardenSku } from "./studio-business-card-light-harden-v1";
import { isShortVideoStandardHardenSku } from "./studio-short-video-standard-harden-v1";
import { isSocialPostsStandardHardenSku } from "./studio-social-posts-standard-harden-v1";
import { studioLaunchMenuProductionRuntimeV1 } from "./studio-launch-menu-production-runtime-v1";

export const STUDIO_COPY_KIT_LIGHT_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-COPY-KIT-LIGHT-HARDEN-1" as const;

export const EMAIL_KIT_SKU = "v2-rtu-email-kit" as const;
export const SMS_KIT_SKU = "v2-rtu-sms-kit" as const;

export const EMAIL_KIT_HONEST_PROMISED_OUTPUT =
  "Up to two marketing emails you paste into your own email platform. The Studio does not send them." as const;

export const SMS_KIT_HONEST_PROMISED_OUTPUT =
  "Up to four text messages you paste into your own texting platform. The Studio does not send them." as const;

export const studioCopyKitLightHardenV1 = {
  packageId: STUDIO_COPY_KIT_LIGHT_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-23" as const,
  owner: "Tagia",
  skuIds: [EMAIL_KIT_SKU, SMS_KIT_SKU] as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: {
    email: "SELL_NOW" as const,
    sms: "SELL_NOW" as const,
  },
  classifiedAt: "2026-09-23" as const,
  doNotReopenFlyer: true as const,
  doNotRemintMaya: true as const,
  doNotBuildSendingOrLists: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,

  qualityLock: {
    lightMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    requiredCustomerStandard: [
      "accurate customer facts",
      "readable copy",
      "clean hierarchy",
      "correct paste-ready files",
      "proper QA",
      "professional presentation",
    ] as const,
  },

  email: {
    skuId: EMAIL_KIT_SKU,
    customerFacingName: "Make My Email Campaign Kit",
    priceCents: 12900,
    promisedOutput: EMAIL_KIT_HONEST_PROMISED_OUTPUT,
    maxEmails: 2 as const,
    files: ["txt", "html"] as const,
    includedRevisions: 1 as const,
    studioDoesNotSend: true as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
    productionTime: "within 3–5 business days" as const,
    toolCostWarningCents: 1935,
    toolCostFailCents: 3870,
  },

  sms: {
    skuId: SMS_KIT_SKU,
    customerFacingName: "Make My Text Message Campaign Kit",
    priceCents: 6900,
    promisedOutput: SMS_KIT_HONEST_PROMISED_OUTPUT,
    maxMessages: 4 as const,
    files: ["txt"] as const,
    includedRevisions: 1 as const,
    studioDoesNotSend: true as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
    productionTime: "within 2–3 business days" as const,
    toolCostWarningCents: 1035,
    toolCostFailCents: 2070,
  },

  ceilings: {
    internalQaAttempts:
      studioLaunchMenuProductionRuntimeV1.internalBudgets.copyAttempts,
    includedCustomerRevisions: 1 as const,
  },
} as const;

export function isCopyKitLightHardenSku(skuId: string | null | undefined): boolean {
  return skuId === EMAIL_KIT_SKU || skuId === SMS_KIT_SKU;
}

/** Flyer + copy kits + service sheet + campaign graphics + menu + social posts + business card + short video: exhaust fail-closes. Owner does not finish the work. */
export function isFailClosedSoldSku(skuId: string | null | undefined): boolean {
  return (
    isFlyerLightHardenSku(skuId) ||
    isCopyKitLightHardenSku(skuId) ||
    isServiceSheetLightHardenSku(skuId) ||
    isCampaignGraphicsLightHardenSku(skuId) ||
    isMenuLightHardenSku(skuId) ||
    isSocialPostsStandardHardenSku(skuId) ||
    isBusinessCardLightHardenSku(skuId) ||
    isShortVideoStandardHardenSku(skuId)
  );
}
