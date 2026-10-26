/**
 * Condensed customer journey — reuse existing rooms and card language.
 * Visual system stays locked. Clip Repurposing Package Detail first.
 */

import type { ThreePackageHeadlineId } from "@/config/studio-three-package-architecture-reconciliation-v1";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import {
  STUDIO_EXTRA_IDS,
  studioExtraDefinitions,
  studioExtrasCustomerCopy,
  studioExtrasEligibilityByPackage,
  studioExtrasPackageIncludedLine,
  type StudioExtraId,
} from "@/config/studio-extras-v1";

export const STUDIO_CUSTOMER_JOURNEY_CONDENSE_PACKAGE_ID =
  "STUDIO-CUSTOMER-JOURNEY-CONDENSE-1" as const;

export const CONDENSED_PACKAGE_IDS = [
  "clip_repurposing",
  "short_form_video_editing",
  "social_and_promo_graphics",
  "creative_qa_finish",
  "campaign_launch_kit",
] as const;

export type CondensedPackageId = (typeof CONDENSED_PACKAGE_IDS)[number];

/** Packages a new customer can discover, select, and buy. Creative QA stays in the internal id list for existing jobs. */
export const PUBLIC_LAUNCH_PACKAGE_IDS = [
  "clip_repurposing",
  "short_form_video_editing",
  "social_and_promo_graphics",
  "campaign_launch_kit",
] as const satisfies readonly CondensedPackageId[];

export function isPublicLaunchPackageId(
  value: string | null | undefined,
): value is (typeof PUBLIC_LAUNCH_PACKAGE_IDS)[number] {
  return (PUBLIC_LAUNCH_PACKAGE_IDS as readonly string[]).includes(String(value ?? ""));
}

export const RETIRED_CREATIVE_QA_PURCHASE_MESSAGE =
  "Creative QA & Finish is not a current package. Choose Clip Repurposing, Short-Form Video Editing, Social & Promo Graphics, or Campaign Launch Kit." as const;

export const CONDENSED_PACKAGE_SLUGS = {
  clip_repurposing: "clip-repurposing",
  short_form_video_editing: "short-form-video-editing",
  social_and_promo_graphics: "social-promo-graphics",
  creative_qa_finish: "creative-qa-finish",
  campaign_launch_kit: "campaign-launch-kit",
} as const;

export type CondensedPackageSlug =
  (typeof CONDENSED_PACKAGE_SLUGS)[CondensedPackageId];

/** Live customer promise: Studio Extras, read from canonical `studioExtrasV1`. */
export const CONDENSED_SUPPORT_OPTIONS = STUDIO_EXTRA_IDS.map((id) => ({
  id,
  label: studioExtraDefinitions[id].name,
  detail: `${studioExtraDefinitions[id].customerSummary} ${studioExtraDefinitions[id].customerNotIncluded}`,
}));

export type CondensedSupportId = StudioExtraId;

/** Eligible Studio Extras for a package. Eligibility lives only in `studioExtrasEligibilityByPackage`. */
export function supportOptionsForPackage(id: CondensedPackageId) {
  const allowed = studioExtrasEligibilityByPackage[id];
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
  clipPriceCents: 37375,
  clipPriceDisplay: "$373.75",
  reviewConfirmTitle: "Confirm checkout",
  reviewTermsLabel:
    "I reviewed my order and understand that confirming checkout is required before work can move forward.",
  materialsAfterPay:
    "You add your actual project files in My Studio after checkout.",
  materialsHere:
    "Tell us what you have. You do not add files on this page. You add them in My Studio after checkout.",
  includedOptionalSupport: [
    studioExtrasCustomerCopy.builderLead,
    ...studioExtrasCustomerCopy.builderPromise,
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
    title: studioExtrasCustomerCopy.builderTitle,
    summaryEmpty: "Add up to two, or skip them.",
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
      summaryEmpty: "What the shorts should help people do.",
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
          placeholder: "Example: Book online or call.",
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
      summaryEmpty: "What the videos should help people do.",
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
      summaryEmpty: "The offer, promotion, or campaign theme.",
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
  creative_qa_finish: {
    aboutProject: {
      summaryEmpty: "What the piece should do, the assets, and rights.",
      fields: [
        {
          name: "purpose",
          kind: "textarea",
          label: "What should the finished piece do?",
          required: true,
          rows: 3,
        },
        {
          name: "assets",
          kind: "textarea",
          label: "Name the one or two existing static assets you will send.",
          required: true,
          rows: 2,
        },
        {
          name: "facts",
          kind: "textarea",
          label: "Facts, prices, dates, or claims that must stay exactly as written",
          required: true,
          rows: 3,
        },
        {
          name: "rights",
          kind: "checkbox",
          label: "I have permission to use the creative I am supplying.",
          required: true,
        },
        {
          name: "cta",
          kind: "textarea",
          label: "Anything that must stay the same",
          required: false,
          rows: 2,
        },
      ],
    },
    upload: {
      label: "What existing files will you add in My Studio after checkout?",
      placeholder: "Example: one or two existing static assets, plus any facts that must be confirmed.",
      summaryEmpty: "The existing files you will add in My Studio after checkout.",
    },
    preferences: {
      mustKeep: "Any wording or meaning that must stay",
      mustNot: "Anything that must not be changed",
      studioDecide: "I’m not sure. Let The Studio decide within the original package scope.",
      summaryEmpty: "No specific finish notes added.",
    },
  },
  campaign_launch_kit: {
    aboutProject: {
      summaryEmpty: "The one objective for this campaign.",
      fields: [
        {
          name: "purpose",
          kind: "textarea",
          label: "What is the one objective for this campaign?",
          required: true,
          rows: 3,
        },
        {
          name: "facts",
          kind: "textarea",
          label: "What is the one offer or message?",
          required: true,
          rows: 3,
        },
        {
          name: "prices",
          kind: "textarea",
          label: "What is the offer price, including any original price?",
          required: true,
          rows: 2,
        },
        {
          name: "dates",
          kind: "textarea",
          label: "What dates should appear?",
          required: true,
          rows: 2,
        },
        {
          name: "phone",
          kind: "textarea",
          label: "What phone number should customers use?",
          required: true,
          rows: 1,
        },
        {
          name: "website",
          kind: "textarea",
          label: "What website should customers use?",
          required: true,
          rows: 1,
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
      placeholder: "Example: a logo if you have one, photos, and the offer the materials need.",
      summaryEmpty: "The logos, photos, and other files you will add in My Studio after checkout.",
    },
    preferences: {
      mustKeep: "Any offer, date, or wording that must stay",
      mustNot: "Anything that must not appear",
      studioDecide: "I’m not sure. Let The Studio decide within the original package scope.",
      summaryEmpty: "No specific campaign notes added.",
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
  priceDisplay: "$373.75",
  priceCents: 37375,
  purposeLine:
    "Polished vertical shorts from one 15–60 minute English recording, filmed vertically, with one primary speaker. You post them.",
  converted: true,
  startHref: "/project-builder?package=clip_repurposing",
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
        "Three finished 15–30 second vertical shorts",
        "Reviews the source and identifies the strongest distinct moments",
        "Creates polished vertical shorts and improves pacing or audio where appropriate",
        "Accurate captions, matching post captions, suggested titles or hooks, and suggested hashtag keywords",
        "A customer-specific end card on each short, using only the call to action you supplied",
        "A posting companion that tells you what to do with the finished files",
        "The Studio checks the finished shorts before you review them",
        studioExtrasPackageIncludedLine("clip_repurposing"),
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
  priceDisplay: "$186.25",
  priceCents: 18625,
  purposeLine:
    "Polished short-form videos from the English clips or marked moments you already chose. You post them.",
  converted: true,
  startHref: "/project-builder?package=short_form_video_editing",
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
        studioExtrasPackageIncludedLine("short_form_video_editing"),
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
        studioExtrasPackageIncludedLine("social_and_promo_graphics"),
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

export const creativeQaFinishPackageDetail: PackageDetailModel = {
  id: "creative_qa_finish",
  slug: "creative-qa-finish",
  name: "Creative QA & Finish",
  priceDisplay: "$129",
  priceCents: 12900,
  purposeLine: "Inspection and finish for one or two existing static files. The Studio keeps your artwork whole, places it on a clean 1080 square with a margin, and returns the file. You use the finished files.",
  converted: true,
  startHref: "/project-builder?package=creative_qa_finish",
  homeHref: studioCustomerJourneyCondenseV1.routes.home,
  sections: [
    {
      id: "purpose",
      kind: "purpose",
      label: "Purpose",
      prose: "Bring us one or two existing static files. The Studio checks that the artwork is fully visible, fits it inside a 1080 square with a clean margin, keeps your words and prices exactly as supplied, and returns the finished file with a short summary of what changed.",
    },
    {
      id: "includes",
      kind: "includes",
      label: "Included",
      icon: "\u2705",
      items: [
        "Finish for one or two existing static files.",
        "If the artwork is cut off at the edge, it is fitted inside the canvas so the whole file stays visible.",
        "Your words, prices, dates, and claims stay exactly as you supplied them.",
        "One 1080 by 1080 PNG for each file.",
        "A What We Fixed summary.",
        "The file may come from you, a design tool, a freelancer, AI, or a mixed workflow. The Studio finishes that file. It does not rebuild it.",
        studioExtrasPackageIncludedLine("creative_qa_finish"),
      ],
    },
    {
      id: "revision",
      kind: "revision",
      label: "Revisions",
      icon: "\uD83D\uDD04",
      items: [
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.roundsIncluded,
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound,
        "A revision may ask for more margin, less margin, or the same finish.",
        "A revision cannot become a new design or a reconstruction.",
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.notIncluded,
      ],
    },
    {
      id: "needs",
      kind: "needs",
      label: "What You Provide",
      icon: "\uD83D\uDC64",
      items: [
        "One or two existing static files",
        "The facts, prices, dates, or claims that must stay exactly as written",
        "Permission to use and adapt the creative you supply",
        "The files are added in My Studio after checkout",
      ],
    },
    {
      id: "excludes",
      kind: "excludes",
      label: "Not Included in This Package",
      icon: "\u274C",
      items: [
        "A separate Revision Rescue purchase is not included.",
        "Unsupported file types are not included.",
        "Full reconstruction is not included.",
        "Rewriting headlines, prices, or other wording is not included.",
        "Brand-color changes inside the artwork are not included.",
        "Font changes inside the artwork are not included.",
        "Layout changes inside the artwork are not included.",
        "Video is not included.",
        "A new campaign is not included.",
        "Printing coordination is not included.",
      ],
    },
  ],
};

export const campaignLaunchKitPackageDetail: PackageDetailModel = {
  id: "campaign_launch_kit",
  slug: "campaign-launch-kit",
  name: "Campaign Launch Kit",
  priceDisplay: "$349",
  priceCents: 34900,
  purposeLine: "One campaign, one offer, and a fixed set of four channels. You send and post the finished materials.",
  converted: true,
  startHref: "/project-builder?package=campaign_launch_kit",
  homeHref: studioCustomerJourneyCondenseV1.routes.home,
  sections: [
    {
      id: "purpose",
      kind: "purpose",
      label: "Purpose",
      prose: "Bring us your offer, event, launch, or announcement. The Studio turns it into a polished, brand-consistent set of ready-to-use campaign materials.",
    },
    {
      id: "includes",
      kind: "includes",
      label: "Included",
      icon: "\u2705",
      items: [
        "One campaign, one objective, one primary offer or message.",
        "A digital promotional flyer with a print-yourself PDF where supported.",
        "One paste-ready promotional email. The Studio does not send it.",
        "Two coordinated paste-ready text messages. The Studio does not send them.",
        "One square graphic and one portrait graphic for the same promotion.",
        "A short usage guide. The guide is not a fifth channel.",
        "We use the business information and brand materials you provide to keep your campaign consistent and accurate.",
        "Independent Quality review before customer review and final delivery.",
        "3 shared revision rounds across the package and any eligible included Extras.",
        studioExtrasPackageIncludedLine("campaign_launch_kit"),
      ],
    },
    {
      id: "revision",
      kind: "revision",
      label: "Revisions",
      icon: "\uD83D\uDD04",
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
      icon: "\uD83D\uDC64",
      items: [
        "One campaign, one objective, and one primary offer or message",
        "The offer, the price, the dates, and the call to action",
        "Permission to use the materials you supply",
        "Logos, photos, and other files are added in My Studio after checkout",
      ],
    },
    {
      id: "excludes",
      kind: "excludes",
      label: "Not Included in This Package",
      icon: "\u274C",
      items: [
        "No video, ad buying, ongoing marketing, or guaranteed campaign results.",
      ],
    },
  ],
};
const PACKAGE_DETAIL_BY_ID: Record<CondensedPackageId, PackageDetailModel> = {
  clip_repurposing: clipRepurposingPackageDetail,
  short_form_video_editing: shortFormVideoEditingPackageDetail,
  social_and_promo_graphics: socialAndPromoGraphicsPackageDetail,
  creative_qa_finish: creativeQaFinishPackageDetail,
  campaign_launch_kit: campaignLaunchKitPackageDetail,
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
  if (slug === CONDENSED_PACKAGE_SLUGS.creative_qa_finish) return null;
  if (slug === CONDENSED_PACKAGE_SLUGS.campaign_launch_kit) return "campaign_launch_kit";
  return null;
}

export function resolveCondensedPackageId(
  value: string | null | undefined,
): CondensedPackageId {
  if (value === "short_form_video_editing") return "short_form_video_editing";
  if (value === "social_and_promo_graphics") return "social_and_promo_graphics";
  if (value === "creative_qa_finish") return "creative_qa_finish";
  if (value === "campaign_launch_kit") return "campaign_launch_kit";
  return "clip_repurposing";
}

export function packageDetailPath(id: CondensedPackageId): string {
  return `/package/${CONDENSED_PACKAGE_SLUGS[id]}`;
}

export function helpFromForPackage(id: CondensedPackageId): string {
  if (id === "short_form_video_editing") return "short-form-package-detail";
  if (id === "social_and_promo_graphics") return "social-package-detail";
  if (id === "creative_qa_finish") return "creative-qa-package-detail";
  if (id === "campaign_launch_kit") return "campaign-launch-package-detail";
  return "package-detail";
}

export function condensedServiceSku(
  id: CondensedPackageId,
): "v2-rtu-clip-repurposing" | "v2-rtu-short-form-video-edit" | "v2-rtu-social-posts" | "v2-creative-qa-finish" | "v2-campaign-launch-kit" {
  if (id === "short_form_video_editing") return "v2-rtu-short-form-video-edit";
  if (id === "social_and_promo_graphics") return "v2-rtu-social-posts";
  if (id === "creative_qa_finish") return "v2-creative-qa-finish";
  if (id === "campaign_launch_kit") return "v2-campaign-launch-kit";
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

export type CondensedIntakeWelcome = {
  eyebrow: string;
  title: string;
  lead: string;
  detailsLabel: string;
  filesNote: string;
  savedNote: string;
};

/** Customer voice for the condensed intake page. Not a test script. */
export const CONDENSED_INTAKE_TEST_NOTICE =
  "Test mode: Checkout is unavailable. No payment will be taken." as const;

const CONDENSED_INTAKE_WELCOME: Record<CondensedPackageId, CondensedIntakeWelcome> = {
  clip_repurposing: {
    eyebrow: "Your Studio Plan",
    title: "Let's get your clips ready.",
    lead: "Tell us a little about your recording and what you want your clips to accomplish.",
    detailsLabel: "Project details",
    filesNote: "Your recording will be uploaded securely in My Studio after checkout.",
    savedNote: "Your answers will be saved. You won't need to repeat them.",
  },
  short_form_video_editing: {
    eyebrow: "Your Studio Plan",
    title: "Let's get your edit ready.",
    lead: "Tell us a little about the footage and what you want the finished piece to accomplish.",
    detailsLabel: "Project details",
    filesNote: "Your footage will be uploaded securely in My Studio after checkout.",
    savedNote: "Your answers will be saved. You won't need to repeat them.",
  },
  social_and_promo_graphics: {
    eyebrow: "Your Studio Plan",
    title: "Let's get your graphics ready.",
    lead: "Tell us a little about the promotion and what you want people to understand.",
    detailsLabel: "Project details",
    filesNote: "Your logo and photos will be uploaded securely in My Studio after checkout.",
    savedNote: "Your answers will be saved. You won't need to repeat them.",
  },
  campaign_launch_kit: {
    eyebrow: "Your Studio Plan",
    title: "Let's get your campaign ready.",
    lead: "Tell us a little about the offer and what you want this campaign to accomplish.",
    detailsLabel: "Project details",
    filesNote: "Your logo and photos will be uploaded securely in My Studio after checkout.",
    savedNote: "Your answers will be saved. You won't need to repeat them.",
  },
  creative_qa_finish: {
    eyebrow: "Your Studio Plan",
    title: "Let's finish this review.",
    lead: "Tell us what still needs to be clear before The Studio closes the work.",
    detailsLabel: "Project details",
    filesNote: "Any files are added in My Studio.",
    savedNote: "Your answers will be saved. You won't need to repeat them.",
  },
};

export function condensedIntakeWelcomeFor(
  packageId: string | null | undefined,
): CondensedIntakeWelcome | null {
  if (!packageId || !(packageId in CONDENSED_INTAKE_WELCOME)) return null;
  return CONDENSED_INTAKE_WELCOME[packageId as CondensedPackageId];
}
