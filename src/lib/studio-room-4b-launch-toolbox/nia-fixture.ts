/**
 * Room 4B — Nia Carter / Rooted & Ready Fall Reset fixture.
 * Honest sellable SKUs only — no carousel SKU, no CapCut.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { studioRoom4bLaunchToolboxCertificationV1 as cfg } from "@/config/studio-room-4b-launch-toolbox-certification-v1";
import type { ServiceId } from "@/catalog/types";
import { PROMO_INTAKE_PLATE_OPTIONS } from "@/lib/studio-design-renderer";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";

export const NIA_CUSTOMER_NAME = "Nia Carter" as const;
export const NIA_BUSINESS_NAME = "Rooted & Ready Wellness Studio" as const;
export const NIA_PROGRAM_TITLE = "Fall Reset" as const;
export const NIA_CAMPAIGN_NAME = "Fall Reset Launch Campaign" as const;

/** Program starts ~3 weeks after 2026-08-19; six-week run. */
export const NIA_PROGRAM_START_ISO = "2026-09-09" as const;
export const NIA_PROGRAM_END_ISO = "2026-10-20" as const;
export const NIA_PROGRAM_DATES_DISPLAY =
  "September 9 – October 20, 2026" as const;

export const NIA_PRICE_USD = 297 as const;
export const NIA_PRICE_DISPLAY = "$297" as const;

export const NIA_CONTACT = {
  phone: "(804) 555-0194",
  email: "hello@rootedandready.example",
  studioCity: "Richmond, VA",
} as const;

export const NIA_BENEFITS = [
  "Weekly live group coaching sessions",
  "Simple daily movement and recovery practices",
  "Meal-rhythm and energy check-ins that fit busy weeks",
  "Private community support for accountability",
  "A calm end-of-program reset plan you can keep",
] as const;

export const NIA_VOICE_BRIEF_EXACT = cfg.voiceBriefExact;

export const NIA_MISSING_FACT_DESCRIPTION =
  "How customers enroll or book (link, phone path, or in-studio method)" as const;

export const NIA_STYLE_DIRECTION =
  "Calm, grown-up wellness. Women in their thirties through fifties. No neon. No before-and-after body pictures. Motivating without loud fitness-challenge energy." as const;

/** Descriptive material placeholders — not binary assets. */
export const NIA_MATERIALS = [
  {
    id: "nia-logo",
    kind: "logo" as const,
    quality: "good" as const,
    label: "Rooted & Ready wordmark logo (SVG/PNG)",
    description: "Clean botanical wordmark on transparent background.",
  },
  {
    id: "nia-photo-good-1",
    kind: "photo" as const,
    quality: "good" as const,
    label: "Nia by the studio window",
    description: "Natural light, standing by window, calm expression, usable for hero.",
  },
  {
    id: "nia-photo-good-2",
    kind: "photo" as const,
    quality: "good" as const,
    label: "Group stretch in studio",
    description: "Women 30s–50s in soft neutrals, uncrowded composition.",
  },
  {
    id: "nia-photo-good-3",
    kind: "photo" as const,
    quality: "good" as const,
    label: "Tea and journal flat-lay",
    description: "Warm wood table, journal, tea — lifestyle support image.",
  },
  {
    id: "nia-photo-good-4",
    kind: "photo" as const,
    quality: "good" as const,
    label: "Studio exterior morning light",
    description: "Storefront / entrance with soft morning light.",
  },
  {
    id: "nia-photo-mediocre-1",
    kind: "photo" as const,
    quality: "mediocre" as const,
    label: "Dim hallway selfie",
    description: "Underexposed, awkward crop — prefer not to lead.",
  },
  {
    id: "nia-photo-mediocre-2",
    kind: "photo" as const,
    quality: "mediocre" as const,
    label: "Busy cluttered desk shot",
    description: "Cluttered background, weak focus — support only if needed.",
  },
] as const;

export const NIA_HONEST_SELLABLE_SKUS = [
  ...cfg.honestSellableSkusTowardCampaign,
] as ServiceId[];

const SQUARE_PLATE = PROMO_INTAKE_PLATE_OPTIONS[0];
const PORTRAIT_PLATE = PROMO_INTAKE_PLATE_OPTIONS[1];

export type BuildNiaPaidCampaignOpts = {
  withIntake: boolean;
  includeCarouselAsk: boolean;
  bookingMethodFilled: boolean;
};

function niaMustInclude(bookingMethodFilled: boolean): string {
  const facts = [
    `${NIA_BUSINESS_NAME}`,
    `${NIA_PROGRAM_TITLE} — six-week wellness program for busy women.`,
    `Dates: ${NIA_PROGRAM_DATES_DISPLAY}.`,
    `Price: ${NIA_PRICE_DISPLAY}.`,
    `Benefits: ${NIA_BENEFITS.join("; ")}.`,
    `Contact: ${NIA_CONTACT.phone} · ${NIA_CONTACT.email} · ${NIA_CONTACT.studioCity}.`,
    // Style direction stays for palette detection; mappers strip Style: trails from body.
    `Style: ${NIA_STYLE_DIRECTION}`,
  ];
  // Voice brief lives only on dedicated answer keys — never concatenated into mustInclude body.
  if (bookingMethodFilled) {
    facts.push(
      `Enrollment: book at rootedandready.example/fall-reset or call ${NIA_CONTACT.phone}.`,
    );
  } else {
    facts.push(
      `MISSING FACT — enrollment/booking method not provided yet. Do not invent a booking link, phone path, or in-studio method.`,
    );
  }
  return facts.join("\n");
}

function buildIntakeAnswers(opts: {
  bookingMethodFilled: boolean;
}): Record<string, string> {
  const mustInclude = niaMustInclude(opts.bookingMethodFilled);
  const ctaLabel = opts.bookingMethodFilled
    ? "Enroll in Fall Reset"
    : "Learn more about Fall Reset";
  const ctaDestination = opts.bookingMethodFilled
    ? `Book at rootedandready.example/fall-reset or call ${NIA_CONTACT.phone}`
    : "CTA destination pending — enrollment/booking method not yet provided";

  const answers: Record<string, string> = {
    // Flyer (printable handout/poster path)
    flyerPurpose: `Promotional flyer for ${NIA_PROGRAM_TITLE}`,
    mustInclude,
    materials:
      "Logo plus four strong photos and two mediocre photos staged as controlled test assets.",
    intendedUse: "Both print and digital",
    callToAction: opts.bookingMethodFilled
      ? `${ctaLabel} — ${ctaDestination}`
      : ctaLabel,

    // Promo graphics (2 static social)
    businessType: "Wellness studio",
    campaignFocus: `${NIA_PROGRAM_TITLE} launch — six-week program starting ${NIA_PROGRAM_START_ISO}.`,
    dates: NIA_PROGRAM_DATES_DISPLAY,
    disclaimers: "Spots limited.",
    graphicA_authorizedPurpose: "Social",
    graphicA_agreedPlate: SQUARE_PLATE,
    graphicB_authorizedPurpose: "Social",
    graphicB_agreedPlate: PORTRAIT_PLATE,

    // Social posts
    socialPostsPurposeChoice: "Promote an offer",
    socialPostsActionChoice: opts.bookingMethodFilled ? "Book now" : "Learn more",
    socialPostsPlatformChoice: "Instagram Post",
    socialPostsMaterialsChoices: "I can provide a logo",
    postsAbout: `${NIA_PROGRAM_TITLE} — six-week calm wellness reset. ${NIA_PRICE_DISPLAY}. ${NIA_PROGRAM_DATES_DISPLAY}.`,
    platform: "Instagram Post — Square or portrait feed graphic",
    wordingHashtags: "No required hashtags. Avoid loud fitness-challenge language.",
    // Keep empty — design QA treats mustNotSay text as declared creative copy;
    // style constraints live in voiceBriefExact / mustInclude instead.
    mustNotSay: "",
    voiceBriefExact: NIA_VOICE_BRIEF_EXACT,
    studioVoiceBrief: NIA_VOICE_BRIEF_EXACT,
  };

  if (opts.bookingMethodFilled) {
    // Plain CTA + destination — never prefix Destination: (mapper strip is safety net).
    answers.callToAction = `${ctaLabel} — ${ctaDestination}`;
  } else {
    // Missing fact: do not put booking CTA destination in answers.
    answers.callToAction = ctaLabel;
  }

  return answers;
}

/**
 * Paid multi-SKU Nia campaign. Carousel may appear in intent copy only —
 * never in selectedServiceIds.
 */
export function buildNiaPaidCampaign(
  campaignId: string,
  opts: BuildNiaPaidCampaignOpts,
): CampaignRecord {
  const now = new Date().toISOString();
  const selectedServiceIds = [...NIA_HONEST_SELLABLE_SKUS];
  const totals = computePlanPricingTotals(selectedServiceIds);
  const lineItems = buildServiceScopeSnapshot(selectedServiceIds);

  const carouselNote = opts.includeCarouselAsk
    ? " Customer also asked for 1 social carousel (catalog exclusion — not sold; not in selectedServiceIds)."
    : "";

  const description = [
    `${NIA_CAMPAIGN_NAME} for ${NIA_BUSINESS_NAME}.`,
    "Coordinated mini-campaign: visual direction, short video, static social, captions, email, printable handout.",
    carouselNote.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const intake = opts.withIntake
    ? {
        projectDetailsSubmittedAt: now,
        routeMapIntakeSubmittedAt: now,
        routeMapIntake: {
          submittedAt: now,
          answers: buildIntakeAnswers({
            bookingMethodFilled: opts.bookingMethodFilled,
          }),
        },
      }
    : {};

  return {
    campaignId,
    campaignName: `${NIA_BUSINESS_NAME} — ${NIA_CAMPAIGN_NAME}`,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: description,
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: totals.amountDueTodayCents,
      confirmedAmountCents: totals.amountDueTodayCents,
      checkoutSessionId: `cs_nia_room4b_${campaignId}`,
      paymentIntentId: `pi_nia_room4b_${campaignId}`,
      stripeEventId: `evt_nia_room4b_${campaignId}`,
      selectedServiceIds: [...selectedServiceIds],
      decisionId: `dec_nia_room4b_${campaignId}`,
      factFingerprint: `fp_nia_room4b_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...selectedServiceIds],
      includedServiceIds: [...selectedServiceIds],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems,
      approvedAt: now,
    },
    ...intake,
  };
}