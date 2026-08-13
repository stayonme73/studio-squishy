/**
 * Set-level consistency for promotion-graphics campaign set.
 * Complements per-asset design-quality gating.
 */

import type { PromoAssetSpec, PromoCampaignSetSpec, PromoProjectTruth } from "./promo-types";

export type PromoSetQaResult =
  | { ok: true; summary: string }
  | { ok: false; code: "SET_CONSISTENCY_FAILURE" | "FIXTURE_LEAKAGE"; message: string };

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
    if (!text.includes(asset.authorizedPurpose)) {
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
  if (truth.outputMode === "customer") {
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
