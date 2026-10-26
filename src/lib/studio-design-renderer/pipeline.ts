/**
 * End-to-end design renderer pipeline for v2-rtu-flyer.
 * Proof mode uses Harbor CERT brief; job mode uses authoritative FlyerProjectTruth.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

import type { FlyerReasoningConstraints } from "@/config/studio-autonomous-production-loop-v1";
import {
  briefForSku,
  gateDesignQualityForQaPass,
  passAttestations,
} from "@/lib/studio-kitchen-production";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type {
  DesignQualityBrief,
  DesignQualityFinding,
  DesignQualityJudgmentAttestations,
  DesignQualitySubmission,
} from "@/lib/studio-kitchen-production/design-quality";

import { persistFlyerArtifacts, sha256File } from "./bind";
import { captureFlyerExports } from "./capture";
import { isDesignRendererProofSku } from "./contracts";
import { PROOF_ARTIFACT_ROOT } from "./fixtures";
import {
  composeAndRenderLiveFlyer,
  shouldUseLiveStage0Composition,
} from "@/lib/studio-static-creative-lane/live-flyer-compose";
import { evaluateFlyerSpecCreativeQuality } from "./flyer-creative-quality";
import { evaluateFlyerOutputReadability } from "./flyer-output-readability";
import { evaluateHybridLayoutFamilyAgreement } from "@/lib/studio-project-alpha/composition-checks";
import { checkComposedArtifactCreativeQuality } from "@/lib/studio-project-alpha/composed-artifact-quality";
import { reasonFlyerDesignSpec } from "./reason";
import { composeHybridSpec } from "@/lib/studio-project-alpha/compose-hybrid";
import {
  checkGeneratedFieldPixels,
  checkHybridComposition,
} from "@/lib/studio-project-alpha/composition-checks";
import { generateHybridVisual } from "@/lib/studio-project-alpha/hybrid-image";
import {
  auditComposedArtifactCarriesFacts,
  auditGeneratedLayerHasNoText,
} from "@/lib/studio-project-alpha/pixel-text-audit";
import { inspectComposedArtifact } from "@/lib/studio-project-alpha/vision-director";
import { openaiImageConfigured, routeProductionMethod } from "@/lib/studio-project-alpha/tool-chest";
import { declaredTextFromSpec, renderFlyerHtml } from "./render-html";
import type {
  DesignRendererPipelineResult,
  FlyerDesignSpec,
  FlyerOutputMode,
  FlyerProjectTruth,
} from "./types";
import { validateFlyerDesignSpec } from "./validate-spec";

/**
 * Merge findings into an already-written QA record. The vision Creative Director
 * runs after the record is written, and its verdict has to reach the correction
 * brief the same way every other finding does.
 */
function appendQaFindings(
  qaPath: string,
  findings: readonly DesignQualityFinding[],
): void {
  try {
    const existing = JSON.parse(readFileSync(qaPath, "utf8")) as {
      ok?: boolean;
      error?: string;
      evaluation?: { findings?: DesignQualityFinding[]; deterministicFailCount?: number; summary?: string };
    };
    const merged = [...(existing.evaluation?.findings ?? []), ...findings];
    const next = {
      ...existing,
      ok: false,
      error: findings.map((finding) => finding.message).join("; "),
      evaluation: {
        ...(existing.evaluation ?? {}),
        ok: false,
        findings: merged,
        deterministicFailCount:
          (existing.evaluation?.deterministicFailCount ?? 0) + findings.length,
        summary: findings.map((finding) => finding.message).join("; "),
      },
    };
    writeFileSync(qaPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch {
    // A missing or unreadable QA record must not turn a creative rejection into a
    // crash. The rejection still returns; the brief falls back to code classification.
  }
}

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

/** Absolute path of the generated hybrid layer, or null when the spec has none. */
function generatedVisualAbsolutePath(
  repoRoot: string,
  spec: FlyerDesignSpec,
): string | null {
  const material = spec.materials.find(
    (candidate) => candidate.materialId === "hybrid-generated-visual",
  );
  return material ? path.join(repoRoot, material.relativePath) : null;
}

function webHostToken(webDisplay: string): string {
  return webDisplay.replace(/^https?:\/\//i, "").split("/")[0] ?? webDisplay;
}

function lockedFactsFromTruth(truth: FlyerProjectTruth): readonly string[] {
  return [
    truth.businessName,
    truth.offerName,
    truth.priceDisplay,
    truth.cta,
    truth.phone,
    truth.webDisplay,
    truth.dateWindow,
  ].filter((fact) => fact.trim().length >= 4);
}

function buildJobDesignBrief(
  truth: FlyerProjectTruth,
  repoRoot: string,
  canvas: { widthPx: number; heightPx: number },
): DesignQualityBrief {
  const host = webHostToken(truth.webDisplay);
  const logoId = truth.approvedLogoVariantId;
  return {
    skuId: truth.skuId,
    fixtureId: truth.fixtureId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    ctaTokens: [truth.phone, host, truth.cta].filter(Boolean),
    requireCta: Boolean(truth.phone.trim() || host || truth.cta.trim()),
    minAssets: 1,
    maxAssets: 1,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: canvas.widthPx,
    expectedHeightPx: canvas.heightPx,
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
    notes: `Job flyer QA for ${truth.businessName}: deterministic hierarchy/offer/placeholder/contact checks; bound file sha256 ${pngHash} at ${pngPath}; identity ${truth.approvedLogoVariantId ?? "wordmark-only"}; overflow ${overflowDetail}. Visual judgment attestations follow those checks and are not a ceremonial pass.`,
  };
}

export type HybridProductionOptions = {
  /**
   * `true` authorizes the hybrid route even when the caller reasoned the spec
   * itself (the real dispatch hook does). `false` refuses it. Omitted leaves the
   * route to the Machine, but only when no spec was injected.
   */
  enabled?: boolean;
  attempt?: number;
  forceInsufficientVisual?: boolean;
  priorVisionCritique?: string;
};

export async function runDesignRendererPipeline(input: {
  repoRoot: string;
  truth: FlyerProjectTruth;
  artifactRootRel: string;
  /** Injected spec for failure tests; otherwise reasoned from truth. */
  specOverride?: FlyerDesignSpec;
  preferAnthropic?: boolean;
  skipDesignQaAttestations?: boolean;
  forceQaFail?: boolean;
  constraints?: FlyerReasoningConstraints;
  hybridProduction?: HybridProductionOptions;
}): Promise<DesignRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererProofSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in design-renderer scope`,
    );
  }

  const useLiveStage0 = shouldUseLiveStage0Composition({
    outputMode: mode,
    specOverride: input.specOverride,
  });
  let liveTruth = input.truth;
  const creativeBrief = liveTruth.creativeDirection?.brief;
  const hybridAuthorized =
    input.hybridProduction?.enabled === true || !input.specOverride;
  const hybridAttempt = input.hybridProduction?.attempt ?? 1;
  const hybridRoute =
    mode === "customer" &&
    input.hybridProduction?.enabled !== false &&
    hybridAuthorized &&
    Boolean(creativeBrief) &&
    openaiImageConfigured() &&
    routeProductionMethod(creativeBrief!).method === "image_plus_renderer";
  /**
   * Creative Director findings readable from the spec alone — no render, no
   * provider. Collected inside the hybrid block so they can gate the billable
   * text audit, then carried out to the normal post-render evaluation so they are
   * recorded and classified like every other finding.
   */
  let specDirectorFails: DesignQualityFinding[] = [];
  let spec: FlyerDesignSpec | undefined;
  const staging = path.join(tmpdir(), `studio-flyer-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });
  const stagingHtml = path.join(staging, "flyer.html");
  const stagingPng = path.join(staging, "flyer.png");
  const stagingPdf = path.join(staging, "flyer.pdf");
  let html: string;
  let capture: {
    widthPx: number;
    heightPx: number;
    overflowOk: boolean;
    overflowDetail: string;
  };

  if (hybridRoute) {
    try {
      const visual = await generateHybridVisual(
        input.repoRoot,
        input.artifactRootRel,
        {
          brief: creativeBrief!,
          lockedFacts: lockedFactsFromTruth(liveTruth),
          attempt: hybridAttempt,
          forceInsufficientVisual: input.hybridProduction?.forceInsufficientVisual,
          priorCritique: input.hybridProduction?.priorVisionCritique,
          layoutFamilyId: liveTruth.creativeDirection?.selectedRoute.layoutFamilyId,
        },
      );
      const pixels = await checkGeneratedFieldPixels({
        repoRoot: input.repoRoot,
        relativePath: visual.relativePath,
      });
      if (!pixels.ok) {
        const detail = pixels.findings.map((f) => f.message).join(" ");
        return fail(mode, "QA_FAILURE", `REJECT — generated visual failed deterministic composition checks. ${detail}`, {
          visionCritique: detail,
        });
      }
      liveTruth = {
        ...liveTruth,
        materials: [
          ...liveTruth.materials.filter(
            (material) => material.materialId !== "hybrid-generated-visual",
          ),
          {
            materialId: "hybrid-generated-visual",
            role: "hero",
            relativePath: visual.relativePath,
            contentSha256: visual.contentSha256,
          },
        ],
      };
      if (!useLiveStage0) {
        spec =
          input.specOverride ??
          (await reasonFlyerDesignSpec({
            truth: liveTruth,
            preferAnthropic: input.preferAnthropic,
            constraints: input.constraints,
          }));
        spec = composeHybridSpec(spec, visual);
        const composition = checkHybridComposition(spec);
        if (!composition.ok) {
          return fail(
            mode,
            "QA_FAILURE",
            `REJECT — composed layout failed deterministic composition checks. ${composition.findings
              .map((f) => f.message)
              .join(" ")}`,
            { designSpec: spec },
          );
        }
        specDirectorFails = [
          ...(mode === "customer" ? evaluateFlyerOutputReadability(spec) : []),
          ...evaluateHybridLayoutFamilyAgreement(spec),
        ];
      }
      if (specDirectorFails.length === 0) {
        const bakedText = await auditGeneratedLayerHasNoText({
          pngAbsolutePath: path.join(input.repoRoot, visual.relativePath),
          attempt: hybridAttempt,
        });
        if (!bakedText.ok) {
          const detail = bakedText.findings.map((f) => f.message).join(" ");
          return fail(mode, "QA_FAILURE", `REJECT — generated visual carries its own text. ${detail}`, {
            designSpec: spec,
            visionCritique:
              "The previous generation baked letters into the picture. Produce a purely photographic or illustrated field with no letterforms, signage, labels, or watermarks anywhere.",
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
        return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
      }
      return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
    }
  }

  if (useLiveStage0) {
    const live = await composeAndRenderLiveFlyer({
      repoRoot: input.repoRoot,
      truth: liveTruth,
      stagingDir: staging,
    });
    if (!live.ok) {
      const code =
        live.code === "PRINT_RESOLUTION_NOT_LAUNCHABLE" ||
        live.code === "studio_design_text_overflows_declared_box"
          ? "QA_FAILURE"
          : live.code === "TRUTH_HEADLINE_REPLACED_BY_CTA" ||
              live.code === "SUPPLIED_FACT_DROPPED" ||
              live.code === "BRIEF_COMPLIANCE_MISSING" ||
              live.code === "INVALID_DESIGN_SPEC"
            ? "INVALID_DESIGN_SPEC"
            : live.code === "MISSING_REQUIRED_MATERIAL"
              ? "MISSING_REQUIRED_MATERIAL"
              : live.code === "BROKEN_ASSET_REFERENCE"
                ? "BROKEN_ASSET_REFERENCE"
                : "RENDER_FAILURE";
      return fail(mode, code, live.message);
    }
    spec = live.spec;
    html = readFileSync(live.htmlAbsolutePath ?? stagingHtml, "utf8");
    writeFileSync(stagingHtml, html, "utf8");
    capture = {
      widthPx: live.widthPx,
      heightPx: live.heightPx,
      overflowOk: true,
      overflowDetail: "stage0-live-chromium",
    };
  } else {
    try {
      spec =
        spec ??
        input.specOverride ??
        (await reasonFlyerDesignSpec({
          truth: liveTruth,
          preferAnthropic: input.preferAnthropic,
          constraints: input.constraints,
        }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
        return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
      }
      return fail(mode, "RENDER_FAILURE", msg);
    }

    const validatedLegacy = validateFlyerDesignSpec(
      input.repoRoot,
      spec,
      liveTruth,
    );
    if (!validatedLegacy.ok) {
      return fail(mode, validatedLegacy.code, validatedLegacy.message, {
        designSpec: spec,
      });
    }

    try {
      html = renderFlyerHtml(input.repoRoot, spec);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
        return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
      }
      return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
    }
    writeFileSync(stagingHtml, html, "utf8");
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
  }

  if (!spec) {
    return fail(mode, "RENDER_FAILURE", "Composition did not produce a design spec");
  }

  const validated = validateFlyerDesignSpec(
    input.repoRoot,
    spec,
    liveTruth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
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
    brief = buildJobDesignBrief(input.truth, input.repoRoot, spec.canvas);
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

  const creativeFails =
    mode === "customer"
      ? evaluateFlyerSpecCreativeQuality(spec, input.truth).filter(
          (finding) => finding.severity === "fail",
        )
      : [];

  // Creative Director gates on the artifact the customer receives. Declared
  // occupancy is not evidence: a full-canvas generated hero claims the whole
  // plate whether or not its pixels earned it (Customer-One V19). These run
  // before the vision pass, so work this rejects costs no vision call.
  const directorFails: DesignQualityFinding[] = [...specDirectorFails];
  if (!hybridRoute && mode === "customer") {
    // Non-hybrid work has no composed spec to grade early, so readability runs here.
    directorFails.push(...evaluateFlyerOutputReadability(spec));
  }
  if (hybridRoute) {
    const composed = await checkComposedArtifactCreativeQuality({
      repoRoot: input.repoRoot,
      composedAbsolutePath: path.join(input.repoRoot, identity.pngRelativePath),
      generatedAbsolutePath: generatedVisualAbsolutePath(input.repoRoot, spec),
      spec,
    });
    directorFails.push(
      ...composed.findings.map((finding) => ({
        id: finding.code,
        severity: "fail" as const,
        checkKind: "creative_quality" as const,
        message: finding.message,
      })),
    );
  }
  const directorCritique = directorFails
    .filter((finding) => finding.id.startsWith("composed_"))
    .map((finding) => finding.message)
    .join(" ");
  const qualityFails = [...creativeFails, ...directorFails];
  const evaluation = qualityFails.length
    ? {
        ...gated.evaluation,
        ok: false as const,
        findings: [...gated.evaluation.findings, ...qualityFails],
        deterministicFailCount:
          gated.evaluation.deterministicFailCount + qualityFails.length,
        summary: qualityFails.map((finding) => finding.message).join("; "),
      }
    : gated.evaluation;
  const qaOk = gated.ok && qualityFails.length === 0;
  const qaError = qualityFails.length
    ? qualityFails.map((finding) => finding.message).join("; ")
    : gated.ok
      ? undefined
      : gated.error;

  const qaPath = path.join(
    input.repoRoot,
    identity.pngRelativePath.replace(/\.png$/i, ".design-qa.json"),
  );
  writeFileSync(
    qaPath,
    `${JSON.stringify(
      {
        ok: qaOk,
        error: qaError,
        evaluation,
        attestations,
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

  if (!qaOk) {
    const creativelyInsufficient = directorFails.length > 0;
    return fail(
      mode,
      "QA_FAILURE",
      creativelyInsufficient
        ? `REJECT — technically correct, creatively insufficient. ${qaError ?? ""}`.trim()
        : (qaError ?? "Creative or technical QA did not pass"),
      {
        designSpec: spec,
        identity,
        // The next attempt's image request needs to know what was empty. Facts are
        // stripped from this before it reaches the image provider.
        visionCritique: directorCritique || undefined,
      },
    );
  }

  if (!capture.overflowOk) {
    return fail(
      mode,
      "QA_FAILURE",
      `Clipping/overflow detected: ${capture.overflowDetail}`,
      { designSpec: spec, identity },
    );
  }

  if (hybridRoute) {
    try {
      // Facts must be legible in the delivered pixels, not merely declared in the
      // spec. This runs before the creative pass: a factually broken artifact is
      // not worth a creative opinion.
      const factsInPixels = await auditComposedArtifactCarriesFacts({
        pngAbsolutePath: path.join(input.repoRoot, identity.pngRelativePath),
        lockedFacts: lockedFactsFromTruth(input.truth),
        attempt: hybridAttempt,
      });
      if (!factsInPixels.ok) {
        return fail(
          mode,
          "QA_FAILURE",
          `REJECT — composed artifact does not carry the customer's exact facts in its pixels. ${factsInPixels.findings
            .map((f) => f.message)
            .join(" ")}`,
          { designSpec: spec, identity },
        );
      }
      const vision = await inspectComposedArtifact({
        pngAbsolutePath: path.join(input.repoRoot, identity.pngRelativePath),
        lockedFacts: lockedFactsFromTruth(input.truth),
        industry: creativeBrief?.industryFamily ?? "",
        mood: creativeBrief?.moodId ?? "",
        attempt: hybridAttempt,
      });
      if (!vision.ok) {
        // Record the verdict as a structured finding so the correction brief
        // carries "creatively insufficient" instead of a generic QA failure.
        appendQaFindings(qaPath, [
          {
            id: "creative_director_rejected_creatively_insufficient",
            severity: "fail",
            checkKind: "creative_quality",
            message: `REJECT — ${vision.rejectReason ?? "technically_correct_creatively_insufficient"}. ${vision.summary}`,
          },
        ]);
        return fail(
          mode,
          "QA_FAILURE",
          `REJECT — technically correct, creatively insufficient. ${vision.summary}`,
          {
            designSpec: spec,
            identity,
            visionCritique: [vision.summary, vision.visualFix]
              .filter(Boolean)
              .join(" "),
          },
        );
      }
    } catch (e) {
      return fail(
        mode,
        "QA_FAILURE",
        e instanceof Error ? e.message : String(e),
        { designSpec: spec, identity },
      );
    }
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
  constraints?: FlyerReasoningConstraints;
  hybridProduction?: HybridProductionOptions;
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
    constraints: input.constraints,
    hybridProduction: input.hybridProduction,
  });
}
