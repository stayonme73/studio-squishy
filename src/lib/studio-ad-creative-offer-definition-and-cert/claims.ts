import { studioAdCreativeOfferDefinitionAndCertV1 as pack } from "@/config/studio-ad-creative-offer-definition-and-cert-v1";

export type AdCreativeIntake = {
  campaignId: string;
  businessName: string;
  offerName: string;
  headline: string;
  primaryText: string;
  cta: string;
  priceDisplay: string;
  phone?: string;
  website?: string;
  requiredDisclosure?: string;
  customerSuppliedExactWording?: readonly string[];
};

export type ClaimsGateResult =
  | { ok: true }
  | { ok: false; code: "INVENTED_CLAIM" | "MISSING_FACT"; message: string };

export function evaluateAdCreativeClaims(intake: AdCreativeIntake): ClaimsGateResult {
  if (!intake.businessName.trim() || !intake.offerName.trim() || !intake.cta.trim()) {
    return {
      ok: false,
      code: "MISSING_FACT",
      message: "Ad Creative needs a business name, one offer, and a call to action.",
    };
  }
  const studioVoice = [intake.headline, intake.primaryText, intake.cta].join("\n");
  for (const pattern of pack.prohibitedStudioClaimPatterns) {
    if (pattern.test(studioVoice)) {
      return {
        ok: false,
        code: "INVENTED_CLAIM",
        message:
          "The Studio will not write performance, ranking, or results claims. Keep the ad text factual.",
      };
    }
  }
  return { ok: true };
}
