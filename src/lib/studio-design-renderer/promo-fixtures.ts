/**
 * Harbor & Oak CERTIFICATION FIXTURE — two-asset campaign set.
 * Explicit per-asset purpose truth (not derived from live intake).
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { HARBOR_OAK_LOGO_SVG } from "./fixtures";
import {
  DESIGN_RENDERER_PROMO_SKU,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  type PromoMaterialRef,
  type PromoProjectTruth,
} from "./promo-types";

export const PROMO_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1" as const;

export const PROMO_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-promotion-graphics-proof-1/artifacts/v2-rtu-promotion-graphics" as const;

const LOGO_REL =
  `${PROMO_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

/** Historical gap note — intake fields closed by INTAKE-TRUTH-1; dispatch wired by DISPATCH-HOOK-1. */
export const LIVE_INTAKE_PER_ASSET_PURPOSE_GAP =
  "RESOLVED by STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1: live rtu-promotion-graphics intake now requires graphicA_authorizedPurpose, graphicA_agreedPlate, graphicB_authorizedPurpose, and graphicB_agreedPlate (mapped via mapPromoAssetsFromIntakeAnswers). DISPATCH-HOOK-1 wires execution for Square+Portrait only; Landscape remains recorded-but-unproven (fail closed)." as const;

export function ensureHarborOakPromoLogoMaterial(
  repoRoot: string,
): PromoMaterialRef {
  const abs = path.join(repoRoot, LOGO_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs) || readFileSync(abs, "utf8") !== HARBOR_OAK_LOGO_SVG) {
    writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
  }
  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  return {
    materialId: "mat-harbor-oak-logo-v1",
    role: "logo",
    relativePath: LOGO_REL,
    contentSha256,
    approvedIdentitySourceId: harborOakIdentityLock.approvedLogoVariantIds[0],
  };
}

export function buildHarborOakPromoCampaignSetTruth(input: {
  repoRoot: string;
  campaignId?: string;
  jobId?: string;
  dispatchId?: string;
}): PromoProjectTruth {
  const campaignId =
    input.campaignId ?? "camp-design-promo-graphics-proof-harbor";
  const jobId = input.jobId ?? `${campaignId}::${DESIGN_RENDERER_PROMO_SKU}`;
  const dispatchId = input.dispatchId ?? `dd:${jobId}`;
  const logo = ensureHarborOakPromoLogoMaterial(input.repoRoot);
  const fx = designFixtureA;
  const colors = fx.approvedColors;
  const campaign = harborOakIdentityLock.campaign;

  return {
    campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    fixtureId: fx.id,
    label: `${fx.label} — promotion-graphics two-asset set`,
    outputMode: "certification_fixture",
    businessName: harborOakIdentityLock.businessName,
    wordmark: harborOakIdentityLock.requiredWordmark,
    descriptor: harborOakIdentityLock.approvedDescriptors[0]!,
    headline: "Spring service you can trust",
    offerName: campaign.offerName,
    priceDisplay: campaign.priceToken,
    wasPriceDisplay: "was $249",
    dateWindow: "March 10 – April 15, 2026",
    body: "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
    cta: fx.cta,
    phone: fx.phone,
    webDisplay: "harborandoak.example/book-tuneup",
    webUrl: fx.ctaUrl,
    disclaimer:
      "CERTIFICATION FIXTURE / INTERNAL TEST — not a live customer. Two coordinated campaign graphics proof.",
    brandColors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      muted: "#5A6570",
    },
    materials: [logo],
    approvedLogoVariantId: harborOakIdentityLock.approvedLogoVariantIds[0]!,
    requiredTextTokens: [
      campaign.priceToken,
      "March 10",
      "April 15",
      "2026",
      "Harbor",
    ],
    prohibitedClaimPatterns: [...fx.prohibitedClaims],
    assets: [
      {
        assetId: "spring-tuneup-social-square",
        authorizedPurpose: "Social feed placement (square)",
        plateId: PROMO_SQUARE_PLATE.plateId,
        canvas: {
          widthPx: PROMO_SQUARE_PLATE.widthPx,
          heightPx: PROMO_SQUARE_PLATE.heightPx,
        },
        layoutVariant: "compact_square",
      },
      {
        assetId: "spring-tuneup-print-portrait",
        authorizedPurpose: "Print / in-store poster (portrait)",
        plateId: PROMO_PORTRAIT_PLATE.plateId,
        canvas: {
          widthPx: PROMO_PORTRAIT_PLATE.widthPx,
          heightPx: PROMO_PORTRAIT_PLATE.heightPx,
        },
        layoutVariant: "tall_portrait",
      },
    ],
    liveIntakePerAssetPurposeGap: LIVE_INTAKE_PER_ASSET_PURPOSE_GAP,
  };
}
