/**
 * Social & Promo Graphics — customer intake signals for production routing.
 * Reads live Project Intake answers (primary) and optional My Studio text slots.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID } from "@/config/studio-social-promo-current-door-contract-v1";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";

import { resolveApprovedLogoMaterial } from "./map-flyer-job-truth";

const PARENT = SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID;

export const SOCIAL_PROMO_PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
export const SOCIAL_PROMO_DATE_RE =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\s*[–—-]\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s*\d{4})?/i;

export type SocialPromoWebContact =
  | { kind: "url"; webDisplay: string; webUrl: string }
  | { kind: "social_handle"; webDisplay: string; webUrl: "" }
  | { kind: "empty"; webDisplay: ""; webUrl: "" };

export type SocialPromoIntakeSignals = {
  hasPendingLogoUpload: boolean;
  purpose: string;
  facts: string;
  disclosureBody: string;
  cta: string;
  mustKeep: string;
  mustNot: string;
  phone: string;
  web: SocialPromoWebContact;
  businessName: string;
  explicitPrice: string;
  wasPriceDisplay?: string;
  explicitDateWindow: string;
  hasApprovedLogo: boolean;
  productionLane: "offer_led" | "theme_led";
};

function readDoor(
  answers: CampaignRecord["routeMapIntake"],
  fieldId: string,
): string {
  return readProjectIntakeAnswer(answers?.answers, fieldId, PARENT).trim();
}

function readShared(answers: CampaignRecord["routeMapIntake"], fieldId: string): string {
  return readProjectIntakeAnswer(answers?.answers, fieldId).trim();
}

/** Intake answers and My Studio text slots may carry the same facts after submit — do not double the disclosure. */
export function mergeCustomerFactsText(intakeFacts: string, materialFacts: string): string {
  const intake = intakeFacts.trim();
  const material = materialFacts.trim();
  if (!intake) return material;
  if (!material) return intake;
  if (intake === material) return intake;
  return `${intake}\n${material}`.trim();
}

function readMaterialText(
  materials: readonly CampaignMaterialItem[],
  slotId: string,
): string {
  const item = materials.find((entry) => entry.id === slotId);
  const text = item?.text?.trim();
  if (!text) return "";
  if (item?.reviewStatus === "missing" || item?.reviewStatus === "not_needed") return "";
  return text;
}

export function classifyWebOrSocial(raw: string): SocialPromoWebContact {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty", webDisplay: "", webUrl: "" };
  if (
    /^@/.test(trimmed) ||
    /^(?:instagram|facebook|tiktok|x|twitter|linkedin)\.com\b/i.test(trimmed) ||
    /\binstagram\.com\/|facebook\.com\/|tiktok\.com\/@/i.test(trimmed)
  ) {
    return { kind: "social_handle", webDisplay: trimmed, webUrl: "" };
  }
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    const webDisplay = trimmed.replace(/^https?:\/\//i, "");
    const webUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return { kind: "url", webDisplay, webUrl };
  }
  if (/\.(?:com|net|org|io|co|us|example)\b/i.test(trimmed)) {
    const webDisplay = trimmed.replace(/^https?:\/\//i, "");
    return { kind: "url", webDisplay, webUrl: `https://${trimmed.replace(/^https?:\/\//i, "")}` };
  }
  return { kind: "social_handle", webDisplay: trimmed, webUrl: "" };
}

export function pricesFromSocialPromoText(text: string): { price: string; was?: string } {
  const amounts = [...text.matchAll(SOCIAL_PROMO_PRICE_RE)].map((match) =>
    match[0].replace(/\s+/g, ""),
  );
  const price = amounts[0] ?? "";
  const wasAmount = /was/i.test(text) ? amounts[1] : undefined;
  return { price, ...(wasAmount ? { was: `was ${wasAmount}` } : {}) };
}

function firstExplicitDateWindow(...sources: string[]): string {
  for (const source of sources) {
    const trimmed = source.trim();
    if (!trimmed) continue;
    const match = trimmed.match(SOCIAL_PROMO_DATE_RE);
    if (match?.[0]) return match[0].trim();
  }
  return "";
}

export function readSocialPromoIntakeSignals(input: {
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  repoRoot: string;
  stagedLogoRelativePath?: string;
  skuId: Parameters<typeof resolveApprovedLogoMaterial>[0]["skuId"];
}): SocialPromoIntakeSignals {
  const intake = input.campaign.routeMapIntake;
  const purpose = readDoor(intake, "purpose");
  const intakeFacts = readDoor(intake, "facts");
  const legacyPrices = readDoor(intake, "prices");
  const legacyDates = readDoor(intake, "dates");
  const materialFacts = readMaterialText(input.materials, "condensed-social-facts");
  const materialPricing = readMaterialText(input.materials, "condensed-social-pricing");
  const facts = mergeCustomerFactsText(intakeFacts, materialFacts);
  const pricingText = [legacyPrices, materialPricing].filter(Boolean).join("\n").trim();

  const intakeCta = readDoor(intake, "cta");
  const materialCta = readMaterialText(input.materials, "condensed-social-cta");
  const cta = intakeCta || materialCta;

  const phone = readDoor(intake, "phone") || readShared(intake, "phone");
  const websiteKit = readDoor(intake, "website");
  const web = websiteKit
    ? classifyWebOrSocial(websiteKit)
    : classifyWebOrSocial(readShared(intake, "webOrSocial"));

  const money = pricesFromSocialPromoText(`${pricingText}\n${facts}`);
  const explicitDateWindow = legacyDates.trim() || firstExplicitDateWindow(facts, pricingText);

  const logo = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: input.skuId,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  const hasApprovedLogo = Boolean(logo.ok && logo.material);
  const hasPendingLogoUpload =
    !hasApprovedLogo &&
    input.materials.some(
      (i) =>
        i.category === "logo-brand" &&
        i.uploadStatus === "stored" &&
        i.reviewStatus !== "approved_for_use" &&
        i.reviewStatus !== "not_needed",
    );

  const productionLane: SocialPromoIntakeSignals["productionLane"] =
    money.price || explicitDateWindow || hasApprovedLogo ? "offer_led" : "theme_led";

  const businessName =
    readProjectIntakeAnswer(intake?.answers, "businessName").trim() ||
    input.campaign.campaignName?.trim() ||
    "";

  return {
    purpose,
    facts,
    disclosureBody: facts,
    cta,
    mustKeep: readDoor(intake, "mustKeep"),
    mustNot: readDoor(intake, "mustNot"),
    phone,
    web,
    businessName,
    explicitPrice: money.price,
    ...(money.was ? { wasPriceDisplay: money.was } : {}),
    explicitDateWindow,
    hasApprovedLogo,
    hasPendingLogoUpload,
    productionLane,
  };
}

export function socialPromoContactLine(signals: Pick<SocialPromoIntakeSignals, "phone" | "web">): boolean {
  return Boolean(signals.phone.trim() || signals.web.webDisplay.trim());
}
