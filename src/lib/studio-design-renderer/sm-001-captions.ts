/**
 * Studio-written captions for sm-001 sized to plannedPostCount.
 */

import type {
  Sm001AssetSpec,
  Sm001Caption,
  Sm001LayoutTemplate,
  Sm001ProjectTruth,
} from "./sm-001-types";

function captionForTemplate(
  truth: Sm001ProjectTruth,
  template: Sm001LayoutTemplate,
): string {
  switch (template) {
    case "offer_lead":
      return `${truth.offerName} is ${truth.priceDisplay} at ${truth.businessName}. The offer runs ${truth.dateWindow}.`;
    case "cta_book":
      return `${truth.cta}: ${truth.phone} or ${truth.webDisplay}. ${truth.offerName} is ${truth.priceDisplay} at ${truth.businessName}.`;
    case "dates_window":
      return `${truth.businessName}: ${truth.offerName} runs ${truth.dateWindow} for ${truth.priceDisplay}. ${truth.body}`;
    case "trust_brand":
      return `${truth.businessName}. ${truth.headline}. ${truth.cta}: ${truth.phone}.`;
    case "proof_point":
      return truth.wasPriceDisplay
        ? `${truth.offerName} — ${truth.priceDisplay} (${truth.wasPriceDisplay}) at ${truth.businessName}. Offer window ${truth.dateWindow}.`
        : `${truth.offerName} at ${truth.priceDisplay} from ${truth.businessName}. ${truth.headline}`;
    case "soft_close":
      return `${truth.businessName}: save your spot for ${truth.offerName}. ${truth.cta} ${truth.phone}. Runs ${truth.dateWindow}.`;
    default:
      throw new Error(
        `CAPTION_FAILURE: no Studio caption pattern for layout "${template}"`,
      );
  }
}

export function reasonSm001CaptionsDeterministic(
  truth: Sm001ProjectTruth,
  assets: readonly Sm001AssetSpec[],
): Sm001Caption[] {
  const n = truth.plannedPostCount;
  if (assets.length !== n) {
    throw new Error(
      `CAPTION_FAILURE: captions require plannedPostCount=${n} posts, received ${assets.length}`,
    );
  }
  const ordered = [...assets].sort((a, b) => a.orderIndex - b.orderIndex);
  return ordered.map((asset) => ({
    captionId: `caption-${asset.orderIndex}`,
    assetId: asset.assetId,
    orderIndex: asset.orderIndex,
    text: captionForTemplate(truth, asset.layoutTemplate),
  }));
}

export type Sm001CaptionBindingResult =
  | { ok: true }
  | { ok: false; code: "CAPTION_FAILURE" | "BINDING_FAILURE"; message: string };

export function assertSm001CaptionsBoundToPosts(
  captions: readonly Sm001Caption[],
  assets: readonly Sm001AssetSpec[],
  plannedPostCount: number,
): Sm001CaptionBindingResult {
  if (captions.length !== plannedPostCount) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Expected ${plannedPostCount} captions, found ${captions.length}`,
    };
  }
  if (assets.length !== plannedPostCount) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Expected ${plannedPostCount} posts, found ${assets.length}`,
    };
  }

  const seenCaptionIds = new Set<string>();
  const seenAssetIds = new Set<string>();
  const byAssetId = new Map(assets.map((a) => [a.assetId, a] as const));

  for (const caption of captions) {
    if (!caption.captionId?.trim()) {
      return { ok: false, code: "CAPTION_FAILURE", message: "Caption missing captionId" };
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
        message: `Caption ${caption.captionId} position mismatch`,
      };
    }
    if (caption.captionId !== `caption-${caption.orderIndex}`) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} does not match position ${caption.orderIndex}`,
      };
    }
  }

  if (seenAssetIds.size !== plannedPostCount) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: "Not every post received a caption",
    };
  }
  return { ok: true };
}

/** Caption fact lock — no invented prices/claims. */
export function validateSm001CaptionFacts(
  caption: Sm001Caption,
  truth: Sm001ProjectTruth,
): { ok: true } | { ok: false; code: "CAPTION_FAILURE"; message: string } {
  const text = caption.text?.trim() ?? "";
  if (!text) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Caption ${caption.captionId} is empty`,
    };
  }
  if (/CERTIFICATION FIXTURE|INTERNAL TEST/i.test(text)) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Caption ${caption.captionId} leaks fixture wording`,
    };
  }
  for (const pattern of truth.prohibitedClaimPatterns) {
    if (pattern && new RegExp(pattern, "i").test(text)) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} states prohibited claim: "${pattern}"`,
      };
    }
  }
  const moneyMatches = text.match(/\$\s?\d[\d,]*(?:\.\d+)?/g) ?? [];
  const allowedMoney = [truth.priceDisplay, truth.wasPriceDisplay]
    .filter(Boolean)
    .map((s) => s!.replace(/\s+/g, ""));
  for (const money of moneyMatches) {
    const norm = money.replace(/\s+/g, "");
    if (!allowedMoney.some((a) => a.includes(norm) || norm.includes(a.replace(/\s+/g, "")))) {
      // allow if priceDisplay contains the number
      const digits = norm.replace(/[^\d.]/g, "");
      const allowedDigits = allowedMoney.map((a) => a.replace(/[^\d.]/g, ""));
      if (!allowedDigits.includes(digits)) {
        return {
          ok: false,
          code: "CAPTION_FAILURE",
          message: `Caption ${caption.captionId} invents price "${money}"`,
        };
      }
    }
  }
  return { ok: true };
}
