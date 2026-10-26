/**
 * One verified campaign brief for Campaign Launch Kit.
 * Machine projects this brief into the existing flyer, graphics, email, and SMS tools.
 * Scout does not author the customer pieces.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID } from "@/config/studio-social-promo-current-door-contract-v1";
import { CAMPAIGN_LAUNCH_KIT_PACKAGE_ID } from "@/config/studio-campaign-launch-kit-current-door-contract-v1";
import { projectIntakeServiceFieldKey, readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import type { CopyProducerFacts } from "@/lib/studio-copy-production";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer/types";

const PACKAGE_ID = CAMPAIGN_LAUNCH_KIT_PACKAGE_ID;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;

export type CampaignLaunchKitBrief = {
  businessName: string;
  objective: string;
  offerName: string;
  priceDisplay: string;
  wasPriceDisplay?: string;
  dateWindow: string;
  body: string;
  cta: string;
  phone: string;
  webDisplay: string;
  webUrl: string;
};

export type CampaignLaunchKitBriefResult =
  | { ok: true; brief: CampaignLaunchKitBrief }
  | { ok: false; message: string };

function readField(campaign: CampaignRecord, fieldId: string): string {
  return readProjectIntakeAnswer(campaign.routeMapIntake?.answers, fieldId, PACKAGE_ID).trim();
}

function pricesFrom(text: string): { price: string; was?: string } {
  const amounts = [...text.matchAll(PRICE_RE)].map((match) => match[0].replace(/\s+/g, ""));
  const price = amounts[0] ?? "";
  const wasAmount = /was/i.test(text) ? amounts[1] : undefined;
  return { price, ...(wasAmount ? { was: `was ${wasAmount}` } : {}) };
}

export function isCampaignLaunchKitBranchJob(jobId: string): boolean {
  return jobId.includes(`:${PACKAGE_ID}:branch:`);
}

export function readCampaignLaunchKitBrief(campaign: CampaignRecord): CampaignLaunchKitBriefResult {
  const offerName = readField(campaign, "purpose");
  const body = readField(campaign, "facts");
  const prices = readField(campaign, "prices");
  const dateWindow = readField(campaign, "dates");
  const cta = readField(campaign, "cta");
  const phone = readField(campaign, "phone");
  const website = readField(campaign, "website");
  const objective = readField(campaign, "mustKeep") || offerName;
  const rights = readField(campaign, "rights");
  const businessName =
    readProjectIntakeAnswer(campaign.routeMapIntake?.answers, "businessName").trim() ||
    campaign.campaignName?.trim() ||
    "";
  const money = pricesFrom(`${prices}\n${body}`);
  const missing: string[] = [];
  if (!businessName) missing.push("business name");
  if (!offerName) missing.push("offer");
  if (!money.price) missing.push("price");
  if (!dateWindow) missing.push("dates");
  if (!cta) missing.push("call to action");
  if (!phone) missing.push("phone");
  if (!website) missing.push("website");
  if (!rights) missing.push("rights");
  const combined = [offerName, body, prices, dateWindow, cta, phone, website, objective].join("\n");
  if (/CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)/i.test(combined)) {
    return {
      ok: false,
      message: "Campaign brief contains internal fixture language and cannot be produced.",
    };
  }
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Campaign Launch Kit still needs: ${missing.join(", ")}.`,
    };
  }
  const webDisplay = website.replace(/^https?:\/\//i, "");
  return {
    ok: true,
    brief: {
      businessName,
      objective,
      offerName,
      priceDisplay: money.price,
      ...(money.was ? { wasPriceDisplay: money.was } : {}),
      dateWindow,
      body,
      cta,
      phone,
      webDisplay,
      webUrl: /^https?:\/\//i.test(website) ? website : `https://${webDisplay}`,
    },
  };
}

export function buildCampaignLaunchKitUsageGuide(brief: CampaignLaunchKitBrief): string {
  const price = brief.wasPriceDisplay
    ? `${brief.priceDisplay} (${brief.wasPriceDisplay})`
    : brief.priceDisplay;
  return [
    "Campaign Launch Kit usage guide",
    "",
    `${brief.businessName} — ${brief.offerName}`,
    `Objective: ${brief.objective}`,
    `Offer: ${price}`,
    `Dates: ${brief.dateWindow}`,
    `Call to action: ${brief.cta}`,
    "",
    "This guide is not a fifth channel. The package is four channels.",
    "",
    "1. Promotional flyer. Share the PNG, or print the PDF yourself. This is not a commercial 300-DPI print certification.",
    "2. Promotional email. Paste the one email into your own sending tool. The Studio does not send the email or the text messages.",
    "3. Text campaign. Send Message 1, then Message 2, from your own phone or texting tool. The Studio does not send the email or the text messages.",
    "4. Social graphics. Use the square and the portrait for this same promotion. You post or share the graphics. The Studio does not post them.",
    "",
    `Phone: ${brief.phone}`,
    `Website: ${brief.webDisplay}`,
  ].join("\n");
}

function sharedMustInclude(brief: CampaignLaunchKitBrief): string {
  const was = brief.wasPriceDisplay ? `, ${brief.wasPriceDisplay}` : "";
  return [
    `${brief.offerName} is ${brief.priceDisplay}${was} at ${brief.businessName}.`,
    brief.dateWindow + ".",
    brief.body,
    `${brief.cta}: ${brief.phone} or ${brief.webDisplay}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function projectCampaignLaunchKitOntoFlyer(
  campaign: CampaignRecord,
): { ok: true; campaign: CampaignRecord } | { ok: false; message: string } {
  const read = readCampaignLaunchKitBrief(campaign);
  if (!read.ok) return read;
  const brief = read.brief;
  const answers = { ...(campaign.routeMapIntake?.answers ?? {}) };
  const put = (fieldId: string, value: string) => {
    answers[projectIntakeServiceFieldKey(DESIGN_RENDERER_PROOF_SKU, fieldId)] = value;
  };
  put("flyerPurpose", `Promotional flyer for ${brief.offerName}`);
  put(
    "mustInclude",
    [
      `${brief.offerName} — ${brief.priceDisplay}.`,
      `${brief.dateWindow}.`,
      brief.wasPriceDisplay ? `${brief.wasPriceDisplay}.` : "",
      brief.body,
      `Call ${brief.phone} or visit ${brief.webDisplay}.`,
      `${brief.cta}.`,
    ]
      .filter(Boolean)
      .join(" "),
  );
  put("intendedUse", "Digital PNG and a print-yourself PDF. This is not a commercial 300-DPI print certification.");
  answers.callToAction = brief.cta;
  return {
    ok: true,
    campaign: {
      ...campaign,
      routeMapIntake: {
        submittedAt: campaign.routeMapIntake?.submittedAt ?? campaign.routeMapIntakeSubmittedAt ?? "",
        answers,
      },
    },
  };
}

/** In-memory only. Lets the existing offer-led graphics tool read this package's brief. */
export function projectCampaignLaunchKitOntoSocialPromo(
  campaign: CampaignRecord,
): { ok: true; campaign: CampaignRecord } | { ok: false; message: string } {
  const read = readCampaignLaunchKitBrief(campaign);
  if (!read.ok) return read;
  const brief = read.brief;
  const answers = { ...(campaign.routeMapIntake?.answers ?? {}) };
  const parent = SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID;
  const put = (fieldId: string, value: string) => {
    answers[projectIntakeServiceFieldKey(parent, fieldId)] = value;
  };
  put("purpose", brief.offerName);
  put("facts", brief.body);
  put("prices", brief.wasPriceDisplay
    ? `${brief.priceDisplay} (${brief.wasPriceDisplay})`
    : brief.priceDisplay);
  put("dates", brief.dateWindow);
  put("cta", brief.cta);
  put("phone", brief.phone);
  put("website", brief.webDisplay);
  put("mustKeep", brief.objective);
  put("rights", readField(campaign, "rights"));
  answers[projectIntakeServiceFieldKey("shared", "businessName")] = brief.businessName;
  answers.businessName = brief.businessName;
  return {
    ok: true,
    campaign: {
      ...campaign,
      campaignName: brief.businessName,
      routeMapIntake: {
        submittedAt: campaign.routeMapIntake?.submittedAt ?? campaign.routeMapIntakeSubmittedAt ?? "",
        answers,
      },
    },
  };
}

export function campaignLaunchKitCopyFacts(
  campaign: CampaignRecord,
  skuId: "v2-rtu-email-kit" | "v2-rtu-sms-kit",
): { ok: true; facts: CopyProducerFacts } | { ok: false; message: string } {
  const read = readCampaignLaunchKitBrief(campaign);
  if (!read.ok) return read;
  const brief = read.brief;
  const mustInclude = sharedMustInclude(brief);
  const messageCopy = [
    `${brief.offerName} is ${brief.priceDisplay}${brief.wasPriceDisplay ? ` (${brief.wasPriceDisplay})` : ""} at ${brief.businessName}. ${brief.dateWindow}.`,
    `${brief.cta}: ${brief.phone} or ${brief.webDisplay}.`,
  ].join("\n");
  return {
    ok: true,
    facts: {
      skuId,
      businessName: brief.businessName,
      campaignGoal: brief.objective,
      mustInclude,
      callToAction: brief.cta,
      compliance: "",
      mustNotSay: "Spring Check. Before Summer AC Rush. Saturday morning slots. Limited availability. Book early.",
      messageCopy: skuId === "v2-rtu-sms-kit" ? messageCopy : "",
      sendingAccount: "Customer sends from their own account.",
      listConsent: "Yes. The customer owns the list and will send this. The Studio does not.",
      ...(skuId === "v2-rtu-email-kit" ? { emailCount: 1 as const } : {}),
      ...(skuId === "v2-rtu-sms-kit" ? { smsCount: 2 as const } : {}),
    },
  };
}

export function campaignLaunchKitSharedFactSentence(brief: CampaignLaunchKitBrief): string {
  return sharedMustInclude(brief);
}
