/**
 * Harbor & Oak ma-001 mixed pack fixtures (INTERNAL TEST).
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { buildHarborOakBusinessCardProjectTruth } from "./card-fixtures";
import { HARBOR_OAK_LOGO_SVG, buildHarborOakFlyerProjectTruth } from "./fixtures";
import { producerFamilyForKind } from "./ma-001-contracts";
import type {
  Ma001PackProjectTruth,
  Ma001PlannedPackMember,
  Ma001PromotionGraphicMemberTruth,
} from "./ma-001-types";
import { DESIGN_RENDERER_MA_001_SKU } from "./ma-001-types";
import {
  PROMO_SQUARE_PLATE,
  type PromoMaterialRef,
} from "./promo-types";
import { buildHarborOakServiceSheetProjectTruthMax } from "./service-sheet-fixtures";

export const MA_001_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MA-001-PROOF-1" as const;

export const MA_001_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-ma-001-proof-1/artifacts/ma-001" as const;

const LOGO_REL =
  `${MA_001_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

export function ensureHarborOakMa001LogoMaterial(
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

function buildPromoMemberTruth(
  repoRoot: string,
): Ma001PromotionGraphicMemberTruth {
  const logo = ensureHarborOakMa001LogoMaterial(repoRoot);
  const fx = designFixtureA;
  const colors = fx.approvedColors;
  const campaign = harborOakIdentityLock.campaign;
  return {
    assetId: "pack-spring-tuneup-social-square",
    authorizedPurpose: "Pack campaign graphic — social square",
    plateId: PROMO_SQUARE_PLATE.plateId,
    canvas: {
      widthPx: PROMO_SQUARE_PLATE.widthPx,
      heightPx: PROMO_SQUARE_PLATE.heightPx,
    },
    layoutVariant: "compact_square",
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
      "CERTIFICATION FIXTURE / INTERNAL TEST — ma-001 single promotion_graphic member.",
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
  };
}

function member(
  partial: Omit<Ma001PlannedPackMember, "producerFamily"> & {
    kind: "flyer" | "business_card" | "service_sheet" | "promotion_graphic";
  },
): Ma001PlannedPackMember {
  return {
    ...partial,
    producerFamily: producerFamilyForKind(partial.kind),
  };
}

/**
 * Maximum-load mixed pack: flyer · business_card · service_sheet · promotion_graphic.
 */
export function buildHarborOakMa001MaxMixedPackTruth(input: {
  repoRoot: string;
  campaignId?: string;
  jobId?: string;
  dispatchId?: string;
}): Ma001PackProjectTruth {
  const campaignId =
    input.campaignId ?? "camp-design-ma-001-proof-harbor-mixed";
  const jobId = input.jobId ?? `${campaignId}::${DESIGN_RENDERER_MA_001_SKU}`;
  const dispatchId = input.dispatchId ?? `dd:${jobId}`;
  const campaign = harborOakIdentityLock.campaign;

  const flyer = buildHarborOakFlyerProjectTruth({
    repoRoot: input.repoRoot,
    campaignId,
    jobId: `${jobId}::member-flyer`,
    dispatchId: `${dispatchId}::flyer`,
  });
  const card = buildHarborOakBusinessCardProjectTruth({
    repoRoot: input.repoRoot,
    campaignId,
    jobId: `${jobId}::member-card`,
    dispatchId: `${dispatchId}::card`,
  });
  const sheetBase = buildHarborOakServiceSheetProjectTruthMax({
    repoRoot: input.repoRoot,
  });
  const sheet = {
    ...sheetBase,
    campaignId,
    jobId: `${jobId}::member-sheet`,
    dispatchId: `${dispatchId}::sheet`,
  };
  const promo = buildPromoMemberTruth(input.repoRoot);

  const plannedPackMembers = [
    member({
      memberId: "pack-member-1-flyer",
      kind: "flyer",
      order: 1,
      memberPurpose: "Launch flyer — Spring Tune-Up offer",
      agreedPlateId: "cert-portrait-1024x1536",
    }),
    member({
      memberId: "pack-member-2-business-card",
      kind: "business_card",
      order: 2,
      memberPurpose: "Contact card — Jordan Hale",
      agreedPlateId: "cert-landscape-1536x1024",
    }),
    member({
      memberId: "pack-member-3-service-sheet",
      kind: "service_sheet",
      order: 3,
      memberPurpose: "Service list handout",
      agreedPlateId: "cert-portrait-1024x1536",
    }),
    member({
      memberId: "pack-member-4-promotion-graphic",
      kind: "promotion_graphic",
      order: 4,
      memberPurpose: "Campaign social square graphic",
      agreedPlateId: PROMO_SQUARE_PLATE.plateId,
    }),
  ] as const;

  return {
    campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_MA_001_SKU,
    fixtureId: designFixtureA.id,
    label: "Harbor & Oak — ma-001 max mixed pack (4 members)",
    outputMode: "certification_fixture",
    lockedPackMemberCount: 4,
    plannedPackMembers,
    campaignFocus: campaign.offerName,
    businessName: harborOakIdentityLock.businessName,
    offerName: campaign.offerName,
    priceDisplay: campaign.priceToken,
    memberTruthById: {
      "pack-member-1-flyer": { kind: "flyer", truth: flyer },
      "pack-member-2-business-card": { kind: "business_card", truth: card },
      "pack-member-3-service-sheet": { kind: "service_sheet", truth: sheet },
      "pack-member-4-promotion-graphic": {
        kind: "promotion_graphic",
        truth: promo,
      },
    },
  };
}

/** N=1 structural fixture (flyer only). */
export function buildHarborOakMa001N1FlyerPackTruth(input: {
  repoRoot: string;
  campaignId?: string;
}): Ma001PackProjectTruth {
  const base = buildHarborOakMa001MaxMixedPackTruth({
    ...input,
    campaignId: input.campaignId ?? "camp-design-ma-001-proof-n1",
  });
  const m = base.plannedPackMembers[0]!;
  return {
    ...base,
    campaignId: input.campaignId ?? "camp-design-ma-001-proof-n1",
    jobId: `${input.campaignId ?? "camp-design-ma-001-proof-n1"}::ma-001`,
    lockedPackMemberCount: 1,
    plannedPackMembers: [m],
    label: "Harbor & Oak — ma-001 N=1 flyer pack",
    memberTruthById: {
      [m.memberId]: base.memberTruthById[m.memberId]!,
    },
  };
}

/** Composition with unsupported kind — must fail closed. */
export function buildMa001UnsupportedKindPackTruth(input: {
  repoRoot: string;
}): Ma001PackProjectTruth {
  const base = buildHarborOakMa001N1FlyerPackTruth(input);
  return {
    ...base,
    campaignId: "camp-design-ma-001-proof-unsupported",
    jobId: "camp-design-ma-001-proof-unsupported::ma-001",
    label: "Unsupported kind fail-closed fixture",
    plannedPackMembers: [
      {
        memberId: "pack-member-bad-poster",
        kind: "poster",
        order: 1,
        memberPurpose: "Should fail closed",
        producerFamily: "invented-poster",
      },
    ],
    memberTruthById: {
      "pack-member-bad-poster": base.memberTruthById["pack-member-1-flyer"]!,
    },
  };
}
