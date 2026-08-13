/**
 * Set-level consistency for the four-post social set.
 * Complements per-post design-quality gating: proves the set is a coordinated
 * four-post plan with bound captions and a publishable order — not four clones.
 */

import {
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POST_TRUST_ROLE_ANGLE,
  type SocialPostAssetSpec,
  type SocialPostCaption,
  type SocialPostingOrderEntry,
  type SocialPostsProjectTruth,
  type SocialPostsSetSpec,
} from "./social-posts-types";

export type SocialPostsSetQaResult =
  | { ok: true; summary: string }
  | {
      ok: false;
      code:
        | "SET_CONSISTENCY_FAILURE"
        | "CAPTION_FAILURE"
        | "ORDER_FAILURE"
        | "BINDING_FAILURE"
        | "FIXTURE_LEAKAGE";
      message: string;
    };

function layoutFingerprint(asset: SocialPostAssetSpec): string {
  return asset.layers
    .map((l) =>
      l.type === "text"
        ? `${l.role}:${l.x},${l.y},${l.fontSizePx},${l.fontWeight},${l.align}`
        : `${l.role}:${l.x},${l.y},${l.width}x${l.height}`,
    )
    .join("|");
}

export function evaluateSocialPostsSetConsistency(input: {
  truth: SocialPostsProjectTruth;
  spec: SocialPostsSetSpec;
  declaredTextByAsset: Record<string, string>;
  captions: readonly SocialPostCaption[];
  postingOrder: readonly SocialPostingOrderEntry[];
}): SocialPostsSetQaResult {
  const { truth, spec, declaredTextByAsset, captions, postingOrder } = input;

  if (spec.assets.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: `Set must contain exactly ${SOCIAL_POSTS_EXACT_COUNT} posts, found ${spec.assets.length}`,
    };
  }

  const plateIds = new Set(spec.assets.map((a) => a.plateId));
  if (plateIds.size !== 1) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "All four posts must share the same square plate",
    };
  }
  for (const asset of spec.assets) {
    if (asset.canvas.widthPx !== asset.canvas.heightPx) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} is not square`,
      };
    }
  }

  const positions = spec.assets.map((a) => a.orderIndex).sort((a, b) => a - b);
  if (positions.join(",") !== "1,2,3,4") {
    return {
      ok: false,
      code: "ORDER_FAILURE",
      message: `Posting positions must be 1-4 exactly once, found ${positions.join(",")}`,
    };
  }

  // Anti-clone: no two posts may share a layout fingerprint.
  const fingerprints = spec.assets.map((a) => ({
    assetId: a.assetId,
    fingerprint: layoutFingerprint(a),
  }));
  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      if (fingerprints[i]!.fingerprint === fingerprints[j]!.fingerprint) {
        return {
          ok: false,
          code: "SET_CONSISTENCY_FAILURE",
          message: `Posts ${fingerprints[i]!.assetId} and ${fingerprints[j]!.assetId} appear cloned (identical layout fingerprints) — the set must vary hierarchy`,
        };
      }
    }
  }

  const roleAngles = new Set(spec.assets.map((a) => a.roleAngle));
  if (roleAngles.size !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Each post must carry a distinct role angle",
    };
  }

  for (const asset of spec.assets) {
    const text = declaredTextByAsset[asset.assetId] ?? "";
    if (!asset.authorizedPurpose.trim()) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Missing purpose for ${asset.assetId}`,
      };
    }
    if (!text.includes(asset.authorizedPurpose)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} does not surface its authorized purpose`,
      };
    }
    if (!text.includes(asset.roleAngle)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} does not surface its role angle (set variety must be visible)`,
      };
    }
    if (!text.includes(truth.wordmark)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} missing shared brand wordmark`,
      };
    }

    const brandOnly = asset.roleAngle === SOCIAL_POST_TRUST_ROLE_ANGLE;
    if (brandOnly) {
      // A brand-trust post may omit price, but must not restate offer facts partially.
      if (text.includes(truth.priceDisplay)) {
        return {
          ok: false,
          code: "SET_CONSISTENCY_FAILURE",
          message: `Brand-trust post ${asset.assetId} carries campaign price but is declared brand-only`,
        };
      }
      continue;
    }

    if (!text.includes(truth.offerName) && !text.includes("Tune-Up")) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} missing shared offer truth`,
      };
    }
    if (!text.includes(truth.priceDisplay)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Post ${asset.assetId} missing shared price truth`,
      };
    }
  }

  if (captions.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "CAPTION_FAILURE",
      message: `Set requires exactly ${SOCIAL_POSTS_EXACT_COUNT} captions, found ${captions.length}`,
    };
  }

  const assetById = new Map(spec.assets.map((a) => [a.assetId, a] as const));
  const captionById = new Map(captions.map((c) => [c.captionId, c] as const));

  for (const caption of captions) {
    const asset = assetById.get(caption.assetId);
    if (!asset) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} references unknown post ${caption.assetId}`,
      };
    }
    if (asset.orderIndex !== caption.orderIndex) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Caption ${caption.captionId} is bound to position ${caption.orderIndex} but post ${caption.assetId} is position ${asset.orderIndex}`,
      };
    }
    if (!caption.text.trim()) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} is empty`,
      };
    }
    if (!caption.text.includes(truth.businessName) && !caption.text.includes(truth.wordmark)) {
      return {
        ok: false,
        code: "CAPTION_FAILURE",
        message: `Caption ${caption.captionId} does not name the business`,
      };
    }
    if (asset.roleAngle !== SOCIAL_POST_TRUST_ROLE_ANGLE) {
      if (!caption.text.includes(truth.priceDisplay)) {
        return {
          ok: false,
          code: "CAPTION_FAILURE",
          message: `Caption ${caption.captionId} on offer post ${caption.assetId} omits the campaign price`,
        };
      }
      if (
        !caption.text.includes(truth.offerName) &&
        !caption.text.includes("Tune-Up")
      ) {
        return {
          ok: false,
          code: "CAPTION_FAILURE",
          message: `Caption ${caption.captionId} on offer post ${caption.assetId} omits the campaign offer`,
        };
      }
    }
  }

  if (postingOrder.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "ORDER_FAILURE",
      message: `Posting order must cover ${SOCIAL_POSTS_EXACT_COUNT} positions, found ${postingOrder.length}`,
    };
  }

  const seenPositions = new Set<number>();
  const seenOrderAssets = new Set<string>();
  for (const entry of postingOrder) {
    if (seenPositions.has(entry.position)) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Duplicate posting position ${entry.position}`,
      };
    }
    seenPositions.add(entry.position);
    const asset = assetById.get(entry.assetId);
    if (!asset) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Posting order references unknown post ${entry.assetId}`,
      };
    }
    if (seenOrderAssets.has(entry.assetId)) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Post ${entry.assetId} appears more than once in the posting order`,
      };
    }
    seenOrderAssets.add(entry.assetId);
    if (asset.orderIndex !== entry.position) {
      return {
        ok: false,
        code: "ORDER_FAILURE",
        message: `Posting order places ${entry.assetId} at position ${entry.position} but the post declares ${asset.orderIndex}`,
      };
    }
    const caption = captionById.get(entry.captionId);
    if (!caption) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Posting order references unknown caption ${entry.captionId}`,
      };
    }
    if (caption.assetId !== entry.assetId) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Posting order pairs caption ${entry.captionId} with ${entry.assetId} but the caption is bound to ${caption.assetId}`,
      };
    }
  }
  if (seenPositions.size !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "ORDER_FAILURE",
      message: "Posting order does not cover all four positions",
    };
  }

  if (truth.outputMode === "customer") {
    const leak = /CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)/i;
    for (const asset of spec.assets) {
      const text = declaredTextByAsset[asset.assetId] ?? "";
      if (leak.test(text)) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Fixture leakage in ${asset.assetId}`,
        };
      }
    }
    for (const caption of captions) {
      if (leak.test(caption.text)) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Fixture leakage in caption ${caption.captionId}`,
        };
      }
    }
  }

  const order = [...postingOrder]
    .sort((a, b) => a.position - b.position)
    .map((e) => `${e.position}:${e.assetId}`)
    .join(" → ");
  return {
    ok: true,
    summary: `Set consistency OK: four square posts on ${spec.assets[0]!.plateId} with distinct layouts and role angles; four captions bound to posts; posting order ${order}.`,
  };
}
