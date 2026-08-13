/**
 * Proof contract for v2-rtu-social-posts — exactly four square posts,
 * Studio-written captions, durable posting order.
 */

import {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_SQUARE_PLATE,
  type DesignRendererSocialPostsSku,
  type SocialPostPlateId,
} from "./social-posts-types";

export const SOCIAL_POSTS_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  exactAssetCount: SOCIAL_POSTS_EXACT_COUNT,
  /** Square-only proof — reuses the promotion-graphics CERT square plate. */
  squarePlateReused: {
    plateId: SOCIAL_POSTS_SQUARE_PLATE.plateId,
    widthPx: SOCIAL_POSTS_SQUARE_PLATE.widthPx,
    heightPx: SOCIAL_POSTS_SQUARE_PLATE.heightPx,
  },
  portraitVariantsAuthorized: false,
  captionsRequired: true,
  postingOrderRequired: true,
  wholeSetVersionsTogether: true,
  setIncompleteUnlessAllPass: true,
  /**
   * INTAKE-TRUTH-1: live path can map platform + square×4 + durable order +
   * Studio layout-template assignment. Harbor role names are NOT customer
   * intake fields and NOT fixed service-contract roles.
   */
  liveIntakeSetStructureResolved: true,
  roleAnglesAreCustomerIntakeFields: false,
  roleAnglesAreFixedServiceContract: false,
  /** DISPATCH-HOOK-1 authorized — primaryTool remapped for this SKU only. */
  primaryToolRemapAuthorized: true,
  dispatchHookAuthorized: true,
  observerWiringAuthorized: true,
  canvaUsedInProof: false,
  makeUsedInProof: false,
  ownerRoutineResponsibility: "NONE",
  dimensionTolerancePx: 40,
  note:
    "v2-rtu-social-posts Machine path: four square posts, Studio layout templates (not customer role menus), Studio-written captions, durable posting order. DISPATCH-HOOK-1 remaps primaryTool to studio_design_renderer for this SKU only. Portrait/TikTok fail-closed. Owner routine NONE.",
} as const;

export function isDesignRendererSocialPostsSku(
  skuId: string,
): skuId is DesignRendererSocialPostsSku {
  return skuId === DESIGN_RENDERER_SOCIAL_POSTS_SKU;
}

export function resolveSocialPostPlate(plateId: SocialPostPlateId): {
  plateId: SocialPostPlateId;
  widthPx: number;
  heightPx: number;
} {
  if (plateId === SOCIAL_POSTS_SQUARE_PLATE.plateId) {
    return { ...SOCIAL_POSTS_SQUARE_PLATE };
  }
  throw new Error(
    `INVALID_PLATE: social posts proof is square-only (${SOCIAL_POSTS_SQUARE_PLATE.plateId}); got ${plateId}`,
  );
}
