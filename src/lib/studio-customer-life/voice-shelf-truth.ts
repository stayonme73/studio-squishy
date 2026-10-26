/**
 * Studio Voice answers for service fit, price, and scope when the three-package
 * script did not answer first.
 *
 * Current truth only: the three-package door in
 * `src/config/studio-canonical-launch-truth-v1.ts`. The older Launch Now shelf
 * is history; its services and prices are never offered or quoted here.
 * A customer's own saved purchase is quoted from their project record.
 */

import type { CampaignRecord } from "@/config/studio-board";
import {
  canonicalLaunchMenuSentence,
  formatCanonicalUsd,
  listCanonicalLaunchPackages,
  type CanonicalLaunchPackage,
} from "@/lib/studio-canonical-menu-enforcement/enforcement";

import { answerCondensedLaunchVoice } from "./condensed-launch-voice";

type PackageId = CanonicalLaunchPackage["packageId"];

const FIT_KEYWORDS: readonly { packageId: PackageId; patterns: readonly string[] }[] = [
  {
    packageId: "social_and_promo_graphics",
    patterns: [
      "social & promo",
      "social and promo",
      "promo graphic",
      "campaign graphic",
      "instagram",
      "social post",
      "social media",
      "facebook post",
    ],
  },
  {
    packageId: "short_form_video_editing",
    patterns: ["short-form", "short form", "talking-head", "talking head", "footage", "reel edit"],
  },
  {
    packageId: "clip_repurposing",
    patterns: ["clip repurpos", "repurpos", "long video", "long recording", "hour video", "15 minute", "clip set"],
  },
];

function packageById(packageId: string): CanonicalLaunchPackage | null {
  return listCanonicalLaunchPackages().find((pkg) => pkg.packageId === packageId) ?? null;
}

function priceSentence(pkg: CanonicalLaunchPackage): string {
  return `${pkg.customerFacingName} is ${pkg.priceDisplay}. With the 20% Studio Thank-You, you pay ${formatCanonicalUsd(pkg.amountDueAfterThankYouCents)} at checkout. It includes ${pkg.revisionRounds} revision rounds.`;
}

function scopeSentence(pkg: CanonicalLaunchPackage): string {
  return (
    answerCondensedLaunchVoice(`What is included in ${pkg.customerFacingName}?`) ??
    `${pkg.customerFacingName} is ${pkg.priceDisplay}. It includes ${pkg.revisionRounds} revision rounds.`
  );
}

/** Matches a question to one of the current three packages, or null. */
export function findPublicShelfService(question: string): CanonicalLaunchPackage | null {
  const text = question.trim().toLowerCase();
  if (!text) return null;
  const named = listCanonicalLaunchPackages().find((pkg) =>
    text.includes(pkg.customerFacingName.toLowerCase()),
  );
  if (named) return named;
  for (const entry of FIT_KEYWORDS) {
    if (entry.patterns.some((pattern) => text.includes(pattern))) {
      return packageById(entry.packageId);
    }
  }
  return null;
}

function savedPackage(campaign: CampaignRecord | null): CanonicalLaunchPackage | null {
  const packageId = campaign?.condensedOffer?.packageId;
  return packageId ? packageById(packageId) : null;
}

function hasConfirmedPayment(campaign: CampaignRecord | null): boolean {
  return Boolean(campaign?.paymentReceivedAt) || campaign?.paymentTruth?.status === "confirmed";
}

export function answerServiceFitFromShelf(question: string): string {
  const matched = findPublicShelfService(question);
  if (!matched) {
    return `I will not guess which package you need. ${canonicalLaunchMenuSentence()} You still choose.`;
  }
  return `This may fit what you described: ${matched.customerFacingName} at ${matched.priceDisplay}. You still choose. Ask me what is included if you want the details.`;
}

export function answerPricingFromShelf(
  question: string,
  campaign: CampaignRecord | null,
): string {
  const offer = campaign?.condensedOffer;
  const saved = savedPackage(campaign);
  if (offer && saved) {
    const listCents = offer.listPriceCents ?? offer.priceCents;
    const base = `Your project is ${saved.customerFacingName}. The package price on your record is ${formatCanonicalUsd(listCents)}.`;
    return typeof offer.amountDueCents === "number"
      ? `${base} With the Studio Thank-You, your record shows ${formatCanonicalUsd(offer.amountDueCents)} for this purchase.`
      : base;
  }
  if (campaign && !offer && hasConfirmedPayment(campaign)) {
    const paid = campaign.paymentTruth?.expectedAmountCents;
    return typeof paid === "number" && paid > 0
      ? `Your project record shows ${formatCanonicalUsd(paid)} for your earlier Studio purchase. That is what was recorded for this project. It is not a current price.`
      : "Your project record does not show the amount for your earlier Studio purchase, so I will not guess.";
  }
  const matched = findPublicShelfService(question);
  if (matched) return priceSentence(matched);
  const due = listCanonicalLaunchPackages().map(
    (pkg) => `${formatCanonicalUsd(pkg.amountDueAfterThankYouCents)} for ${pkg.customerFacingName}`,
  );
  const dueList =
    due.length > 1
      ? `${due.slice(0, -1).join(", ")}, and ${due[due.length - 1]}`
      : due.join("");
  return `${canonicalLaunchMenuSentence()} With the 20% Studio Thank-You, you pay ${dueList}. Each includes three revision rounds. The Thank-You is applied at checkout. Tell me which package you mean. I will not invent a price.`;
}

export function answerScopeFromShelf(
  question: string,
  campaign: CampaignRecord | null,
): string {
  const saved = savedPackage(campaign);
  if (saved) {
    return `Your project is ${saved.customerFacingName}. ${scopeSentence(saved)}`;
  }
  if (campaign && hasConfirmedPayment(campaign)) {
    return "Your project record is an earlier Studio purchase. I will not describe it from the current menu. Your Project Record shows what was purchased.";
  }
  const matched = findPublicShelfService(question);
  if (matched) return scopeSentence(matched);
  return `Tell me which package you mean. ${canonicalLaunchMenuSentence()} I will not invent inclusions.`;
}
