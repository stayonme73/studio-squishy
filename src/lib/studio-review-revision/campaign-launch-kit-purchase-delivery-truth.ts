/**
 * Campaign Launch Kit — four channels plus a usage guide, delivered as one set.
 */

import { CAMPAIGN_LAUNCH_KIT_PACKAGE_ID } from "@/config/studio-campaign-launch-kit-current-door-contract-v1";
import { studioGeneralDesignReviewBindV1 } from "@/config/studio-general-design-review-bind-v1";

export const CAMPAIGN_LAUNCH_KIT_DELIVERY_KEY_PREFIX = "campaign-launch-kit" as const;

export type CampaignLaunchKitDeliveryMember =
  | "flyer-png"
  | "flyer-pdf"
  | "email"
  | "sms"
  | "square"
  | "portrait"
  | "usage-guide";

export type CampaignLaunchKitDeliveryFile = {
  member: CampaignLaunchKitDeliveryMember;
  filename: string;
  contentType: "image/png" | "application/pdf" | "text/plain; charset=utf-8";
  fileLabel: string;
  reviewLabel: string;
  channel: "flyer" | "email" | "sms" | "graphics" | "guide";
};

export const CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES: readonly CampaignLaunchKitDeliveryFile[] = [
  {
    member: "flyer-png",
    filename: "Promotional-Flyer.png",
    contentType: "image/png",
    fileLabel: "Promotional flyer PNG",
    reviewLabel: "Promotional flyer",
    channel: "flyer",
  },
  {
    member: "flyer-pdf",
    filename: "Promotional-Flyer.pdf",
    contentType: "application/pdf",
    fileLabel: "Promotional flyer print-yourself PDF",
    reviewLabel: "Promotional flyer PDF",
    channel: "flyer",
  },
  {
    member: "email",
    filename: "Promotional-Email.txt",
    contentType: "text/plain; charset=utf-8",
    fileLabel: "One paste-ready promotional email",
    reviewLabel: "Promotional email",
    channel: "email",
  },
  {
    member: "sms",
    filename: "Text-Campaign.txt",
    contentType: "text/plain; charset=utf-8",
    fileLabel: "Two paste-ready text messages",
    reviewLabel: "Text campaign",
    channel: "sms",
  },
  {
    member: "square",
    filename: "Campaign-Graphic-Square.png",
    contentType: "image/png",
    fileLabel: "Campaign graphic, square",
    reviewLabel: "Campaign graphic, square",
    channel: "graphics",
  },
  {
    member: "portrait",
    filename: "Campaign-Graphic-Portrait.png",
    contentType: "image/png",
    fileLabel: "Campaign graphic, portrait",
    reviewLabel: "Campaign graphic, portrait",
    channel: "graphics",
  },
  {
    member: "usage-guide",
    filename: "Usage-Guide.txt",
    contentType: "text/plain; charset=utf-8",
    fileLabel: "Usage guide",
    reviewLabel: "Usage guide",
    channel: "guide",
  },
];

export function isCampaignLaunchKitParentSku(skuId: string): boolean {
  return skuId === CAMPAIGN_LAUNCH_KIT_PACKAGE_ID;
}

export function campaignLaunchKitDeliveryKey(member: CampaignLaunchKitDeliveryMember): string {
  return `${CAMPAIGN_LAUNCH_KIT_DELIVERY_KEY_PREFIX}:${member}`;
}

export function campaignLaunchKitReviewProofKey(member: CampaignLaunchKitDeliveryMember): string {
  return `${studioGeneralDesignReviewBindV1.proofKeyPrefix}:${CAMPAIGN_LAUNCH_KIT_DELIVERY_KEY_PREFIX}-${member}`;
}

export function campaignLaunchKitDeliveryFileForFilename(
  filename: string,
): CampaignLaunchKitDeliveryFile | undefined {
  return CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES.find((file) => file.filename === filename.trim());
}

export function campaignLaunchKitClientDeliveryFileLabels(): readonly string[] {
  return CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES.map((file) => file.fileLabel);
}
