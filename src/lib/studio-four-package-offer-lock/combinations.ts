import {
  fourPackageSupportMatrix,
  type ExtraChoice,
  type FourPackageExtraId,
  type FourPackageHeadlineId,
  type FourPackageSupportId,
  type SupportChoice,
} from "@/config/studio-four-package-offer-lock-v1";

export type SelectedSupport = Partial<Record<FourPackageSupportId, SupportChoice>>;
export type SelectedExtras = Partial<Record<FourPackageExtraId, ExtraChoice>>;

export type CombinationInput = {
  headline?: FourPackageHeadlineId;
  secondHeadline?: FourPackageHeadlineId;
  support?: SelectedSupport;
  extras?: SelectedExtras;
  wantsVideoAds?: boolean;
  wantsAccountAccess?: boolean;
  wantsWebsiteFetch?: boolean;
  wantsTestimonialVideo?: boolean;
  wantsCarouselOrStories?: boolean;
  missingRequiredInputs?: boolean;
};

export type CombinationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function evaluateFourPackageCombination(
  input: CombinationInput,
): CombinationResult {
  if (!input.headline) {
    return {
      ok: false,
      code: "HEADLINE_REQUIRED",
      message: "The customer chooses one headline package.",
    };
  }
  if (input.secondHeadline && input.secondHeadline !== input.headline) {
    return {
      ok: false,
      code: "ONE_HEADLINE_ONLY",
      message:
        "Clip Repurposing and Short-Form Video Editing are separate jobs. One headline per order.",
    };
  }
  if (input.wantsVideoAds) {
    return {
      ok: false,
      code: "UNSUPPORTED_VIDEO_ADS",
      message: "Ad Creative V1 is static graphics only. The Studio does not make video ads.",
    };
  }
  if (input.wantsAccountAccess) {
    return {
      ok: false,
      code: "ACCOUNT_ACCESS_FORBIDDEN",
      message:
        "The Studio does not take passwords or log into ads, email, social, reviews, or Google Business.",
    };
  }
  if (input.wantsWebsiteFetch) {
    return {
      ok: false,
      code: "UNSUPPORTED_RESEARCH",
      message:
        "AI + Local Visibility uses customer-supplied facts only. The Studio does not fetch or scrape websites.",
    };
  }
  if (input.wantsTestimonialVideo) {
    return {
      ok: false,
      code: "UNSUPPORTED_VIDEO",
      message:
        "Reputation V1 does not edit testimonial video. That is not part of this kit.",
    };
  }
  if (input.wantsCarouselOrStories) {
    return {
      ok: false,
      code: "UNSUPPORTED_DESIGN_FAMILY",
      message:
        "Social & Promo Graphics are the certified square posts and promo plates. Carousel, Stories, and extra sizes are not in this lock.",
    };
  }
  if (input.missingRequiredInputs) {
    return {
      ok: false,
      code: "MISSING_INPUTS_NO_FILLER",
      message:
        "The Studio will not invent missing facts or generate useless filler. Skip the option or supply the facts.",
    };
  }

  const row = fourPackageSupportMatrix[input.headline];
  for (const [supportId, choice] of Object.entries(input.support ?? {}) as [
    FourPackageSupportId,
    SupportChoice,
  ][]) {
    if (choice !== "SELECT") continue;
    if (row[supportId] === "NOT_APPROPRIATE") {
      return {
        ok: false,
        code: "SUPPORT_NOT_APPROPRIATE",
        message: `${supportId} is not appropriate on ${input.headline}. Mark it SKIP / N/A.`,
      };
    }
  }

  return { ok: true };
}

export function supportOptionsForHeadline(headline: FourPackageHeadlineId) {
  const row = fourPackageSupportMatrix[headline];
  return (Object.entries(row) as [FourPackageSupportId, (typeof row)[FourPackageSupportId]][])
    .filter(([, fit]) => fit !== "NOT_APPROPRIATE")
    .map(([id, fit]) => ({ id, fit, defaultChoice: "SKIP" as const }));
}
