/**
 * Customer-safe content boundary for photo-led campaign creative.
 * Voice brief / Machine chrome must never paint on artwork.
 */

import {
  assertNoInternalLeakInCustomerText,
  FORBIDDEN_CUSTOMER_ART_FRAGMENTS,
  isInternalProductionChromeText,
  stripProductionMetadataFromMustInclude,
} from "@/lib/studio-design-renderer/customer-facing-creative-copy";

export function assertNoInternalLeakInCampaignText(text: string): void {
  assertNoInternalLeakInCustomerText(text);
  if (isInternalProductionChromeText(text)) {
    throw new Error(`CUSTOMER_ART_INTERNAL_CHROME:${text.slice(0, 80)}`);
  }
}

export function sanitizeCampaignCreativeCopy(text: string): string {
  return stripProductionMetadataFromMustInclude(text);
}

export { FORBIDDEN_CUSTOMER_ART_FRAGMENTS };
