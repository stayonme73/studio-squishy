/**
 * Studio-written captions for the four-post social set.
 *
 * Captions are written from campaign truth only. Creative phrasing is allowed;
 * inventing prices, dates, percentages, urgency, or offers is not. Every caption
 * is durably bound to exactly one post and one posting position.
 */

import {
  isThemeLedSocialPostsTruth,
  reasonThemeLedSocialPostCaptions,
} from "./social-posts-theme-led";
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

/**
 * Business-claim language captions may use only when the approved brief already
 * contains the same phrase. Inventing testimonials, guarantees, or results is
 * a CAPTION_FAILURE — not a copy-agency flourish.
 */
const INVENTED_CLAIM_PHRASES = [
  "testimonial",
  "guarantee",
  "guaranteed",
  "money-back",
  "money back",
  "results guaranteed",
  "#1",
  "five-star",
  "five star",
  "we doubled",
  "we tripled",
] as const;

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
    truth.themeLed?.theme ?? "",
    truth.themeLed?.coreMessage ?? "",
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
  const corpusLower = corpus.toLowerCase();
  for (const phrase of INVENTED_CLAIM_PHRASES) {
    if (text.toLowerCase().includes(phrase) && !corpusLower.includes(phrase)) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} invents a business claim "${phrase}" that is not in the campaign record`,
      };
    }
  }
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

/** Customer-facing captions.txt — posting order + caption text, no internal IDs. */
export function formatSocialPostsCustomerCaptionFile(
  captions: readonly SocialPostCaption[],
): string {
  const ordered = [...captions].sort((a, b) => a.orderIndex - b.orderIndex);
  return `${ordered.map((caption) => `Post ${caption.orderIndex}\n${caption.text.trim()}`).join("\n\n")}\n`;
}

/** Customer-facing posting-order.txt — suggested order, not a calendar. */
export function formatSocialPostsCustomerOrderFile(
  captions: readonly SocialPostCaption[],
  platformLabel: string,
): string {
  const ordered = [...captions].sort((a, b) => a.orderIndex - b.orderIndex);
  const lines = [
    "Suggested posting order — you post these yourself. This is not a calendar.",
    platformLabel.trim() ? `Platform: ${platformLabel.trim()}` : "",
    "",
    ...ordered.map((caption) => `${caption.orderIndex}. Post ${caption.orderIndex}`),
  ].filter((line, index, list) => !(line === "" && list[index - 1] === ""));
  return `${lines.join("\n")}\n`;
}

function captionContactLead(truth: SocialPostsProjectTruth): string {
  const cta = truth.cta.trim();
  const phone = truth.phone.trim();
  const web = truth.webDisplay.trim();
  if (cta && phone && web) return `${cta}: ${phone} or ${web}`;
  if (cta && phone) return `${cta}: ${phone}`;
  if (cta && web) return `${cta}. ${web}`;
  if (phone && web) return `${phone} or ${web}`;
  if (phone) return phone;
  if (web) return web;
  return cta;
}

function captionTextForRole(
  truth: SocialPostsProjectTruth,
  roleAngle: string,
): string {
  const priceClause = truth.priceDisplay.trim()
    ? ` is ${truth.priceDisplay}`
    : "";
  const dateClause = truth.dateWindow.trim()
    ? truth.priceDisplay.trim()
      ? ` The offer runs ${truth.dateWindow}.`
      : ` Runs ${truth.dateWindow}.`
    : "";
  switch (roleAngle) {
    case "offer_lead":
      return `${truth.offerName}${priceClause} at ${truth.businessName}.${dateClause}`.trim();
    case "cta_book": {
      const lead = captionContactLead(truth);
      const contact = lead.trim() ? `${lead}. ` : "";
      return `${contact}${truth.offerName}${priceClause} at ${truth.businessName}.`.trim();
    }
    case "dates_window": {
      const priceTail = truth.priceDisplay.trim() ? ` for ${truth.priceDisplay}` : "";
      const window = truth.dateWindow.trim()
        ? `${truth.businessName}: ${truth.offerName} runs ${truth.dateWindow}${priceTail}.`
        : `${truth.businessName}: ${truth.offerName}.`;
      return `${window} ${truth.body}`.trim();
    }
    case SOCIAL_POST_TRUST_ROLE_ANGLE:
      return `${truth.businessName}. ${truth.headline}. ${captionContactLead(truth)}.`;
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
  if (isThemeLedSocialPostsTruth(truth)) {
    return reasonThemeLedSocialPostCaptions(truth, assets);
  }
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
