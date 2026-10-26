/**
 * Short-video stills and caption facts stay exact.
 * Missing or uncleared stills wait. Stock / Studio substitutes fail closed.
 */

export type ShortVideoExactFactResult =
  | { ok: true; path: "PROCEED" }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_FACTS"
        | "MISSING_USABLE_FOOTAGE"
        | "UNCLEARED_CUSTOMER_STILL"
        | "AMBIGUOUS_CUSTOMER_FACT"
        | "UNSUPPORTED_FOOTAGE_CLAIM"
        | "UNSUPPORTED_SUBSTITUTE"
        | "UNSUPPORTED_PLATE_CLAIM";
      message: string;
      path: "WAIT_FOR_CUSTOMER" | "FAIL_CLOSED";
    };

const AMBIGUOUS_FACT =
  /\b(tbd|tba|todo|lorem ipsum|placeholder|we think|probably|maybe|not sure|approx(?:imately)?|or so|\?\?\?)\b/i;

const FOOTAGE_EDIT_CLAIM =
  /\b(edit(?:ing)? my (?:footage|clip|video)|cut (?:the )?footage|film(?:ed)?|drone|\.mp4\b|phone clip|raw footage)\b/i;

const STOCK_OR_STUDIO_SUBSTITUTE =
  /\b(stock(?: footage| photo| visual)?|ai visual|studio[- ]approved|studio asset|use studio|generate (?:a |the )?photo)\b/i;

const NON_VERTICAL =
  /\b(landscape|horizontal|square|1\s*:\s*1|16\s*:\s*9)\b/i;

function isAmbiguous(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\[.*\]$/.test(trimmed)) return true;
  if (/^xxx+$/i.test(trimmed)) return true;
  return AMBIGUOUS_FACT.test(trimmed);
}

function wait(
  code: Extract<ShortVideoExactFactResult, { ok: false }>["code"],
  message: string,
  path: Extract<ShortVideoExactFactResult, { ok: false }>["path"] = "WAIT_FOR_CUSTOMER",
): Extract<ShortVideoExactFactResult, { ok: false }> {
  return { ok: false, code, message, path };
}

export function evaluateShortVideoExactFacts(input: {
  videoPurpose?: string;
  onScreenText?: string;
  format?: string;
  footageMaterials?: string;
}): ShortVideoExactFactResult {
  if (input.format && NON_VERTICAL.test(input.format) && !/vertical/i.test(input.format)) {
    return wait(
      "UNSUPPORTED_PLATE_CLAIM",
      "This video is sold as vertical 1080×1920 only. Square and landscape are not sold.",
      "FAIL_CLOSED",
    );
  }
  if (input.footageMaterials && STOCK_OR_STUDIO_SUBSTITUTE.test(input.footageMaterials)) {
    return wait(
      "UNSUPPORTED_SUBSTITUTE",
      "Stock, AI, or Studio-created visuals are not sold. Customer still photos only.",
      "FAIL_CLOSED",
    );
  }
  if (input.footageMaterials && FOOTAGE_EDIT_CLAIM.test(input.footageMaterials)) {
    return wait(
      "UNSUPPORTED_FOOTAGE_CLAIM",
      "Footage editing is not sold. This video is assembled from still photos only.",
      "FAIL_CLOSED",
    );
  }

  if (!input.videoPurpose?.trim()) {
    return wait("MISSING_REQUIRED_FACTS", "videoPurpose is required. Wait for the customer.");
  }
  if (!input.onScreenText?.trim()) {
    return wait("MISSING_REQUIRED_FACTS", "onScreenText is required. Wait for the customer.");
  }
  if (isAmbiguous(input.videoPurpose) || isAmbiguous(input.onScreenText)) {
    return wait(
      "AMBIGUOUS_CUSTOMER_FACT",
      "Purpose or on-screen wording is ambiguous. Wait for the customer. Do not invent it.",
    );
  }
  return { ok: true, path: "PROCEED" };
}

export function shortVideoCaptionsPreserveApprovedWords(input: {
  approvedOnScreenText: string;
  captions: readonly string[];
  cta: string;
}): boolean {
  const hay = input.approvedOnScreenText;
  const parts = [...input.captions, input.cta].map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((part) => hay.includes(part));
}
