/**
 * Single promotion_graphic pack-member adapter.
 * Reuses sealed promo layout reasoner + HTML render + capture + design QA.
 * Does NOT call runPromo*Pipeline (exact-two set). Does NOT render two graphics and discard one.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

import {
  gateDesignQualityForQaPass,
  passAttestations,
} from "@/lib/studio-kitchen-production";
import type {
  DesignQualityBrief,
  DesignQualitySubmission,
} from "@/lib/studio-kitchen-production/design-quality";

import { nextRenderVersion, sha256File } from "./bind";
import { captureFlyerExports } from "./capture";
import { resolvePromoPlate } from "./promo-contracts";
import { reasonPromoGraphicAsset } from "./promo-reason";
import {
  declaredTextFromPromoAsset,
  renderPromoAssetHtml,
} from "./promo-render-html";
import {
  DESIGN_RENDERER_PROMO_SKU,
  PROMO_DESIGN_SPEC_VERSION,
  PROMO_LANDSCAPE_PLATE,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  type PromoAssetSpec,
  type PromoCampaignSetSpec,
  type PromoProjectTruth,
} from "./promo-types";
import type {
  Ma001MemberArtifactRef,
  Ma001MemberResult,
  Ma001PromotionGraphicMemberTruth,
} from "./ma-001-types";

function webHostToken(webDisplay?: string): string {
  if (!webDisplay?.trim()) return "";
  return webDisplay.replace(/^https?:\/\//i, "").split("/")[0] ?? webDisplay;
}

function toHostPromoTruth(
  member: Ma001PromotionGraphicMemberTruth,
  ids: { campaignId: string; jobId: string; dispatchId: string },
): PromoProjectTruth {
  // Host shape for sealed reasoner/render helpers. assets tuple is a type fiction:
  // only the first asset is reasoned and rendered. Second slot is a typed placeholder
  // that is NEVER rendered or persisted (adapter forbids dual render).
  const asset = {
    assetId: member.assetId,
    authorizedPurpose: member.authorizedPurpose,
    plateId: member.plateId,
    canvas: member.canvas,
    layoutVariant: member.layoutVariant,
  };
  const placeholder = {
    ...asset,
    assetId: `${member.assetId}__adapter-placeholder-never-rendered`,
    authorizedPurpose: "ADAPTER_PLACEHOLDER_NEVER_RENDERED",
    layoutVariant:
      member.layoutVariant === "compact_square"
        ? ("tall_portrait" as const)
        : ("compact_square" as const),
    plateId:
      member.layoutVariant === "compact_square"
        ? PROMO_PORTRAIT_PLATE.plateId
        : PROMO_SQUARE_PLATE.plateId,
    canvas:
      member.layoutVariant === "compact_square"
        ? {
            widthPx: PROMO_PORTRAIT_PLATE.widthPx,
            heightPx: PROMO_PORTRAIT_PLATE.heightPx,
          }
        : {
            widthPx: PROMO_SQUARE_PLATE.widthPx,
            heightPx: PROMO_SQUARE_PLATE.heightPx,
          },
  };
  return {
    campaignId: ids.campaignId,
    jobId: ids.jobId,
    dispatchId: ids.dispatchId,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    fixtureId: "ma-001-promo-member-adapter",
    label: "ma-001 single promotion_graphic adapter host",
    outputMode: "certification_fixture",
    businessName: member.businessName,
    wordmark: member.wordmark,
    descriptor: member.descriptor,
    headline: member.headline,
    offerName: member.offerName,
    priceDisplay: member.priceDisplay,
    wasPriceDisplay: member.wasPriceDisplay,
    dateWindow: member.dateWindow,
    body: member.body,
    cta: member.cta,
    phone: member.phone,
    webDisplay: member.webDisplay,
    webUrl: member.webUrl,
    disclaimer: member.disclaimer,
    brandColors: member.brandColors,
    materials: member.materials,
    approvedLogoVariantId: member.approvedLogoVariantId,
    requiredTextTokens: member.requiredTextTokens,
    prohibitedClaimPatterns: member.prohibitedClaimPatterns,
    assets: [asset, placeholder],
    liveIntakePerAssetPurposeGap:
      "ma-001 single promotion_graphic adapter — not the sealed exact-two promo SKU.",
  };
}

export type Ma001PromoMemberAdapterResult =
  | {
      ok: true;
      member: Ma001MemberResult;
    }
  | {
      ok: false;
      failureCode:
        | "WRONG_PLATE"
        | "MEMBER_RENDER_FAILURE"
        | "MEMBER_QA_FAILURE"
        | "MISSING_REQUIRED_TRUTH";
      message: string;
    };

/**
 * Produce exactly one promotion graphic for one pack member.
 */
export async function runMa001PromotionGraphicMemberAdapter(input: {
  repoRoot: string;
  memberId: string;
  order: number;
  memberPurpose: string;
  memberTruth: Ma001PromotionGraphicMemberTruth;
  artifactRootRel: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  forceQaFail?: boolean;
}): Promise<Ma001PromoMemberAdapterResult> {
  const t = input.memberTruth;

  if (t.plateId === PROMO_LANDSCAPE_PLATE.plateId) {
    return {
      ok: false,
      failureCode: "WRONG_PLATE",
      message:
        "INVALID_PLATE: promotion_graphic pack member Landscape is fail-closed (square or portrait only)",
    };
  }
  if (
    t.plateId !== PROMO_SQUARE_PLATE.plateId &&
    t.plateId !== PROMO_PORTRAIT_PLATE.plateId
  ) {
    return {
      ok: false,
      failureCode: "WRONG_PLATE",
      message: `INVALID_PLATE: unsupported plate ${t.plateId}`,
    };
  }

  let plate;
  try {
    plate = resolvePromoPlate(t.plateId);
  } catch (e) {
    return {
      ok: false,
      failureCode: "WRONG_PLATE",
      message: e instanceof Error ? e.message : String(e),
    };
  }
  if (
    t.canvas.widthPx !== plate.widthPx ||
    t.canvas.heightPx !== plate.heightPx
  ) {
    return {
      ok: false,
      failureCode: "WRONG_PLATE",
      message: "Canvas does not match agreed plate",
    };
  }

  const host = toHostPromoTruth(t, {
    campaignId: input.campaignId,
    jobId: input.jobId,
    dispatchId: input.dispatchId,
  });

  let assetSpec: PromoAssetSpec;
  try {
    assetSpec = reasonPromoGraphicAsset(host, host.assets[0]!);
  } catch (e) {
    return {
      ok: false,
      failureCode: "MISSING_REQUIRED_TRUTH",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  // Spec used only for materials + single asset render — never persist dual set.
  const singleSpec = {
    specVersion: PROMO_DESIGN_SPEC_VERSION,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    colors: { ...t.brandColors },
    materials: [...t.materials],
    sharedCampaign: {
      businessName: t.businessName,
      wordmark: t.wordmark,
      offerName: t.offerName,
      priceDisplay: t.priceDisplay,
      dateWindow: t.dateWindow,
      phone: t.phone,
      webDisplay: t.webDisplay,
      cta: t.cta,
    },
    assets: [assetSpec, assetSpec],
    reasoningMode: "deterministic_constrained" as const,
  } satisfies PromoCampaignSetSpec;

  let html: string;
  try {
    html = renderPromoAssetHtml(
      input.repoRoot,
      singleSpec,
      assetSpec,
    );
  } catch (e) {
    return {
      ok: false,
      failureCode: "MEMBER_RENDER_FAILURE",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const staging = path.join(tmpdir(), `studio-ma001-promo-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  const safe = t.assetId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const stagingHtml = path.join(staging, `${safe}.html`);
  const stagingPng = path.join(staging, `${safe}.png`);
  const stagingPdf = path.join(staging, `${safe}.pdf`);
  writeFileSync(stagingHtml, html, "utf8");

  try {
    const capture = await captureFlyerExports({
      htmlAbsolutePath: stagingHtml,
      pngAbsolutePath: stagingPng,
      pdfAbsolutePath: stagingPdf,
      widthPx: t.canvas.widthPx,
      heightPx: t.canvas.heightPx,
    });
    if (!capture.overflowOk) {
      return {
        ok: false,
        failureCode: "MEMBER_RENDER_FAILURE",
        message: `overflow/clip: ${capture.overflowDetail}`,
      };
    }
  } catch (e) {
    return {
      ok: false,
      failureCode: "MEMBER_RENDER_FAILURE",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const renderVersion = nextRenderVersion(
    input.repoRoot,
    input.artifactRootRel,
  );
  const dirRel = `${input.artifactRootRel}/renders/v${renderVersion}`;
  const dirAbs = path.join(input.repoRoot, dirRel);
  mkdirSync(dirAbs, { recursive: true });

  const htmlRel = `${dirRel}/${safe}.html`;
  const pngRel = `${dirRel}/${safe}.png`;
  const pdfRel = `${dirRel}/${safe}.pdf`;
  const { copyFileSync } = await import("fs");
  copyFileSync(stagingHtml, path.join(input.repoRoot, htmlRel));
  copyFileSync(stagingPng, path.join(input.repoRoot, pngRel));
  copyFileSync(stagingPdf, path.join(input.repoRoot, pdfRel));

  const pngSha = sha256File(path.join(input.repoRoot, pngRel));
  const pdfSha = sha256File(path.join(input.repoRoot, pdfRel));
  const declaredText = declaredTextFromPromoAsset(assetSpec);
  const hostTok = webHostToken(t.webDisplay);

  const brief: DesignQualityBrief = {
    skuId: "ma-001",
    fixtureId: "ma-001-promo-member",
    requiredTextTokens: [...t.requiredTextTokens],
    prohibitedClaimPatterns: [...t.prohibitedClaimPatterns],
    ctaTokens: [t.phone, hostTok, t.cta].filter(Boolean),
    requireCta: true,
    minAssets: 1,
    maxAssets: 1,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: t.canvas.widthPx,
    expectedHeightPx: t.canvas.heightPx,
    dimensionTolerancePx: 40,
    brandIdentity: {
      businessName: t.businessName,
      requiredWordmark: t.wordmark,
      approvedDescriptors: [t.descriptor],
      prohibitedDescriptors: [],
      approvedLogoVariantIds: [t.approvedLogoVariantId],
    },
    campaignTruth: {
      offerName: t.offerName,
      offerNameRequiredTokens: ["Tune-Up", "Drain Clear"],
      priceToken: t.priceDisplay,
      dateTokens: ["March 10", "April 15", "2026"],
      phone: t.phone,
      urlTokens: [hostTok].filter(Boolean),
      prohibitedOfferAliases: [],
    },
    contactSemantics: [
      { value: t.phone, expectedKind: "phone" as const },
      ...(hostTok ? [{ value: hostTok, expectedKind: "web" as const }] : []),
    ],
    requireLogoVariant: true,
    requireMultiAssetConsistency: false,
    requireArtifactBinding: true,
    artifactRepoRoot: input.repoRoot,
  };

  const submission: DesignQualitySubmission = {
    artifacts: [
      {
        id: t.assetId,
        relativePath: pngRel,
        version: "final",
        widthPx: t.canvas.widthPx,
        heightPx: t.canvas.heightPx,
        extension: "png",
        contentSha256: pngSha,
        approvedIdentitySourceId: t.approvedLogoVariantId,
        declaredText,
        declaredLogoVariantId: t.approvedLogoVariantId,
        isCampaignOfferAsset: true,
        declaredContactPresentations: [
          { value: t.phone, presentedAs: "phone" as const },
          ...(hostTok
            ? [{ value: hostTok, presentedAs: "web" as const }]
            : []),
        ],
        declaredImageryTheme: "hvac_home_services",
      },
    ],
  };

  let attestations = {
    ...passAttestations("a"),
    multiAssetConsistencyReviewed: false,
    notes: `ma-001 single promotion_graphic adapter — one graphic only (${t.assetId}); png sha256 ${pngSha} at ${pngRel}; not sealed exact-two promo set.`,
  };
  if (input.forceQaFail) {
    attestations = {
      ...attestations,
      hierarchyReviewed: false,
      notes: "Forced QA failure",
    };
  }

  const gated = gateDesignQualityForQaPass({
    brief,
    submission,
    attestations,
  });

  const identityRel = `${dirRel}/member-identity.json`;
  writeFileSync(
    path.join(input.repoRoot, identityRel),
    `${JSON.stringify(
      {
        adapter: "ma-001-promotion-graphic-single",
        memberId: input.memberId,
        assetId: t.assetId,
        plateId: t.plateId,
        renderVersion,
        pngRelativePath: pngRel,
        pdfRelativePath: pdfRel,
        htmlRelativePath: htmlRel,
        pngContentSha256: pngSha,
        pdfContentSha256: pdfSha,
        producerQaOk: gated.ok,
        note: "Single graphic only — placeholder host asset never rendered",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, `${dirRel}/member.design-qa.json`),
    `${JSON.stringify(
      { ok: gated.ok, error: gated.ok ? undefined : gated.error, evaluation: gated.evaluation },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (!gated.ok) {
    return {
      ok: false,
      failureCode: "MEMBER_QA_FAILURE",
      message: gated.error,
    };
  }

  const artifacts: Ma001MemberArtifactRef[] = [
    {
      role: "png",
      relativePath: pngRel,
      contentSha256: pngSha,
      widthPx: t.canvas.widthPx,
      heightPx: t.canvas.heightPx,
    },
    {
      role: "pdf",
      relativePath: pdfRel,
      contentSha256: pdfSha,
      widthPx: t.canvas.widthPx,
      heightPx: t.canvas.heightPx,
    },
    {
      role: "html",
      relativePath: htmlRel,
      contentSha256: sha256File(path.join(input.repoRoot, htmlRel)),
    },
  ];

  return {
    ok: true,
    member: {
      memberId: input.memberId,
      kind: "promotion_graphic",
      order: input.order,
      producerFamily: "v2-rtu-promotion-graphics-single-adapter",
      agreedPlateId: t.plateId,
      memberPurpose: input.memberPurpose,
      producerQaOk: true,
      artifacts,
      producerIdentityRel: identityRel,
      producerRenderVersion: renderVersion,
    },
  };
}
