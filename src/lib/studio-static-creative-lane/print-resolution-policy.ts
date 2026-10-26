/**
 * Shared print vs digital resolution policy.
 *
 * Cedar & Stone discovered that gpt-image-1 cannot fill a full-bleed 8.5in band
 * at 300 DPI. That is a lane fact, not a flyer defect. This module is the rule
 * every static-design SKU is supposed to inherit, so the next menu or service
 * sheet does not get its own private version of the same surprise.
 */

import {
  STATIC_CREATIVE_PRINT_SKUS,
  studioStaticCreativeLaneReadinessV1 as lane,
} from "@/config/studio-static-creative-lane-readiness-v1";

export type OutputIntent = "digital" | "print_customer_managed";

export type ResolutionClaim = {
  intent: OutputIntent;
  /** Physical box being filled, in inches. Digital claims may omit this. */
  boxInches?: { width: number; height: number };
  sourcePx: { width: number; height: number };
  claimedDpi?: number;
  fit: "cover" | "contain";
  exception?: {
    scope: "controlled_proof";
    authorisedBy: string;
    reason: string;
  } | null;
};

export type ResolutionVerdict = {
  ok: boolean;
  /** May ship to a paying customer as print. Always false for a proof exception. */
  launchable: boolean;
  sourceScale: number;
  effectivePpi: number;
  requiredScale: number;
  code:
    | "digital_ok"
    | "print_ok"
    | "below_headroom"
    | "controlled_proof_exception"
    | "missing_print_geometry";
  detail: string;
};

function sourceScaleFor(claim: ResolutionClaim, boxPx: { width: number; height: number }): number {
  const widthRatio = claim.sourcePx.width / Math.max(1, boxPx.width);
  const heightRatio = claim.sourcePx.height / Math.max(1, boxPx.height);
  return claim.fit === "cover"
    ? Math.min(widthRatio, heightRatio)
    : Math.max(widthRatio, heightRatio);
}

/**
 * Largest physical box, in inches, that a generated-art source can fill at the
 * claimed print DPI while still keeping crop headroom.
 */
export function maxHeadroomBoxInches(sourcePx: {
  width: number;
  height: number;
}): { width: number; height: number } {
  const dpi = lane.resolutionPolicy.claimedPrintDpi;
  const headroom = lane.resolutionPolicy.cropHeadroom;
  return {
    width: Number((sourcePx.width / headroom / dpi).toFixed(3)),
    height: Number((sourcePx.height / headroom / dpi).toFixed(3)),
  };
}

export function outputIntentForSku(skuId: string): OutputIntent {
  return (STATIC_CREATIVE_PRINT_SKUS as readonly string[]).includes(skuId)
    ? "print_customer_managed"
    : "digital";
}

/**
 * Grade a resolution claim. Digital does not inherit a 300 DPI requirement.
 * Print does, and a controlled-proof exception never becomes launchable.
 */
export function evaluatePrintResolutionClaim(claim: ResolutionClaim): ResolutionVerdict {
  const requiredScale = lane.resolutionPolicy.cropHeadroom;

  if (claim.intent === "digital") {
    return {
      ok: true,
      launchable: true,
      sourceScale: 1,
      effectivePpi: 0,
      requiredScale,
      code: "digital_ok",
      detail: "Digital output is graded on CERT-plate pixels, not on a 300 DPI print claim.",
    };
  }

  const dpi = claim.claimedDpi ?? lane.resolutionPolicy.claimedPrintDpi;
  if (!claim.boxInches) {
    return {
      ok: false,
      launchable: false,
      sourceScale: 0,
      effectivePpi: 0,
      requiredScale,
      code: "missing_print_geometry",
      detail: "A print claim must name the physical box. CERT-plate pixels are not inches.",
    };
  }

  const boxPx = {
    width: claim.boxInches.width * dpi,
    height: claim.boxInches.height * dpi,
  };
  const scale = sourceScaleFor(claim, boxPx);
  const effectivePpi = Math.round(scale * dpi);
  const authorised =
    claim.exception != null &&
    claim.exception.scope === "controlled_proof" &&
    claim.exception.authorisedBy.trim().length > 0 &&
    claim.exception.reason.trim().length > 0;

  if (scale >= requiredScale) {
    return {
      ok: true,
      launchable: true,
      sourceScale: Number(scale.toFixed(4)),
      effectivePpi,
      requiredScale,
      code: "print_ok",
      detail: `Source covers the ${claim.boxInches.width}x${claim.boxInches.height}in box at ${dpi} DPI with ${scale.toFixed(2)}x headroom.`,
    };
  }

  const shortfall = `source ${claim.sourcePx.width}x${claim.sourcePx.height} into ${Math.round(boxPx.width)}x${Math.round(boxPx.height)}px at ${dpi} DPI is ${scale.toFixed(2)}x (need ${requiredScale}x); effective ${effectivePpi} ppi`;

  if (authorised) {
    return {
      ok: true,
      launchable: false,
      sourceScale: Number(scale.toFixed(4)),
      effectivePpi,
      requiredScale,
      code: "controlled_proof_exception",
      detail: `${lane.resolutionPolicy.exceptionLabel}. ${shortfall}. Authorised by ${claim.exception!.authorisedBy}. Not launch print.`,
    };
  }

  return {
    ok: false,
    launchable: false,
    sourceScale: Number(scale.toFixed(4)),
    effectivePpi,
    requiredScale,
    code: "below_headroom",
    detail: `Print claim is not launchable. ${shortfall}.`,
  };
}

/**
 * The Cedar & Stone hero band, as a lane fixture. Used to prove the policy
 * still refuses a 300 DPI full-bleed claim from gpt-image-1 without an exception,
 * and still refuses to mark that exception launchable.
 */
export const CEDAR_STONE_HERO_PRINT_CLAIM = {
  intent: "print_customer_managed" as const,
  boxInches: { width: 8.5, height: 4.266666666666667 },
  sourcePx: { width: 1536, height: 1024 },
  claimedDpi: 300,
  fit: "cover" as const,
};
