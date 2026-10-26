/**
 * Email Kit + Text Kit — purchase → Review → Final Delivery truth.
 * Review shows readable proofs. Final Delivery is the paste-ready files.
 */

import {
  EMAIL_KIT_SKU,
  SMS_KIT_SKU,
  isCopyKitLightHardenSku,
} from "@/config/studio-copy-kit-light-harden-v1";

export const EMAIL_KIT_PASTE_READY_LABEL =
  "Plain-text and simple HTML-ready email content files the client can paste into their own email platform" as const;

export const SMS_KIT_PASTE_READY_LABEL =
  "Plain-text message file with suggested sending order, ready to paste into the client's texting platform" as const;

export const SMS_KIT_SEQUENCE_LABEL_ALIAS =
  "Suggested sending order/sequence and timing document" as const;

export const SMS_KIT_MESSAGE_FILE_ALIAS =
  "Plain-text message file with all approved SMS copy ready to paste into the client's SMS platform" as const;

export function isCopyKitPasteReadyLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === EMAIL_KIT_PASTE_READY_LABEL ||
    trimmed === SMS_KIT_PASTE_READY_LABEL ||
    trimmed === SMS_KIT_SEQUENCE_LABEL_ALIAS ||
    trimmed === SMS_KIT_MESSAGE_FILE_ALIAS ||
    /plain-text|html-ready|paste/i.test(trimmed)
  );
}

export function copyKitClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isCopyKitLightHardenSku(skuId)) return [...labels];
  const files = labels.filter(isCopyKitPasteReadyLabel);
  if (files.length > 0) return files;
  if (skuId === EMAIL_KIT_SKU) return [EMAIL_KIT_PASTE_READY_LABEL];
  if (skuId === SMS_KIT_SKU) return [SMS_KIT_PASTE_READY_LABEL];
  return [...labels];
}

export const COPY_EXPORT_DELIVERABLE_PREFIX = "copy-export" as const;
