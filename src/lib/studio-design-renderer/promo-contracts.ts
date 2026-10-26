/**
 * Proof contract for v2-rtu-promotion-graphics — exactly two assets.
 */

import { CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT } from "@/config/studio-campaign-graphics-light-harden-v1";

import {
  DESIGN_RENDERER_PROMO_SKU,
  PROMO_LANDSCAPE_PLATE,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  type DesignRendererPromoSku,
  type PromoPlateId,
} from "./promo-types";

export const PROMO_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_PROMO_SKU,
  name: "Make My Campaign Graphics",
  promisedOutput: CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT,
  requiredDeliverableFormats: ["png"] as const,
  exactAssetCount: 2,
  captionsAllowed: false,
  squarePlateProvenThisPackage: {
    plateId: PROMO_SQUARE_PLATE.plateId,
    widthPx: PROMO_SQUARE_PLATE.widthPx,
    heightPx: PROMO_SQUARE_PLATE.heightPx,
  },
  portraitPlateReused: {
    plateId: PROMO_PORTRAIT_PLATE.plateId,
    widthPx: PROMO_PORTRAIT_PLATE.widthPx,
    heightPx: PROMO_PORTRAIT_PLATE.heightPx,
  },
  landscapePlateAvailableFromIntake: {
    plateId: PROMO_LANDSCAPE_PLATE.plateId,
    widthPx: PROMO_LANDSCAPE_PLATE.widthPx,
    heightPx: PROMO_LANDSCAPE_PLATE.heightPx,
  },
  landscapeSold: false,
  dimensionTolerancePx: 40,
  wholeSetVersionsTogether: true,
  setIncompleteUnlessBothPass: true,
  /** Closed by STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1. */
  liveIntakePerAssetPurposeResolved: true,
  note:
    "HARDEN #4 LIGHT 2026-09-24: sold set is square + portrait digital CERT plates. Landscape stays fail-closed and is not sold. One campaign-set renderer. Owner does not finish the set.",
} as const;

export function isDesignRendererPromoSku(
  skuId: string,
): skuId is DesignRendererPromoSku {
  return skuId === DESIGN_RENDERER_PROMO_SKU;
}

export function resolvePromoPlate(plateId: PromoPlateId): {
  plateId: PromoPlateId;
  widthPx: number;
  heightPx: number;
} {
  if (plateId === PROMO_SQUARE_PLATE.plateId) {
    return { ...PROMO_SQUARE_PLATE };
  }
  if (plateId === PROMO_PORTRAIT_PLATE.plateId) {
    return { ...PROMO_PORTRAIT_PLATE };
  }
  if (plateId === PROMO_LANDSCAPE_PLATE.plateId) {
    return { ...PROMO_LANDSCAPE_PLATE };
  }
  throw new Error(`INVALID_PLATE: unsupported plateId ${plateId}`);
}
