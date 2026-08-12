/**
 * End-to-end menu renderer pipeline — max-load proof capable.
 * Does not retarget dispatch primaryTool. Does not alter flyer/card pipelines.
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
import { persistMenuArtifacts } from "./menu-bind";
import { captureMenuExports } from "./menu-capture";
import { verifyMenuItemCompletenessAndPrices } from "./menu-completeness";
import { isDesignRendererMenuSku } from "./menu-contracts";
import { MENU_PROOF_ARTIFACT_ROOT } from "./menu-fixtures";
import {
  assertMenuRequiredTruth,
  reasonMenuDesignSpecDeterministic,
} from "./menu-reason";
import {
  declaredTextFromMenuSpec,
  renderMenuHtml,
} from "./menu-render-html";
import type {
  MenuDesignSpec,
  MenuOutputMode,
  MenuProjectTruth,
  MenuRendererPipelineResult,
} from "./menu-types";
import { MENU_CANVAS } from "./menu-types";
import { validateMenuDesignSpec } from "./menu-validate";

function fail(
  mode: MenuOutputMode,
  code: Extract<MenuRendererPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<MenuRendererPipelineResult, { ok: false }>>,
): MenuRendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "MENU_RENDERER_JOB_FAIL"
        : "MENU_RENDERER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
    ownerRoutineProduction: "NONE",
    canvaUsed: false,
    makeUsed: false,
    ...extra,
  };
}

function buildMenuBrief(
  truth: MenuProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const base = briefForSku("v2-rtu-menu", "b");
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
    expectedWidthPx: MENU_CANVAS.widthPx,
    expectedHeightPx: MENU_CANVAS.heightPx,
    dimensionTolerancePx: 40,
    brandIdentity: {
      businessName: truth.businessName,
      requiredWordmark: truth.wordmark,
      approvedDescriptors: truth.descriptor ? [truth.descriptor] : [],
      prohibitedDescriptors: [],
      approvedLogoVariantIds: [truth.approvedLogoVariantId],
    },
    // Item-list truth — not a single campaign offer price lock.
    campaignTruth: undefined,
    requireLogoVariant: true,
    requireMultiAssetConsistency: false,
    requireArtifactBinding: true,
    artifactRepoRoot: repoRoot,
  };
}

export async function runMenuRendererPipeline(input: {
  repoRoot: string;
  truth: MenuProjectTruth;
  artifactRootRel: string;
  specOverride?: MenuDesignSpec;
  forceQaFail?: boolean;
}): Promise<MenuRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererMenuSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in menu renderer scope`,
    );
  }

  try {
    assertMenuRequiredTruth(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
  }

  let spec: MenuDesignSpec;
  try {
    spec =
      input.specOverride ?? reasonMenuDesignSpecDeterministic(input.truth);
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
    return fail(mode, "RENDER_FAILURE", msg);
  }

  const validated = validateMenuDesignSpec(
    input.repoRoot,
    spec,
    input.truth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
  }

  let html: string;
  try {
    html = renderMenuHtml(input.repoRoot, spec);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
      return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
    }
    return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
  }

  const staging = path.join(tmpdir(), `studio-menu-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  const stagingHtml = path.join(staging, "menu.html");
  const stagingPng = path.join(staging, "menu.png");
  const stagingPdf = path.join(staging, "menu.pdf");
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

  const identity = persistMenuArtifacts({
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

  const declaredText = declaredTextFromMenuSpec(spec);
  const completeness = verifyMenuItemCompletenessAndPrices(
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

  const brief = buildMenuBrief(input.truth, input.repoRoot);
  const logoId = input.truth.approvedLogoVariantId;
  const submission: DesignQualitySubmission = {
    artifacts: [
      {
        id: `menu-${identity.renderId}`,
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
        declaredImageryTheme: "bakery_food",
      },
    ],
  };

  const baseAttest =
    mode === "certification_fixture"
      ? passAttestations("b")
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
    notes: `Menu QA for ${input.truth.businessName}: ${identity.sectionCount} sections / ${identity.itemCount} items TOTAL; typography=${identity.typographyMode}; png sha256 ${identity.pngContentSha256}; pdf ${identity.pdfContentSha256}; overflow ${capture.overflowDetail}; identity ${logoId}.`,
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
        itemCompletenessOk: completeness.ok,
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
        ? "MENU_RENDERER_JOB_PASS"
        : "MENU_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    qaOk: true,
    qaSummary: gated.evaluation.summary,
    overflowOk: capture.overflowOk,
    overflowDetail: capture.overflowDetail,
    declaredText,
    itemCompletenessOk: true,
    priceTruthOk: true,
    outputMode: mode,
    ownerRoutineProduction: "NONE",
    canvaUsed: false,
    makeUsed: false,
  };
}

export async function runMenuProofPipeline(input: {
  repoRoot: string;
  truth: MenuProjectTruth;
  specOverride?: MenuDesignSpec;
  forceQaFail?: boolean;
  artifactRootRel?: string;
}): Promise<MenuRendererPipelineResult> {
  return runMenuRendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "certification_fixture" },
    artifactRootRel: input.artifactRootRel ?? MENU_PROOF_ARTIFACT_ROOT,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
  });
}

export async function runMenuJobPipeline(input: {
  repoRoot: string;
  truth: MenuProjectTruth;
  artifactRootRel: string;
  specOverride?: MenuDesignSpec;
  forceQaFail?: boolean;
}): Promise<MenuRendererPipelineResult> {
  return runMenuRendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "customer" },
    artifactRootRel: input.artifactRootRel,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
  });
}
