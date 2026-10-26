/**
 * Hybrid composition per layout family — and the measure that proves it happened.
 *
 * Customer-One V18 (`type_led_premium` / `type_field`) and V19 (`editorial_split` /
 * `vertical_split`) came out identical to within one pixel of plate height: same
 * full-width dock at 47% of the canvas, same type scale, same left alignment. The
 * creative reasoner was choosing a route label, a palette name, and an image
 * prompt. It was not choosing a layout, because the hybrid composer laid out one
 * fixed dock regardless of family.
 *
 * This module holds the geometry each family is entitled to, and derives the
 * signature a composed spec must show to claim that family. The composer reads the
 * plan; the Creative Director gate reads the signature. One source, so a family
 * cannot be honoured in name only.
 */

import type { DesignLayoutFamilyId } from "./types";

export type HybridLockupAnchor = "bottom_edge" | "lower" | "middle";

export type HybridTypeScale = {
  wordmarkPx: number;
  headlinePx: number;
  offerPx: number;
  pricePx: number;
  datesPx: number;
  bodyPx: number;
  ctaPx: number;
  contactPx: number;
};

export type HybridLockupPlan = {
  familyId: DesignLayoutFamilyId;
  /** Plate frame, horizontally. The lockup is inset inside it. */
  plateX: number;
  plateWidth: number;
  /** Space between the plate edge and the type. */
  insetPx: number;
  /** Vertical padding inside the plate, above the first line and below the last. */
  paddingPx: number;
  /** Gap between lockup blocks. Editorial rhythm differs by family. */
  blockGapPx: number;
  anchor: HybridLockupAnchor;
  /** Distance from the canvas bottom for bottom-anchored and lower plates. */
  bottomMarginPx: number;
  /** Plate top for middle-anchored families; ignored otherwise. */
  plateTopPx: number;
  align: "left" | "center";
  scale: HybridTypeScale;
  /** Full-height accent rail, for the families whose identity is a rail. */
  rail?: { x: number; y: number; width: number; height: number };
  /**
   * Where the generated image must stay quieter, in the Studio's own words, so the
   * image request matches the composition instead of always reserving a lower third.
   */
  reservedImageZone: string;
};

function scale(overrides: Partial<HybridTypeScale>): HybridTypeScale {
  return {
    wordmarkPx: 32,
    headlinePx: 36,
    offerPx: 26,
    pricePx: 34,
    datesPx: 20,
    bodyPx: 20,
    ctaPx: 26,
    contactPx: 18,
    ...overrides,
  };
}

/**
 * The layout each family gets in the hybrid route. Sizes are canvas pixels and
 * scale with the plate, so the square format stays proportional.
 */
export function hybridLockupPlanFor(
  familyId: DesignLayoutFamilyId | undefined,
  canvasWidthPx: number,
  canvasHeightPx: number,
): HybridLockupPlan {
  const W = canvasWidthPx;
  const H = canvasHeightPx;
  if (!familyId) {
    // No route chose a family — CERT fixtures and legacy proofs. Keep the shape
    // those artifacts were certified with; only prose size rises to the
    // readable floor.
    return {
      familyId: "centered_promotional_plate",
      plateX: 40,
      plateWidth: W - 80,
      insetPx: 16,
      paddingPx: 20,
      blockGapPx: 14,
      anchor: "middle",
      bottomMarginPx: 0,
      plateTopPx: Math.round(H * 0.48) - 20,
      align: "left",
      scale: scale({
        wordmarkPx: 28,
        headlinePx: 34,
        offerPx: 26,
        pricePx: 28,
        datesPx: 18,
        ctaPx: 24,
        contactPx: 16,
      }),
      reservedImageZone:
        "Leave the lower third slightly quieter so typography can overlay later.",
    };
  }
  switch (familyId) {
    case "type_led_premium":
      // Type is the artwork: a full-bleed field welded to the bottom edge.
      return {
        familyId,
        plateX: 0,
        plateWidth: W,
        insetPx: 64,
        paddingPx: 40,
        blockGapPx: 18,
        anchor: "bottom_edge",
        bottomMarginPx: 0,
        plateTopPx: 0,
        align: "left",
        scale: scale({
          wordmarkPx: 52,
          headlinePx: 42,
          offerPx: 28,
          pricePx: 38,
          ctaPx: 28,
        }),
        reservedImageZone:
          "Keep the lower third calmer for a full-width type field, and carry strong material in the upper two thirds.",
      };
    case "editorial_split":
      // A genuine split: a tall type column on the left, image open on the right.
      return {
        familyId,
        plateX: 0,
        plateWidth: Math.round(W * 0.56),
        insetPx: 56,
        paddingPx: 36,
        blockGapPx: 56,
        anchor: "bottom_edge",
        bottomMarginPx: 48,
        plateTopPx: 0,
        align: "left",
        scale: scale({
          wordmarkPx: 30,
          headlinePx: 46,
          offerPx: 28,
          pricePx: 34,
          bodyPx: 22,
          ctaPx: 28,
        }),
        reservedImageZone:
          "Keep the left half calmer for a tall type column, and carry the subject on the right side of the frame.",
      };
    case "bold_asymmetric":
      // A heavy block shoved left and lifted off the edge — deliberately off-centre.
      return {
        familyId,
        plateX: 0,
        plateWidth: Math.round(W * 0.78),
        insetPx: 56,
        paddingPx: 36,
        blockGapPx: 22,
        anchor: "lower",
        bottomMarginPx: 104,
        plateTopPx: 0,
        align: "left",
        scale: scale({
          wordmarkPx: 34,
          headlinePx: 48,
          offerPx: 26,
          pricePx: 40,
          ctaPx: 30,
        }),
        reservedImageZone:
          "Keep the lower left calmer for an offset type block, and carry the subject in the upper right of the frame.",
      };
    case "service_rail":
      // Identity rail down the full height, lockup docked to the right of it.
      return {
        familyId,
        plateX: Math.round(W * 0.094),
        plateWidth: W - Math.round(W * 0.094),
        insetPx: 48,
        paddingPx: 34,
        blockGapPx: 20,
        anchor: "bottom_edge",
        bottomMarginPx: 0,
        plateTopPx: 0,
        align: "left",
        scale: scale({ wordmarkPx: 34, headlinePx: 38, ctaPx: 26 }),
        rail: { x: 0, y: 0, width: Math.round(W * 0.094), height: H },
        reservedImageZone:
          "Keep a narrow left margin and the lower band calmer for a rail and dock, and carry material across the centre.",
      };
    case "modular_thirds":
      // Middle band on the thirds grid, image working above and below it.
      return {
        familyId,
        plateX: 0,
        plateWidth: W,
        insetPx: 56,
        paddingPx: 36,
        blockGapPx: 20,
        anchor: "middle",
        bottomMarginPx: 0,
        plateTopPx: Math.round(H / 3),
        align: "left",
        scale: scale({ wordmarkPx: 36, headlinePx: 40, pricePx: 36 }),
        reservedImageZone:
          "Keep the middle band calmer for a full-width band on the thirds grid, and carry real material in both the top and bottom thirds.",
      };
    default:
      // Centred promotional plate — the legacy CERT shape, kept centred.
      return {
        familyId: "centered_promotional_plate",
        plateX: Math.round(W * 0.1),
        plateWidth: W - Math.round(W * 0.1) * 2,
        insetPx: 48,
        paddingPx: 40,
        blockGapPx: 20,
        anchor: "middle",
        bottomMarginPx: 0,
        plateTopPx: Math.round(H * 0.34),
        align: "center",
        scale: scale({ wordmarkPx: 34, headlinePx: 38 }),
        reservedImageZone:
          "Keep the centre calmer for a centred plate, and carry material out to all four edges.",
      };
  }
}

export type CompositionSignature = {
  spansFullWidth: boolean;
  horizontalAnchor: "full" | "left" | "center" | "right";
  verticalAnchor: "upper" | "middle" | "lower" | "bottom_edge";
  plateAspect: "portrait" | "square" | "landscape";
  hasFullHeightRail: boolean;
  textAlign: "left" | "center" | "right";
};

function horizontalAnchorOf(
  plateX: number,
  plateWidth: number,
  W: number,
): CompositionSignature["horizontalAnchor"] {
  if (plateX <= W * 0.02 && plateWidth >= W * 0.96) return "full";
  const leftMargin = plateX;
  const rightMargin = W - (plateX + plateWidth);
  if (Math.abs(leftMargin - rightMargin) <= W * 0.03) return "center";
  return leftMargin < rightMargin ? "left" : "right";
}

function verticalAnchorOf(
  plateY: number,
  plateHeight: number,
  H: number,
): CompositionSignature["verticalAnchor"] {
  if (plateY + plateHeight >= H - H * 0.04) return "bottom_edge";
  const center = plateY + plateHeight / 2;
  if (center > H * 0.62) return "lower";
  if (center > H * 0.34) return "middle";
  return "upper";
}

function aspectOf(width: number, height: number): CompositionSignature["plateAspect"] {
  const ratio = width / Math.max(1, height);
  if (ratio < 0.95) return "portrait";
  if (ratio <= 1.6) return "square";
  return "landscape";
}

export function signatureFromFrames(input: {
  canvasWidthPx: number;
  canvasHeightPx: number;
  plateX: number;
  plateY: number;
  plateWidth: number;
  plateHeight: number;
  textAlign: CompositionSignature["textAlign"];
  hasFullHeightRail: boolean;
}): CompositionSignature {
  const W = input.canvasWidthPx;
  const H = input.canvasHeightPx;
  return {
    spansFullWidth: input.plateX <= W * 0.02 && input.plateWidth >= W * 0.96,
    horizontalAnchor: horizontalAnchorOf(input.plateX, input.plateWidth, W),
    verticalAnchor: verticalAnchorOf(input.plateY, input.plateHeight, H),
    plateAspect: aspectOf(input.plateWidth, input.plateHeight),
    hasFullHeightRail: input.hasFullHeightRail,
    textAlign: input.textAlign,
  };
}

/** Vertical placement each anchor is required to produce. */
function requiredVerticalAnchor(
  anchor: HybridLockupAnchor,
): CompositionSignature["verticalAnchor"] {
  return anchor === "bottom_edge" ? "bottom_edge" : anchor === "lower" ? "lower" : "middle";
}

export type LayoutFamilyAgreement = {
  ok: boolean;
  familyId: DesignLayoutFamilyId;
  findings: readonly { code: string; message: string }[];
  actualSignatureKey: string;
};

/**
 * Does the composition actually show the layout family the route claims?
 *
 * Checks only what the plan dictates — plate frame, vertical anchor, alignment,
 * rail — so a family cannot be satisfied by a label in the spec header.
 */
export function evaluateLayoutFamilyAgreement(input: {
  canvasWidthPx: number;
  canvasHeightPx: number;
  layoutFamilyId: DesignLayoutFamilyId;
  plate: { x: number; y: number; width: number; height: number };
  textAlign: CompositionSignature["textAlign"];
  hasFullHeightRail: boolean;
  /**
   * Rendered size of the headline and wordmark, when the caller has the text
   * layers. Type scale is part of what a layout family means: two families that
   * agree on plate geometry and disagree on which line dominates are not the same
   * layout. Omitted by callers that only hold plate geometry.
   */
  typeSizes?: { headlinePx?: number; wordmarkPx?: number };
}): LayoutFamilyAgreement {
  const W = input.canvasWidthPx;
  const H = input.canvasHeightPx;
  const plan = hybridLockupPlanFor(input.layoutFamilyId, W, H);
  const findings: { code: string; message: string }[] = [];
  const actual = signatureFromFrames({
    canvasWidthPx: W,
    canvasHeightPx: H,
    plateX: input.plate.x,
    plateY: input.plate.y,
    plateWidth: input.plate.width,
    plateHeight: input.plate.height,
    textAlign: input.textAlign,
    hasFullHeightRail: input.hasFullHeightRail,
  });

  const xTolerance = Math.max(8, W * 0.02);
  const widthTolerance = Math.max(12, W * 0.03);
  if (
    Math.abs(input.plate.x - plan.plateX) > xTolerance ||
    Math.abs(input.plate.width - plan.plateWidth) > widthTolerance
  ) {
    findings.push({
      code: "layout_family_composition_mismatch",
      message: `Route claims layout family ${input.layoutFamilyId}, which places the type plate at x=${plan.plateX} width=${plan.plateWidth}, but the composition placed it at x=${input.plate.x} width=${input.plate.width}. The chosen layout did not reach the artwork.`,
    });
  }

  const requiredAnchor = requiredVerticalAnchor(plan.anchor);
  if (actual.verticalAnchor !== requiredAnchor) {
    findings.push({
      code: "layout_family_anchor_mismatch",
      message: `Layout family ${input.layoutFamilyId} anchors its lockup ${requiredAnchor.replace("_", " ")}; the composition anchored it ${actual.verticalAnchor.replace("_", " ")}.`,
    });
  }

  if (actual.textAlign !== plan.align) {
    findings.push({
      code: "layout_family_alignment_mismatch",
      message: `Layout family ${input.layoutFamilyId} sets type ${plan.align}-aligned; the composition set it ${actual.textAlign}-aligned.`,
    });
  }

  if (Boolean(plan.rail) !== input.hasFullHeightRail) {
    findings.push({
      code: "layout_family_rail_mismatch",
      message: plan.rail
        ? `Layout family ${input.layoutFamilyId} is built on a full-height rail, and the composition has none.`
        : `Layout family ${input.layoutFamilyId} has no rail, and the composition drew one.`,
    });
  }

  // Bottom margin, for the families that dock near the bottom edge. This is what
  // separates a plate sitting on the trim from one lifted off it — the difference
  // between type_led_premium (flush) and editorial_split (lifted).
  if (plan.anchor === "bottom_edge" || plan.anchor === "lower") {
    const actualBottomMargin = H - (input.plate.y + input.plate.height);
    const marginTolerance = Math.max(12, H * 0.02);
    if (Math.abs(actualBottomMargin - plan.bottomMarginPx) > marginTolerance) {
      findings.push({
        code: "layout_family_bottom_margin_mismatch",
        message: `Layout family ${input.layoutFamilyId} lifts its lockup ${plan.bottomMarginPx}px off the bottom edge; the composition left ${Math.round(actualBottomMargin)}px. The plate is not sitting where this layout puts it.`,
      });
    }
  }

  // Type scale. A family that says the wordmark leads and a family that says the
  // headline leads are different layouts even at identical plate geometry.
  const sizeTolerance = 3;
  for (const [role, planned, actualSize] of [
    ["headline", plan.scale.headlinePx, input.typeSizes?.headlinePx],
    ["wordmark", plan.scale.wordmarkPx, input.typeSizes?.wordmarkPx],
  ] as const) {
    if (typeof actualSize !== "number") continue;
    if (Math.abs(actualSize - planned) > sizeTolerance) {
      findings.push({
        code: "layout_family_type_scale_mismatch",
        message: `Layout family ${input.layoutFamilyId} sets the ${role} at ${planned}px on a ${H}px plate; the composition set it at ${actualSize}px. The type scale that makes this layout what it is did not reach the artwork.`,
      });
    }
  }

  return {
    ok: findings.length === 0,
    familyId: input.layoutFamilyId,
    findings,
    actualSignatureKey: signatureKey(actual),
  };
}

export function signatureKey(signature: CompositionSignature): string {
  return [
    signature.spansFullWidth ? "full-width" : "partial-width",
    signature.horizontalAnchor,
    signature.verticalAnchor,
    signature.plateAspect,
    signature.hasFullHeightRail ? "rail" : "no-rail",
    signature.textAlign,
  ].join("/");
}
