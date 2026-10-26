/**
 * Social & Promo Graphics — one parent purchase → one Review package → one Final Delivery set.
 * Both production branches are reviewed and released together, never one branch at a time.
 */

import {
  SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID,
  socialPromoCustomerDeliverableLabels,
} from "@/config/studio-social-promo-current-door-contract-v1";
import { studioGeneralDesignReviewBindV1 } from "@/config/studio-general-design-review-bind-v1";

import {
  SOCIAL_POSTS_CAPTIONS_LABEL,
  SOCIAL_POSTS_ORDER_LABEL,
  socialPostsPngLabel,
} from "./social-posts-purchase-delivery-truth";

export const SOCIAL_PROMO_DELIVERY_KEY_PREFIX = "social-promo" as const;

export type SocialPromoDeliveryMember =
  | "post-1"
  | "post-2"
  | "post-3"
  | "post-4"
  | "captions"
  | "order"
  | "square"
  | "portrait";

export type SocialPromoDeliveryFile = {
  member: SocialPromoDeliveryMember;
  /** Index into the purchased plan-line deliverables this file belongs to. */
  purchasedDeliverableIndex: 0 | 1 | 2 | 3 | 4;
  filename: string;
  /** Text files carry an explicit charset; without it browsers misread "—" and "×" in Review. */
  contentType: "image/png" | "text/plain; charset=utf-8";
  /** Final Delivery label for this single file. */
  fileLabel: string;
  /** Review Room section label — every file is its own section so none reads as a prior version. */
  reviewLabel: string;
};

const [POSTS, CAPTIONS, ORDER, SQUARE, PORTRAIT] = [0, 1, 2, 3, 4] as const;

export const SOCIAL_PROMO_DELIVERY_FILES: readonly SocialPromoDeliveryFile[] = [
  { member: "post-1", purchasedDeliverableIndex: POSTS, filename: "Social-Post-1.png", contentType: "image/png", fileLabel: socialPostsPngLabel(1), reviewLabel: "Post 1 of 4 — square 1024×1024" },
  { member: "post-2", purchasedDeliverableIndex: POSTS, filename: "Social-Post-2.png", contentType: "image/png", fileLabel: socialPostsPngLabel(2), reviewLabel: "Post 2 of 4 — square 1024×1024" },
  { member: "post-3", purchasedDeliverableIndex: POSTS, filename: "Social-Post-3.png", contentType: "image/png", fileLabel: socialPostsPngLabel(3), reviewLabel: "Post 3 of 4 — square 1024×1024" },
  { member: "post-4", purchasedDeliverableIndex: POSTS, filename: "Social-Post-4.png", contentType: "image/png", fileLabel: socialPostsPngLabel(4), reviewLabel: "Post 4 of 4 — square 1024×1024" },
  { member: "captions", purchasedDeliverableIndex: CAPTIONS, filename: "Social-Post-Captions.txt", contentType: "text/plain; charset=utf-8", fileLabel: SOCIAL_POSTS_CAPTIONS_LABEL, reviewLabel: "Four matching captions" },
  { member: "order", purchasedDeliverableIndex: ORDER, filename: "Suggested-Posting-Order.txt", contentType: "text/plain; charset=utf-8", fileLabel: SOCIAL_POSTS_ORDER_LABEL, reviewLabel: "Suggested posting order" },
  { member: "square", purchasedDeliverableIndex: SQUARE, filename: "Campaign-Graphic-Square.png", contentType: "image/png", fileLabel: "Campaign graphic — square 1024×1024 PNG", reviewLabel: "Campaign graphic, 1024×1024" },
  { member: "portrait", purchasedDeliverableIndex: PORTRAIT, filename: "Campaign-Graphic-Portrait.png", contentType: "image/png", fileLabel: "Campaign graphic — portrait 1024×1536 PNG", reviewLabel: "Campaign graphic, 1024×1536" },
];

export function isSocialPromoParentSku(skuId: string): boolean {
  return skuId === SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID;
}

export function socialPromoDeliveryKey(member: SocialPromoDeliveryMember): string {
  return `${SOCIAL_PROMO_DELIVERY_KEY_PREFIX}:${member}`;
}

/** Uses the general-design Review key space so the Review Room shows one section per file. */
export function socialPromoReviewProofKey(member: SocialPromoDeliveryMember): string {
  return `${studioGeneralDesignReviewBindV1.proofKeyPrefix}:${SOCIAL_PROMO_DELIVERY_KEY_PREFIX}-${member}`;
}

export function socialPromoDeliveryFileForFilename(
  filename: string,
): SocialPromoDeliveryFile | undefined {
  return SOCIAL_PROMO_DELIVERY_FILES.find((file) => file.filename === filename.trim());
}

/** Final Delivery requires all eight files of the purchased set. */
export function socialPromoClientDeliveryFileLabels(): readonly string[] {
  return SOCIAL_PROMO_DELIVERY_FILES.map((file) => file.fileLabel);
}

export function socialPromoPurchasedDeliverableLabels(): readonly string[] {
  return socialPromoCustomerDeliverableLabels();
}
