/**
 * Customer-facing creative copy — machine language must never reach art.
 * Strips / detects production chrome before body/CTA/PNG text is released.
 */

/** Patterns that must not appear in customer-declared PNG / body / CTA text. */
export const INTERNAL_FIELD_LEAK_PATTERNS: readonly RegExp[] = [
  /\bDestination:\s*/i,
  /\bVoice\s*brief\b/i,
  /\bStyle\s*\/\s*Voice\s*brief\b/i,
  /\bMISSING\s+FACT\b/i,
  /\bIntake\s+Fact\b/i,
  /\bpurpose_label\b/i,
  /\bPost\s+\d+\s+of\s+\d+\b/i,
  /\boffer_lead\b/i,
  /\bcta_book\b/i,
  /\bdates_window\b/i,
  /\btrust_brand\b/i,
  /\bCERTIFICATION\s+FIXTURE\b/i,
  /\bINTERNAL\s+TEST\b/i,
  /\(\s*\d{3,4}\s*[×x]\s*\d{3,4}\s*\)/,
  /\bsquare\s+feed\b/i,
  /\bcert-square-\d+\b/i,
  /\bYou\s+distribute\b/i,
  /\bYou\s+post\s+and\s+schedule\b/i,
  /\bFinished\s+campaign\s+graphics\s+for\s+your\s+print\b/i,
  /\bFinished\s+social\s+posts\s+and\s+captions\s+for\s+your\s+upload\b/i,
  /\bFinished\s+single-sided\s+flyer\s+for\s+your\s+print\b/i,
];

/**
 * Concrete fragments for negative tests / set-QA customer fail-closed scans.
 * Prefer substring checks over regex when scanning declared PNG text.
 */
export const FORBIDDEN_CUSTOMER_ART_FRAGMENTS: readonly string[] = [
  "Destination:",
  "Voice brief",
  "Style / Voice brief",
  "MISSING FACT",
  "Intake Fact",
  "purpose_label",
  "Post 1 of 4",
  "Post 2 of 4",
  "Post 3 of 4",
  "Post 4 of 4",
  "offer_lead",
  "cta_book",
  "dates_window",
  "trust_brand",
  "CERTIFICATION FIXTURE",
  "INTERNAL TEST",
  "(1024×1024)",
  "(1024x1024)",
  "square feed",
  "cert-square-1024",
  "You distribute",
  "You post and schedule",
];

export function assertNoInternalLeakInCustomerText(text: string): void {
  const hay = String(text ?? "");
  for (const pattern of INTERNAL_FIELD_LEAK_PATTERNS) {
    if (pattern.test(hay)) {
      throw new Error(
        `INTERNAL_FIELD_LEAK: customer-facing text matches ${pattern}`,
      );
    }
  }
  for (const fragment of FORBIDDEN_CUSTOMER_ART_FRAGMENTS) {
    if (hay.toLowerCase().includes(fragment.toLowerCase())) {
      throw new Error(
        `INTERNAL_FIELD_LEAK: customer-facing text contains "${fragment}"`,
      );
    }
  }
}

/**
 * Remove Destination: label and similar machine CTA chrome.
 * Keeps the human CTA and the destination value itself.
 */
export function stripCustomerFacingCta(cta: string): string {
  let out = String(cta ?? "").trim();
  if (!out) return "";
  out = out.replace(/\s*[—–-]\s*Destination:\s*/gi, " — ");
  out = out.replace(/\bDestination:\s*/gi, "");
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([—–-])\s+/g, " $1 ").trim();
  out = out.replace(/^(?:—|–|-)\s*/, "").replace(/\s*(?:—|–|-)$/, "").trim();
  return out;
}

/**
 * Button/plate CTA — short action only. Phone/URL belong on contact layers.
 * Prevents CTA box clipping from dumping "Book at … or call …" into the button.
 */
export function shortenCustomerFacingCta(
  cta: string,
  options?: { maxLen?: number },
): string {
  const max = options?.maxLen ?? 36;
  let s = stripCustomerFacingCta(cta);
  if (!s) return "";
  const enroll = s.match(
    /^(Enroll(?:\s+in\s+[A-Za-z0-9 &'’-]{1,40})?|Book now|Learn more|Get started|Join us)/i,
  );
  if (enroll?.[1]) return enroll[1].trim().slice(0, max);
  const beforeBook = s.split(/\s+(?:Book at|or call|Visit|Call)\b/i)[0]?.trim();
  if (beforeBook && beforeBook.length >= 4) {
    const head = beforeBook.split(/\s+[—–-]\s+/)[0]?.trim() || beforeBook;
    return head.slice(0, max).trim();
  }
  return s.split(/\s+[—–-]\s+/)[0]?.trim().slice(0, max) || s.slice(0, max);
}

/**
 * Campaign labels are often "Business — Campaign Title". Wordmarks must be the business only.
 */
export function resolveCustomerBusinessName(input: {
  campaignName?: string;
  mustInclude?: string;
  businessNameAnswer?: string;
}): string {
  const fromAnswer = String(input.businessNameAnswer ?? "").trim();
  if (fromAnswer && fromAnswer.length <= 64) return fromAnswer;

  const firstLine = String(input.mustInclude ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (
    firstLine &&
    firstLine.length <= 64 &&
    !/\$\d/.test(firstLine) &&
    !/^dates?:/i.test(firstLine) &&
    !/^price:/i.test(firstLine) &&
    !/^promotional flyer/i.test(firstLine)
  ) {
    return firstLine.replace(/\s+[—–-]\s+.*$/, "").trim() || firstLine;
  }

  const campaign = String(input.campaignName ?? "").trim();
  if (!campaign) return "Customer";
  const parts = campaign.split(/\s+[—–-]\s+/);
  if (parts[0]?.trim()) return parts[0].trim().slice(0, 64);
  return campaign.slice(0, 64);
}

/** Short offer headline — never "Promotional flyer for …" or ISO date dumps. */
export function resolveCustomerOfferHeadline(input: {
  flyerPurpose?: string;
  campaignFocus?: string;
  postsAbout?: string;
  mustInclude?: string;
  fallback?: string;
}): string {
  const purpose = String(input.flyerPurpose ?? "").trim();
  const purposeTail = purpose.replace(/^promotional flyer for\s+/i, "").trim();
  if (purposeTail && !/^promotional flyer/i.test(purposeTail)) {
    return purposeTail.slice(0, 48);
  }

  const focus = String(input.campaignFocus ?? "").trim();
  if (focus) {
    const noIso = focus
      .replace(/\bstarting\s+\d{4}-\d{2}-\d{2}\b/gi, "")
      .replace(/\s+[—–-]\s+six-week.*$/i, "")
      .replace(/\s+launch\s*$/i, "")
      .trim();
    const head = (noIso || focus).split(/[.\n]/)[0]?.trim() ?? "";
    if (head && !/^promotional flyer/i.test(head)) return head.slice(0, 48);
  }

  const posts = String(input.postsAbout ?? "").trim();
  const fall = posts.match(/\b([A-Z][A-Za-z0-9 &'’-]{2,40}\s+Reset)\b/);
  if (fall?.[1]) return fall[1].slice(0, 48);

  const must = String(input.mustInclude ?? "");
  const mustOffer = must.match(
    /\b([A-Z][A-Za-z0-9 &'’-]{2,40}\s+(?:Reset|Launch|Tune-Up|Bundle))\b/,
  );
  if (mustOffer?.[1]) return mustOffer[1].slice(0, 48);

  return String(input.fallback ?? "Your offer").slice(0, 48);
}

/**
 * Remove Style/Voice brief blocks, MISSING FACT lines, Style: trails,
 * and optional exact voice-brief content before body curation.
 */
export function stripProductionMetadataFromMustInclude(
  mustInclude: string,
  options?: { voiceBriefExact?: string },
): string {
  let text = String(mustInclude ?? "");

  // Drop Style / Voice brief (authoritative) … through end-of-line or block.
  text = text.replace(
    /^[^\S\n]*Style\s*\/\s*Voice\s*brief(?:\s*\([^)]*\))?\s*:?\s*[\s\S]*?(?=\n(?![^\S\n])|\n*$)/gim,
    "",
  );
  text = text.replace(/^[^\S\n]*Voice\s*brief(?:\s*\([^)]*\))?\s*:?\s*.*$/gim, "");

  // MISSING FACT production notes — never customer body.
  text = text.replace(/^[^\S\n]*MISSING\s+FACT[^\n]*$/gim, "");

  // Style: direction trail (palette/layout notes) — strip from first Style: onward.
  text = text.replace(/\n*Style:\s*[\s\S]*$/i, "");
  text = text.replace(/^[^\S\n]*Style:\s*.*$/gim, "");

  const brief = options?.voiceBriefExact?.trim();
  if (brief) {
    const escaped = brief.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "g"), "");
  }

  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

/**
 * Detect production chrome that belongs on identity JSON only —
 * purpose bars, role angles, plate dims, intake chips, etc.
 */
export function isInternalProductionChromeText(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;

  if (
    /^Post\s+\d+\s+of\s+\d+\b/i.test(t) ||
    /\bPost\s+\d+\s+of\s+\d+\b/i.test(t)
  ) {
    return true;
  }
  if (
    /\boffer_lead\b|\bcta_book\b|\bdates_window\b|\btrust_brand\b/i.test(t)
  ) {
    return true;
  }
  if (/\(\s*\d{3,4}\s*[×x]\s*\d{3,4}\s*\)/.test(t)) {
    return true;
  }
  if (/\bsquare\s+feed\b|\bcert-square-\d+\b/i.test(t)) {
    return true;
  }
  if (/\bIntake\s+Fact\b|\bMISSING\s+FACT\b/i.test(t)) {
    return true;
  }
  if (/\bDestination:\s*/i.test(t)) {
    return true;
  }
  if (/\bVoice\s*brief\b|\bStyle\s*\/\s*Voice\s*brief\b/i.test(t)) {
    return true;
  }
  if (/\bpurpose_label\b/i.test(t)) {
    return true;
  }
  // Purpose / role chrome often looks like "Instagram — Offer lead · offer_lead"
  if (
    /\b(Offer lead|Booking call to action|Offer window reminder|Brand trust)\b/i.test(
      t,
    ) &&
    /\b(Post\s+\d+|·|—)\b/.test(t)
  ) {
    return true;
  }
  // Bare intake purpose chips that are not offer language.
  if (
    /^(Promote an offer|Share an update|Build awareness|Something else)$/i.test(
      t,
    )
  ) {
    return true;
  }
  // Authorized purpose strings that embed plate labels.
  if (
    /\b(Social|Print|In-store|Email)\b/i.test(t) &&
    /\b(Square|Portrait|Landscape|feed|poster)\b/i.test(t) &&
    /—/.test(t)
  ) {
    return true;
  }

  return false;
}

/** Soft curated customer body from mustInclude — not a raw voice-brief dump. */
export function curatedCustomerBodyFromMustInclude(
  mustInclude: string,
  options?: { voiceBriefExact?: string; maxLen?: number },
): string {
  const cleaned = stripProductionMetadataFromMustInclude(mustInclude, options);
  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isInternalProductionChromeText(line))
    // Contact / enrollment / price / dates belong on dedicated layers — not body dump.
    .filter(
      (line) =>
        !/^(Contact|Enrollment|Price|Dates?|Benefits|Style)\s*:/i.test(line) &&
        !/^(Calm, grown-up|No neon)/i.test(line),
    );
  // Prefer program description lines over repeating the business name alone.
  const preferred = lines.filter(
    (line) =>
      /week|program|coaching|movement|community|reset|women|session/i.test(
        line,
      ) && !/^Rooted & Ready Wellness Studio$/i.test(line),
  );
  const use = preferred.length > 0 ? preferred : lines;
  const joined = use.join(" ").replace(/\s+/g, " ").trim();
  const max = options?.maxLen ?? 220;
  if (joined.length <= max) return joined;
  const sliced = joined.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim();
}

export function customerArtContainsForbiddenFragment(text: string): string | null {
  const hay = String(text ?? "");
  for (const fragment of FORBIDDEN_CUSTOMER_ART_FRAGMENTS) {
    if (hay.toLowerCase().includes(fragment.toLowerCase())) {
      return fragment;
    }
  }
  for (const pattern of INTERNAL_FIELD_LEAK_PATTERNS) {
    if (pattern.test(hay)) {
      return pattern.source;
    }
  }
  return null;
}
