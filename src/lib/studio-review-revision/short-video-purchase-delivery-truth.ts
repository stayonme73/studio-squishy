/**
 * Short Video — purchase → Review → Final Delivery truth.
 */

import {
  SHORT_VIDEO_MP4_LABEL,
  SHORT_VIDEO_STANDARD_HARDEN_SKU,
  isShortVideoStandardHardenSku,
} from "@/config/studio-short-video-standard-harden-v1";

export const SHORT_VIDEO_EXPORT_PREFIX = "short-video-export" as const;

export function isShortVideoCustomerFileLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === SHORT_VIDEO_MP4_LABEL ||
    /vertical mp4 1080|still photos, captions, and cta/i.test(trimmed)
  );
}

export function shortVideoClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isShortVideoStandardHardenSku(skuId)) return [...labels];
  const files = labels.filter(isShortVideoCustomerFileLabel);
  if (files.length > 0) return files;
  return [SHORT_VIDEO_MP4_LABEL];
}

export { SHORT_VIDEO_MP4_LABEL, SHORT_VIDEO_STANDARD_HARDEN_SKU };
