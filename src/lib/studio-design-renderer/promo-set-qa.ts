/**
 * Set-level consistency for promotion-graphics campaign set.
 * Complements per-asset design-quality gating.
 */

import {
  customerArtContainsForbiddenFragment,
  isInternalProductionChromeText,
} from "./customer-facing-creative-copy";
import {
  evaluateTextLayerCollisions,
  textLayersForCollisionCheck,
} from "./text-layer-collision";
import type { PromoAssetSpec, PromoCampaignSetSpec, PromoProjectTruth } from "./promo-types";

export type PromoSetQaResult =
  | { ok: true; summary: string }
  | {
      ok: false;
      code:
        | "SET_CONSISTENCY_FAILURE"
        | "FIXTURE_LEAKAGE"
        | "COLLISION"
        | "OVERLAP";
      message: string;
    };

function layoutFingerprint(asset: PromoAssetSpec): string {
  return asset.layers
    .map((l) =>
      l.type === "text"
        ? `${l.id}:${l.x},${l.y},${l.fontSizePx},${l.align}`
        : `${l.id}:${l.x},${l.y},${l.width}x${l.height}`,
    )
    .join("|");
}

export function evaluatePromoSetConsistency(input: {
  truth: PromoProjectTruth;
  spec: PromoCampaignSetSpec;
  declaredTextByAsset: Record<string, string>;
}): PromoSetQaResult {
  const { truth, spec, declaredTextByAsset } = input;
  const customerMode = truth.outputMode === "customer";

  if (spec.assets.length !== 2) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Set must contain exactly two assets",
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
    if (!text.includes(truth.offerName) && !text.includes("Tune-Up")) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Asset ${asset.assetId} missing shared offer truth`,
      };
    }
    if (!text.includes(truth.priceDisplay)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Asset ${asset.assetId} missing shared price truth`,
      };
    }

    if (customerMode) {
      // Customer mode: purpose chrome on PNG is a FAIL (identity JSON may still carry it).
      if (
        asset.authorizedPurpose.trim() &&
        text.includes(asset.authorizedPurpose)
      ) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Customer asset ${asset.assetId} paints authorizedPurpose chrome onto PNG`,
        };
      }
      if (
        asset.layers.some(
          (l) => l.type === "text" && l.role === "purpose_label",
        )
      ) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Customer asset ${asset.assetId} still declares a purpose_label layer`,
        };
      }
      const leak = customerArtContainsForbiddenFragment(text);
      if (leak) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Customer asset ${asset.assetId} contains internal fragment "${leak}"`,
        };
      }
      for (const layer of asset.layers) {
        if (layer.type !== "text") continue;
        if (isInternalProductionChromeText(layer.content)) {
          return {
            ok: false,
            code: "FIXTURE_LEAKAGE",
            message: `Customer asset ${asset.assetId} layer ${layer.id} is production chrome`,
          };
        }
      }
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
    } else if (!text.includes(asset.authorizedPurpose)) {
      // Certification / production: purpose must remain visible on the plate.
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Asset ${asset.assetId} does not surface its authorized purpose`,
      };
    }
  }

  const [a, b] = spec.assets;
  if (layoutFingerprint(a) === layoutFingerprint(b)) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Assets appear cloned (identical layout fingerprints) — must adapt to format",
    };
  }
  if (a.canvas.widthPx === b.canvas.widthPx && a.canvas.heightPx === b.canvas.heightPx) {
    // Same plate allowed by contract, but this proof requires mixed CERT plates.
    if (a.plateId === b.plateId) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: "Proof requires distinct plates (square + portrait) for CERT parity",
      };
    }
  }

  if (
    a.authorizedPurpose === b.authorizedPurpose &&
    a.plateId === b.plateId
  ) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Duplicate purpose+plate — not a truthful two-format set",
    };
  }

  // Customer mode must not leak fixture wording into deliverables.
  if (customerMode) {
    for (const asset of spec.assets) {
      const text = declaredTextByAsset[asset.assetId] ?? "";
      if (/CERTIFICATION FIXTURE|INTERNAL TEST/i.test(text)) {
        return {
          ok: false,
          code: "FIXTURE_LEAKAGE",
          message: `Fixture leakage in ${asset.assetId}`,
        };
      }
    }
  }

  return {
    ok: true,
    summary: `Set consistency OK: ${a.assetId} (${a.plateId}) + ${b.assetId} (${b.plateId}); related campaign truth; distinct layouts.`,
  };
}
