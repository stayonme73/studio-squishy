import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { AD_CREATIVE_V1_CAMPAIGN_ID } from "@/config/studio-ad-creative-offer-definition-and-cert-v1";
import {
  DESIGN_RENDERER_PROMO_SKU,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  type PromoProjectTruth,
} from "@/lib/studio-design-renderer/promo-types";
import type { AdCreativeIntake } from "./claims";

const MAPLE_WICK_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#3D2B1F"/><text x="128" y="148" text-anchor="middle" fill="#F4E6C8" font-size="42" font-family="Georgia">MW</text></svg>`;

export function mapleWickIntake(): AdCreativeIntake {
  return {
    campaignId: AD_CREATIVE_V1_CAMPAIGN_ID,
    businessName: "Maple & Wick",
    offerName: "Fall candle flight",
    headline: "Fall candles, ready this week",
    primaryText:
      "Maple & Wick’s fall candle flight is on the shelf now. Three seasonal scents. $28.",
    cta: "Shop this week",
    priceDisplay: "$28",
    phone: "555-0148",
    website: "mapleandwick.example",
    requiredDisclosure: "While supplies last.",
  };
}

export function ensureMapleWickLogo(repoRoot: string, campaignId: string) {
  const relativePath = `data/campaign-design-artifacts/${campaignId}/materials/maple-wick-mark.svg`;
  const abs = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, MAPLE_WICK_LOGO_SVG, "utf8");
  return {
    materialId: "mat-maple-wick-logo-v1",
    role: "logo" as const,
    relativePath,
    contentSha256: createHash("sha256").update(MAPLE_WICK_LOGO_SVG).digest("hex"),
    approvedIdentitySourceId: "maple-wick-mark-v1",
  };
}

export function mapleWickPromoTruth(repoRoot: string): PromoProjectTruth {
  const campaignId = AD_CREATIVE_V1_CAMPAIGN_ID;
  const logo = ensureMapleWickLogo(repoRoot, campaignId);
  const intake = mapleWickIntake();
  return {
    campaignId,
    jobId: `${campaignId}::${DESIGN_RENDERER_PROMO_SKU}`,
    dispatchId: `dd:${campaignId}:${DESIGN_RENDERER_PROMO_SKU}`,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    fixtureId: "ad-creative-v1-maple-wick",
    label: "Maple & Wick Ad Creative V1",
    outputMode: "customer",
    businessName: intake.businessName,
    wordmark: "Maple & Wick",
    descriptor: "Seasonal candles",
    headline: intake.headline,
    offerName: intake.offerName,
    priceDisplay: intake.priceDisplay,
    dateWindow: "this week",
    body: intake.primaryText,
    cta: intake.cta,
    phone: intake.phone ?? "",
    webDisplay: intake.website ?? "",
    webUrl: `https://${intake.website ?? "example.com"}`,
    disclaimer: intake.requiredDisclosure ?? "",
    brandColors: {
      primary: "#3D2B1F",
      secondary: "#8C4A2F",
      background: "#F4E6C8",
      text: "#2A1C12",
      muted: "#6B5344",
    },
    materials: [logo],
    approvedLogoVariantId: "maple-wick-mark-v1",
    requiredTextTokens: ["Maple", "Wick", "Fall", "$28"],
    prohibitedClaimPatterns: ["guaranteed", "best", "results"],
    assets: [
      {
        assetId: "fall-flight-ad-square",
        authorizedPurpose: "Square ad graphic for the customer’s own ad account",
        plateId: PROMO_SQUARE_PLATE.plateId,
        canvas: { widthPx: PROMO_SQUARE_PLATE.widthPx, heightPx: PROMO_SQUARE_PLATE.heightPx },
        layoutVariant: "compact_square",
      },
      {
        assetId: "fall-flight-ad-portrait",
        authorizedPurpose: "Portrait ad graphic for the customer’s own ad account",
        plateId: PROMO_PORTRAIT_PLATE.plateId,
        canvas: { widthPx: PROMO_PORTRAIT_PLATE.widthPx, heightPx: PROMO_PORTRAIT_PLATE.heightPx },
        layoutVariant: "tall_portrait",
      },
    ],
    liveIntakePerAssetPurposeGap:
      "Ad Creative V1 reuses the certified promotion-graphics plates. No new plate was invented.",
  };
}
