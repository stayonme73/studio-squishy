/**
 * Condensed customer journey — reuse existing rooms and card language.
 * Visual system stays locked. Clip Repurposing Package Detail first.
 */

import type { ThreePackageHeadlineId } from "@/config/studio-three-package-architecture-reconciliation-v1";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";

export const STUDIO_CUSTOMER_JOURNEY_CONDENSE_PACKAGE_ID =
  "STUDIO-CUSTOMER-JOURNEY-CONDENSE-1" as const;

export const CONDENSED_PACKAGE_IDS = [
  "clip_repurposing",
  "short_form_video_editing",
  "social_and_promo_graphics",
] as const;

export type CondensedPackageId = (typeof CONDENSED_PACKAGE_IDS)[number];

export const CONDENSED_PACKAGE_SLUGS = {
  clip_repurposing: "clip-repurposing",
  short_form_video_editing: "short-form-video-editing",
  social_and_promo_graphics: "social-promo-graphics",
} as const;

export type CondensedPackageSlug =
  (typeof CONDENSED_PACKAGE_SLUGS)[CondensedPackageId];

export const CONDENSED_SUPPORT_OPTIONS = [
  {
    id: "reputation_customer_proof",
    label: "Reputation & Customer Proof",
    detail:
      "Wording you can use to ask for a review, and quote graphics from a real testimonial you supply. You still send and post them.",
  },
  {
    id: "ad_creative",
    label: "Ad Creative",
    detail:
      "A square graphic, a portrait graphic, and the headline, main line, and call to action for one offer. The Studio does not run the ad.",
  },
  {
    id: "email_and_text",
    label: "Email & Text Campaign",
    detail:
      "Up to 2 emails and up to 4 texts for one announcement. The Studio does not send them.",
  },
  {
    id: "menu_price_list",
    label: "Menu / Price List",
    detail:
      "One single-page menu from the items and prices you supply. You check the prices and any allergen wording.",
  },
  {
    id: "ai_local_visibility",
    label: "AI + Local Visibility",
    detail:
      "A written summary of your business and service area, using details you supply. No ranking promise, and The Studio does not update your listings.",
  },
] as const;

export type CondensedSupportId = (typeof CONDENSED_SUPPORT_OPTIONS)[number]["id"];

const SHARED_SUPPORT_IDS: readonly CondensedSupportId[] = [
  "reputation_customer_proof",
  "ad_creative",
  "email_and_text",
];

export function supportOptionsForPackage(id: CondensedPackageId) {
  const allowed =
    id === "social_and_promo_graphics"
      ? CONDENSED_SUPPORT_OPTIONS.map((option) => option.id)
      : SHARED_SUPPORT_IDS;
  return CONDENSED_SUPPORT_OPTIONS.filter((option) => allowed.includes(option.id));
}

export type PackageDetailSectionKind =
  | "purpose"
  | "includes"
  | "excludes"
  | "changes"
  | "revision"
  | "needs"
  | "price";

export type PackageDetailSection = {
  id: string;
  kind: PackageDetailSectionKind;
  label: string;
  icon?: string;
  prose?: string;
  items?: readonly string[];
};

export type PackageDetailModel = {
  id: CondensedPackageId;
  slug: CondensedPackageSlug;
  name: string;
  priceDisplay: string;
  priceCents: number;
  purposeLine: string;
  converted: boolean;
  startHref: string;
  voiceHref: string;
  homeHref: string;
  sections: readonly PackageDetailSection[];
};

export const studioCustomerJourneyCondenseV1 = {
  packageId: STUDIO_CUSTOMER_JOURNEY_CONDENSE_PACKAGE_ID,
  authorizedAt: "2026-10-04" as const,
  visualSystemLocked: true as const,
  noRedesign: true as const,
  noNewBoxStyles: true as const,
  clipOnlyPackageDetail: false as const,
  noShortFormConversionYet: false as const,
  noSocialConversionYet: false as const,
  noPublish: true as const,
  noMerge: true as const,
  noPush: true as const,
  revisionTruth: STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1,
  routes: {
    home: "/",
    packageDetail: "/package",
    buildYourProject: "/project-builder",
    reviewAndPay: "/checkout",
    myStudio: "/studio-board",
    finalDelivery: "/deliverables",
    studioVoice: "/studio-conversation-room",
    help: "/help-center?from=studio-lobby",
  },
  clipPriceCents: 39900,
  clipPriceDisplay: "$399",
  reviewConfirmTitle: "Confirm checkout",
  reviewTermsLabel:
    "I reviewed my order and understand that confirming checkout is required before work can move forward.",
  materialsAfterPay:
    "You add your actual project files in My Studio after checkout.",
  materialsHere:
    "Tell us what you have. You do not add files on this page. You add them in My Studio after checkout.",
  includedOptionalSupport: [
    "You can add these. There is no extra charge.",
    "Skip any you do not want.",
  ],
  reviewMaterialsHeading: "Materials you'll provide",
  reviewWhatsNext: [
    { label: "Checkout confirmed", marker: "number" },
    {
      label: "The Studio uses what you shared on Build Your Project",
      marker: "number",
    },
    {
      label: "You add your project files in My Studio",
      marker: "number",
    },
    {
      label: "Production begins after required materials are received",
      marker: "number",
    },
    { label: "You'll review the work", marker: "number" },
    { label: "Final delivery", marker: "number" },
  ] as const,
  reviewWhatsNextReassurance:
    "You can follow project status in My Studio. Email notices are a courtesy. Your Studio Board is the source of truth.",
  startThisPackage: "Start This Package",
  askStudioVoice: "Ask Studio Voice",
  hideDetails: "Hide details",
  saveAndContinue: "Save and continue",
  continueToReview: "Continue to Review & Pay",
  correctSomething: "Correct something",
  stampDoc:
    "docs/launch/studio-customer-journey-condense-1/STUDIO-CUSTOMER-JOURNEY-CONDENSE-1.md" as const,
} as const;

export const condensedBuilderSections = [
  {
    id: "about-you",
    title: "About You",
    summaryEmpty: "Name, email, and company.",
  },
  {
    id: "about-project",
    title: "About Your Project",
    summaryEmpty: "Purpose, source confirmation, rights, and CTA.",
  },
  {
    id: "upload",
    title: "Your Materials",
    summaryEmpty: "The files you will provide after checkout.",
  },
  {
    id: "preferences",
    title: "Creative Preferences",
    summaryEmpty: "What must stay in and what must stay out.",
  },
  {
    id: "support",
    title: "Optional Support",
    summaryEmpty: "Add the ones you want, or skip them.",
  },
] as const;

export type CondensedBuilderSectionId =
  (typeof condensedBuilderSections)[number]["id"];

export type CondensedBuilderField = {
  name: string;
  kind: "textarea" | "checkbox";
  label: string;
  required: boolean;
  rows?: number;
  placeholder?: string;
};

export type CondensedBuilderPackageCopy = {
  aboutProject: {
    summaryEmpty: string;
    fields: readonly CondensedBuilderField[];
  };
  upload: {
    label: string;
    placeholder: string;
    summaryEmpty: string;
  };
  preferences: {
    mustKeep: string;
    mustNot: string;
    studioDecide: string;
    summaryEmpty: string;
  };
};

export const condensedBuilderByPackage: Record<
  CondensedPackageId,
  CondensedBuilderPackageCopy
> = {
  clip_repurposing: {
    aboutProject: {
      summaryEmpty: "Purpose, the recording, rights, and a call to action if you have one.",
      fields: [
        {
          name: "purpose",
          kind: "textarea",
          label: "What do you want these shorts to help people understand or do?",
          required: true,
          rows: 3,
        },
        {
          name: "context",
          kind: "textarea",
          label: "Any important context The Studio should know",
          required: false,
          rows: 2,
          placeholder:
            "Example: who it is for, the offer, the tone, one key detail, or anything to avoid.",
        },
        {
          name: "qualifyingSource",
          kind: "checkbox",
          label:
            "I am sending one source. It is 15–60 minutes, filmed vertically, in English, with one primary speaker.",
          required: true,
        },
        {
          name: "intelligible",
          kind: "checkbox",
          label: "The speech and audio are clear enough to follow.",
          required: true,
        },
        {
          name: "rights",
          kind: "checkbox",
          label:
            "I own this recording, or I have permission from everyone who appears in it.",
          required: true,
        },
        {
          name: "cta",
          kind: "textarea",
          label: "Call-to-action wording, if you have one",
          required: false,
          rows: 2,
          placeholder: "Example: Book now, or Visit our website.",
        },
      ],
    },
    upload: {
      label: "What recording will you add in My Studio after checkout?",
      placeholder:
        "Example: one 15–60 minute recording, filmed vertically, in English, with one primary speaker.",
      summaryEmpty: "The recording you will add in My Studio after checkout.",
    },
    preferences: {
      mustKeep: "Any line that must stay in the finished set",
      mustNot: "Anything that must not be included",
      studioDecide:
        "I’m not sure. Let The Studio decide within the original package scope.",
      summaryEmpty: "No specific keep or cut notes added.",
    },
  },
  short_form_video_editing: {
    aboutProject: {
      summaryEmpty: "Purpose, marked moments, rights, and a call to action if you have one.",
      fields: [
        {
          name: "purpose",
          kind: "textarea",
          label: "What do you want these videos to help people understand or do?",
          required: true,
          rows: 3,
        },
        {
          name: "markedMoments",
          kind: "checkbox",
          label:
            "I am sending up to 3 English clips or marked moments. Each one is 45 seconds or less, and I have marked the moments to use.",
          required: true,
        },
        {
          name: "usableFootage",
          kind: "checkbox",
          label: "The footage and audio are clear enough to use.",
          required: true,
        },
        {
          name: "rights",
          kind: "checkbox",
          label:
            "I own these clips, or I have permission from everyone who appears in them.",
          required: true,
        },
        {
          name: "cta",
          kind: "textarea",
          label: "Call-to-action wording, if you have one",
          required: false,
          rows: 2,
          placeholder: "Example: Book now, or Visit our website.",
        },
      ],
    },
    upload: {
      label: "What clips will you add in My Studio after checkout?",
      placeholder: "Example: up to 3 English clips or marked moments, each up to 45 seconds.",
      summaryEmpty: "The clips you will add in My Studio after checkout.",
    },
    preferences: {
      mustKeep: "Any moment or line that must stay in the finished videos",
      mustNot: "Anything that must not be included",
      studioDecide:
        "I’m not sure. Let The Studio decide within the original package scope.",
      summaryEmpty: "No specific keep or cut notes added.",
    },
  },
  social_and_promo_graphics: {
    aboutProject: {
      summaryEmpty: "Offer, campaign theme, facts, and rights.",
      fields: [
        {
          name: "purpose",
          kind: "textarea",
          label: "What is the offer, promotion, or campaign theme?",
          required: true,
          rows: 3,
        },
        {
          name: "facts",
          kind: "textarea",
          label: "Facts, prices, and disclosures the graphics need to include",
          placeholder: "Example: prices, dates, and anything the graphics must say or avoid.",
          required: false,
          rows: 3,
        },
        {
          name: "assets",
          kind: "textarea",
          label: "Your logo, brand assets, or photos, if you have them",
          required: false,
          rows: 2,
        },
        {
          name: "rights",
          kind: "checkbox",
          label: "I have permission to use the materials I am supplying.",
          required: true,
        },
        {
          name: "cta",
          kind: "textarea",
          label: "Call-to-action wording, if you have one",
          required: false,
          rows: 2,
          placeholder: "Example: Book now, or Visit our website.",
        },
      ],
    },
    upload: {
      label: "What logos, photos, or other files will you add in My Studio after checkout?",
      placeholder:
        "Example: a logo if you have one, photos, and the facts the graphics need.",
      summaryEmpty: "The logos, photos, and other files you will add in My Studio after checkout.",
    },
    preferences: {
      mustKeep: "Any color, wording, or layout that must stay",
      mustNot: "Anything that must not appear",
      studioDecide:
        "I’m not sure. Let The Studio decide within the original package scope.",
      summaryEmpty: "No specific design notes added.",
    },
  },
};

export function builderCopyForPackage(id: CondensedPackageId): CondensedBuilderPackageCopy {
  return condensedBuilderByPackage[id];
}

export const clipRepurposingPackageDetail: PackageDetailModel = {
  id: "clip_repurposing",
  slug: "clip-repurposing",
  name: "Clip Repurposing",
  priceDisplay: "$399",
  priceCents: 39900,
  purposeLine:
    "Polished vertical shorts from one 15–60 minute English recording, filmed vertically, with one primary speaker. You post them.",
  converted: true,
  startHref: "/project-builder?package=clip_repurposing",
  voiceHref: studioCustomerJourneyCondenseV1.routes.studioVoice,
  homeHref: studioCustomerJourneyCondenseV1.routes.home,
  sections: [
    {
      id: "purpose",
      kind: "purpose",
      label: "Purpose",
      prose:
        "The Studio watches that recording, finds the strongest distinct moments, and finishes them as polished vertical shorts.",
    },
    {
      id: "includes",
      kind: "includes",
      label: "Included",
      icon: "✅",
      items: [
        "Up to 5 polished 15–30 second vertical shorts, depending on the strength and number of distinct moments in your source",
        "Reviews the source and identifies the strongest distinct moments",
        "Creates polished vertical shorts and improves pacing or audio where appropriate",
        "Adds captions, matching post captions, suggested titles or hooks, and suggested hashtag keywords",
        "A posting companion that tells you what to do with the finished files",
        "Optional support you can include or skip: Reputation & Customer Proof, Ad Creative, and Email & Text",
      ],
    },
    {
      id: "revision",
      kind: "revision",
      label: "Revisions",
      icon: "🔄",
      items: [
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.roundsIncluded,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.notIncluded,
      ],
    },
    {
      id: "needs",
      kind: "needs",
      label: "What You Provide",
      icon: "👤",
      items: [
        "One 15–60 minute English recording, filmed vertically, with one primary speaker",
        "Speech and audio clear enough to follow",
        "Permission to use the recording and everyone who appears in it",
        "Call-to-action wording, if you have one",
        "The recording is added in My Studio after checkout",
      ],
    },
    {
      id: "excludes",
      kind: "excludes",
      label: "Not Included in This Package",
      icon: "❌",
      items: [
        "Five is the maximum, not a guarantee",
        "A weak source does not get filler clips",
        "No designed covers",
        "No posting or account management",
        "No passwords",
        "No performance guarantee",
      ],
    },
  ],
};

export const shortFormVideoEditingPackageDetail: PackageDetailModel = {
  id: "short_form_video_editing",
  slug: "short-form-video-editing",
  name: "Short-Form Video Editing",
  priceDisplay: "$249",
  priceCents: 24900,
  purposeLine:
    "Polished short-form videos from the English clips or marked moments you already chose. You post them.",
  converted: true,
  startHref: "/project-builder?package=short_form_video_editing",
  voiceHref: studioCustomerJourneyCondenseV1.routes.studioVoice,
  homeHref: studioCustomerJourneyCondenseV1.routes.home,
  sections: [
    {
      id: "purpose",
      kind: "purpose",
      label: "Purpose",
      prose:
        "The Studio polishes the clips or marked moments you chose. It does not search a long recording for content.",
    },
    {
      id: "includes",
      kind: "includes",
      label: "Included",
      icon: "✅",
      items: [
        "Up to 3 polished short-form videos",
        "Edits the moments you chose",
        "May look slightly before or after a moment you marked, so the opening, ending, or thought is complete",
        "Improves pacing and audio where appropriate",
        "Matching captions for each finished video",
        "Cover and title graphics",
        "A simple guide for posting or using the finished videos",
        "Optional support you can include or skip: Reputation & Customer Proof, Ad Creative, and Email & Text",
      ],
    },
    {
      id: "revision",
      kind: "revision",
      label: "Revisions",
      icon: "🔄",
      items: [
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.roundsIncluded,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.notIncluded,
      ],
    },
    {
      id: "needs",
      kind: "needs",
      label: "What You Provide",
      icon: "👤",
      items: [
        "Up to 3 English source clips, or marked moments",
        "Each clip or marked moment up to 45 seconds",
        "The moments you want used",
        "Footage and audio clear enough to use",
        "Permission to use the footage and everyone who appears in it",
        "Call-to-action wording, if you have one",
        "The clips are added in My Studio after checkout",
      ],
    },
    {
      id: "excludes",
      kind: "excludes",
      label: "Not Included in This Package",
      icon: "❌",
      items: [
        "The Studio does not search a long recording for moments",
        "No posting, scheduling, or account management",
        "No passwords",
        "No performance guarantee",
      ],
    },
  ],
};

export const socialAndPromoGraphicsPackageDetail: PackageDetailModel = {
  id: "social_and_promo_graphics",
  slug: "social-promo-graphics",
  name: "Social & Promo Graphics",
  priceDisplay: "$199",
  priceCents: 19900,
  purposeLine:
    "Coordinated social posts and campaign graphics for one theme. You post them.",
  converted: true,
  startHref: "/project-builder?package=social_and_promo_graphics",
  voiceHref: studioCustomerJourneyCondenseV1.routes.studioVoice,
  homeHref: studioCustomerJourneyCondenseV1.routes.home,
  sections: [
    {
      id: "purpose",
      kind: "purpose",
      label: "Purpose",
      prose:
        "The Studio turns your offer and business information into one visual theme, with posts, captions, and campaign graphics.",
    },
    {
      id: "includes",
      kind: "includes",
      label: "Included",
      icon: "✅",
      items: [
        "One coordinated visual theme",
        "4 coordinated square posts",
        "Matching captions",
        "A suggested posting order",
        "2 campaign graphics: a 1024x1024 PNG and a 1024x1536 PNG",
        "Optional support you can include or skip: Reputation & Customer Proof, Ad Creative, and Email & Text",
      ],
    },
    {
      id: "revision",
      kind: "revision",
      label: "Revisions",
      icon: "🔄",
      items: [
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.roundsIncluded,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.notIncluded,
      ],
    },
    {
      id: "needs",
      kind: "needs",
      label: "What You Provide",
      icon: "👤",
      items: [
        "Your business and the offer",
        "Your logo or brand assets, if you have them",
        "Facts, prices, and disclosures the graphics need to include",
        "Photos or other images, if you have them",
        "Call-to-action wording, if you have one",
        "Permission to use the materials you supply",
        "Logos, photos, and other files are added in My Studio after checkout",
      ],
    },
    {
      id: "excludes",
      kind: "excludes",
      label: "Not Included in This Package",
      icon: "❌",
      items: [
        "No posting, scheduling, or account management",
        "No passwords",
        "No performance guarantee",
        "Designed for digital use, not professional print production.",
      ],
    },
  ],
};

const PACKAGE_DETAIL_BY_ID: Record<CondensedPackageId, PackageDetailModel> = {
  clip_repurposing: clipRepurposingPackageDetail,
  short_form_video_editing: shortFormVideoEditingPackageDetail,
  social_and_promo_graphics: socialAndPromoGraphicsPackageDetail,
};

export function packageIdFromSlug(
  slug: string | undefined,
): CondensedPackageId | null {
  if (slug === CONDENSED_PACKAGE_SLUGS.clip_repurposing) return "clip_repurposing";
  if (slug === CONDENSED_PACKAGE_SLUGS.short_form_video_editing) {
    return "short_form_video_editing";
  }
  if (
    slug === CONDENSED_PACKAGE_SLUGS.social_and_promo_graphics ||
    slug === "social-and-promo-graphics"
  ) {
    return "social_and_promo_graphics";
  }
  return null;
}

export function resolveCondensedPackageId(
  value: string | null | undefined,
): CondensedPackageId {
  if (value === "short_form_video_editing") return "short_form_video_editing";
  if (value === "social_and_promo_graphics") return "social_and_promo_graphics";
  return "clip_repurposing";
}

export function packageDetailPath(id: CondensedPackageId): string {
  return `/package/${CONDENSED_PACKAGE_SLUGS[id]}`;
}

export function helpFromForPackage(id: CondensedPackageId): string {
  if (id === "short_form_video_editing") return "short-form-package-detail";
  if (id === "social_and_promo_graphics") return "social-package-detail";
  return "package-detail";
}

export function condensedServiceSku(
  id: CondensedPackageId,
): "v2-rtu-clip-repurposing" | "v2-rtu-short-form-video-edit" | "v2-rtu-social-posts" {
  if (id === "short_form_video_editing") return "v2-rtu-short-form-video-edit";
  if (id === "social_and_promo_graphics") return "v2-rtu-social-posts";
  return "v2-rtu-clip-repurposing";
}

export function slugFromPackageId(id: CondensedPackageId): CondensedPackageSlug {
  return CONDENSED_PACKAGE_SLUGS[id];
}

export function getConvertedPackageDetail(
  id: CondensedPackageId | string | null | undefined,
): PackageDetailModel | null {
  if (!id) return null;
  return PACKAGE_DETAIL_BY_ID[id as CondensedPackageId] ?? null;
}

export function isCondensedHeadlineId(
  value: string | null | undefined,
): value is ThreePackageHeadlineId {
  return (
    value === "clip_repurposing" ||
    value === "short_form_video_editing" ||
    value === "social_and_promo_graphics"
  );
}
