/**
 * Social & Promo Graphics current door → theme-led render truth for both
 * production branches. Reads only the parent intake. CTA, dates, contact,
 * price, and logo are optional and stay blank when the customer left them blank.
 */

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_PROMO_SKU,
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  resolveSocialPostsPlatformPlacement,
  themeLedBeats,
  themeLedSocialPostMembers,
  themeLedStatement,
} from "@/lib/studio-design-renderer";
import type {
  PromoProjectTruth,
  SocialPostsProjectTruth,
  ThemeLedCampaignTruth,
} from "@/lib/studio-design-renderer";

import {
  readSocialPromoIntakeSignals,
  SOCIAL_PROMO_DATE_RE,
  pricesFromSocialPromoText,
} from "./social-promo-intake-truth";
import type { JobDispatchRecord } from "./types";

const BRAND_COLORS = {
  primary: "#1F3A5F",
  secondary: "#C4A574",
  background: "#F7F4EF",
  text: "#1A1A1A",
  muted: "#5A6570",
} as const;

const PROHIBITED_CLAIMS = [
  "CERTIFICATION FIXTURE",
  "#1 rated",
  "Destination:",
  "Voice brief",
  "MISSING FACT",
  "You post and schedule",
] as const;

type MapFailure = { ok: false; code: string; message: string };

type ThemeLedShared = {
  businessName: string;
  wordmark: string;
  theme: ThemeLedCampaignTruth;
  cta: string;
  prohibitedClaimPatterns: string[];
  requiredTextTokens: string[];
};

function readThemeLedShared(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  skuId: ServiceId;
}): { ok: true; shared: ThemeLedShared & { phone: string; webDisplay: string; webUrl: string; disclosureBody: string } } | MapFailure {
  const signals = readSocialPromoIntakeSignals({
    ...input,
    skuId: input.skuId,
  });
  const coreMessage = signals.mustKeep;
  if (!signals.purpose) {
    return { ok: false, code: "MISSING_REQUIRED_TRUTH", message: "Social & Promo theme is missing" };
  }
  if (!coreMessage || !themeLedBeats(coreMessage)) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Theme-led graphics need the core message in “Any color, wording, or layout that must stay” with three comma-separated parts. Ask the customer; do not invent it.",
    };
  }
  if (signals.productionLane === "offer_led") {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "This project includes an explicit price, a date window, or an approved logo. Offer-led graphics are required so those details are not dropped.",
    };
  }
  if (pricesFromSocialPromoText(signals.facts).price) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Facts include an explicit dollar price. Offer-led graphics are required so that price appears exactly as supplied.",
    };
  }
  if (SOCIAL_PROMO_DATE_RE.test(signals.facts)) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Facts include an explicit date window. Offer-led graphics are required so those dates appear exactly as supplied.",
    };
  }

  const businessName = signals.businessName;
  if (!businessName) {
    return { ok: false, code: "MISSING_REQUIRED_TRUTH", message: "Business name is missing" };
  }

  const mustNot = signals.mustNot;
  const beats = themeLedBeats(coreMessage)!;
  return {
    ok: true,
    shared: {
      businessName,
      wordmark: businessName,
      theme: { theme: signals.purpose, coreMessage },
      cta: signals.cta,
      phone: signals.phone,
      webDisplay: signals.web.webDisplay,
      webUrl: signals.web.webUrl,
      disclosureBody: signals.disclosureBody,
      prohibitedClaimPatterns: [...PROHIBITED_CLAIMS, ...(mustNot ? [mustNot.slice(0, 80)] : [])],
      requiredTextTokens: [
        businessName,
        coreMessage,
        themeLedStatement(signals.purpose),
        ...beats,
        ...(signals.disclosureBody ? [signals.disclosureBody] : []),
      ],
    },
  };
}

export function mapSocialPromoThemeLedSocialTruth(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): { ok: true; truth: SocialPostsProjectTruth } | MapFailure {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_SOCIAL_POSTS_SKU) {
    return { ok: false, code: "SKU_NOT_SUPPORTED", message: "Social posts branch only" };
  }
  const read = readThemeLedShared({ ...input, skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU });
  if (!read.ok) return read;
  const { shared } = read;
  const placement = resolveSocialPostsPlatformPlacement("I am not sure");
  if (!placement.ok) return placement;

  return {
    ok: true,
    truth: {
      campaignId: input.campaign.campaignId,
      jobId: input.dispatchRecord.jobId,
      dispatchId: input.dispatchRecord.dispatchId,
      skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
      fixtureId: `job-${input.campaign.campaignId}`,
      label: "CUSTOMER JOB — Social & Promo Graphics theme-led",
      outputMode: "customer",
      contentMode: "theme_led",
      themeLed: shared.theme,
      businessName: shared.businessName,
      wordmark: shared.wordmark,
      descriptor: "",
      headline: shared.theme.coreMessage,
      offerName: "",
      priceDisplay: "",
      dateWindow: "",
      body: shared.disclosureBody
        ? `${themeLedStatement(shared.theme.theme)} ${shared.disclosureBody}`.trim()
        : themeLedStatement(shared.theme.theme),
      cta: shared.cta,
      phone: shared.phone,
      webDisplay: shared.webDisplay,
      webUrl: shared.webUrl,
      disclaimer: "",
      platformLabel: placement.platformLabel,
      brandColors: { ...BRAND_COLORS },
      materials: [],
      approvedLogoVariantId: "wordmark-only",
      requiredTextTokens: shared.requiredTextTokens,
      prohibitedClaimPatterns: shared.prohibitedClaimPatterns,
      assets: themeLedSocialPostMembers(),
      dispatchWiringScopeNote:
        "Social & Promo Graphics composite branch social_posts — theme-led layouts from the parent intake; wordmark-only; captions Studio-written from the customer's theme and core message.",
    },
  };
}

export function mapSocialPromoThemeLedPromoTruth(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): { ok: true; truth: PromoProjectTruth } | MapFailure {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_PROMO_SKU) {
    return { ok: false, code: "SKU_NOT_SUPPORTED", message: "Campaign graphics branch only" };
  }
  const read = readThemeLedShared({ ...input, skuId: DESIGN_RENDERER_PROMO_SKU });
  if (!read.ok) return read;
  const { shared } = read;

  return {
    ok: true,
    truth: {
      campaignId: input.campaign.campaignId,
      jobId: input.dispatchRecord.jobId,
      dispatchId: input.dispatchRecord.dispatchId,
      skuId: DESIGN_RENDERER_PROMO_SKU,
      fixtureId: `job-${input.campaign.campaignId}`,
      label: "CUSTOMER JOB — Social & Promo Graphics theme-led",
      outputMode: "customer",
      contentMode: "theme_led",
      themeLed: shared.theme,
      businessName: shared.businessName,
      wordmark: shared.wordmark,
      descriptor: "",
      headline: shared.theme.coreMessage,
      offerName: "",
      priceDisplay: "",
      dateWindow: "",
      body: shared.disclosureBody
        ? `${themeLedStatement(shared.theme.theme)} ${shared.disclosureBody}`.trim()
        : themeLedStatement(shared.theme.theme),
      cta: shared.cta,
      phone: shared.phone,
      webDisplay: shared.webDisplay,
      webUrl: shared.webUrl,
      disclaimer: "",
      brandColors: { ...BRAND_COLORS },
      materials: [],
      approvedLogoVariantId: "wordmark-only",
      requiredTextTokens: [shared.wordmark, ...themeLedBeats(shared.theme.coreMessage)!],
      prohibitedClaimPatterns: shared.prohibitedClaimPatterns,
      revisionInstruction: input.campaign.machineFlyerRevisionEmphasis?.instruction?.trim() || undefined,
      assets: [
        {
          assetId: "campaign-graphic-square",
          authorizedPurpose: "Campaign graphic, square",
          plateId: PROMO_SQUARE_PLATE.plateId,
          canvas: { widthPx: PROMO_SQUARE_PLATE.widthPx, heightPx: PROMO_SQUARE_PLATE.heightPx },
          layoutVariant: "compact_square",
        },
        {
          assetId: "campaign-graphic-portrait",
          authorizedPurpose: "Campaign graphic, portrait",
          plateId: PROMO_PORTRAIT_PLATE.plateId,
          canvas: { widthPx: PROMO_PORTRAIT_PLATE.widthPx, heightPx: PROMO_PORTRAIT_PLATE.heightPx },
          layoutVariant: "tall_portrait",
        },
      ],
      liveIntakePerAssetPurposeGap:
        "Social & Promo Graphics composite branch campaign_graphics — square and portrait are fixed by the package promise, not customer-picked.",
    },
  };
}
