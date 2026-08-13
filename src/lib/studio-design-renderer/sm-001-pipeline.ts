/**
 * End-to-end sm-001 Launch Set pipeline — proof and customer job modes.
 * plannedPostCount is selected before execution and never revised by QA.
 * Sealed lanes untouched.
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
  DesignQualityJudgmentAttestations,
  DesignQualitySubmission,
} from "@/lib/studio-kitchen-production/design-quality";

import { nextRenderVersion } from "./bind";
import { captureFlyerExports } from "./capture";
import {
  persistSm001SetArtifacts,
  type Sm001AssetRenderInput,
} from "./sm-001-bind";
import { buildSm001CalendarManifest } from "./sm-001-calendar";
import {
  assertSm001CaptionsBoundToPosts,
  reasonSm001CaptionsDeterministic,
  validateSm001CaptionFacts,
} from "./sm-001-captions";
import { isDesignRendererSm001Sku } from "./sm-001-contracts";
import { SM_001_PROOF_ARTIFACT_ROOT } from "./sm-001-fixtures";
import { assertPlannedPostCountLocked } from "./sm-001-n-select";
import {
  assertSm001RequiredTruth,
  reasonSm001SetDeterministic,
  SM_001_BRAND_ONLY_TEMPLATE,
} from "./sm-001-reason";
import {
  declaredTextFromSm001Asset,
  renderSm001AssetHtml,
} from "./sm-001-render-html";
import { evaluateSm001SetConsistency } from "./sm-001-set-qa";
import {
  SM_001_SQUARE_PLATE,
  type Sm001CalendarManifest,
  type Sm001Caption,
  type Sm001OutputMode,
  type Sm001PostingOrderEntry,
  type Sm001ProjectTruth,
  type Sm001RendererFailureCode,
  type Sm001RendererPipelineResult,
  type Sm001SetSpec,
} from "./sm-001-types";
import { validateSm001SetSpec } from "./sm-001-validate";

/** Unauthorized plate used only to prove the square-only path fails closed. */
const SM_001_UNAUTHORIZED_PLATE_ID = "cert-portrait-1024x1536" as const;

function fail(
  mode: Sm001OutputMode,
  code: Sm001RendererFailureCode,
  message: string,
  extra?: Partial<Extract<Sm001RendererPipelineResult, { ok: false }>>,
): Sm001RendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "SM_001_RENDERER_JOB_FAIL"
        : "SM_001_RENDERER_PROOF_FAIL",
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

function offerNameRequiredTokensForTruth(truth: Sm001ProjectTruth): string[] {
  if (truth.outputMode === "certification_fixture") {
    return ["Tune-Up", "Drain Clear"];
  }
  return truth.offerName
    .split(/[\s+/—–-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3)
    .slice(0, 4);
}

/**
 * briefForSku does not cover sm-001 (not a CERT-tested SKU), so the Launch Set
 * brief is assembled from job truth with minAssets = maxAssets = plannedPostCount.
 */
function buildSm001Brief(
  truth: Sm001ProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const host = webHostToken(truth.webDisplay);
  const dateTokens =
    truth.outputMode === "certification_fixture"
      ? ["March 10", "April 15", "2026"]
      : truth.dateWindow
          .split(/[–—,]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);

  return {
    skuId: truth.skuId,
    fixtureId: truth.fixtureId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    ctaTokens: [truth.phone, host, truth.cta].filter(Boolean),
    requireCta: true,
    minAssets: truth.plannedPostCount,
    maxAssets: truth.plannedPostCount,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: SM_001_SQUARE_PLATE.widthPx,
    expectedHeightPx: SM_001_SQUARE_PLATE.heightPx,
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

export async function runSm001RendererPipeline(input: {
  repoRoot: string;
  truth: Sm001ProjectTruth;
  artifactRootRel: string;
  specOverride?: Sm001SetSpec;
  forceQaFail?: boolean;
  /** Fail mid-set after earlier posts staged — the set must fail closed. */
  forcePartialExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  /** Bind caption 2 to the wrong post — publishing mismatch must fail closed. */
  forceCaptionBindFail?: boolean;
  /** Drop the last caption — an incomplete caption set must fail closed. */
  forceMissingCaption?: boolean;
  /** Drop the last schedule entry — an incomplete calendar must fail closed. */
  forceMissingCalendarEntry?: boolean;
  /** Point a schedule entry at the wrong caption — binding must fail closed. */
  forceBadCalendarBinding?: boolean;
  /** Suggest a date after the campaign end — date governance must fail closed. */
  forceDateOutsideWindow?: boolean;
  /** Drop a post after reasoning — count mismatch must fail closed, never shrink N. */
  forceCountMismatch?: boolean;
  /** Request an unauthorized plate — square-only path must fail closed. */
  forceInvalidPlate?: boolean;
}): Promise<Sm001RendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererSm001Sku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in sm-001 renderer scope`,
    );
  }

  // N is job identity: selected before execution, asserted before render.
  try {
    assertSm001RequiredTruth(input.truth);
    assertPlannedPostCountLocked(input.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg);
    }
    if (msg.startsWith("INVALID_PLANNED_POST_COUNT")) {
      return fail(mode, "INVALID_PLANNED_POST_COUNT", msg);
    }
    if (msg.startsWith("COUNT_MISMATCH")) {
      return fail(mode, "COUNT_MISMATCH", msg);
    }
    if (msg.startsWith("INVALID_PLATE")) {
      return fail(mode, "INVALID_PLATE", msg);
    }
    return fail(mode, "MISSING_REQUIRED_TRUTH", msg);
  }

  const plannedPostCount = input.truth.plannedPostCount;

  let spec: Sm001SetSpec;
  try {
    spec =
      input.specOverride ??
      reasonSm001SetDeterministic(input.truth, {
        plateId: input.forceInvalidPlate
          ? SM_001_UNAUTHORIZED_PLATE_ID
          : SM_001_SQUARE_PLATE.plateId,
      });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("MISSING_REQUIRED_MATERIAL")) {
      return fail(mode, "MISSING_REQUIRED_MATERIAL", msg, { plannedPostCount });
    }
    if (msg.startsWith("INVALID_PLATE")) {
      return fail(mode, "INVALID_PLATE", msg, { plannedPostCount });
    }
    if (msg.startsWith("INVALID_PLANNED_POST_COUNT")) {
      return fail(mode, "INVALID_PLANNED_POST_COUNT", msg, { plannedPostCount });
    }
    if (msg.startsWith("COUNT_MISMATCH")) {
      return fail(mode, "COUNT_MISMATCH", msg, { plannedPostCount });
    }
    if (msg.startsWith("MISSING_REQUIRED_TRUTH")) {
      return fail(mode, "MISSING_REQUIRED_TRUTH", msg, { plannedPostCount });
    }
    return fail(mode, "RENDER_FAILURE", msg, { plannedPostCount });
  }

  if (input.forceCountMismatch) {
    spec = { ...spec, assets: spec.assets.slice(0, -1) };
  }

  const validated = validateSm001SetSpec(input.repoRoot, spec, input.truth);
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, {
      designSpec: spec,
      plannedPostCount,
    });
  }

  const staging = path.join(tmpdir(), `studio-sm-001-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });

  const assetRenders: Sm001AssetRenderInput[] = [];
  const declaredTextByAsset: Record<string, string> = {};
  const partialFailIndex = Math.min(2, plannedPostCount - 1);

  for (let i = 0; i < spec.assets.length; i++) {
    const asset = spec.assets[i]!;
    let html: string;
    try {
      html = renderSm001AssetHtml(input.repoRoot, spec, asset);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
        return fail(mode, "BROKEN_ASSET_REFERENCE", msg, {
          designSpec: spec,
          plannedPostCount,
        });
      }
      return fail(mode, "RENDER_FAILURE", msg, {
        designSpec: spec,
        plannedPostCount,
      });
    }

    declaredTextByAsset[asset.assetId] = declaredTextFromSm001Asset(asset);

    if (input.forcePartialExportFail && i === partialFailIndex) {
      return fail(
        mode,
        "PARTIAL_SET_FAILURE",
        `Posts 1-${i} staged but post ${i + 1} (${asset.assetId}) export forced fail — Launch Set incomplete at ${i}/${plannedPostCount}; plannedPostCount stays ${plannedPostCount}`,
        { designSpec: spec, plannedPostCount },
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
          `Post ${asset.assetId} overflow/clip: ${capture.overflowDetail}`,
          { designSpec: spec, plannedPostCount },
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
        { designSpec: spec, plannedPostCount },
      );
    }
  }

  if (assetRenders.length !== plannedPostCount) {
    return fail(
      mode,
      "PARTIAL_SET_FAILURE",
      `Incomplete Launch Set (${assetRenders.length}/${plannedPostCount}) — plannedPostCount is never reduced to match what rendered`,
      { designSpec: spec, plannedPostCount },
    );
  }

  let captions: Sm001Caption[];
  try {
    captions = [...reasonSm001CaptionsDeterministic(input.truth, spec.assets)];
  } catch (e) {
    return fail(
      mode,
      "CAPTION_FAILURE",
      e instanceof Error ? e.message : String(e),
      { designSpec: spec, plannedPostCount },
    );
  }

  if (input.forceCaptionBindFail) {
    const [first, second, ...rest] = captions;
    captions = [
      { ...first!, assetId: second!.assetId },
      { ...second!, assetId: first!.assetId },
      ...rest,
    ];
  }
  if (input.forceMissingCaption) {
    captions = captions.filter((c) => c.orderIndex !== plannedPostCount);
  }

  const bound = assertSm001CaptionsBoundToPosts(
    captions,
    spec.assets,
    plannedPostCount,
  );
  if (!bound.ok) {
    return fail(mode, bound.code, bound.message, {
      designSpec: spec,
      plannedPostCount,
    });
  }

  for (const caption of captions) {
    const factCheck = validateSm001CaptionFacts(caption, input.truth);
    if (!factCheck.ok) {
      return fail(mode, factCheck.code, factCheck.message, {
        designSpec: spec,
        plannedPostCount,
      });
    }
  }

  const postingOrder: Sm001PostingOrderEntry[] = [...captions]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((caption) => ({
      position: caption.orderIndex,
      assetId: caption.assetId,
      captionId: caption.captionId,
    }));

  if (postingOrder.length !== plannedPostCount) {
    return fail(
      mode,
      "ORDER_FAILURE",
      `Posting order must list ${plannedPostCount} posts, found ${postingOrder.length}`,
      { designSpec: spec, plannedPostCount },
    );
  }

  const plannedRenderVersion = nextRenderVersion(
    input.repoRoot,
    input.artifactRootRel,
  );
  const calendarBuild = buildSm001CalendarManifest({
    plannedPostCount,
    campaignSetRenderVersion: plannedRenderVersion,
    timing: input.truth.timingConstraints,
    postingOrder,
    captions,
    forceDateOutsideWindow: input.forceDateOutsideWindow,
  });
  if (!calendarBuild.ok) {
    return fail(mode, calendarBuild.code, calendarBuild.message, {
      designSpec: spec,
      plannedPostCount,
    });
  }

  let calendar: Sm001CalendarManifest = calendarBuild.manifest;
  if (input.forceBadCalendarBinding) {
    calendar = {
      ...calendar,
      entries: calendar.entries.map((entry, i) =>
        i === 0 ? { ...entry, captionId: `caption-${plannedPostCount}` } : entry,
      ),
    };
  }
  if (input.forceMissingCalendarEntry) {
    calendar = {
      ...calendar,
      entries: calendar.entries.filter(
        (entry) => entry.orderIndex !== plannedPostCount,
      ),
    };
  }

  let setEval = evaluateSm001SetConsistency({
    truth: input.truth,
    spec,
    declaredTextByAsset,
    captions,
    postingOrder,
    calendar,
  });
  if (input.forceSetConsistencyFail) {
    setEval = {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message: "Forced set-level consistency failure for fail-closed proof",
    };
  }
  if (!setEval.ok) {
    return fail(mode, setEval.code, setEval.message, {
      designSpec: spec,
      plannedPostCount,
    });
  }

  let identityDraft;
  try {
    identityDraft = persistSm001SetArtifacts({
      repoRoot: input.repoRoot,
      truth: input.truth,
      spec,
      artifactRootRel: input.artifactRootRel,
      assetRenders: assetRenders.map((r) => ({ ...r, individualQaOk: false })),
      captions,
      postingOrder,
      calendar,
      setQaOk: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code: Sm001RendererFailureCode = msg.startsWith("PARTIAL_SET_FAILURE")
      ? "PARTIAL_SET_FAILURE"
      : msg.startsWith("CAPTION_FAILURE")
        ? "CAPTION_FAILURE"
        : msg.startsWith("ORDER_FAILURE")
          ? "ORDER_FAILURE"
          : msg.startsWith("CALENDAR_FAILURE")
            ? "CALENDAR_FAILURE"
            : msg.startsWith("COUNT_MISMATCH")
              ? "COUNT_MISMATCH"
              : "BINDING_FAILURE";
    return fail(mode, code, msg, { designSpec: spec, plannedPostCount });
  }

  const logoId = input.truth.approvedLogoVariantId;
  const host = webHostToken(input.truth.webDisplay);
  const brief = buildSm001Brief(input.truth, input.repoRoot);
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
      // The brand-trust member carries no campaign offer facts by design.
      isCampaignOfferAsset: a.layoutTemplate !== SM_001_BRAND_ONLY_TEMPLATE,
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
    notes: `sm-001 Launch Set QA for ${input.truth.businessName} at plannedPostCount=${plannedPostCount} (selected before execution): ${identityDraft.assets
      .map(
        (a) =>
          `post ${a.orderIndex} ${a.assetId} ${a.widthPx}x${a.heightPx} template="${a.layoutTemplate}" caption=${a.captionId} sha256 ${a.pngContentSha256} at ${a.pngRelativePath}`,
      )
      .join(
        "; ",
      )}; setFingerprint=${identityDraft.sharedSpecFingerprint}; captionFingerprint=${identityDraft.captionSetFingerprint}; calendarFingerprint=${identityDraft.calendarFingerprint}. Square posts with distinct hierarchy per layout template; captions written from campaign truth and bound to posting order; suggested dates stay inside authoritative campaign timing constraints.`,
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

  const allIndividualOk = gated.ok;
  const setQaOk = gated.ok && setEval.ok;

  const identity = {
    ...identityDraft,
    setQaOk,
    // QA never rewrites N — the locked plannedPostCount travels with the set.
    plannedPostCount,
    assets: identityDraft.assets.map((a) => ({
      ...a,
      individualQaOk: allIndividualOk,
    })),
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
        individualQaOk: allIndividualOk,
        plannedPostCount,
        plannedPostCountSelection: input.truth.plannedPostCountSelection,
        setConsistency: setEval,
        captionsBound: bound,
        calendar: identity.calendar,
        error: gated.ok ? undefined : gated.error,
        evaluation: gated.evaluation,
        identity,
        outputMode: mode,
        proofScopeNote: input.truth.proofScopeNote,
        executablePlate: identity.executablePlate,
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
      plannedPostCount,
    });
  }

  return {
    ok: true,
    verdict:
      mode === "customer"
        ? "SM_001_RENDERER_JOB_PASS"
        : "SM_001_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    captions: identity.captions,
    postingOrder: identity.postingOrder,
    calendar: identity.calendar,
    qaOk: true,
    setQaOk: true,
    qaSummary: `${gated.evaluation.summary} | ${setEval.summary}`,
    declaredTextByAsset,
    outputMode: mode,
    executablePlate: identity.executablePlate,
  };
}

export async function runSm001ProofPipeline(input: {
  repoRoot: string;
  truth: Sm001ProjectTruth;
  artifactRootRel?: string;
  forceQaFail?: boolean;
  forcePartialExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  forceCaptionBindFail?: boolean;
  forceMissingCaption?: boolean;
  forceMissingCalendarEntry?: boolean;
  forceBadCalendarBinding?: boolean;
  forceDateOutsideWindow?: boolean;
  forceCountMismatch?: boolean;
  forceInvalidPlate?: boolean;
}): Promise<Sm001RendererPipelineResult> {
  if (input.truth.outputMode !== "certification_fixture") {
    return fail(
      input.truth.outputMode,
      "MISSING_REQUIRED_TRUTH",
      "Proof pipeline requires outputMode certification_fixture",
    );
  }
  return runSm001RendererPipeline({
    repoRoot: input.repoRoot,
    truth: input.truth,
    artifactRootRel: input.artifactRootRel ?? SM_001_PROOF_ARTIFACT_ROOT,
    forceQaFail: input.forceQaFail,
    forcePartialExportFail: input.forcePartialExportFail,
    forceSetConsistencyFail: input.forceSetConsistencyFail,
    forceCaptionBindFail: input.forceCaptionBindFail,
    forceMissingCaption: input.forceMissingCaption,
    forceMissingCalendarEntry: input.forceMissingCalendarEntry,
    forceBadCalendarBinding: input.forceBadCalendarBinding,
    forceDateOutsideWindow: input.forceDateOutsideWindow,
    forceCountMismatch: input.forceCountMismatch,
    forceInvalidPlate: input.forceInvalidPlate,
  });
}

export async function runSm001JobPipeline(input: {
  repoRoot: string;
  truth: Sm001ProjectTruth;
  artifactRootRel: string;
  specOverride?: Sm001SetSpec;
  forceQaFail?: boolean;
  forcePartialExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  forceCaptionBindFail?: boolean;
  forceMissingCaption?: boolean;
  forceMissingCalendarEntry?: boolean;
  forceBadCalendarBinding?: boolean;
  forceDateOutsideWindow?: boolean;
  forceCountMismatch?: boolean;
  forceInvalidPlate?: boolean;
}): Promise<Sm001RendererPipelineResult> {
  return runSm001RendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "customer" },
    artifactRootRel: input.artifactRootRel,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
    forcePartialExportFail: input.forcePartialExportFail,
    forceSetConsistencyFail: input.forceSetConsistencyFail,
    forceCaptionBindFail: input.forceCaptionBindFail,
    forceMissingCaption: input.forceMissingCaption,
    forceMissingCalendarEntry: input.forceMissingCalendarEntry,
    forceBadCalendarBinding: input.forceBadCalendarBinding,
    forceDateOutsideWindow: input.forceDateOutsideWindow,
    forceCountMismatch: input.forceCountMismatch,
    forceInvalidPlate: input.forceInvalidPlate,
  });
}
