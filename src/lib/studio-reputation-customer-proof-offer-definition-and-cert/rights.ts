import { studioReputationCustomerProofOfferDefinitionAndCertV1 as pack } from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";

export type ReputationProofTestimonial = {
  reviewerDisplayName: string;
  exactQuote: string;
  permissionConfirmed: boolean;
};

export type ReputationProofIntake = {
  campaignId: string;
  businessName: string;
  reviewDestinationUrl: string;
  testimonial: ReputationProofTestimonial;
  rightsConfirmed: boolean;
  cta: string;
  requiredDisclaimer?: string;
};

export type RightsGateResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "MISSING_FACT"
        | "RIGHTS_NOT_CONFIRMED"
        | "BAD_DESTINATION"
        | "MATERIAL_REWRITE"
        | "FORBIDDEN_CLAIM"
        | "INVENTED_CUSTOMER";
      message: string;
    };

export function normalizeQuote(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function destinationLooksUsable(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  if (/password|login|signin/i.test(value)) return false;
  return /^https?:\/\/\S+$/i.test(value) || /^[\w.-]+\.[\w.-]+(\/\S*)?$/i.test(value);
}

export function quoteIsPreserved(supplied: string, used: string): boolean {
  const left = normalizeQuote(supplied).replace(/^["“]|["”]$/g, "");
  const right = normalizeQuote(used).replace(/^["“]|["”]$/g, "");
  return left === right;
}

export function studioVoiceInventedCustomer(
  text: string,
  intake: ReputationProofIntake,
): boolean {
  if (/\b(harbor|cole|kindred|sarah said|john said|five customers|our customers say)\b/i.test(text)) {
    return true;
  }
  const quoted = [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);
  return quoted.some((snippet) => {
    if (snippet.length < 12) return false;
    return (
      !quoteIsPreserved(intake.testimonial.exactQuote, snippet) &&
      normalizeQuote(snippet) !== normalizeQuote(intake.cta)
    );
  });
}

export function evaluateReputationProofRights(
  intake: ReputationProofIntake,
  studioVoice: readonly string[] = [],
  usedQuote?: string,
): RightsGateResult {
  if (!intake.businessName.trim() || !intake.cta.trim()) {
    return {
      ok: false,
      code: "MISSING_FACT",
      message: "The kit needs a business name and a call to action.",
    };
  }
  if (!intake.testimonial.reviewerDisplayName.trim() || !intake.testimonial.exactQuote.trim()) {
    return {
      ok: false,
      code: "MISSING_FACT",
      message: "The kit needs one real customer name and their exact wording.",
    };
  }
  if (!intake.rightsConfirmed || !intake.testimonial.permissionConfirmed) {
    return {
      ok: false,
      code: "RIGHTS_NOT_CONFIRMED",
      message:
        "The customer must confirm they have permission to use this review or testimonial.",
    };
  }
  if (!destinationLooksUsable(intake.reviewDestinationUrl)) {
    return {
      ok: false,
      code: "BAD_DESTINATION",
      message:
        "The QR card needs a real review destination the customer supplied. The Studio will not invent or fetch one.",
    };
  }
  if (usedQuote && !quoteIsPreserved(intake.testimonial.exactQuote, usedQuote)) {
    return {
      ok: false,
      code: "MATERIAL_REWRITE",
      message: "The Studio will not rewrite a review into a different claim. Ask, do not guess.",
    };
  }
  const joined = studioVoice
    .join("\n")
    .replaceAll(normalizeQuote(intake.testimonial.exactQuote), "");
  for (const pattern of pack.prohibitedStudioClaimPatterns) {
    if (pattern.test(joined)) {
      return {
        ok: false,
        code: "FORBIDDEN_CLAIM",
        message:
          "The Studio will not write ranking, review-count, star, lead, sales, or invented-customer claims.",
      };
    }
  }
  if (studioVoice.some((text) => studioVoiceInventedCustomer(text, intake))) {
    return {
      ok: false,
      code: "INVENTED_CUSTOMER",
      message: "Studio wording added a customer, quote, or claim that was not supplied.",
    };
  }
  return { ok: true };
}
