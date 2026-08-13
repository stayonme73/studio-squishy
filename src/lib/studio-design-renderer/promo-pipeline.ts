/**
 * End-to-end promotion-graphics campaign-set pipeline — proof only.
 * Does not retarget primaryTool. Does not alter sealed lanes.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

import {
  briefForSku,
  gateDesignQualityForQaPass,
  passAttestations,
} from "@/lib/studio-kitchen-production";
import type {
  DesignQualityBrief,
  DesignQualityJudgmentAttestations,
  DesignQualitySubmission,
} from "@/lib/studio-kitchen-production/design-quality";

import { captureFlyerExports } from "./capture";
import { persistPromoCampaignSetArtifacts } from "./promo-bind";
import { isDesignRendererPromoSku } from "./promo-contracts";
import { PROMO_PROOF_ARTIFACT_ROOT } from "./promo-fixtures";
import {
  assertPromoRequiredTruth,
  reasonPromoCampaignSetDeterministic,
} from "./promo-reason";
import {
  declaredTextFromPromoAsset,
  renderPromoAssetHtml,
} from "./promo-render-html";
import { evaluatePromoSetConsistency } from "./promo-set-qa";
import type {
  PromoCampaignSetSpec,
  PromoOutputMode,
  PromoProjectTruth,
  PromoRendererPipelineResult,
} from "./promo-types";
import { PROMO_PORTRAIT_PLATE, PROMO_SQUARE_PLATE } from "./promo-types";
import { validatePromoCampaignSetSpec } from "./promo-validate";

function fail(
  mode: PromoOutputMode,
  code: Extract<PromoRendererPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<PromoRendererPipelineResult, { ok: false }>>,
): PromoRendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "PROMOTION_GRAPHICS_RENDERER_JOB_FAIL"
        : "PROMOTION_GRAPHICS_RENDERER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
    ...extra,
  };
}

function webHostToken(webDisplay?: string): string {
  if (!webDisplay?.trim()) return "";
  return webDisplay.replace(/^https?:\/\//i, "").split("/")[0] ?? webDisplay;
}

function offerNameRequiredTokensForTruth(
  truth: PromoProjectTruth,
): string[] {
  // Certification fixtures keep Harbor & Oak locked offer-name tokens.
  if (truth.outputMode === "certification_fixture") {
    return ["Tune-Up", "Drain Clear"];
  }
  // Customer jobs: only tokens from authoritative offerName — never cert leakage.
  return truth.offerName
    .split(/[\s+/—–-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3)
    .slice(0, 4);
}

function buildPromoBrief(
  truth: PromoProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const base = briefForSku("v2-rtu-promotion-graphics", "a");
  const host = webHostToken(truth.webDisplay);
  const dateTokens =
    truth.outputMode === "certification_fixture"
      ? ["March 10", "April 15", "2026"]
      : truth.dateWindow
          .split(/[–—,]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);
  return {
    ...base,
    skuId: truth.skuId,
    fixtureId: truth.fixtureId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    ctaTokens: [truth.phone, host, truth.cta].filter(Boolean),
    requireCta: true,
    minAssets: 2,
    maxAssets: 2,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    // Mixed plates — do not assert a single expected W×H.
    expectedWidthPx: undefined,
    expectedHeightPx: undefined,
    dimensionTolerancePx: 40,
    brandIdentity: {
      businessName: truth.businessName,
      requiredWordmark: truth.wordmark,
      approvedDescriptors: [truth.descriptor],
      prohibitedDescriptors: [],
      approvedLogoVariantIds: [truth.approvedLogoVariantId],
    },
    campaignTruth: {
      offerName: truth.offerName,
      offerNameRequiredTokens: offerNameRequiredTokensForTruth(truth),
      priceToken: truth.priceDisplay,
      dateTokens,
      phone: truth.phone,
      urlTokens: [host].filter(Boolean),
      prohibitedOfferAliases: [],
    },
    contactSemantics: [
      { value: truth.phone, expectedKind: "phone" as const },
      ...(host ? [{ value: host, expectedKind: "web" as const }] : []),
    ],
    requireLogoVariant: true,
    requireMultiAssetConsistency: true,
    requireArtifactBinding: true,
    artifactRepoRoot: repoRoot,
  };
}

export async function runPromoRendererPipeline(input: {
  repoRoot: string;
  truth: PromoProjectTruth;
  artifactRootRel: string;
  specOverride?: PromoCampaignSetSpec;
  forceQaFail?: boolean;
  /** Simulate Asset A capture failure — set must fail closed (no partial success). */
  forceFirstAssetExportFail?: boolean;
  /** Simulate Asset B capture failure after Asset A succeeds — set must fail closed. */
  forceSecondAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
}): Promise<PromoRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererPromoSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in promotion-graphics renderer scope`,
    );
  }

  try {
    assertPromoRequiredTruth(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    if (msg.startsWith("INVALID_PLATE")) {
      return fail(mode, "INVALID_PLATE", msg);
    }
    return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
  }

  let spec: PromoCampaignSetSpec;
  try {
    spec =
      input.specOverride ??
      reasonPromoCampaignSetDeterministic(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    if (msg.startsWith("INVALID_PLATE")) {
      return fail(mode, "INVALID_PLATE", msg);
    }
    if (msg.startsWith("MISSING_REQUIRED_TRUTH")) {
      return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
    }
    return fail(mode, "RENDER_FAILURE", msg);
  }

  const validated = validatePromoCampaignSetSpec(
    input.repoRoot,
    spec,
    input.truth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
  }

  const staging = path.join(tmpdir(), `studio-promo-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });

  const assetRenders: {
    asset: (typeof spec.assets)[number];
    html: string;
    pngAbsolutePath: string;
    pdfAbsolutePath: string;
    overflowOk: boolean;
    overflowDetail: string;
    individualQaOk: boolean;
  }[] = [];

  const declaredTextByAsset: Record<string, string> = {};

  for (let i = 0; i < spec.assets.length; i++) {
    const asset = spec.assets[i]!;
    let html: string;
    try {
      html = renderPromoAssetHtml(input.repoRoot, spec, asset);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
        return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
      }
      return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
    }

    declaredTextByAsset[asset.assetId] = declaredTextFromPromoAsset(asset);

    if (input.forceFirstAssetExportFail && i === 0) {
      return fail(
        mode,
        "EXPORT_FAILURE",
        `Asset A (${asset.assetId}) export forced fail — set incomplete`,
        { designSpec: spec },
      );
    }

    if (input.forceSecondAssetExportFail && i === 1) {
      return fail(
        mode,
        "PARTIAL_SET_FAILURE",
        `Asset A (${spec.assets[0]!.assetId}) staged but Asset B export forced fail — set incomplete`,
        { designSpec: spec },
      );
    }

    const safe = asset.assetId.replace(/[^a-zA-Z0-9_-]+/g, "-");
    const stagingHtml = path.join(staging, `${safe}.html`);
    const stagingPng = path.join(staging, `${safe}.png`);
    const stagingPdf = path.join(staging, `${safe}.pdf`);
    writeFileSync(stagingHtml, html, "utf8");

    try {
      const capture = await captureFlyerExports({
        htmlAbsolutePath: stagingHtml,
        pngAbsolutePath: stagingPng,
        pdfAbsolutePath: stagingPdf,
        widthPx: asset.canvas.widthPx,
        heightPx: asset.canvas.heightPx,
      });
      if (!capture.overflowOk) {
        return fail(
          mode,
          "PARTIAL_SET_FAILURE",
          `Asset ${asset.assetId} overflow/clip: ${capture.overflowDetail}`,
          { designSpec: spec },
        );
      }
      assetRenders.push({
        asset,
        html,
        pngAbsolutePath: stagingPng,
        pdfAbsolutePath: stagingPdf,
        overflowOk: capture.overflowOk,
        overflowDetail: capture.overflowDetail,
        individualQaOk: false, // set after design QA
      });
    } catch (e) {
      return fail(
        mode,
        i === 0 ? "EXPORT_FAILURE" : "PARTIAL_SET_FAILURE",
        e instanceof Error ? e.message : String(e),
        { designSpec: spec },
      );
    }
  }

  if (assetRenders.length !== 2) {
    return fail(mode, "PARTIAL_SET_FAILURE", "Incomplete asset render set", {
      designSpec: spec,
    });
  }

  // Persist under a provisional setQaOk=false until gates pass; rewrite identity after QA.
  // We persist only after set-level gates to avoid customer-ready partial identity.
  // Staging files exist; persist happens after QA + set consistency.

  let setEval = evaluatePromoSetConsistency({
    truth: input.truth,
    spec,
    declaredTextByAsset,
  });
  if (input.forceSetConsistencyFail) {
    setEval = {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Forced set-level consistency failure for fail-closed proof",
    };
  }
  if (!setEval.ok) {
    return fail(mode, setEval.code, setEval.message, { designSpec: spec });
  }

  // Persist with individualQaOk provisional true only after design QA below —
  // first persist after building submission paths: we need paths for QA binding.
  const identityDraft = persistPromoCampaignSetArtifacts({
    repoRoot: input.repoRoot,
    truth: input.truth,
    spec,
    artifactRootRel: input.artifactRootRel,
    assetRenders: assetRenders.map((r) => ({
      ...r,
      individualQaOk: false,
    })),
    setQaOk: false,
  });

  const logoId = input.truth.approvedLogoVariantId;
  const host = webHostToken(input.truth.webDisplay);
  const brief = buildPromoBrief(input.truth, input.repoRoot);
  const submission: DesignQualitySubmission = {
    artifacts: identityDraft.assets.map((a) => ({
      id: a.assetId,
      relativePath: a.pngRelativePath,
      version: "final" as const,
      widthPx: a.widthPx,
      heightPx: a.heightPx,
      extension: "png",
      contentSha256: a.pngContentSha256,
      approvedIdentitySourceId: logoId,
      declaredText: declaredTextByAsset[a.assetId] ?? "",
      declaredLogoVariantId: logoId,
      isCampaignOfferAsset: true,
      declaredContactPresentations: [
        { value: input.truth.phone, presentedAs: "phone" as const },
        ...(host ? [{ value: host, presentedAs: "web" as const }] : []),
      ],
      declaredImageryTheme: "hvac_home_services",
    })),
  };

  let attestations: DesignQualityJudgmentAttestations = {
    ...passAttestations("a"),
    multiAssetConsistencyReviewed: true,
    notes: `Promotion-graphics set QA for ${input.truth.businessName}: ${identityDraft.assets
      .map(
        (a) =>
          `${a.assetId} ${a.widthPx}x${a.heightPx} purpose="${a.authorizedPurpose}" sha256 ${a.pngContentSha256} at ${a.pngRelativePath}`,
      )
      .join("; ")}; setFingerprint=${identityDraft.sharedSpecFingerprint}. Coordinated set with layout variation; Live intake gap documented.`,
  };

  if (input.forceQaFail) {
    attestations = {
      ...attestations,
      hierarchyReviewed: false,
      multiAssetConsistencyReviewed: false,
      notes: "Forced QA failure for fail-closed proof.",
    };
  }

  const gated = gateDesignQualityForQaPass({
    brief,
    submission,
    attestations,
  });

  const qaPath = path.join(
    input.repoRoot,
    identityDraft.designSpecRelativePath.replace(
      /campaign-set-design-spec\.json$/i,
      "campaign-set.design-qa.json",
    ),
  );

  const bothIndividualOk = gated.ok;
  const setQaOk = gated.ok && setEval.ok;

  // Rewrite identity with final QA flags (same version directory).
  const identity = {
    ...identityDraft,
    setQaOk,
    assets: identityDraft.assets.map((a) => ({
      ...a,
      individualQaOk: bothIndividualOk,
    })) as typeof identityDraft.assets,
  };
  writeFileSync(
    path.join(
      input.repoRoot,
      identityDraft.designSpecRelativePath.replace(
        /campaign-set-design-spec\.json$/i,
        "artifact-identity.json",
      ),
    ),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "current-identity.json"),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );

  writeFileSync(
    qaPath,
    `${JSON.stringify(
      {
        ok: setQaOk,
        individualQaOk: bothIndividualOk,
        setConsistency: setEval,
        error: gated.ok ? undefined : gated.error,
        evaluation: gated.evaluation,
        identity,
        outputMode: mode,
        liveIntakePerAssetPurposeGap: input.truth.liveIntakePerAssetPurposeGap,
        squarePlateProven: {
          plateId: PROMO_SQUARE_PLATE.plateId,
          widthPx: PROMO_SQUARE_PLATE.widthPx,
          heightPx: PROMO_SQUARE_PLATE.heightPx,
        },
        portraitPlateReused: {
          plateId: PROMO_PORTRAIT_PLATE.plateId,
          widthPx: PROMO_PORTRAIT_PLATE.widthPx,
          heightPx: PROMO_PORTRAIT_PLATE.heightPx,
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (!gated.ok) {
    return fail(mode, "QA_FAILURE", gated.error, {
      designSpec: spec,
      identity,
    });
  }

  return {
    ok: true,
    verdict:
      mode === "customer"
        ? "PROMOTION_GRAPHICS_RENDERER_JOB_PASS"
        : "PROMOTION_GRAPHICS_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    qaOk: true,
    setQaOk: true,
    qaSummary: `${gated.evaluation.summary} | ${setEval.summary}`,
    declaredTextByAsset,
    outputMode: mode,
    squarePlateProven: {
      plateId: PROMO_SQUARE_PLATE.plateId,
      widthPx: PROMO_SQUARE_PLATE.widthPx,
      heightPx: PROMO_SQUARE_PLATE.heightPx,
    },
    portraitPlateReused: {
      plateId: PROMO_PORTRAIT_PLATE.plateId,
      widthPx: PROMO_PORTRAIT_PLATE.widthPx,
      heightPx: PROMO_PORTRAIT_PLATE.heightPx,
    },
  };
}

export async function runPromoProofPipeline(input: {
  repoRoot: string;
  truth: PromoProjectTruth;
  artifactRootRel?: string;
  forceQaFail?: boolean;
  forceFirstAssetExportFail?: boolean;
  forceSecondAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
}): Promise<PromoRendererPipelineResult> {
  if (input.truth.outputMode !== "certification_fixture") {
    return fail(
      input.truth.outputMode,
      "MISSING_REQUIRED_TRUTH",
      "Proof pipeline requires outputMode certification_fixture",
    );
  }
  return runPromoRendererPipeline({
    repoRoot: input.repoRoot,
    truth: input.truth,
    artifactRootRel: input.artifactRootRel ?? PROMO_PROOF_ARTIFACT_ROOT,
    forceQaFail: input.forceQaFail,
    forceFirstAssetExportFail: input.forceFirstAssetExportFail,
    forceSecondAssetExportFail: input.forceSecondAssetExportFail,
    forceSetConsistencyFail: input.forceSetConsistencyFail,
  });
}

export async function runPromoJobPipeline(input: {
  repoRoot: string;
  truth: PromoProjectTruth;
  artifactRootRel: string;
  specOverride?: PromoCampaignSetSpec;
  forceQaFail?: boolean;
  forceFirstAssetExportFail?: boolean;
  forceSecondAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
}): Promise<PromoRendererPipelineResult> {
  return runPromoRendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "customer" },
    artifactRootRel: input.artifactRootRel,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
    forceFirstAssetExportFail: input.forceFirstAssetExportFail,
    forceSecondAssetExportFail: input.forceSecondAssetExportFail,
    forceSetConsistencyFail: input.forceSetConsistencyFail,
  });
}
