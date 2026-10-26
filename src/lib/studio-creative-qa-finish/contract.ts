/** Catalog and production identity for Creative QA & Finish. Not a customer route. */
export const CREATIVE_QA_FINISH_SKU = "v2-creative-qa-finish" as const;

export const CREATIVE_QA_PACKAGE_ID = "creative_qa_finish" as const;

export const CREATIVE_QA_CANVAS_PX = 1080;

export const CREATIVE_QA_MARGIN_PX = 72;

export const CREATIVE_QA_REVISION_MARGIN_PX = 120;

export const CREATIVE_QA_TIGHTER_MARGIN_PX = 36;

export function creativeQaRequestsTighterMargin(request: string): boolean {
  return /\b(?:less|tighter|smaller|narrower)\s+margin\b/i.test(request)
    || /\bless breathing room\b/i.test(request);
}

export const CREATIVE_QA_MAX_ROUNDS = 3;

export const CREATIVE_QA_ASSET_SLOT_IDS = [
  "condensed-qa-asset-1",
  "condensed-qa-asset-2",
] as const;

export const CREATIVE_QA_FACTS_SLOT_ID = "condensed-qa-facts";

export const CREATIVE_QA_DELIVERABLE_LABEL =
  "1080 by 1080 PNG for each static file you supplied";

/** Paper field around the customer's artwork. Not a new design. */
export const CREATIVE_QA_PAPER = { r: 246, g: 243, b: 236, alpha: 1 } as const;

export function creativeQaMarginForRound(round: number, request = ""): number | null {
  if (round === 1) return CREATIVE_QA_MARGIN_PX;
  if (round === 2 || round === 3) {
    return creativeQaRequestsTighterMargin(request)
      ? CREATIVE_QA_TIGHTER_MARGIN_PX
      : CREATIVE_QA_REVISION_MARGIN_PX;
  }
  return null;
}
