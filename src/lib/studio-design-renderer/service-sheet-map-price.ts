/**
 * Customer-truth → priceMode mapping (pure; no inference / no Machine fallbacks).
 */

import type { ServicePriceDisplayMode } from "./service-sheet-types";

export type ServicePriceMapInput = {
  /** Customer-supplied starting price text, if any. */
  startingPriceText?: string | null;
  /**
   * Customer-explicit contact-for-pricing (or equivalent) wording.
   * Must be present and non-empty to authorize contact_for_pricing mode.
   */
  contactForPricingText?: string | null;
};

export type ServicePriceMapResult =
  | {
      ok: true;
      priceMode: ServicePriceDisplayMode;
      priceDisplay?: string;
    }
  | { ok: false; code: "AMBIGUOUS_PRICING_TRUTH"; message: string };

/**
 * Map only authoritative customer fields.
 * Never invent “contact for pricing” when the customer left price blank.
 */
export function mapServicePriceDisplayMode(
  input: ServicePriceMapInput,
): ServicePriceMapResult {
  const listed = (input.startingPriceText ?? "").trim();
  const contact = (input.contactForPricingText ?? "").trim();

  if (listed && contact) {
    return {
      ok: false,
      code: "AMBIGUOUS_PRICING_TRUTH",
      message:
        "Both starting price and contact-for-pricing wording supplied — fail-closed; do not infer which mode",
    };
  }
  if (listed) {
    return { ok: true, priceMode: "listed", priceDisplay: listed };
  }
  if (contact) {
    return {
      ok: true,
      priceMode: "contact_for_pricing",
      priceDisplay: contact,
    };
  }
  return { ok: true, priceMode: "omitted" };
}

/** Detect Machine-forbidden filler pricing language (not customer-authorized). */
export function looksLikeInventedPricingFallback(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return (
    t === "tbd" ||
    t === "$—" ||
    t === "$-" ||
    t === "—" ||
    t === "-" ||
    t === "n/a" ||
    t === "call for price" ||
    t === "call for pricing" ||
    t === "ask for price"
  );
}
