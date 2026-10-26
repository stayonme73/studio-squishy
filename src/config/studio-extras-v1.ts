/**
 * Studio Extras — canonical Machine truth (Owner decisions 2026-10-10).
 *
 * Authority: `docs/launch/studio-decision-brief-1/STUDIO-DECISION-BRIEF-1.md`
 *
 * Customer-facing sources (`CONDENSED_SUPPORT_OPTIONS`, package pages, Help,
 * Studio Voice, checkout) read this set. Do not modify without Tagia approval.
 */

import type { CondensedPackageId } from "@/config/studio-customer-journey-condense-v1";

export const STUDIO_EXTRAS_V1_PACKAGE_ID = "STUDIO-EXTRAS-V1" as const;

export const STUDIO_EXTRA_IDS = [
  "review_request_kit",
  "email_and_text",
  "ad_creative",
  "flyer",
  "menu_price_list",
] as const;

export type StudioExtraId = (typeof STUDIO_EXTRA_IDS)[number];

export type StudioExtraDefinition = {
  id: StudioExtraId;
  name: string;
  /** One complete sentence the customer reads before choosing. */
  customerSummary: string;
  /** One complete sentence naming what is not included. */
  customerNotIncluded: string;
  includes: readonly string[];
  customerSupplies: readonly string[];
  notIncluded: readonly string[];
  /** Existing production lines this Extra reuses. Empty = not yet buildable. */
  productionLines: readonly string[];
  attemptBudget: "design" | "copy" | "design_and_copy";
};

export const studioExtrasV1 = {
  packageId: STUDIO_EXTRAS_V1_PACKAGE_ID,
  decidedAt: "2026-10-10" as const,
  owner: "Tagia" as const,
  decisionBrief:
    "docs/launch/studio-decision-brief-1/STUDIO-DECISION-BRIEF-1.md" as const,
  customerFrame: "Studio Extras — Add or Skip" as const,
  maxSelectionsPerOrder: 2 as const,
  extraCharge: false as const,
  liveCustomerPromiseSwitched: true as const,
  removed: {
    ai_local_visibility: "Removed for now. Replaced by Flyer.",
  } as const,
  renamed: {
    reputation_customer_proof: "review_request_kit",
  } as const,
  revisions: {
    sharesPackageRounds: true as const,
    separateExtraCount: false as const,
    scope: "Changes stay within the Extra's defined scope. Not a new offer or a new campaign." as const,
    menuFactCorrectionsAlwaysAccepted: true as const,
  },
  exhaustion: {
    attemptBudgets: { design: 3, copy: 2 } as const,
    requiredSteps: [
      "required_internal_attempts_exhausted",
      "approved_alternate_recovery_attempted_where_available",
      "quality_confirms_below_studio_standard",
    ] as const,
    waitingOnClientIsNotExhaustion: true as const,
    packageStillDelivered: true as const,
    ownerRescue: false as const,
  },
  courtesyAdjustment: {
    customerFacingName: "Courtesy Adjustment" as const,
    percentByExhaustedCount: { 1: 5, 2: 10 } as const,
    maxPercent: 10 as const,
    base: "amount_actually_paid_after_studio_thank_you" as const,
    separateFromStudioThankYou: true as const,
    studioThankYouPercent: 20 as const,
    mechanism: "partial_return_to_original_card_via_stripe" as const,
    studioCreditByDefault: false as const,
    changesPackageRefundPolicy: false as const,
    issuance: "automatic_audited_owner_notified_not_asked" as const,
    requiredProof: [
      "customer_supplied_required_inputs",
      "required_production_attempts_exhausted",
      "approved_recovery_attempted_where_available",
      "quality_confirmed_below_studio_standard",
      "extra_marked_exhausted",
      "amount_calculated_from_amount_actually_paid",
      "percent_matches_exhausted_count",
      "same_adjustment_not_already_issued",
    ] as const,
    issueOnce: true as const,
    ownerNotice:
      "Tagia, one Studio Extra exhausted after the required recovery path. The 5% courtesy adjustment was applied and recorded. No action is needed from you." as const,
  },
} as const;

export const studioExtraDefinitions: Record<StudioExtraId, StudioExtraDefinition> = {
  review_request_kit: {
    id: "review_request_kit",
    name: "Review Request Kit",
    customerSummary:
      "Three Studio-written review-request messages (a text, an email, and a thank-you follow-up) and one branded card with a QR code that opens your own review link.",
    customerNotIncluded:
      "The Studio does not send the requests, reply to reviews, or create testimonials or star ratings.",
    includes: [
      "3 Studio-written review-request messages: one text, one email, and one thank-you follow-up",
      "1 branded review-request card with a QR code that opens your own review link",
    ],
    customerSupplies: ["Your review link"],
    notIncluded: [
      "Testimonial quote graphics",
      "Invented reviews or star ratings",
      "Review-count promises",
      "Sending requests or replying to reviews",
      "Account login",
    ],
    productionLines: ["studio-extras-copy", "studio-extras-review-card"],
    attemptBudget: "design_and_copy",
  },
  email_and_text: {
    id: "email_and_text",
    name: "Email + Text",
    customerSummary:
      "One promotional email with a subject, preview line, body, and call to action, plus two text messages for the same offer.",
    customerNotIncluded:
      "The Studio does not send or schedule them, build your list, or review them for compliance.",
    includes: [
      "1 promotional email with subject, preview line, body, and call to action, as plain text and an HTML-ready file",
      "2 text messages for the same offer",
    ],
    customerSupplies: ["Confirmation that you have consent to text your list"],
    notIncluded: [
      "Sending or scheduling",
      "List building",
      "Platform access",
      "Compliance review",
    ],
    productionLines: ["v2-rtu-email-kit", "v2-rtu-sms-kit"],
    attemptBudget: "copy",
  },
  ad_creative: {
    id: "ad_creative",
    name: "Ad Creative",
    customerSummary:
      "Two static ad graphics for the same offer, one square and one portrait, plus three Studio-written headline and main-text options.",
    customerNotIncluded:
      "The Studio does not run ads, set budgets or targeting, or promise results.",
    includes: [
      "2 static ad graphics for the same offer: a square 1024x1024 PNG and a portrait 1024x1536 PNG",
      "3 Studio-written headline and main-text options, ready to paste",
    ],
    customerSupplies: ["Your logo or brand files, if you have them"],
    notIncluded: [
      "Running ads, budgets, or targeting",
      "Ad account access",
      "Video ads or extra sizes",
      "Performance promises",
    ],
    productionLines: ["studio-extras-copy", "v2-rtu-promotion-graphics"],
    attemptBudget: "design_and_copy",
  },
  flyer: {
    id: "flyer",
    name: "Flyer",
    customerSummary:
      "One single-page digital flyer for the same offer, as a PNG and a PDF you can print.",
    customerNotIncluded:
      "Printing, shipping, and certified 300 DPI print production are not included.",
    includes: [
      "1 single-page digital flyer for the same offer, as a PNG and a PDF you can print",
    ],
    customerSupplies: ["Your logo or brand files, if you have them"],
    notIncluded: ["Printing or shipping", "Certified 300 DPI print production"],
    productionLines: ["v2-rtu-flyer"],
    attemptBudget: "design",
  },
  menu_price_list: {
    id: "menu_price_list",
    name: "Menu / Price List",
    customerSummary:
      "One polished single-page digital menu or price list from the items and prices you supply, as a PNG and a PDF you can print.",
    customerNotIncluded:
      "You check the prices, allergens, and any legal wording. Bifolds, booklets, and printing are not included.",
    includes: [
      "1 polished single-page digital menu or price list, as a PNG and a PDF you can print",
    ],
    customerSupplies: [
      "Every item and price",
      "Any allergen, ingredient, or legal wording, checked by you",
    ],
    notIncluded: [
      "Checking prices, allergens, ingredients, or legal wording",
      "Bifolds, booklets, or printing",
    ],
    productionLines: ["v2-rtu-menu", "v2-rtu-service-sheet"],
    attemptBudget: "design",
  },
};

export const studioExtrasEligibilityByPackage: Record<
  CondensedPackageId,
  readonly StudioExtraId[]
> = {
  clip_repurposing: ["review_request_kit", "email_and_text", "ad_creative", "flyer"],
  short_form_video_editing: ["review_request_kit", "email_and_text", "ad_creative", "flyer"],
  social_and_promo_graphics: ["review_request_kit", "email_and_text", "flyer", "menu_price_list"],
  creative_qa_finish: ["review_request_kit", "email_and_text", "flyer", "menu_price_list"],
  campaign_launch_kit: ["review_request_kit", "menu_price_list"],
};

/**
 * Customer-facing wording. Every surface (builder, package pages, checkout,
 * My Studio, Review Room, Final Delivery, Help, Studio Voice) reads from here.
 */
export const studioExtrasCustomerCopy = {
  title: "Your Studio Extras",
  tab: "STUDIO EXTRAS",
  builderTitle: "Studio Extras",
  builderLead:
    "Add up to two Studio Extras to your package, or skip them. Studio Extras are included at no additional charge.",
  builderInstruction: "Choose up to 2 included Extras." as const,
  builderPromise: [
    "The Studio makes the required attempts on every Extra you choose and checks each one before you see it.",
    "The Studio will not send you an Extra that falls below Studio quality.",
    "If an Extra genuinely cannot be completed after that work, the Studio tells you and applies a Courtesy Adjustment of 5% of what you paid for one Extra, or 10% for two.",
  ],
  builderLimitReached: "You have chosen two Studio Extras. Remove one to choose a different Extra.",
  builderSkip: "Skip Studio Extras",
  builderRemove: "Remove",
  checkoutLabel: "Studio Extras",
  checkoutNone: "None",
  checkoutIncluded: "Included at no additional charge",
  includedLead: "These Studio Extras are included with your package at no additional charge.",
  revisionRuleBoard:
    "A change to an Extra uses one of your package's revision rounds. There is no separate count for Extras.",
  revisionRuleReview:
    "A change to an Extra uses one of your package's revision rounds. If you also send package changes from this room, the Extra notes you wrote here go with them in the same round.",
  waitingLead: "The Studio needs these details before it can start this Extra. Add them in the requests on your Studio Board.",
  approve: "Approve",
  requestChange: "Request a change",
  changeLabel: "What should change?",
  sendChange: "Send this change",
  approvedNotice: "Approved. The finished files are ready to download from this Extra.",
  changeSentNotice: "Your change request was sent. The Studio will bring the revised Extra back for your review.",
  openPdf: (label: string) => `Open ${label}`,
  openFile: (label: string) => `Download ${label}`,
} as const;

/** Live builder counter. Clamps to the approved limit. */
export function studioExtrasSelectionCountLabel(selected: number): string {
  const max = studioExtrasV1.maxSelectionsPerOrder;
  const count = Math.max(0, Math.min(max, Math.trunc(selected) || 0));
  return `${count} of ${max}`;
}

function listWithOr(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
}

const STUDIO_EXTRA_PACKAGE_NAMES: Record<CondensedPackageId, string> = {
  clip_repurposing: "Clip Repurposing",
  short_form_video_editing: "Short-Form Video Editing",
  social_and_promo_graphics: "Social & Promo Graphics",
  creative_qa_finish: "Creative QA & Finish",
  campaign_launch_kit: "Campaign Launch Kit",
};

/** Package page "Included" line, built from the eligibility table. */
export function studioExtrasPackageIncludedLine(packageId: CondensedPackageId): string {
  const names = studioExtrasEligibilityByPackage[packageId].map((id) => studioExtraDefinitions[id].name);
  return `Up to two Studio Extras you can add or skip, included at no additional charge: ${listWithOr(names)}`;
}

/** Where one Extra can be selected, read from the same eligibility table. */
export function studioExtraEligibilitySentence(extraId: StudioExtraId): string {
  const publicPackageIds = (Object.keys(studioExtrasEligibilityByPackage) as CondensedPackageId[]).filter(
    (id) => id !== "creative_qa_finish",
  );
  const packageIds = publicPackageIds.filter((id) =>
    studioExtrasEligibilityByPackage[id].includes(extraId),
  );
  const where =
    packageIds.length === publicPackageIds.length
      ? "It is a Studio Extra on every package."
      : `It is a Studio Extra on ${listWithOr(packageIds.map((id) => STUDIO_EXTRA_PACKAGE_NAMES[id]))}.`;
  if (extraId === "flyer") {
    return `${where} Campaign Launch Kit already includes the promotional flyer, so Flyer is not a separate Extra on that package.`;
  }
  if (extraId === "email_and_text") {
    return `${where} Campaign Launch Kit already includes the promotional email and the text campaign, so Email + Text is not a separate Extra on that package.`;
  }
  return where;
}

/** Help and Studio Voice explanation, built from the same eligibility and promise. */
export function studioExtrasExplainer(): {
  whatYouCanAdd: string;
  promise: string;
  revisions: string;
  notIncludedService: string;
  removed: string;
} {
  const names = (packageId: CondensedPackageId) =>
    listWithOr(studioExtrasEligibilityByPackage[packageId].map((id) => studioExtraDefinitions[id].name));
  return {
    whatYouCanAdd: `On Build Your Project you can add up to two Studio Extras, or skip them. Clip Repurposing and Short-Form Video Editing can add ${names("clip_repurposing")}. Social & Promo Graphics can add ${names("social_and_promo_graphics")}. Campaign Launch Kit can add ${names("campaign_launch_kit")}. The promotional flyer, email, and text campaign are already included in Campaign Launch Kit, so they are not separate Extras on that package. Studio Extras are included at no additional charge and do not change the package price.`,
    promise: `${studioExtrasCustomerCopy.builderPromise.join(" ")} The Courtesy Adjustment is separate from the Studio Thank-You.`,
    revisions:
      "Changes to Studio Extras use your package's three revision rounds. There is no separate count for Extras.",
    notIncludedService: "The Studio still does not post, send, or run the ads for you.",
    removed: "AI + Local Visibility is not offered right now.",
  };
}

/** Courtesy Adjustment in cents for an exhausted count, from the amount actually paid. */
export function studioExtrasCourtesyAdjustmentCents(
  amountPaidCents: number,
  exhaustedCount: number,
): number {
  const capped = Math.min(Math.max(Math.trunc(exhaustedCount), 0), 2);
  if (capped === 0) return 0;
  const percent = studioExtrasV1.courtesyAdjustment.percentByExhaustedCount[capped as 1 | 2];
  return Math.round((amountPaidCents * percent) / 100);
}
