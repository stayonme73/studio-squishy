/**
 * QA projection — the new document, expressed as the `FlyerDesignSpec` the
 * existing gates already know how to grade.
 *
 * This is deliberately a projection and not a second source of truth. The rebuild
 * needs richer composition than `FlyerDesignSpec` can describe (crop windows,
 * alpha, gradients, masks), but none of that is a reason to walk away from gates
 * that already encode hard-won judgement about hollow plates, buried offers, dead
 * space, and readability at output size. So the document projects down, and QA
 * runs unchanged.
 *
 * Two projection rules are worth stating plainly:
 *
 *  - A figure projects its `effectiveHex`, the colour a reader actually perceives,
 *    not its raw fill. `rgba(252,249,243,0.95)` is not a colour a contrast gate can
 *    grade, and grading it as black would be a lie in the other direction.
 *  - Gradient-filled type projects its first stop, which is the colour that carries
 *    the reading.
 *
 * Because the document is authored in the legacy logical space, every px-calibrated
 * threshold in those gates stays valid.
 */

import {
  FLYER_DESIGN_SPEC_VERSION,
  type FlyerDesignLayer,
  type FlyerDesignSpec,
  type FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";

import type { StudioDesignDocument } from "./types";
import { requiredFactValues } from "./compose-flyer";

/** First hex stop in a fill, or the fill itself when it is already a colour. */
export function representativeHex(fill: string, fallback: string): string {
  if (/^#[0-9a-f]{3,8}$/i.test(fill.trim())) return fill.trim();
  const hex = fill.match(/#[0-9a-f]{6}\b/i)?.[0];
  return hex ?? fallback;
}

export function toFlyerDesignSpec(
  document: StudioDesignDocument,
  truth: FlyerProjectTruth,
): FlyerDesignSpec {
  const facts = requiredFactValues(truth);
  const layers: FlyerDesignLayer[] = [];

  for (const element of document.elements) {
    if (element.type === "text") {
      const factText =
        element.factId && facts[element.factId]
          ? facts[element.factId]
          : element.text;
      layers.push({
        type: "text",
        id: element.id,
        role: element.role,
        content: factText,
        x: element.x,
        y: element.y,
        width: element.width,
        fontSizePx: element.fontSize,
        fontWeight: element.fontWeight,
        lineHeight: element.lineHeight,
        letterSpacingPx: element.letterSpacing,
        color: representativeHex(element.fill, "#000000"),
        align: element.align,
        maxLines: element.maxLines,
        fontStack: element.fontFamily,
      });
      continue;
    }
    if (element.type === "image") {
      layers.push({
        type: "image",
        id: element.id,
        role: element.role,
        materialId: element.materialId,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        fit: element.fit,
      });
      continue;
    }
    layers.push({
      type: "shape",
      id: element.id,
      role: element.role,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      fill: element.effectiveHex,
      borderRadiusPx: element.cornerRadius,
    });
  }

  return {
    specVersion: FLYER_DESIGN_SPEC_VERSION,
    skuId: document.provenance.skuId,
    canvas: { widthPx: document.logical.widthPx, heightPx: document.logical.heightPx },
    background: { color: representativeHex(document.background, "#0b1420") },
    colors: { ...truth.brandColors },
    layers,
    materials: document.materials,
    outputFormats: ["png", "pdf"],
    reasoningMode: "deterministic_constrained",
    creativeDirection: document.provenance.creativeDirection
      ? {
          intelligenceVersion: document.provenance.creativeDirection.intelligenceVersion,
          routeId: document.provenance.creativeDirection.selectedRoute.routeId,
          layoutFamilyId:
            document.provenance.creativeDirection.selectedRoute.layoutFamilyId,
          paletteFamilyId:
            document.provenance.creativeDirection.selectedRoute.paletteFamilyId,
          typeSystemId: document.provenance.creativeDirection.selectedRoute.typeSystemId,
          geometryId: document.provenance.creativeDirection.selectedRoute.geometryId,
        }
      : undefined,
    revisionEmphasis: document.provenance.revisionEmphasis,
  };
}
