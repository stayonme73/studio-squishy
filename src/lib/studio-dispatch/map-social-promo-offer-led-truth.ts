/**
 * Social & Promo Graphics current door → offer-led customer truth.
 * Used when the parent intake supplied a price, a date window, or contact.
 * Theme-led stays the path when those facts were left blank.
 * Customer art does not receive certification labels.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_PROMO_SKU,
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  resolveSocialPostsPlatformPlacement,
} from "@/lib/studio-design-renderer";
import type {
  PromoProjectTruth,
  SocialPostsProjectTruth,
} from "@/lib/studio-design-renderer";
import type { PromoMaterialRef } from "@/lib/studio-design-renderer/promo-types";
import type { SocialPostMaterialRef } from "@/lib/studio-design-renderer/social-posts-types";

import { resolveApprovedLogoMaterial } from "./map-flyer-job-truth";
import { readSocialPromoIntakeSignals } from "./social-promo-intake-truth";
import type { JobDispatchRecord } from "./types";

const BRAND_COLORS = {
  primary: "#1F3A5F",
  secondary: "#C4A574",
  background: "#F7F4EF",
  text: "#1A1A1A",
  muted: "#5A6570",
} as const;

const PROHIBITED = [
  "CERTIFICATION FIXTURE",
  "INTERNAL TEST",
  "(CERT)",
  "#1 rated",
] as const;

export type SocialPromoOfferLedFailure = {
  ok: false;
  code:
    | "THEME_LED_PATH"
    | "MISSING_REQUIRED_TRUTH"
    | "MISSING_REQUIRED_MATERIAL"
    | "INVALID_DESIGN_SPEC"
    | "SKU_NOT_SUPPORTED"
    | "BROKEN_ASSET_REFERENCE";
  message: string;
};

/** Collapse whitespace for comparing intake lines (headline vs offer theme). */
function normalizeOfferEditorialLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Offer-led promo hierarchy: `purpose` is the offer theme (tan band / primary offer line).
 * `mustKeep` is an optional editorial headline only when it adds distinct copy — never duplicate purpose.
 */
export function offerLedHeadlineFromIntake(purpose: string, mustKeep: string | undefined): string {
  const offerTheme = normalizeOfferEditorialLine(purpose);
  const keep = normalizeOfferEditorialLine(mustKeep ?? "");
  if (keep && keep !== offerTheme) return keep;
  return "";
}

type OfferFacts = {
  businessName: string;
  wordmark: string;
  descriptor: string;
  headline: string;
  offerName: string;
  priceDisplay: string;
  wasPriceDisplay?: string;
  dateWindow: string;
  body: string;
  cta: string;
  phone: string;
  webDisplay: string;
  webUrl: string;
  logo: SocialPostMaterialRef | null;
};

function logoFrom(input: {
  repoRoot: string;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  skuId: ServiceId;
}): { ok: true; logo: SocialPostMaterialRef | null } | SocialPromoOfferLedFailure {
  const resolved = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: input.skuId,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!resolved.ok) {
    return { ok: false, code: resolved.code, message: resolved.message };
  }
  if (!resolved.material) return { ok: true, logo: null };
  const relativePath = resolved.material.relativePath;
  const abs = path.join(input.repoRoot, relativePath);
  if (!existsSync(abs)) {
    return { ok: false, code: "BROKEN_ASSET_REFERENCE", message: `Logo file is missing: ${relativePath}` };
  }
  return {
    ok: true,
    logo: {
      materialId: resolved.material.materialId,
      role: "logo",
      relativePath,
      contentSha256: createHash("sha256").update(readFileSync(abs)).digest("hex"),
      approvedIdentitySourceId:
        relativePath.includes("harbor-oak-anchor-oak-oval")
          ? harborOakIdentityLock.approvedLogoVariantIds[0]
          : resolved.material.approvedIdentitySourceId,
    },
  };
}

function readOfferFacts(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  skuId: ServiceId;
}): { ok: true; facts: OfferFacts } | SocialPromoOfferLedFailure {
  const signals = readSocialPromoIntakeSignals(input);
  const mustKeep = signals.mustKeep;
  const combined = [
    signals.purpose,
    signals.facts,
    signals.cta,
    signals.phone,
    signals.web.webDisplay,
    mustKeep,
  ].join("\n");

  if (/CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)/i.test(combined)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer graphics cannot carry certification fixture labels.",
    };
  }

  if (signals.productionLane !== "offer_led") {
    return {
      ok: false,
      code: "THEME_LED_PATH",
      message: "No explicit price, date window, or approved logo requires theme-led layouts.",
    };
  }

  if (signals.hasPendingLogoUpload) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_MATERIAL",
      message:
        "A logo file is on file but is not yet approved for production use. The Studio must approve the logo in File Room before graphics can render.",
    };
  }

  const missing: string[] = [];
  if (!signals.purpose) missing.push("offer theme");
  if (!signals.businessName) missing.push("business name");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Social & Promo Graphics still needs: ${missing.join(", ")}.`,
    };
  }

  const businessName = signals.businessName;
  const locked = businessName === harborOakIdentityLock.businessName;
  const logo = logoFrom(input);
  if (!logo.ok) return logo;

  return {
    ok: true,
    facts: {
      businessName,
      wordmark: locked ? harborOakIdentityLock.requiredWordmark : businessName,
      descriptor: locked ? harborOakIdentityLock.approvedDescriptors[0] : "",
      headline: offerLedHeadlineFromIntake(signals.purpose, mustKeep),
      offerName: signals.purpose,
      priceDisplay: signals.explicitPrice,
      ...(signals.wasPriceDisplay ? { wasPriceDisplay: signals.wasPriceDisplay } : {}),
      dateWindow: signals.explicitDateWindow,
      body: signals.disclosureBody,
      cta: signals.cta,
      phone: signals.phone,
      webDisplay: signals.web.webDisplay,
      webUrl: signals.web.webUrl,
      logo: logo.logo,
    },
  };
}

export function mapSocialPromoOfferLedSocialTruth(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): { ok: true; truth: SocialPostsProjectTruth } | SocialPromoOfferLedFailure {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_SOCIAL_POSTS_SKU) {
    return { ok: false, code: "SKU_NOT_SUPPORTED", message: "Social posts branch only" };
  }
  const read = readOfferFacts({ ...input, skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU });
  if (!read.ok) return read;
  const placement = resolveSocialPostsPlatformPlacement("I am not sure");
  if (!placement.ok) {
    return { ok: false, code: "MISSING_REQUIRED_TRUTH", message: placement.message };
  }
  const facts = read.facts;
  const logo = facts.logo;

  return {
    ok: true,
    truth: {
      campaignId: input.campaign.campaignId,
      jobId: input.dispatchRecord.jobId,
      dispatchId: input.dispatchRecord.dispatchId,
      skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
      fixtureId: `job-${input.campaign.campaignId}`,
      label: "CUSTOMER JOB — Social & Promo Graphics",
      outputMode: "customer",
      businessName: facts.businessName,
      wordmark: facts.wordmark,
      descriptor: facts.descriptor,
      headline: facts.headline,
      offerName: facts.offerName,
      priceDisplay: facts.priceDisplay,
      ...(facts.wasPriceDisplay ? { wasPriceDisplay: facts.wasPriceDisplay } : {}),
      dateWindow: facts.dateWindow,
      body: facts.body,
      cta: facts.cta,
      phone: facts.phone,
      webDisplay: facts.webDisplay,
      webUrl: facts.webUrl,
      disclaimer: "",
      platformLabel: placement.platformLabel,
      brandColors: { ...BRAND_COLORS },
      materials: logo ? [logo] : [],
      approvedLogoVariantId: logo?.approvedIdentitySourceId ?? "wordmark-only",
      requiredTextTokens: [
        facts.wordmark,
        facts.offerName,
        ...(facts.priceDisplay ? [facts.priceDisplay] : []),
        ...(facts.dateWindow ? [facts.dateWindow] : []),
      ],
      prohibitedClaimPatterns: [...PROHIBITED],
      assets: [
        { assetId: "social-post-1", orderIndex: 1, roleAngle: "offer_lead" },
        { assetId: "social-post-2", orderIndex: 2, roleAngle: "cta_book" },
        { assetId: "social-post-3", orderIndex: 3, roleAngle: "dates_window" },
        { assetId: "social-post-4", orderIndex: 4, roleAngle: "trust_brand" },
      ],
      dispatchWiringScopeNote:
        "Social & Promo Graphics composite branch social_posts — offer facts from the parent intake, customer output, no certification labels.",
      revisionInstruction:
        input.campaign.machineFlyerRevisionEmphasis?.instruction?.trim() || undefined,
    },
  };
}

export function mapSocialPromoOfferLedPromoTruth(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): { ok: true; truth: PromoProjectTruth } | SocialPromoOfferLedFailure {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_PROMO_SKU) {
    return { ok: false, code: "SKU_NOT_SUPPORTED", message: "Campaign graphics branch only" };
  }
  const read = readOfferFacts({ ...input, skuId: DESIGN_RENDERER_PROMO_SKU });
  if (!read.ok) return read;
  const facts = read.facts;
  const logo: PromoMaterialRef | null = facts.logo;

  return {
    ok: true,
    truth: {
      campaignId: input.campaign.campaignId,
      jobId: input.dispatchRecord.jobId,
      dispatchId: input.dispatchRecord.dispatchId,
      skuId: DESIGN_RENDERER_PROMO_SKU,
      fixtureId: `job-${input.campaign.campaignId}`,
      label: "CUSTOMER JOB — Social & Promo Graphics",
      outputMode: "customer",
      businessName: facts.businessName,
      wordmark: facts.wordmark,
      descriptor: facts.descriptor,
      headline: facts.headline,
      offerName: facts.offerName,
      priceDisplay: facts.priceDisplay,
      ...(facts.wasPriceDisplay ? { wasPriceDisplay: facts.wasPriceDisplay } : {}),
      dateWindow: facts.dateWindow,
      body: facts.body,
      cta: facts.cta,
      phone: facts.phone,
      webDisplay: facts.webDisplay,
      webUrl: facts.webUrl,
      disclaimer: "",
      brandColors: { ...BRAND_COLORS },
      materials: logo ? [logo] : [],
      approvedLogoVariantId: logo?.approvedIdentitySourceId ?? "wordmark-only",
      requiredTextTokens: [
        facts.wordmark,
        facts.offerName,
        ...(facts.priceDisplay ? [facts.priceDisplay] : []),
        ...(facts.dateWindow ? [facts.dateWindow] : []),
      ],
      prohibitedClaimPatterns: [...PROHIBITED],
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
        "Social & Promo Graphics composite branch campaign_graphics — square and portrait are fixed by the package promise.",
    },
  };
}
