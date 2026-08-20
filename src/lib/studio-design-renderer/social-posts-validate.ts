/**
 * Validate the four-post social set design spec.
 */

import { existsSync } from "fs";
import path from "path";

import { resolveSocialPostPlate } from "./social-posts-contracts";
import {
  evaluateTextLayerCollisions,
  textLayersForCollisionCheck,
} from "./text-layer-collision";
import {
  SOCIAL_POSTS_DESIGN_SPEC_VERSION,
  SOCIAL_POSTS_EXACT_COUNT,
  type SocialPostsProjectTruth,
  type SocialPostsSetSpec,
} from "./social-posts-types";

export type SocialPostsValidateResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_DESIGN_SPEC"
        | "INVALID_PLATE"
        | "BROKEN_ASSET_REFERENCE"
        | "COLLISION"
        | "OVERLAP";
      message: string;
    };

export function validateSocialPostsSetSpec(
  repoRoot: string,
  spec: SocialPostsSetSpec,
  truth: SocialPostsProjectTruth,
): SocialPostsValidateResult {
  if (spec.specVersion !== SOCIAL_POSTS_DESIGN_SPEC_VERSION) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unexpected specVersion ${spec.specVersion}`,
    };
  }
  if (spec.skuId !== truth.skuId || spec.skuId !== "v2-rtu-social-posts") {
    return { ok: false, code: "INVALID_DESIGN_SPEC", message: "skuId mismatch" };
  }
  if (spec.assets.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Exactly ${SOCIAL_POSTS_EXACT_COUNT} posts required, found ${spec.assets.length}`,
    };
  }
  if (spec.platformLabel !== truth.platformLabel) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "platformLabel does not match project truth",
    };
  }

  const truthById = new Map(truth.assets.map((a) => [a.assetId, a] as const));
  const seenOrder = new Set<number>();

  for (const asset of spec.assets) {
    const member = truthById.get(asset.assetId);
    if (!member) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Unknown assetId ${asset.assetId}`,
      };
    }
    if (asset.orderIndex !== member.orderIndex) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} orderIndex ${asset.orderIndex} does not match truth ${member.orderIndex}`,
      };
    }
    if (asset.roleAngle !== member.roleAngle) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} roleAngle does not match truth`,
      };
    }
    if (seenOrder.has(asset.orderIndex)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Duplicate orderIndex ${asset.orderIndex}`,
      };
    }
    seenOrder.add(asset.orderIndex);
    if (!asset.authorizedPurpose.trim()) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} missing authorizedPurpose`,
      };
    }

    try {
      const plate = resolveSocialPostPlate(asset.plateId);
      if (
        asset.canvas.widthPx !== plate.widthPx ||
        asset.canvas.heightPx !== plate.heightPx
      ) {
        return {
          ok: false,
          code: "INVALID_PLATE",
          message: `Post ${asset.assetId} canvas ${asset.canvas.widthPx}x${asset.canvas.heightPx} does not match plate ${plate.plateId}`,
        };
      }
      if (asset.canvas.widthPx !== asset.canvas.heightPx) {
        return {
          ok: false,
          code: "INVALID_PLATE",
          message: `Post ${asset.assetId} is not square — social posts proof is square-only`,
        };
      }
    } catch (e) {
      return {
        ok: false,
        code: "INVALID_PLATE",
        message: e instanceof Error ? e.message : String(e),
      };
    }

    if (!asset.layers.some((l) => l.type === "image" && l.role === "logo")) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} missing logo layer`,
      };
    }
    const customerMode = truth.outputMode === "customer";
    const hasPurposeLabel = asset.layers.some(
      (l) => l.type === "text" && l.role === "purpose_label",
    );
    if (!customerMode && !hasPurposeLabel) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} missing purpose_label layer`,
      };
    }
    if (customerMode && hasPurposeLabel) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Customer post ${asset.assetId} must not paint purpose_label chrome`,
      };
    }
    if (customerMode) {
      const collision = evaluateTextLayerCollisions(
        textLayersForCollisionCheck(asset.layers),
      );
      if (!collision.ok) {
        return {
          ok: false,
          code: collision.code,
          message: `Post ${asset.assetId}: ${collision.message}`,
        };
      }
    }

    for (const layer of asset.layers) {
      if (layer.type !== "image") continue;
      const mat = spec.materials.find((m) => m.materialId === layer.materialId);
      if (!mat) {
        return {
          ok: false,
          code: "BROKEN_ASSET_REFERENCE",
          message: `Missing material ${layer.materialId}`,
        };
      }
      if (!existsSync(path.join(repoRoot, mat.relativePath))) {
        return {
          ok: false,
          code: "BROKEN_ASSET_REFERENCE",
          message: `Material file missing: ${mat.relativePath}`,
        };
      }
    }
  }

  if (seenOrder.size !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Posting positions must cover 1-4 exactly once",
    };
  }
  for (const position of [1, 2, 3, 4]) {
    if (!seenOrder.has(position)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Posting position ${position} has no post`,
      };
    }
  }

  const plateIds = new Set(spec.assets.map((a) => a.plateId));
  if (plateIds.size !== 1) {
    return {
      ok: false,
      code: "INVALID_PLATE",
      message: "All four posts must share the same square plate",
    };
  }

  if (
    spec.sharedCampaign.offerName !== truth.offerName ||
    spec.sharedCampaign.priceDisplay !== truth.priceDisplay ||
    spec.sharedCampaign.dateWindow !== truth.dateWindow
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Shared campaign truth does not match project truth",
    };
  }

  return { ok: true };
}
