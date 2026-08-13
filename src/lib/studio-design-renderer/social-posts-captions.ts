/**
 * Studio-written captions for the four-post social set.
 *
 * Captions are written from campaign truth only. Creative phrasing is allowed;
 * inventing prices, dates, percentages, urgency, or offers is not. Every caption
 * is durably bound to exactly one post and one posting position.
 */

import {
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POST_TRUST_ROLE_ANGLE,
  type SocialPostAssetSpec,
  type SocialPostCaption,
  type SocialPostsProjectTruth,
  type SocialPostsQuad,
} from "./social-posts-types";

export type SocialPostCaptionValidation =
  | { ok: true }
  | { ok: false; code: "CAPTION_FAILURE" | "FIXTURE_LEAKAGE"; message: string };

/** Fixture wording belongs on the disclaimer plate, never in a customer caption. */
const FIXTURE_LEAKAGE_PATTERN = /CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)/i;

const MONEY_PATTERN = /\$\s*\d[\d,]*(?:\.\d+)?/g;
const PERCENT_PATTERN = /\d[\d,]*(?:\.\d+)?\s*%/g;
const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/g;

function normalizeMoney(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function normalizeNumber(value: string): string {
  return value.replace(/,/g, "");
}

/** Every fact a caption is allowed to state, drawn straight from the campaign record. */
function truthCorpus(truth: SocialPostsProjectTruth): string {
  return [
    truth.businessName,
    truth.wordmark,
    truth.descriptor,
    truth.headline,
    truth.offerName,
    truth.priceDisplay,
    truth.wasPriceDisplay ?? "",
    truth.dateWindow,
    truth.body,
    truth.cta,
    truth.phone,
    truth.webDisplay,
    truth.webUrl,
    truth.platformLabel,
    ...truth.requiredTextTokens,
  ].join(" \u2022 ");
}

/**
 * Fail closed when a caption states a number or claim the campaign record does not
 * contain. Wording the Studio chose (tone, order, connective language) is allowed.
 */
export function validateCaptionFacts(
  caption: SocialPostCaption,
  truth: SocialPostsProjectTruth,
): SocialPostCaptionValidation {
  const text = caption.text?.trim() ?? "";
  if (!text) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Caption ${caption.captionId} is empty`,
    };
  }

  if (FIXTURE_LEAKAGE_PATTERN.test(text)) {
    return {
      ok: false,
      code: "FIXTURE_LEAKAGE",
      message: `Caption ${caption.captionId} leaks certification-fixture wording into customer copy`,
    };
  }

  for (const pattern of truth.prohibitedClaimPatterns) {
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} states a prohibited claim: "${pattern}"`,
      };
    }
  }

  const corpus = truthCorpus(truth);
  const corpusMoney = new Set(
    (corpus.match(MONEY_PATTERN) ?? []).map(normalizeMoney),
  );
  const corpusPercent = new Set(
    (corpus.match(PERCENT_PATTERN) ?? []).map(normalizeMoney),
  );
  const corpusNumbers = new Set(
    (corpus.match(NUMBER_PATTERN) ?? []).map(normalizeNumber),
  );

  for (const money of text.match(MONEY_PATTERN) ?? []) {
    if (!corpusMoney.has(normalizeMoney(money))) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} invents a price "${money.trim()}" that is not in the campaign record`,
      };
    }
  }

  for (const percent of text.match(PERCENT_PATTERN) ?? []) {
    if (!corpusPercent.has(normalizeMoney(percent))) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} invents a figure "${percent.trim()}" that is not in the campaign record`,
      };
    }
  }

  for (const number of text.match(NUMBER_PATTERN) ?? []) {
    if (!corpusNumbers.has(normalizeNumber(number))) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} invents a number "${number}" that is not in the campaign record`,
      };
    }
  }

  return { ok: true };
}

function captionTextForRole(
  truth: SocialPostsProjectTruth,
  roleAngle: string,
): string {
  switch (roleAngle) {
    case "offer_lead":
      return `${truth.offerName} is ${truth.priceDisplay} at ${truth.businessName}. The offer runs ${truth.dateWindow}.`;
    case "cta_book":
      return `${truth.cta}: ${truth.phone} or ${truth.webDisplay}. ${truth.offerName} is ${truth.priceDisplay} at ${truth.businessName}.`;
    case "dates_window":
      return `${truth.businessName}: ${truth.offerName} runs ${truth.dateWindow} for ${truth.priceDisplay}. ${truth.body}`;
    case SOCIAL_POST_TRUST_ROLE_ANGLE:
      return `${truth.businessName}. ${truth.headline}. ${truth.cta}: ${truth.phone}.`;
    default:
      throw new Error(
        `CAPTION_FAILURE: no Studio caption pattern for roleAngle "${roleAngle}" — do not improvise copy for an unproven angle`,
      );
  }
}

/**
 * Produce exactly four captions, one per post, in posting order.
 * Caption ids follow posting position so the binding is legible in the artifacts.
 */
export function reasonSocialPostCaptionsDeterministic(
  truth: SocialPostsProjectTruth,
  assets: readonly SocialPostAssetSpec[],
): SocialPostsQuad<SocialPostCaption> {
  if (assets.length !== SOCIAL_POSTS_EXACT_COUNT) {
    throw new Error(
      `CAPTION_FAILURE: captions require exactly ${SOCIAL_POSTS_EXACT_COUNT} posts, received ${assets.length}`,
    );
  }

  const ordered = [...assets].sort((a, b) => a.orderIndex - b.orderIndex);
  const captions = ordered.map((asset) => ({
    captionId: `caption-${asset.orderIndex}`,
    assetId: asset.assetId,
    orderIndex: asset.orderIndex,
    text: captionTextForRole(truth, asset.roleAngle),
  }));

  return captions as unknown as SocialPostsQuad<SocialPostCaption>;
}

export type SocialPostCaptionBindingResult =
  | { ok: true }
  | { ok: false; code: "CAPTION_FAILURE" | "BINDING_FAILURE"; message: string };

/**
 * Every post has exactly one caption, and every caption points at the post
 * that occupies its posting position. A caption on the wrong post is a
 * publishing error, so it fails closed rather than shipping mismatched copy.
 */
export function assertCaptionsBoundToPosts(
  captions: readonly SocialPostCaption[],
  assets: readonly SocialPostAssetSpec[],
): SocialPostCaptionBindingResult {
  if (captions.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Expected ${SOCIAL_POSTS_EXACT_COUNT} captions, found ${captions.length}`,
    };
  }
  if (assets.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Expected ${SOCIAL_POSTS_EXACT_COUNT} posts, found ${assets.length}`,
    };
  }

  const seenCaptionIds = new Set<string>();
  const seenAssetIds = new Set<string>();
  const byAssetId = new Map(assets.map((a) => [a.assetId, a] as const));

  for (const caption of captions) {
    if (!caption.captionId?.trim()) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: "Caption missing captionId",
      };
    }
    if (seenCaptionIds.has(caption.captionId)) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Duplicate captionId ${caption.captionId}`,
      };
    }
    seenCaptionIds.add(caption.captionId);

    const asset = byAssetId.get(caption.assetId);
    if (!asset) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} references unknown post ${caption.assetId}`,
      };
    }
    if (seenAssetIds.has(caption.assetId)) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Post ${caption.assetId} has more than one caption`,
      };
    }
    seenAssetIds.add(caption.assetId);

    if (asset.orderIndex !== caption.orderIndex) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} claims position ${caption.orderIndex} but post ${caption.assetId} is position ${asset.orderIndex}`,
      };
    }
    if (caption.captionId !== `caption-${caption.orderIndex}`) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} does not match its posting position ${caption.orderIndex}`,
      };
    }
  }

  if (seenAssetIds.size !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: "Not every post received a caption",
    };
  }

  return { ok: true };
}
