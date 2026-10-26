/**
 * Both sides are one card. One weak side fails the set.
 */

import { BUSINESS_CARD_CANVAS } from "./card-types";
import type { BusinessCardArtifactIdentity } from "./card-types";

export type BusinessCardSetQaResult =
  | { ok: true; summary: string }
  | { ok: false; code: "SET_CONSISTENCY_FAILURE"; message: string };

export function evaluateBusinessCardSetConsistency(
  identity: Pick<
    BusinessCardArtifactIdentity,
    "sides" | "pdfContentSha256" | "renderVersion" | "widthPx" | "heightPx"
  >,
): BusinessCardSetQaResult {
  if (identity.sides.length !== 2) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: `Card must bind front and back together, found ${identity.sides.length} side(s)`,
    };
  }
  const ids = new Set(identity.sides.map((side) => side.side));
  if (!ids.has("front") || !ids.has("back")) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "One weak or missing side fails the whole card",
    };
  }
  for (const side of identity.sides) {
    if (
      side.widthPx !== BUSINESS_CARD_CANVAS.widthPx ||
      side.heightPx !== BUSINESS_CARD_CANVAS.heightPx
    ) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `${side.side} is not the sold 1536×1024 CERT plate`,
      };
    }
    if (!side.pngContentSha256 || side.overflowOk === false) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `One weak side fails the whole card (${side.side})`,
      };
    }
  }
  if (!identity.pdfContentSha256) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Customer-print PDF is part of the sold card set",
    };
  }
  if (
    identity.widthPx !== BUSINESS_CARD_CANVAS.widthPx ||
    identity.heightPx !== BUSINESS_CARD_CANVAS.heightPx
  ) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Card canvas must stay 1536×1024 for both sides",
    };
  }
  return {
    ok: true,
    summary: `Card v${identity.renderVersion} binds front + back + PDF as one set`,
  };
}
