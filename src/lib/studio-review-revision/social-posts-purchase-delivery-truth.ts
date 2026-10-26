/**
 * Social Posts — purchase → Review → Final Delivery truth.
 */

import {
  SOCIAL_POSTS_CAPTIONS_LABEL,
  SOCIAL_POSTS_ORDER_LABEL,
  SOCIAL_POSTS_STANDARD_HARDEN_SKU,
  isSocialPostsStandardHardenSku,
} from "@/config/studio-social-posts-standard-harden-v1";

export const SOCIAL_POSTS_EXPORT_PREFIX = "social-export" as const;

export function socialPostsPngLabel(orderIndex: 1 | 2 | 3 | 4): string {
  return `Post ${orderIndex} — square 1024×1024 PNG`;
}

export function isSocialPostsCustomerFileLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === SOCIAL_POSTS_CAPTIONS_LABEL ||
    trimmed === SOCIAL_POSTS_ORDER_LABEL ||
    /^Post [1-4] — square 1024×1024 PNG$/.test(trimmed) ||
    /caption file for all four posts/i.test(trimmed) ||
    /suggested posting order/i.test(trimmed) ||
    /square 1024/.test(trimmed)
  );
}

export function socialPostsClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isSocialPostsStandardHardenSku(skuId)) return [...labels];
  const files = labels.filter(isSocialPostsCustomerFileLabel);
  if (files.length > 0) return files;
  return [
    socialPostsPngLabel(1),
    socialPostsPngLabel(2),
    socialPostsPngLabel(3),
    socialPostsPngLabel(4),
    SOCIAL_POSTS_CAPTIONS_LABEL,
    SOCIAL_POSTS_ORDER_LABEL,
  ];
}

export {
  SOCIAL_POSTS_CAPTIONS_LABEL,
  SOCIAL_POSTS_ORDER_LABEL,
  SOCIAL_POSTS_STANDARD_HARDEN_SKU,
};
