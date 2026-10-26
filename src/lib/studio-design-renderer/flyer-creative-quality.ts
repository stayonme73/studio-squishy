/**
 * Customer-facing flyer creative quality — deterministic, not a Maya special case.
 *
 * Intake purpose is an instruction to production. It must not become the
 * customer-facing headline when it only names the artifact ("flyer for …").
 * Generic placeholders and repeated contact must not auto-pass QA.
 */

import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";
import type { FlyerDesignSpec, FlyerProjectTruth, FlyerTextLayer } from "./types";
import {
  evaluateContentProportionalComposition,
  isCommunicativeFlyerLayer,
  layerBottom,
} from "./flyer-content-proportional-composition";
import {
  evaluateDesignIntelligenceCreativeQa,
  DESIGNED_HERO_IDS,
} from "@/lib/studio-design-intelligence/creative-qa";
import {
  CAPPED_DECORATIVE_GEOMETRY_PX,
  MAX_DECORATIVE_GEOMETRY_PX,
  isPriceInsideMedallion,
  isPromotionalPricePrimaryAttention,
  promotionalPriceCalloutMaxPx,
  promotionalPriceCalloutMinPx,
} from "./flyer-offer-value-hierarchy";

const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?/gi;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;

export const GENERIC_FLYER_PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /\bsee offer details\b/i,
  /\bbook online or call\b/i,
  /\blearn more here\b/i,
];

/** Raw intake/database labels that must not print as marketing copy. */
export const FIELD_LABEL_LEAK_RE =
  /^(phone|web|website|url|email|tel|mobile|destination)\b\s+/i;

const MIN_LIVE_AREA_OCCUPANCY = 0.55;
const MIN_OFFER_PANEL_HEIGHT_PX = 220;
const MAX_OFFER_PRICE_GAP_PX = 28;
/** Identity and offer must read as one sequence, with breathing room after the headline. */
const MAX_IDENTITY_OFFER_GAP_PX = 180;
const MAX_OFFER_PANEL_EMPTY_RATIO = 1.85;
/** Decorative geometry only. Promotional price callouts use a higher ceiling. */
export const MAX_DOMINANT_GEOMETRY_CANVAS_RATIO = 0.24;
export const MAX_DOMINANT_GEOMETRY_PX = MAX_DECORATIVE_GEOMETRY_PX;
/** Constrained remint for decorative geometry — not the promotional price ceiling. */
export const CAPPED_DOMINANT_GEOMETRY_PX = CAPPED_DECORATIVE_GEOMETRY_PX;

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Drop a leading fact even when "&", "+", or a hyphen sits between its words. */
function stripLeadingFact(text: string, fact: string): string {
  const factTokens = normalizeName(fact).split(" ").filter(Boolean);
  if (factTokens.length === 0) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const wordTokens = words.map((word) => normalizeName(word).split(" ").filter(Boolean));
  let wordIndex = 0;
  let tokenIndex = 0;
  for (const needed of factTokens) {
    while (wordIndex < words.length && tokenIndex >= (wordTokens[wordIndex]?.length ?? 0)) {
      wordIndex += 1;
      tokenIndex = 0;
    }
    if (wordIndex >= words.length || wordTokens[wordIndex]?.[tokenIndex] !== needed) return text;
    tokenIndex += 1;
  }
  if (tokenIndex > 0) wordIndex += 1;
  return words.slice(wordIndex).join(" ").trim();
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function clipCustomerHeadline(value: string, max = 72): string {
  const text = String(value ?? "").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space >= 16 ? cut.slice(0, space) : cut).trim();
}

/** Same customer-facing message in two roles — not a fuzzy brand/name match. */
export function sameCustomerFacingMessage(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return Boolean(left) && left === right;
}

/** True when the intake purpose is an instruction, not offer copy. */
export function isInstructionalFlyerPurpose(
  purpose: string,
  businessName?: string,
): boolean {
  const purposeText = String(purpose ?? "").trim();
  if (!purposeText) return false;
  if (/\bmake me a\b/i.test(purposeText)) return true;
  if (/\bthis flyer\b/i.test(purposeText)) return true;
  if (/\bflyer(?:s)?\s+for\b/i.test(purposeText)) return true;
  if (/\b(?:launch\s+)?announcement(?:s)?\s+for\b/i.test(purposeText)) return true;
  if (businessName && namesMatch(purposeText, businessName)) return true;
  return false;
}

export function stripContactFacts(text: string): string {
  return String(text ?? "")
    .replace(PHONE_RE, " ")
    .replace(URL_RE, " ")
    .replace(/\b(?:call|visit)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[—–-]\s*$/g, "")
    .trim();
}

/**
 * Offer language from mustInclude facts — never invents a promotion.
 * Prefers the clause before a price; keeps an em-dash event/offer split.
 */
export function offerCopyFromMustInclude(mustInclude: string): {
  headline: string;
  offerName: string;
} {
  const cleaned = stripContactFacts(
    String(mustInclude ?? "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(". "),
  );
  const firstSentence =
    cleaned
      .split(/[.\n]/)
      .map((part) => part.trim())
      .find((part) => part.length > 2) ?? cleaned;
  const withoutPrice = firstSentence
    .replace(PRICE_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[—–-]\s*$/g, "")
    .trim();
  const dash = withoutPrice.split(/\s+[—–-]\s+/);
  if (dash.length >= 2 && dash[0] && dash[1]) {
    return {
      headline: clipCustomerHeadline(dash[0].trim()),
      offerName: dash.slice(1).join(" — ").trim().slice(0, 80),
    };
  }
  return {
    headline: clipCustomerHeadline(withoutPrice || firstSentence),
    offerName: (withoutPrice || firstSentence).slice(0, 80),
  };
}

export function resolveCustomerOfferHeadlineFromFacts(input: {
  flyerPurpose?: string;
  mustInclude?: string;
  businessName?: string;
  campaignFocus?: string;
  postsAbout?: string;
  fallback?: string;
}): string {
  const purpose = String(input.flyerPurpose ?? "").trim();
  const businessName = String(input.businessName ?? "").trim();
  if (purpose && !isInstructionalFlyerPurpose(purpose, businessName)) {
    const purposeTail = purpose.replace(/^promotional flyer for\s+/i, "").trim();
    if (purposeTail && !/^promotional flyer/i.test(purposeTail)) {
      if (!businessName || !namesMatch(purposeTail, businessName)) {
        return clipCustomerHeadline(purposeTail);
      }
    }
  }
  const openingLine = String(input.mustInclude ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .find(
      (line) =>
        /^(Opening|Now open|Grand opening|Launching)\b/i.test(line) &&
        line.length <= 48 &&
        !/[—–-]/.test(line) &&
        !PRICE_RE.test(line),
    );
  if (
    openingLine &&
    !namesMatch(openingLine, businessName) &&
    !isInstructionalFlyerPurpose(openingLine, businessName)
  ) {
    return clipCustomerHeadline(openingLine);
  }
  const fromMust = offerCopyFromMustInclude(String(input.mustInclude ?? ""));
  if (
    fromMust.headline &&
    !isInstructionalFlyerPurpose(fromMust.headline, businessName) &&
    !namesMatch(fromMust.headline, businessName)
  ) {
    return fromMust.headline;
  }
  const focus = String(input.campaignFocus ?? "").trim();
  if (focus && !isInstructionalFlyerPurpose(focus, businessName)) {
    const noIso = focus
      .replace(/\bstarting\s+\d{4}-\d{2}-\d{2}\b/gi, "")
      .replace(/\s+[—–-]\s+six-week.*$/i, "")
      .replace(/\s+launch\s*$/i, "")
      .trim();
    const head = (noIso || focus).split(/[.\n]/)[0]?.trim() ?? "";
    if (head && !/^promotional flyer/i.test(head)) return clipCustomerHeadline(head);
  }
  const posts = String(input.postsAbout ?? "").trim();
  const fall = posts.match(/\b([A-Z][A-Za-z0-9 &'’-]{2,40}\s+Reset)\b/);
  if (fall?.[1]) return clipCustomerHeadline(fall[1]);
  const mustOffer = String(input.mustInclude ?? "").match(
    /\b([A-Z][A-Za-z0-9 &'’-]{2,40}\s+(?:Reset|Launch|Tune-Up|Bundle))\b/,
  );
  if (mustOffer?.[1]) return clipCustomerHeadline(mustOffer[1]);
  const rawFallback = String(input.fallback ?? fromMust.offerName ?? "").trim();
  if (rawFallback && !isInstructionalFlyerPurpose(rawFallback, businessName)) {
    return clipCustomerHeadline(rawFallback);
  }
  return clipCustomerHeadline(fromMust.offerName || "Your offer");
}

/** Category-appropriate poster family from supplied facts — not invented branding. */
export function isEditorialFlyerFamily(text: string): boolean {
  return /\b(boutique|fashion|styling|stylist|salon|apparel|clothing|couture|atelier|grand opening)\b/i.test(
    text,
  );
}

export function sentenceCaseOffer(value: string): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/[A-Z]/.test(text.slice(1))) return text;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** Strip a price token so a dedicated price layer can carry it once. */
export function offerNameWithoutRepeatedPrice(offerName: string): string {
  return sentenceCaseOffer(
    String(offerName ?? "")
      .replace(PRICE_RE, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+for\s*$/i, "")
      .replace(/\s+[—–-]\s*$/g, "")
      .trim(),
  );
}

/**
 * Offer line a customer can read. Fragments such as "first styling appointment"
 * must carry the price in the same sentence. Does not invent a promotion.
 */
export function composeCustomerOfferLine(
  offerName: string,
  priceDisplay: string,
): string {
  const offer = sentenceCaseOffer(offerName);
  const price = String(priceDisplay ?? "").trim();
  if (!offer) return price;
  if (PRICE_RE.test(offer)) return offer;
  if (!price) return offer;
  return `${offer} for ${price}`;
}

export function liveAreaOccupancy(spec: FlyerDesignSpec): number {
  const liveTop = 52;
  const liveBottom = spec.canvas.heightPx - 52;
  const liveHeight = Math.max(1, liveBottom - liveTop);
  const items = spec.layers.filter(isCommunicativeFlyerLayer);
  if (items.length === 0) return 0;
  const top = Math.min(...items.map((layer) => layer.y));
  const bottom = Math.max(...items.map(layerBottom));
  return (bottom - top) / liveHeight;
}

/** CTA from customer verbs in mustInclude — never a generic Studio filler. */
export function deriveCustomerFacingCta(input: {
  explicitCta?: string;
  mustInclude?: string;
}): string {
  const explicit = String(input.explicitCta ?? "").trim();
  if (explicit) return explicit;
  const facts = String(input.mustInclude ?? "");
  const hasCall = /\bcall\b/i.test(facts);
  const hasVisit = /\bvisit\b/i.test(facts);
  if (hasCall && hasVisit) return "Call or visit";
  if (hasCall) return "Call";
  if (hasVisit) return "Visit";
  const accepting = facts.match(/Now accepting[^\n.]*/i)?.[0]?.trim();
  if (accepting) return accepting.slice(0, 48);
  return "";
}

export function customerFlyerBodyWithoutContactDump(
  body: string,
  extras?: { headline?: string; offerName?: string; businessName?: string },
): string {
  let text = String(body ?? "");
  text = text.replace(/\bCall\b[\s\S]*$/i, "").trim();
  text = stripContactFacts(text);
  text = text.replace(PRICE_RE, " ");
  text = text
    .replace(/\s+[.]+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
  if (text.length < 8) return "";

  const facts = [extras?.businessName, extras?.headline, extras?.offerName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => normalizeName(b).length - normalizeName(a).length)
    .filter((fact, index, all) => {
      const norm = normalizeName(fact);
      return !all.slice(0, index).some((longer) => normalizeName(longer).startsWith(`${norm} `) || normalizeName(longer) === norm);
    });
  let removed = true;
  while (removed) {
    removed = false;
    for (const fact of facts) {
      const next = stripLeadingFact(text, fact);
      if (next !== text) {
        text = next;
        removed = true;
      }
    }
  }
  text = text.replace(/^[.\s]+|[.\s]+$/g, "").trim();
  if (text.length < 8) return "";

  const skip = facts.map((value) => normalizeName(value)).filter(Boolean);
  const normalized = normalizeName(text);
  if (skip.some((value) => value && normalized === value)) {
    return "";
  }
  const combined = normalizeName(
    `${extras?.headline ?? ""} ${extras?.offerName ?? ""}`,
  );
  if (combined && normalized === combined) {
    return "";
  }
  return text.slice(0, 480);
}

export function countDistinctMatches(hay: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = String(hay ?? "").match(new RegExp(pattern.source, flags));
  return matches?.length ?? 0;
}

function pushFail(
  findings: DesignQualityFinding[],
  id: string,
  message: string,
): void {
  findings.push({
    id,
    severity: "fail",
    checkKind: "creative_quality",
    message,
  });
}

/** Fail closed on declared PNG text that is still an intake instruction or filler. */
export function evaluateDeclaredFlyerCreativeQuality(
  declaredText: string,
): DesignQualityFinding[] {
  const findings: DesignQualityFinding[] = [];
  const hay = String(declaredText ?? "");
  if (/\bflyer for\b/i.test(hay) || /\bmake me a\b/i.test(hay)) {
    pushFail(
      findings,
      "instructional_purpose_on_art",
      "Customer-facing flyer uses intake purpose/instruction language (for example “flyer for”) instead of the offer",
    );
  }
  for (const [i, pattern] of GENERIC_FLYER_PLACEHOLDER_PATTERNS.entries()) {
    if (pattern.test(hay)) {
      pushFail(
        findings,
        `generic_placeholder_${i}`,
        `Customer-facing flyer uses a generic production placeholder (${pattern})`,
      );
    }
  }
  if (countDistinctMatches(hay, PHONE_RE) > 1) {
    pushFail(
      findings,
      "duplicate_phone",
      "Phone number is repeated across flyer layers — contact belongs on the contact line once",
    );
  }
  if (countDistinctMatches(hay, URL_RE) > 1) {
    pushFail(
      findings,
      "duplicate_web",
      "Website is repeated across flyer layers — contact belongs on the contact line once",
    );
  }
  for (const line of hay.split(/\n+/).map((part) => part.trim()).filter(Boolean)) {
    if (FIELD_LABEL_LEAK_RE.test(line)) {
      pushFail(
        findings,
        "field_label_leak",
        "Customer-facing flyer prints a database field label (for example “phone” or “web”) instead of finished marketing copy",
      );
      break;
    }
  }
  return findings;
}

function textLayers(spec: FlyerDesignSpec): FlyerTextLayer[] {
  return spec.layers.filter((layer): layer is FlyerTextLayer => layer.type === "text");
}

function estimatedTextHeight(layer: FlyerTextLayer): number {
  const lineHeight = layer.lineHeight || 1.2;
  const maxLines = layer.maxLines ?? 2;
  const approxCharsPerLine = Math.max(12, Math.floor(layer.width / Math.max(10, layer.fontSizePx * 0.45)));
  const contentLines = Math.max(1, Math.ceil(layer.content.length / approxCharsPerLine));
  return Math.round(layer.fontSizePx * lineHeight * Math.min(maxLines, contentLines));
}

function firstPriceToken(text: string): string | null {
  const match = String(text ?? "").match(PRICE_RE);
  return match ? match[0].replace(/\s+/g, "") : null;
}

function textInsideShape(
  layer: FlyerTextLayer,
  plate: Extract<FlyerDesignSpec["layers"][number], { type: "shape" }>,
): boolean {
  const bottom = layer.y + estimatedTextHeight(layer);
  return layer.y >= plate.y && bottom <= plate.y + plate.height;
}

function offerPanel(spec: FlyerDesignSpec) {
  return spec.layers.find(
    (layer) =>
      layer.type === "shape" &&
      layer.id === "offer-panel" &&
      layer.height >= MIN_OFFER_PANEL_HEIGHT_PX,
  );
}

function offerMedallion(spec: FlyerDesignSpec) {
  return spec.layers.find(
    (layer) =>
      layer.type === "shape" &&
      layer.id === "offer-medallion" &&
      layer.height >= 200,
  );
}

/** Panel height vs the offer lockup (type + price seal). A tall empty card scores high. */
export function offerPanelContentFillRatio(spec: FlyerDesignSpec): number {
  const panel = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === "offer-panel",
  );
  if (!panel || panel.type !== "shape") return Number.POSITIVE_INFINITY;
  const headline = textLayers(spec).find((layer) => layer.role === "headline");
  const offer = textLayers(spec).find((layer) => layer.role === "offer");
  const price = textLayers(spec).find((layer) => layer.role === "price");
  const dates = textLayers(spec).find((layer) => layer.role === "dates");
  const body = textLayers(spec).find((layer) => layer.role === "body");
  const cta = textLayers(spec).find((layer) => layer.role === "cta");
  const medallion = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === "offer-medallion",
  );
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  const consider = (y: number, height: number) => {
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + height);
  };
  if (headline && panel.type === "shape" && textInsideShape(headline, panel)) {
    consider(headline.y, estimatedTextHeight(headline));
  }
  if (offer) consider(offer.y, estimatedTextHeight(offer));
  if (price) consider(price.y, estimatedTextHeight(price));
  if (dates) consider(dates.y, estimatedTextHeight(dates));
  if (body && panel.type === "shape" && textInsideShape(body, panel)) {
    consider(body.y, estimatedTextHeight(body));
  }
  if (cta && panel.type === "shape" && textInsideShape(cta, panel)) {
    consider(cta.y, estimatedTextHeight(cta));
  }
  if (medallion && medallion.type === "shape") {
    consider(medallion.y, medallion.height);
  }
  if (!Number.isFinite(top) || bottom <= top) return Number.POSITIVE_INFINITY;
  return panel.height / Math.max(1, bottom - top);
}

function designedFillOverlap(
  spec: FlyerDesignSpec,
  top: number,
  bottom: number,
): number {
  const fillIds = new Set([
    "offer-medallion",
    "cta-plate",
    "cta-bar",
    "logo-plate",
    "split-field",
    "hero-slab",
    "field-bleed",
    "service-rail",
  ]);
  let covered = 0;
  for (const layer of spec.layers) {
    if (layer.type !== "shape" || !fillIds.has(layer.id)) continue;
    const overlap =
      Math.min(layer.y + layer.height, bottom) - Math.max(layer.y, top);
    if (overlap > 0) covered += overlap;
  }
  return covered;
}

const CHROME_PLATE_IDS = new Set([
  "plate-top",
  "plate-bottom",
  "paper-mat",
  "frame-top",
  "frame-bottom",
  "frame-left",
  "frame-right",
]);

/** Height of designed content overlapping a plate. The plate itself does not count. */
export function plateContentSpan(spec: FlyerDesignSpec, plateId: string): number {
  const plate = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === plateId,
  );
  if (!plate || plate.type !== "shape") return 0;
  const plateTop = plate.y;
  const plateBottom = plate.y + plate.height;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const layer of spec.layers) {
    if (layer.id === plateId || CHROME_PLATE_IDS.has(layer.id)) continue;
    const height =
      layer.type === "text" ? estimatedTextHeight(layer) : layer.height;
    const overlapTop = Math.max(layer.y, plateTop);
    const overlapBottom = Math.min(layer.y + height, plateBottom);
    if (overlapBottom <= overlapTop) continue;
    top = Math.min(top, overlapTop);
    bottom = Math.max(bottom, overlapBottom);
  }
  if (!Number.isFinite(top) || bottom <= top) return 0;
  return bottom - top;
}

export function plateContentFillRatio(spec: FlyerDesignSpec, plateId: string): number {
  const plate = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === plateId,
  );
  if (!plate || plate.type !== "shape") return Number.POSITIVE_INFINITY;
  const span = plateContentSpan(spec, plateId);
  if (span <= 0) return Number.POSITIVE_INFINITY;
  return plate.height / span;
}

/**
 * Composition + presentation: occupancy, offer grouping, designed offer region,
 * and no field-label leakage. Token presence alone is not customer-ready.
 */
export function evaluateFlyerSpecCreativeQuality(
  spec: FlyerDesignSpec,
  truth: FlyerProjectTruth,
): DesignQualityFinding[] {
  const findings = evaluateDeclaredFlyerCreativeQuality(
    textLayers(spec)
      .map((layer) => layer.content)
      .join("\n"),
  ).filter((finding) => {
    if (finding.id !== "generic_placeholder_1") return true;
    return !/\bbook online or call\b/i.test(truth.cta ?? "");
  });
  const offer = textLayers(spec).find((layer) => layer.role === "offer");
  const headline = textLayers(spec).find((layer) => layer.role === "headline");
  const cta = textLayers(spec).find((layer) => layer.role === "cta");
  const price = textLayers(spec).find((layer) => layer.role === "price");
  if (
    headline &&
    cta &&
    sameCustomerFacingMessage(headline.content, cta.content)
  ) {
    pushFail(
      findings,
      "duplicate_headline_cta",
      "Headline and call-to-action repeat the same message — each role may appear once",
    );
  }
  const offerText = `${headline?.content ?? ""} ${offer?.content ?? ""}`;
  const offerTokens = String(truth.offerName ?? "")
    .split(/[\s+/—–-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !PRICE_RE.test(token));
  const missingOfferToken = offerTokens.find(
    (token) => !new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(offerText),
  );
  if (missingOfferToken && offerTokens.length > 0) {
    pushFail(
      findings,
      "offer_buried",
      `Offer fact "${missingOfferToken}" is missing from headline/offer layers — price cannot be the only prominent message`,
    );
  }
  const offerCarriesPrice = Boolean(offer && PRICE_RE.test(offer.content));
  const offerPriceToken = firstPriceToken(offer?.content ?? "");
  const priceToken = firstPriceToken(price?.content ?? "");
  if (
    offer &&
    price &&
    offerPriceToken &&
    priceToken &&
    offerPriceToken === priceToken
  ) {
    pushFail(
      findings,
      "redundant_price_representation",
      "The price is printed in the offer line and again as a separate display — the price may appear once in its proper role",
    );
  }
  if (
    price &&
    offer &&
    price.fontSizePx > offer.fontSizePx + 8 &&
    !offerCarriesPrice &&
    !offerMedallion(spec)
  ) {
    const panel = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-panel",
    );
    const groupedInPanel =
      panel?.type === "shape" &&
      textInsideShape(offer, panel) &&
      textInsideShape(price, panel);
    if (!groupedInPanel) {
      pushFail(
        findings,
        "price_outranks_offer",
        "Price type is larger than the offer line — the offer must lead hierarchy",
      );
    }
  }
  if (offer && truth.priceDisplay && !PRICE_RE.test(offer.content)) {
    const panel = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-panel",
    );
    const groupedInPanel =
      panel?.type === "shape" &&
      price &&
      textInsideShape(offer, panel) &&
      textInsideShape(price, panel);
    const gap =
      price && offer
        ? Math.abs(price.y - (offer.y + estimatedTextHeight(offer)))
        : Number.POSITIVE_INFINITY;
    if (!groupedInPanel && gap > MAX_OFFER_PRICE_GAP_PX) {
      pushFail(
        findings,
        "offer_price_ungrouped",
        "Offer copy is a fragment separated from the price — they must read as one composed offer",
      );
    }
  }
  const identityRule = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === "identity-rule",
  );
  const offerRegion = offerPanel(spec);
  if (
    identityRule?.type === "shape" &&
    offerRegion?.type === "shape"
  ) {
    const identityOfferGap =
      offerRegion.y - (identityRule.y + identityRule.height);
    if (identityOfferGap > MAX_IDENTITY_OFFER_GAP_PX) {
      pushFail(
        findings,
        "identity_offer_ungrouped",
        "Identity and offer are separate islands — they must read as one lockup, not a headline stranded above a floating offer",
      );
    }
  }
  if (isInstructionalFlyerPurpose(truth.headline, truth.businessName)) {
    pushFail(
      findings,
      "headline_is_intake_purpose",
      "Headline is still the intake purpose/instruction rather than the customer offer",
    );
  }
  if (!offerPanel(spec)) {
    pushFail(
      findings,
      "missing_offer_panel",
      "Flyer has no designed offer region — a technically valid text stack is not customer-presentable creative",
    );
  }
  if (offerPanelContentFillRatio(spec) > MAX_OFFER_PANEL_EMPTY_RATIO) {
    pushFail(
      findings,
      "hollow_offer_panel",
      "Offer region is a hollow card — painting an empty plate is not customer-presentable composition",
    );
  }
  const largePlates = spec.layers.filter(
    (layer) =>
      layer.type === "shape" &&
      layer.role === "plate" &&
      layer.id !== "paper-mat" &&
      layer.id !== "offer-panel" &&
      !DESIGNED_HERO_IDS.has(layer.id) &&
      layer.height >= 300,
  );
  for (const plate of largePlates) {
    if (plateContentFillRatio(spec, plate.id) <= MAX_OFFER_PANEL_EMPTY_RATIO) {
      continue;
    }
    pushFail(
      findings,
      "hollow_field_plate",
      "A large painted field is mostly empty — occupancy from an unused plate is not customer-presentable composition",
    );
    break;
  }
  const hasCustomerImage = spec.layers.some((layer) => layer.type === "image");
  const designedHero = spec.layers.some(
    (layer) => layer.type === "shape" && DESIGNED_HERO_IDS.has(layer.id),
  );
  const substantialPrice = Boolean(
    price && price.fontSizePx >= 40,
  );
  if (!hasCustomerImage && !offerMedallion(spec)) {
    const composedWithoutPrice =
      Boolean(offerPanel(spec)) && !String(truth.priceDisplay ?? "").trim();
    const composedPricedPoster =
      Boolean(offerPanel(spec)) && (substantialPrice || designedHero);
    if (!composedWithoutPrice && !composedPricedPoster && !designedHero) {
      pushFail(
        findings,
        "missing_no_photo_hero",
        "No-photo flyer has no designed geometric hero — short copy must still receive a composed poster structure, not a blank field",
      );
    }
  }
  const dominant = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === "offer-medallion",
  );
  const medallionSize =
    dominant?.type === "shape"
      ? Math.max(dominant.width, dominant.height)
      : 0;
  const priceCallout = isPriceInsideMedallion(spec);
  const promotionalPrimary = isPromotionalPricePrimaryAttention(truth);
  if (dominant && dominant.type === "shape") {
    if (
      promotionalPrimary &&
      medallionSize < promotionalPriceCalloutMinPx(spec.canvas.widthPx)
    ) {
      pushFail(
        findings,
        "underscaled_promotional_price",
        "The promotional price is a primary attention element but is treated as a small decorative button — scale the legitimate price treatment",
      );
    } else if (priceCallout && medallionSize > promotionalPriceCalloutMaxPx(spec.canvas.widthPx)) {
      pushFail(
        findings,
        "excessive_dominant_geometry",
        "The promotional price callout overwhelms the composition — a price treatment may be substantial, not the entire plate",
      );
    } else if (!priceCallout && medallionSize > MAX_DOMINANT_GEOMETRY_PX) {
      pushFail(
        findings,
        "excessive_dominant_geometry",
        "A decorative geometric seal dominates the composition — occupancy from oversized geometry is not a promotional price callout",
      );
    }
  }
  if (liveAreaOccupancy(spec) < MIN_LIVE_AREA_OCCUPANCY) {
    pushFail(
      findings,
      "dead_space_occupancy",
      "Flyer composition leaves excessive unused space — short copy must occupy a designed poster region, not a small centered cluster",
    );
  }
  const messageRoles = new Set([
    "wordmark",
    "descriptor",
    "headline",
    "offer",
    "price",
    "dates",
    "body",
    "cta",
  ]);
  const live = textLayers(spec)
    .filter((layer) => messageRoles.has(layer.role) && layer.content.trim())
    .sort((a, b) => a.y - b.y);
  const zoneSpan = liveAreaOccupancy(spec);
  for (let i = 0; i < live.length - 1; i += 1) {
    const current = live[i]!;
    const next = live[i + 1]!;
    const currentBottom = current.y + estimatedTextHeight(current);
    const gap = next.y - currentBottom;
    if (gap <= 280) continue;
    const uncovered = gap - designedFillOverlap(spec, currentBottom, next.y);
    if (uncovered <= 280) continue;
    if (zoneSpan >= 0.72) continue;
    pushFail(
      findings,
      `unused_space_${current.id}_${next.id}`,
      `Flyer composition leaves unused space (${Math.round(uncovered)}px) between ${current.id} and ${next.id}`,
    );
  }
  findings.push(...evaluateContentProportionalComposition(spec, truth));
  findings.push(...evaluateDesignIntelligenceCreativeQa({ spec, truth }));
  return findings;
}
