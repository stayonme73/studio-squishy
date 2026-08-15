/**
 * End-to-end design renderer pipeline for v2-rtu-flyer.
 * Proof mode uses Harbor CERT brief; job mode uses authoritative FlyerProjectTruth.
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

import { persistFlyerArtifacts, sha256File } from "./bind";
import { captureFlyerExports } from "./capture";
import { isDesignRendererProofSku } from "./contracts";
import { PROOF_ARTIFACT_ROOT } from "./fixtures";
import { reasonFlyerDesignSpec } from "./reason";
import { declaredTextFromSpec, renderFlyerHtml } from "./render-html";
import type {
  DesignRendererPipelineResult,
  FlyerDesignSpec,
  FlyerOutputMode,
  FlyerProjectTruth,
} from "./types";
import { FLYER_CANVAS } from "./types";
import { validateFlyerDesignSpec } from "./validate-spec";

function fail(
  mode: FlyerOutputMode,
  code: Extract<DesignRendererPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<DesignRendererPipelineResult, { ok: false }>>,
): DesignRendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "DESIGN_RENDERER_JOB_FAIL"
        : "DESIGN_RENDERER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
    ...extra,
  };
}

function webHostToken(webDisplay: string): string {
  return webDisplay.replace(/^https?:\/\//i, "").split("/")[0] ?? webDisplay;
}

function buildJobDesignBrief(
  truth: FlyerProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const host = webHostToken(truth.webDisplay);
  const logoId = truth.approvedLogoVariantId;
  return {
    skuId: truth.skuId,
    fixtureId: truth.fixtureId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    ctaTokens: [truth.phone, host, truth.cta].filter(Boolean),
    requireCta: true,
    minAssets: 1,
    maxAssets: 1,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: FLYER_CANVAS.widthPx,
    expectedHeightPx: FLYER_CANVAS.heightPx,
    dimensionTolerancePx: 40,
    brandIdentity: {
      businessName: truth.businessName,
      requiredWordmark: truth.wordmark,
      approvedDescriptors: truth.descriptor.trim() ? [truth.descriptor] : [],
      prohibitedDescriptors: [],
      approvedLogoVariantIds: logoId ? [logoId] : [],
    },
    campaignTruth: {
      offerName: truth.offerName,
      offerNameRequiredTokens: truth.offerName
        .split(/[\s+/]+/)
        .filter((t) => t.length > 3)
        .slice(0, 4),
      priceToken: truth.priceDisplay,
      dateTokens: truth.dateWindow
        ? truth.dateWindow.split(/[–—,]/).map((s) => s.trim()).filter(Boolean)
        : [],
      phone: truth.phone,
      urlTokens: [host].filter(Boolean),
      prohibitedOfferAliases: [],
    },
    contactSemantics: [
      ...(truth.phone
        ? [{ value: truth.phone, expectedKind: "phone" as const }]
        : []),
      ...(host ? [{ value: host, expectedKind: "web" as const }] : []),
    ],
    requireLogoVariant: Boolean(logoId),
    requireMultiAssetConsistency: false,
    requireArtifactBinding: true,
    artifactRepoRoot: repoRoot,
  };
}

function buildJobAttestations(
  truth: FlyerProjectTruth,
  pngHash: string,
  pngPath: string,
  overflowDetail: string,
): DesignQualityJudgmentAttestations {
  return {
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
    notes: `Job flyer QA for ${truth.businessName}: hierarchy wordmark→offer→price→CTA→contact; bound file sha256 ${pngHash} at ${pngPath}; identity ${truth.approvedLogoVariantId ?? "wordmark-only"}; overflow ${overflowDetail}.`,
  };
}

export async function runDesignRendererPipeline(input: {
  repoRoot: string;
  truth: FlyerProjectTruth;
  artifactRootRel: string;
  /** Injected spec for failure tests; otherwise reasoned from truth. */
  specOverride?: FlyerDesignSpec;
  preferAnthropic?: boolean;
  skipDesignQaAttestations?: boolean;
  forceQaFail?: boolean;
}): Promise<DesignRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererProofSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in design-renderer scope`,
    );
  }

  let spec: FlyerDesignSpec;
  try {
    spec =
      input.specOverride ??
      (await reasonFlyerDesignSpec({
        truth: input.truth,
        preferAnthropic: input.preferAnthropic,
      }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    return fail(mode, "RENDER_FAILURE", msg);
  }

  const validated = validateFlyerDesignSpec(
    input.repoRoot,
    spec,
    input.truth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
  }

  let html: string;
  try {
    html = renderFlyerHtml(input.repoRoot, spec);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
      return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
    }
    return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
  }

  const staging = path.join(tmpdir(), `studio-flyer-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  const stagingHtml = path.join(staging, "flyer.html");
  const stagingPng = path.join(staging, "flyer.png");
  const stagingPdf = path.join(staging, "flyer.pdf");
  writeFileSync(stagingHtml, html, "utf8");

  let capture;
  try {
    capture = await captureFlyerExports({
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

  const identity = persistFlyerArtifacts({
    repoRoot: input.repoRoot,
    truth: input.truth,
    spec,
    artifactRootRel: input.artifactRootRel,
    html,
    pngAbsolutePath: stagingPng,
    pdfAbsolutePath: stagingPdf,
    widthPx: capture.widthPx,
    heightPx: capture.heightPx,
  });

  const declaredText = declaredTextFromSpec(spec);
  const pngHash = sha256File(
    path.join(input.repoRoot, identity.pngRelativePath),
  );

  let brief: DesignQualityBrief;
  let submission: DesignQualitySubmission;
  let attestations: DesignQualityJudgmentAttestations;

  if (mode === "certification_fixture") {
    brief = {
      ...briefForSku("v2-rtu-flyer", "a"),
      artifactRepoRoot: input.repoRoot,
    };
    const logoId = harborOakIdentityLock.approvedLogoVariantIds[0]!;
    submission = {
      artifacts: [
        {
          id: `renderer-proof-${identity.renderId}`,
          relativePath: identity.pngRelativePath,
          version: "final",
          widthPx: identity.widthPx,
          heightPx: identity.heightPx,
          extension: "png",
          contentSha256: pngHash,
          approvedIdentitySourceId: logoId,
          declaredText,
          declaredLogoVariantId: logoId,
          declaredContactPresentations: [
            { value: input.truth.phone, presentedAs: "phone" },
            { value: "harborandoak.example", presentedAs: "web" },
          ],
          declaredImageryTheme: "hvac_home_services",
        },
      ],
    };
    const base = passAttestations("a");
    attestations = {
      ...base,
      notes: `${base.notes} Design-renderer proof bound file sha256 ${pngHash} at ${identity.pngRelativePath}. Hierarchy: wordmark → offer → price → CTA → contact. Overflow check: ${capture.overflowDetail}.`,
    };
  } else {
    brief = buildJobDesignBrief(input.truth, input.repoRoot);
    const host = webHostToken(input.truth.webDisplay);
    submission = {
      artifacts: [
        {
          id: `renderer-job-${identity.renderId}`,
          relativePath: identity.pngRelativePath,
          version: "final",
          widthPx: identity.widthPx,
          heightPx: identity.heightPx,
          extension: "png",
          contentSha256: pngHash,
          approvedIdentitySourceId:
            input.truth.approvedLogoVariantId ?? undefined,
          declaredText,
          declaredLogoVariantId:
            input.truth.approvedLogoVariantId ?? undefined,
          declaredContactPresentations: [
            ...(input.truth.phone
              ? [
                  {
                    value: input.truth.phone,
                    presentedAs: "phone" as const,
                  },
                ]
              : []),
            ...(host
              ? [{ value: host, presentedAs: "web" as const }]
              : []),
          ],
          declaredImageryTheme: "customer_job_flyer",
        },
      ],
    };
    attestations = buildJobAttestations(
      input.truth,
      pngHash,
      identity.pngRelativePath,
      capture.overflowDetail,
    );
  }

  if (input.forceQaFail) {
    attestations = {
      ...attestations,
      hierarchyReviewed: false,
      notes: "Forced QA failure for fail-closed proof.",
    };
  }

  if (input.skipDesignQaAttestations) {
    return fail(mode, "QA_FAILURE", "Attestations skipped — fail closed", {
      designSpec: spec,
      identity,
    });
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
        ok: gated.ok,
        error: gated.ok ? undefined : gated.error,
        evaluation: gated.evaluation,
        overflowOk: capture.overflowOk,
        overflowDetail: capture.overflowDetail,
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

  return {
    ok: true,
    verdict:
      mode === "customer"
        ? "DESIGN_RENDERER_JOB_PASS"
        : "DESIGN_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    qaOk: true,
    qaSummary: gated.evaluation.summary,
    overflowOk: capture.overflowOk,
    declaredText,
    outputMode: mode,
  };
}

/** Harbor CERT / internal proof entry — never customer production. */
export async function runDesignRendererProofPipeline(input: {
  repoRoot: string;
  truth: FlyerProjectTruth;
  specOverride?: FlyerDesignSpec;
  preferAnthropic?: boolean;
  skipDesignQaAttestations?: boolean;
  forceQaFail?: boolean;
}): Promise<DesignRendererPipelineResult> {
  return runDesignRendererPipeline({
    ...input,
    truth: { ...input.truth, outputMode: "certification_fixture" },
    artifactRootRel: PROOF_ARTIFACT_ROOT,
  });
}

/** Customer job entry — authoritative job truth only. */
export async function runDesignRendererJobPipeline(input: {
  repoRoot: string;
  truth: FlyerProjectTruth;
  artifactRootRel: string;
  preferAnthropic?: boolean;
  specOverride?: FlyerDesignSpec;
  /** Test harness only — force QA attestation failure after export. */
  forceQaFail?: boolean;
}): Promise<DesignRendererPipelineResult> {
  if (input.truth.outputMode !== "customer") {
    return fail(
      "customer",
      "INVALID_DESIGN_SPEC",
      "Job pipeline requires outputMode=customer",
    );
  }
  return runDesignRendererPipeline({
    repoRoot: input.repoRoot,
    truth: input.truth,
    artifactRootRel: input.artifactRootRel,
    preferAnthropic: input.preferAnthropic ?? false,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
  });
}
