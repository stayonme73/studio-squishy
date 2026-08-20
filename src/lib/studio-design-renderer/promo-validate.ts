/**
 * Validate promotion-graphics campaign-set design spec.
 */

import { existsSync } from "fs";
import path from "path";

import { resolvePromoPlate } from "./promo-contracts";
import {
  evaluateTextLayerCollisions,
  textLayersForCollisionCheck,
} from "./text-layer-collision";
import type {
  PromoCampaignSetSpec,
  PromoProjectTruth,
} from "./promo-types";
import { PROMO_DESIGN_SPEC_VERSION } from "./promo-types";

export type PromoValidateResult =
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

export function validatePromoCampaignSetSpec(
  repoRoot: string,
  spec: PromoCampaignSetSpec,
  truth: PromoProjectTruth,
): PromoValidateResult {
  if (spec.specVersion !== PROMO_DESIGN_SPEC_VERSION) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unexpected specVersion ${spec.specVersion}`,
    };
  }
  if (spec.skuId !== truth.skuId || spec.skuId !== "v2-rtu-promotion-graphics") {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "skuId mismatch",
    };
  }
  if (spec.assets.length !== 2) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Exactly two assets required",
    };
  }

  const truthIds = new Set(truth.assets.map((a) => a.assetId));
  for (const asset of spec.assets) {
    if (!truthIds.has(asset.assetId)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Unknown assetId ${asset.assetId}`,
      };
    }
    const truthAsset = truth.assets.find((a) => a.assetId === asset.assetId)!;
    if (asset.authorizedPurpose !== truthAsset.authorizedPurpose) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Purpose mismatch for ${asset.assetId}`,
      };
    }
    try {
      const plate = resolvePromoPlate(asset.plateId);
      if (
        asset.canvas.widthPx !== plate.widthPx ||
        asset.canvas.heightPx !== plate.heightPx
      ) {
        return {
          ok: false,
          code: "INVALID_PLATE",
          message: `Canvas does not match plate ${asset.plateId}`,
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
        message: `Asset ${asset.assetId} missing logo layer`,
      };
    }
    const customerMode = truth.outputMode === "customer";
    const hasPurposeLabel = asset.layers.some(
      (l) => l.type === "text" && l.role === "purpose_label",
    );
    if (customerMode && hasPurposeLabel) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Customer asset ${asset.assetId} must not paint purpose_label chrome`,
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
          message: `Asset ${asset.assetId}: ${collision.message}`,
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

  if (spec.assets[0].layoutVariant === spec.assets[1].layoutVariant) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Assets must use distinct layout variants (coordinated, not cloned)",
    };
  }

  if (
    spec.sharedCampaign.offerName !== truth.offerName ||
    spec.sharedCampaign.priceDisplay !== truth.priceDisplay
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Shared campaign truth does not match project truth",
    };
  }

  return { ok: true };
}
