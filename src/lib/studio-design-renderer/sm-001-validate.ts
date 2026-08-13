/**
 * Validate the sm-001 Launch Set design spec against the locked plannedPostCount.
 * Count, plate, order coverage, unique ids, and no phantom members.
 */

import { existsSync } from "fs";
import path from "path";

import { resolveSm001ExecutablePlate } from "./sm-001-contracts";
import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_DESIGN_SPEC_VERSION,
  type Sm001ProjectTruth,
  type Sm001SetSpec,
} from "./sm-001-types";

export type Sm001ValidateResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_DESIGN_SPEC"
        | "INVALID_PLATE"
        | "BROKEN_ASSET_REFERENCE"
        | "COUNT_MISMATCH";
      message: string;
    };

export function validateSm001SetSpec(
  repoRoot: string,
  spec: Sm001SetSpec,
  truth: Sm001ProjectTruth,
): Sm001ValidateResult {
  if (spec.specVersion !== SM_001_DESIGN_SPEC_VERSION) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unexpected specVersion ${spec.specVersion}`,
    };
  }
  if (spec.skuId !== truth.skuId || spec.skuId !== DESIGN_RENDERER_SM_001_SKU) {
    return { ok: false, code: "INVALID_DESIGN_SPEC", message: "skuId mismatch" };
  }

  const n = truth.plannedPostCount;
  if (spec.plannedPostCount !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Spec plannedPostCount ${spec.plannedPostCount} does not match locked job plannedPostCount ${n}`,
    };
  }
  if (spec.assets.length !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Locked plannedPostCount=${n} requires exactly ${n} posts, found ${spec.assets.length} — never shrink the set to what rendered`,
    };
  }
  if (truth.assets.length !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Project truth declares ${truth.assets.length} members for plannedPostCount=${n}`,
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
  const seenIds = new Set<string>();
  const seenTemplates = new Set<string>();

  for (const asset of spec.assets) {
    const member = truthById.get(asset.assetId);
    if (!member) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Unknown assetId ${asset.assetId} — phantom members are forbidden`,
      };
    }
    if (seenIds.has(asset.assetId)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Duplicate assetId ${asset.assetId}`,
      };
    }
    seenIds.add(asset.assetId);
    if (asset.orderIndex !== member.orderIndex) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} orderIndex ${asset.orderIndex} does not match truth ${member.orderIndex}`,
      };
    }
    if (asset.assetId !== `social-post-${asset.orderIndex}`) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} must use durable id social-post-${asset.orderIndex}`,
      };
    }
    if (asset.layoutTemplate !== member.layoutTemplate) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} layoutTemplate does not match truth`,
      };
    }
    if (seenTemplates.has(asset.layoutTemplate)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Duplicate layoutTemplate ${asset.layoutTemplate}`,
      };
    }
    seenTemplates.add(asset.layoutTemplate);
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
      const plate = resolveSm001ExecutablePlate(asset.plateId);
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
          message: `Post ${asset.assetId} is not square — the sm-001 proof executable path is square-only`,
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
    if (
      !asset.layers.some((l) => l.type === "text" && l.role === "purpose_label")
    ) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} missing purpose_label layer`,
      };
    }
    if (!asset.layers.some((l) => l.type === "text" && l.role === "wordmark")) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Post ${asset.assetId} missing wordmark layer`,
      };
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

  if (seenOrder.size !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Posting positions must cover 1-${n} exactly once`,
    };
  }
  for (let position = 1; position <= n; position++) {
    if (!seenOrder.has(position)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Posting position ${position} has no post — empty numbered slots are forbidden`,
      };
    }
  }

  const plateIds = new Set(spec.assets.map((a) => a.plateId));
  if (plateIds.size !== 1) {
    return {
      ok: false,
      code: "INVALID_PLATE",
      message: "All Launch Set posts must share the same square plate",
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
