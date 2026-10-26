/**
 * Fixed four-channel contract for Campaign Launch Kit.
 * The customer does not choose four pieces. Flyer, email, text, and graphics
 * arrive together from one verified campaign brief.
 */

import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import { studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";
import { CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU } from "@/config/studio-campaign-graphics-light-harden-v1";
import { EMAIL_KIT_SKU, SMS_KIT_SKU } from "@/config/studio-copy-kit-light-harden-v1";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer/types";

const DOOR = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages.campaign_launch_kit;
const THANK_YOU = studioThankYouAmount(DOOR.priceCents);

export const CAMPAIGN_LAUNCH_KIT_PACKAGE_ID = "campaign_launch_kit" as const;

export const studioCampaignLaunchKitCurrentDoorContractV1 = {
  packageId: CAMPAIGN_LAUNCH_KIT_PACKAGE_ID,
  customerFacingName: DOOR.name,
  listPriceCents: DOOR.priceCents,
  priceDisplay: DOOR.priceDisplay,
  thankYouDiscountCents: THANK_YOU.discountCents,
  thankYouDisplay: "$69.80" as const,
  amountDueCents: THANK_YOU.amountDueCents,
  amountDueDisplay: "$279.20" as const,
  revisionRounds: DOOR.revisionRounds,
  channels: ["flyer", "email", "sms", "graphics"] as const,
  usageGuideIsNotAChannel: true as const,
  studioDoesNotSendEmailOrSms: true as const,
  noCommercialPrintCertification: true as const,
  branches: {
    flyer: {
      branchId: "flyer" as const,
      capabilitySku: DESIGN_RENDERER_PROOF_SKU,
      toolId: "studio_design_renderer" as const,
      capability: "DESIGN_PRODUCTION" as const,
      supporting: ["PRINT_FILE_PRODUCTION", "QUALITY_TEAM"] as const,
    },
    email: {
      branchId: "email" as const,
      capabilitySku: EMAIL_KIT_SKU,
      toolId: "studio_copy_producer" as const,
      capability: "COPY_PRODUCTION" as const,
      supporting: ["QUALITY_TEAM"] as const,
      emails: 1 as const,
    },
    sms: {
      branchId: "sms" as const,
      capabilitySku: SMS_KIT_SKU,
      toolId: "studio_copy_producer" as const,
      capability: "COPY_PRODUCTION" as const,
      supporting: ["QUALITY_TEAM"] as const,
      messages: 2 as const,
    },
    graphics: {
      branchId: "graphics" as const,
      capabilitySku: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
      toolId: "studio_design_renderer" as const,
      capability: "DESIGN_PRODUCTION" as const,
      supporting: ["QUALITY_TEAM"] as const,
      square: { width: 1024 as const, height: 1024 as const },
      portrait: { width: 1024 as const, height: 1536 as const },
    },
  },
  completionLanguage:
    "One promotional flyer with a print-yourself PDF, one paste-ready email, two paste-ready text messages, and one square plus one portrait graphic arrive together for the same offer. You send and post them. A short usage guide is included. Three revision rounds are included." as const,
} as const;

export function campaignLaunchKitCustomerDeliverableLabels(): readonly string[] {
  return [
    "Promotional flyer PNG",
    "Promotional flyer print-yourself PDF",
    "One paste-ready promotional email",
    "Two paste-ready text messages",
    "Campaign graphic, square",
    "Campaign graphic, portrait",
    "Usage guide",
  ];
}
