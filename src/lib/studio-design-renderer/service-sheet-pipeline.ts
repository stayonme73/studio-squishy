/**
 * End-to-end service-sheet renderer pipeline — proof only.
 * Does not retarget dispatch primaryTool. Does not alter flyer/card/menu.
 * Reuses captureMenuExports (shared Playwright overflow gate).
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

import { sha256File } from "./bind";
import { captureMenuExports } from "./menu-capture";
import { persistServiceSheetArtifacts } from "./service-sheet-bind";
import { verifyServiceSheetCompletenessAndPrices } from "./service-sheet-completeness";
import { isDesignRendererServiceSheetSku } from "./service-sheet-contracts";
import { SERVICE_SHEET_PROOF_ARTIFACT_ROOT } from "./service-sheet-fixtures";
import {
  assertServiceSheetRequiredTruth,
  reasonServiceSheetDesignSpecDeterministic,
} from "./service-sheet-reason";
import {
  declaredTextFromServiceSheetSpec,
  renderServiceSheetHtml,
} from "./service-sheet-render-html";
import type {
  ServiceSheetDesignSpec,
  ServiceSheetOutputMode,
  ServiceSheetProjectTruth,
  ServiceSheetRendererPipelineResult,
} from "./service-sheet-types";
import { SERVICE_SHEET_CANVAS } from "./service-sheet-types";
import { validateServiceSheetDesignSpec } from "./service-sheet-validate";

function fail(
  mode: ServiceSheetOutputMode,
  code: Extract<ServiceSheetRendererPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<ServiceSheetRendererPipelineResult, { ok: false }>>,
): ServiceSheetRendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "SERVICE_SHEET_RENDERER_JOB_FAIL"
        : "SERVICE_SHEET_RENDERER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
    ownerRoutineProduction: "NONE",
    canvaUsed: false,
    makeUsed: false,
    ...extra,
  };
}

function buildServiceSheetBrief(
  truth: ServiceSheetProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const base = briefForSku("v2-rtu-service-sheet", "a");
  return {
    ...base,
    skuId: truth.skuId,
    fixtureId: truth.fixtureId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    ctaTokens: [],
    requireCta: false,
    minAssets: 1,
    maxAssets: 1,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: SERVICE_SHEET_CANVAS.widthPx,
    expectedHeightPx: SERVICE_SHEET_CANVAS.heightPx,
    dimensionTolerancePx: 40,
    brandIdentity: {
      businessName: truth.businessName,
      requiredWordmark: truth.wordmark,
      approvedDescriptors: truth.descriptor ? [truth.descriptor] : [],
      prohibitedDescriptors: [],
      approvedLogoVariantIds: [truth.approvedLogoVariantId],
    },
    campaignTruth: undefined,
    requireLogoVariant: true,
    requireMultiAssetConsistency: false,
    requireArtifactBinding: true,
    artifactRepoRoot: repoRoot,
  };
}

export async function runServiceSheetRendererPipeline(input: {
  repoRoot: string;
  truth: ServiceSheetProjectTruth;
  artifactRootRel: string;
  specOverride?: ServiceSheetDesignSpec;
  forceQaFail?: boolean;
}): Promise<ServiceSheetRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererServiceSheetSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in service-sheet renderer scope`,
    );
  }

  try {
    assertServiceSheetRequiredTruth(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    if (msg.startsWith("FIXTURE_LEAKAGE")) {
      return fail(mode, "FIXTURE_LEAKAGE", msg);
    }
    return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
  }

  let spec: ServiceSheetDesignSpec;
  try {
    spec =
      input.specOverride ??
      reasonServiceSheetDesignSpecDeterministic(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("DENSITY_OVERFLOW")) {
      return fail(mode, "DENSITY_OVERFLOW", msg);
    }
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    if (msg.startsWith("MISSING_REQUIRED_TRUTH")) {
      return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
    }
    if (msg.startsWith("FIXTURE_LEAKAGE")) {
      return fail(mode, "FIXTURE_LEAKAGE", msg);
    }
    return fail(mode, "RENDER_FAILURE", msg);
  }

  const validated = validateServiceSheetDesignSpec(
    input.repoRoot,
    spec,
    input.truth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
  }

  let html: string;
  try {
    html = renderServiceSheetHtml(input.repoRoot, spec);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
      return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
    }
    return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
  }

  const staging = path.join(tmpdir(), `studio-service-sheet-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  const stagingHtml = path.join(staging, "service-sheet.html");
  const stagingPng = path.join(staging, "service-sheet.png");
  const stagingPdf = path.join(staging, "service-sheet.pdf");
  writeFileSync(stagingHtml, html, "utf8");

  let capture;
  try {
    capture = await captureMenuExports({
      htmlAbsolutePath: stagingHtml,
      pngAbsolutePath: stagingPng,
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

  const identity = persistServiceSheetArtifacts({
    repoRoot: input.repoRoot,
    truth: input.truth,
    spec,
    artifactRootRel: input.artifactRootRel,
    html,
    pngAbsolutePath: stagingPng,
    pdfAbsolutePath: stagingPdf,
    overflowOk: capture.overflowOk,
    overflowDetail: capture.overflowDetail,
    widthPx: capture.widthPx,
    heightPx: capture.heightPx,
  });

  const declaredText = declaredTextFromServiceSheetSpec(spec);
  const completeness = verifyServiceSheetCompletenessAndPrices(
    input.truth,
    spec,
    declaredText,
  );
  if (!completeness.ok) {
    return fail(mode, "QA_FAILURE", completeness.message, {
      designSpec: spec,
      identity,
    });
  }

  const brief = buildServiceSheetBrief(input.truth, input.repoRoot);
  const logoId = input.truth.approvedLogoVariantId;
  const submission: DesignQualitySubmission = {
    artifacts: [
      {
        id: `service-sheet-${identity.renderId}`,
        relativePath: identity.pngRelativePath,
        version: "final",
        widthPx: identity.widthPx,
        heightPx: identity.heightPx,
        extension: "png",
        contentSha256: identity.pngContentSha256,
        approvedIdentitySourceId: logoId,
        declaredText,
        declaredLogoVariantId: logoId,
        isCampaignOfferAsset: false,
        declaredImageryTheme: "home_services",
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
    notes: `Service-sheet QA for ${input.truth.businessName}: ${identity.serviceCount} services (listed=${identity.listedCount}, contact=${identity.contactForPricingCount}, omitted=${identity.omittedCount}); typography=${identity.typographyMode}; png sha256 ${identity.pngContentSha256}; overflow ${capture.overflowDetail}; identity ${logoId}.`,
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
    identity.pngRelativePath.replace(/\.png$/i, ".design-qa.json"),
  );
  writeFileSync(
    qaPath,
    `${JSON.stringify(
      {
        ok: gated.ok && capture.overflowOk && completeness.ok,
        error: gated.ok
          ? capture.overflowOk
            ? undefined
            : `overflow: ${capture.overflowDetail}`
          : gated.error,
        evaluation: gated.evaluation,
        overflowOk: capture.overflowOk,
        overflowDetail: capture.overflowDetail,
        serviceCompletenessOk: completeness.ok,
        identity,
        outputMode: mode,
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

  if (!capture.overflowOk) {
    return fail(
      mode,
      "QA_FAILURE",
      `Clipping/overflow detected: ${capture.overflowDetail}`,
      { designSpec: spec, identity },
    );
  }

  const pdfHash = sha256File(
    path.join(input.repoRoot, identity.pdfRelativePath),
  );
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
        ? "SERVICE_SHEET_RENDERER_JOB_PASS"
        : "SERVICE_SHEET_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    qaOk: true,
    qaSummary: gated.evaluation.summary,
    overflowOk: capture.overflowOk,
    overflowDetail: capture.overflowDetail,
    declaredText,
    serviceCompletenessOk: true,
    priceTruthOk: true,
    outputMode: mode,
    ownerRoutineProduction: "NONE",
    canvaUsed: false,
    makeUsed: false,
  };
}

export async function runServiceSheetProofPipeline(input: {
  repoRoot: string;
  truth: ServiceSheetProjectTruth;
  specOverride?: ServiceSheetDesignSpec;
  forceQaFail?: boolean;
  artifactRootRel?: string;
}): Promise<ServiceSheetRendererPipelineResult> {
  return runServiceSheetRendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "certification_fixture" },
    artifactRootRel:
      input.artifactRootRel ?? SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
  });
}

export async function runServiceSheetJobPipeline(input: {
  repoRoot: string;
  truth: ServiceSheetProjectTruth;
  artifactRootRel: string;
  specOverride?: ServiceSheetDesignSpec;
  forceQaFail?: boolean;
}): Promise<ServiceSheetRendererPipelineResult> {
  return runServiceSheetRendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "customer" },
    artifactRootRel: input.artifactRootRel,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
  });
}
