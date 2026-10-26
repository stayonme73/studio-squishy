/**
 * Combined customer-package check for Social & Promo Graphics.
 * Branch design-qa is not this check. Six graphics, captions, and posting order
 * are judged together, and the square campaign graphic must be a filled card
 * rather than a sparse copy of the first social post.
 */

import { SOCIAL_PROMO_DELIVERY_FILES } from "@/lib/studio-review-revision/social-promo-purchase-delivery-truth";

export const SQUARE_TEXT_GAP_LIMIT_PX = 140;
const MIN_PNG_BYTES = 8_000;

const LEAK = /CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)|offer_lead/i;

export type SocialPromoPackageFile = {
  member: string;
  byteLength: number;
  text?: string;
};

export type SquareCompositionLayer = {
  type: string;
  role?: string;
  y?: number;
  content?: string;
  align?: string;
};

export type SocialPromoPackageQaResult =
  | { ok: true; summary: string }
  | { ok: false; code: "PACKAGE_INCOMPLETE" | "FIXTURE_LEAKAGE" | "SQUARE_COMPOSITION"; message: string };

function textLayers(layers: readonly SquareCompositionLayer[]): SquareCompositionLayer[] {
  return layers.filter(
    (layer) =>
      layer.type === "text" &&
      layer.role !== "disclaimer" &&
      layer.role !== "purpose_label" &&
      String(layer.content ?? "").trim().length > 0,
  );
}

/** Square campaign card: approved body is on the art, the offer is centered, and no text band is left empty. */
export function evaluateSquareCampaignComposition(
  layers: readonly SquareCompositionLayer[],
): SocialPromoPackageQaResult {
  const texts = textLayers(layers);
  const body = texts.find((layer) => layer.role === "body");
  if (!body) {
    return {
      ok: false,
      code: "SQUARE_COMPOSITION",
      message: "Square campaign graphic omits the approved service description.",
    };
  }
  const offer = texts.find((layer) => layer.role === "offer");
  if (!offer || offer.align !== "center") {
    return {
      ok: false,
      code: "SQUARE_COMPOSITION",
      message: "Square campaign graphic still uses the left-aligned social-post stack.",
    };
  }
  const ys = texts
    .map((layer) => layer.y)
    .filter((y): y is number => typeof y === "number")
    .sort((a, b) => a - b);
  for (let index = 1; index < ys.length; index += 1) {
    const gap = ys[index]! - ys[index - 1]!;
    if (gap > SQUARE_TEXT_GAP_LIMIT_PX) {
      return {
        ok: false,
        code: "SQUARE_COMPOSITION",
        message: `Square campaign graphic leaves ${gap}px of empty space between text bands.`,
      };
    }
  }
  return { ok: true, summary: "Square campaign graphic is a filled, centered card." };
}

export function evaluateSocialPromoCustomerPackage(input: {
  files: readonly SocialPromoPackageFile[];
  squareLayers: readonly SquareCompositionLayer[];
}): SocialPromoPackageQaResult {
  const byMember = new Map(input.files.map((file) => [file.member, file]));
  for (const required of SOCIAL_PROMO_DELIVERY_FILES) {
    const file = byMember.get(required.member);
    if (!file) {
      return {
        ok: false,
        code: "PACKAGE_INCOMPLETE",
        message: `Customer package is missing ${required.filename}.`,
      };
    }
    const minimum = required.contentType === "image/png" ? MIN_PNG_BYTES : 40;
    if (file.byteLength < minimum) {
      return {
        ok: false,
        code: "PACKAGE_INCOMPLETE",
        message: `${required.filename} is not a finished customer file.`,
      };
    }
  }

  const captions = byMember.get("captions")?.text ?? "";
  const order = byMember.get("order")?.text ?? "";
  const leakSource = `${captions}\n${order}`;
  if (LEAK.test(leakSource)) {
    return {
      ok: false,
      code: "FIXTURE_LEAKAGE",
      message: "Captions or posting order contain internal production text.",
    };
  }
  for (const label of ["Post 1", "Post 2", "Post 3", "Post 4"]) {
    if (!captions.includes(label)) {
      return {
        ok: false,
        code: "PACKAGE_INCOMPLETE",
        message: `Captions are missing ${label}.`,
      };
    }
  }
  if (!/\$\d+/.test(captions)) {
    return {
      ok: false,
      code: "PACKAGE_INCOMPLETE",
      message: "Captions do not include the approved price.",
    };
  }
  if (!/you post these yourself/i.test(order)) {
    return {
      ok: false,
      code: "PACKAGE_INCOMPLETE",
      message: "Posting order does not tell the customer they post the graphics themselves.",
    };
  }
  for (const step of ["1.", "2.", "3.", "4."]) {
    if (!order.includes(step)) {
      return {
        ok: false,
        code: "PACKAGE_INCOMPLETE",
        message: `Posting order is missing step ${step}`,
      };
    }
  }

  const square = evaluateSquareCampaignComposition(input.squareLayers);
  if (!square.ok) return square;
  return {
    ok: true,
    summary:
      "Six graphics, four captions, and the posting order passed as one customer package. The square campaign graphic is a filled card.",
  };
}
