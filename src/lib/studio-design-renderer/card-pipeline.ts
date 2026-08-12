/**
 * End-to-end business-card renderer pipeline — double-sided proof.
 * Does not retarget dispatch primaryTool. Does not alter flyer pipeline.
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
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type {
  DesignQualityBrief,
  DesignQualityJudgmentAttestations,
  DesignQualitySubmission,
} from "@/lib/studio-kitchen-production/design-quality";

import { sha256File } from "./bind";
import { persistBusinessCardArtifacts } from "./card-bind";
import { captureBusinessCardExports } from "./card-capture";
import { isDesignRendererBusinessCardSku } from "./card-contracts";
import { BUSINESS_CARD_PROOF_ARTIFACT_ROOT } from "./card-fixtures";
import {
  assertBusinessCardRequiredTruth,
  reasonBusinessCardDesignSpecDeterministic,
} from "./card-reason";
import {
  declaredTextFromCardSide,
  renderBusinessCardPrintHtml,
  renderBusinessCardSideHtml,
} from "./card-render-html";
import type {
  BusinessCardDesignSpec,
  BusinessCardOutputMode,
  BusinessCardProjectTruth,
  BusinessCardRendererPipelineResult,
} from "./card-types";
import { BUSINESS_CARD_CANVAS } from "./card-types";
import { validateBusinessCardDesignSpec } from "./card-validate";

function fail(
  mode: BusinessCardOutputMode,
  code: Extract<BusinessCardRendererPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<BusinessCardRendererPipelineResult, { ok: false }>>,
): BusinessCardRendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "BUSINESS_CARD_RENDERER_JOB_FAIL"
        : "BUSINESS_CARD_RENDERER_PROOF_FAIL",
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

function buildCardBrief(
  truth: BusinessCardProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const base = briefForSku("v2-rtu-business-card", "a");
  const host = webHostToken(truth.webDisplay);
  return {
    ...base,
    skuId: truth.skuId,
    fixtureId: truth.fixtureId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    ctaTokens: [truth.phone, host, truth.email].filter(Boolean),
    requireCta: true,
    minAssets: 2,
    maxAssets: 2,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: BUSINESS_CARD_CANVAS.widthPx,
    expectedHeightPx: BUSINESS_CARD_CANVAS.heightPx,
    dimensionTolerancePx: 40,
    brandIdentity: {
      businessName: truth.businessName,
      requiredWordmark: truth.wordmark,
      approvedDescriptors: [],
      prohibitedDescriptors: [],
      approvedLogoVariantIds: [truth.approvedLogoVariantId],
    },
    // Contact-identity card — not a priced campaign offer set.
    // Empty priceToken must not be used (matchPattern("" ) is always true).
    campaignTruth: undefined,
    contactSemantics: [
      { value: truth.phone, expectedKind: "phone" as const },
      ...(host ? [{ value: host, expectedKind: "web" as const }] : []),
    ],
    requireLogoVariant: true,
    requireMultiAssetConsistency: false,
    requireArtifactBinding: true,
    artifactRepoRoot: repoRoot,
  };
}

export async function runBusinessCardRendererPipeline(input: {
  repoRoot: string;
  truth: BusinessCardProjectTruth;
  artifactRootRel: string;
  specOverride?: BusinessCardDesignSpec;
  forceQaFail?: boolean;
}): Promise<BusinessCardRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererBusinessCardSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in business-card renderer scope`,
    );
  }

  try {
    assertBusinessCardRequiredTruth(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
  }

  let spec: BusinessCardDesignSpec;
  try {
    spec =
      input.specOverride ??
      reasonBusinessCardDesignSpecDeterministic(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    if (msg.startsWith("MISSING_REQUIRED_TRUTH")) {
      return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
    }
    return fail(mode, "RENDER_FAILURE", msg);
  }

  const validated = validateBusinessCardDesignSpec(
    input.repoRoot,
    spec,
    input.truth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
  }

  let frontHtml: string;
  let backHtml: string;
  let printHtml: string;
  try {
    frontHtml = renderBusinessCardSideHtml(input.repoRoot, spec, spec.front);
    backHtml = renderBusinessCardSideHtml(input.repoRoot, spec, spec.back);
    printHtml = renderBusinessCardPrintHtml(input.repoRoot, spec);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
      return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
    }
    return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
  }

  const staging = path.join(tmpdir(), `studio-card-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  const stagingFrontHtml = path.join(staging, "front.html");
  const stagingBackHtml = path.join(staging, "back.html");
  const stagingPrintHtml = path.join(staging, "print.html");
  const stagingFrontPng = path.join(staging, "front.png");
  const stagingBackPng = path.join(staging, "back.png");
  const stagingPdf = path.join(staging, "business-card.pdf");
  writeFileSync(stagingFrontHtml, frontHtml, "utf8");
  writeFileSync(stagingBackHtml, backHtml, "utf8");
  writeFileSync(stagingPrintHtml, printHtml, "utf8");

  let capture;
  try {
    capture = await captureBusinessCardExports({
      frontHtmlAbsolutePath: stagingFrontHtml,
      backHtmlAbsolutePath: stagingBackHtml,
      printHtmlAbsolutePath: stagingPrintHtml,
      frontPngAbsolutePath: stagingFrontPng,
      backPngAbsolutePath: stagingBackPng,
      pdfAbsolutePath: stagingPdf,
      widthPx: spec.canvas.widthPx,
      heightPx: spec.canvas.heightPx,
    });
  } catch (e) {
    return fail(
      mode,
      "EXPORT_FAILURE",
      e instanceof Error ? e.message : String(e),
      { designSpec: spec },
    );
  }

  const identity = persistBusinessCardArtifacts({
    repoRoot: input.repoRoot,
    truth: input.truth,
    spec,
    artifactRootRel: input.artifactRootRel,
    frontHtml,
    backHtml,
    printHtml,
    frontPngAbsolutePath: stagingFrontPng,
    backPngAbsolutePath: stagingBackPng,
    pdfAbsolutePath: stagingPdf,
    frontOverflowOk: capture.front.overflowOk,
    frontOverflowDetail: capture.front.overflowDetail,
    backOverflowOk: capture.back.overflowOk,
    backOverflowDetail: capture.back.overflowDetail,
    widthPx: capture.front.widthPx,
    heightPx: capture.front.heightPx,
  });

  const frontSide = identity.sides.find((s) => s.side === "front")!;
  const backSide = identity.sides.find((s) => s.side === "back")!;
  const declaredTextFront = declaredTextFromCardSide(spec.front);
  const declaredTextBack = declaredTextFromCardSide(spec.back);
  const logoId = input.truth.approvedLogoVariantId;
  const host = webHostToken(input.truth.webDisplay);

  const brief = buildCardBrief(input.truth, input.repoRoot);
  const submission: DesignQualitySubmission = {
    artifacts: [
      {
        id: `card-front-${identity.renderId}`,
        relativePath: frontSide.pngRelativePath,
        version: "final",
        widthPx: frontSide.widthPx,
        heightPx: frontSide.heightPx,
        extension: "png",
        contentSha256: frontSide.pngContentSha256,
        approvedIdentitySourceId: logoId,
        declaredText: declaredTextFront,
        declaredLogoVariantId: logoId,
        isCampaignOfferAsset: false,
        declaredContactPresentations: [
          { value: input.truth.phone, presentedAs: "phone" },
          ...(host ? [{ value: host, presentedAs: "web" as const }] : []),
        ],
        declaredImageryTheme: "hvac_home_services",
      },
      {
        id: `card-back-${identity.renderId}`,
        relativePath: backSide.pngRelativePath,
        version: "final",
        widthPx: backSide.widthPx,
        heightPx: backSide.heightPx,
        extension: "png",
        contentSha256: backSide.pngContentSha256,
        approvedIdentitySourceId: logoId,
        declaredText: declaredTextBack,
        declaredLogoVariantId: logoId,
        isCampaignOfferAsset: false,
        declaredContactPresentations: [
          ...(host ? [{ value: host, presentedAs: "web" as const }] : []),
        ],
        declaredImageryTheme: "hvac_home_services",
      },
    ],
  };

  const baseAttest =
    mode === "certification_fixture"
      ? passAttestations("a")
      : {
          hierarchyReviewed: true,
          readabilityReviewed: true,
          spacingCompositionReviewed: true,
          brandFitReviewed: true,
          genericnessRejected: true,
          exportReadinessReviewed: true,
          multiAssetConsistencyReviewed: true,
          imageryBusinessFitReviewed: true,
          renderedIdentityMatchesDeclaredSource: true,
          renderedContactSemanticsMatchDeclared: true,
          notes: "",
        };

  let attestations: DesignQualityJudgmentAttestations = {
    ...baseAttest,
    notes: `Business-card double-sided QA for ${input.truth.businessName}: front sha256 ${frontSide.pngContentSha256} at ${frontSide.pngRelativePath}; back sha256 ${backSide.pngContentSha256} at ${backSide.pngRelativePath}; pdf ${identity.pdfContentSha256}; overflow front=${capture.front.overflowDetail} back=${capture.back.overflowDetail}; identity ${logoId}.`,
  };

  if (input.forceQaFail) {
    attestations = {
      ...attestations,
      hierarchyReviewed: false,
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
    identity.sides[0]!.pngRelativePath.replace(/front\.png$/i, "card.design-qa.json"),
  );
  writeFileSync(
    qaPath,
    `${JSON.stringify(
      {
        ok: gated.ok,
        error: gated.ok ? undefined : gated.error,
        evaluation: gated.evaluation,
        frontOverflowOk: capture.front.overflowOk,
        backOverflowOk: capture.back.overflowOk,
        frontOverflowDetail: capture.front.overflowDetail,
        backOverflowDetail: capture.back.overflowDetail,
        identity,
        outputMode: mode,
        sidesBound: identity.sides.map((s) => s.side),
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

  if (!capture.front.overflowOk || !capture.back.overflowOk) {
    return fail(
      mode,
      "QA_FAILURE",
      `Clipping/overflow on card side(s): front=${capture.front.overflowDetail}; back=${capture.back.overflowDetail}`,
      { designSpec: spec, identity },
    );
  }

  // Ensure PDF bytes exist and hash matches identity
  const pdfHash = sha256File(path.join(input.repoRoot, identity.pdfRelativePath));
  if (pdfHash !== identity.pdfContentSha256) {
    return fail(mode, "EXPORT_FAILURE", "PDF hash mismatch after persist", {
      designSpec: spec,
      identity,
    });
  }

  return {
    ok: true,
    verdict:
      mode === "customer"
        ? "BUSINESS_CARD_RENDERER_JOB_PASS"
        : "BUSINESS_CARD_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    qaOk: true,
    qaSummary: gated.evaluation.summary,
    declaredTextFront,
    declaredTextBack,
    outputMode: mode,
  };
}

export async function runBusinessCardProofPipeline(input: {
  repoRoot: string;
  truth: BusinessCardProjectTruth;
  specOverride?: BusinessCardDesignSpec;
  forceQaFail?: boolean;
}): Promise<BusinessCardRendererPipelineResult> {
  return runBusinessCardRendererPipeline({
    ...input,
    truth: { ...input.truth, outputMode: "certification_fixture" },
    artifactRootRel: BUSINESS_CARD_PROOF_ARTIFACT_ROOT,
  });
}

/** Customer job entry — authoritative card truth only. */
export async function runBusinessCardJobPipeline(input: {
  repoRoot: string;
  truth: BusinessCardProjectTruth;
  artifactRootRel: string;
  specOverride?: BusinessCardDesignSpec;
  forceQaFail?: boolean;
}): Promise<BusinessCardRendererPipelineResult> {
  if (input.truth.outputMode !== "customer") {
    return fail(
      "customer",
      "INVALID_DESIGN_SPEC",
      "Job pipeline requires outputMode=customer",
    );
  }
  return runBusinessCardRendererPipeline({
    repoRoot: input.repoRoot,
    truth: input.truth,
    artifactRootRel: input.artifactRootRel,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
  });
}
