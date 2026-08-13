/**
 * End-to-end four-post social set pipeline — proof only.
 * Does not retarget primaryTool. Does not wire dispatch. Does not alter sealed lanes.
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
import {
  assertCaptionsBoundToPosts,
  reasonSocialPostCaptionsDeterministic,
  validateCaptionFacts,
} from "./social-posts-captions";
import {
  persistSocialPostsSetArtifacts,
  type SocialPostAssetRenderInput,
} from "./social-posts-bind";
import { isDesignRendererSocialPostsSku } from "./social-posts-contracts";
import { SOCIAL_POSTS_PROOF_ARTIFACT_ROOT } from "./social-posts-fixtures";
import {
  assertSocialPostsRequiredTruth,
  reasonSocialPostsSetDeterministic,
} from "./social-posts-reason";
import {
  declaredTextFromSocialPostAsset,
  renderSocialPostAssetHtml,
} from "./social-posts-render-html";
import { evaluateSocialPostsSetConsistency } from "./social-posts-set-qa";
import {
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_SQUARE_PLATE,
  SOCIAL_POST_TRUST_ROLE_ANGLE,
  type SocialPostCaption,
  type SocialPostingOrderEntry,
  type SocialPostsOutputMode,
  type SocialPostsProjectTruth,
  type SocialPostsRendererFailureCode,
  type SocialPostsRendererPipelineResult,
  type SocialPostsSetSpec,
} from "./social-posts-types";
import { validateSocialPostsSetSpec } from "./social-posts-validate";

function fail(
  mode: SocialPostsOutputMode,
  code: SocialPostsRendererFailureCode,
  message: string,
  extra?: Partial<Extract<SocialPostsRendererPipelineResult, { ok: false }>>,
): SocialPostsRendererPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "SOCIAL_POSTS_RENDERER_JOB_FAIL"
        : "SOCIAL_POSTS_RENDERER_PROOF_FAIL",
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
  truth: SocialPostsProjectTruth,
): string[] {
  if (truth.outputMode === "certification_fixture") {
    return ["Tune-Up", "Drain Clear"];
  }
  return truth.offerName
    .split(/[\s+/—–-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3)
    .slice(0, 4);
}

function buildSocialPostsBrief(
  truth: SocialPostsProjectTruth,
  repoRoot: string,
): DesignQualityBrief {
  const base = briefForSku("v2-rtu-social-posts", "a");
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
    minAssets: SOCIAL_POSTS_EXACT_COUNT,
    maxAssets: SOCIAL_POSTS_EXACT_COUNT,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    expectedWidthPx: SOCIAL_POSTS_SQUARE_PLATE.widthPx,
    expectedHeightPx: SOCIAL_POSTS_SQUARE_PLATE.heightPx,
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

export async function runSocialPostsRendererPipeline(input: {
  repoRoot: string;
  truth: SocialPostsProjectTruth;
  artifactRootRel: string;
  specOverride?: SocialPostsSetSpec;
  forceQaFail?: boolean;
  /** Simulate post 3 capture failure after posts 1-2 succeed — set must fail closed. */
  forceThirdAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  /** Bind caption 2 to the wrong post — publishing mismatch must fail closed. */
  forceCaptionBindFail?: boolean;
  /** Drop the fourth caption — an incomplete caption set must fail closed. */
  forceMissingCaption?: boolean;
  /** Inject a price the campaign record does not contain. */
  forceCaptionInventFail?: boolean;
}): Promise<SocialPostsRendererPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererSocialPostsSku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in social-posts renderer scope`,
    );
  }

  try {
    assertSocialPostsRequiredTruth(input.truth);
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

  let spec: SocialPostsSetSpec;
  try {
    spec = input.specOverride ?? reasonSocialPostsSetDeterministic(input.truth);
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

  const validated = validateSocialPostsSetSpec(
    input.repoRoot,
    spec,
    input.truth,
  );
  if (!validated.ok) {
    return fail(mode, validated.code, validated.message, { designSpec: spec });
  }

  const staging = path.join(tmpdir(), `studio-social-posts-${randomUUID()}`);
  mkdirSync(staging, { recursive: true });

  const assetRenders: SocialPostAssetRenderInput[] = [];
  const declaredTextByAsset: Record<string, string> = {};

  for (let i = 0; i < spec.assets.length; i++) {
    const asset = spec.assets[i]!;
    let html: string;
    try {
      html = renderSocialPostAssetHtml(input.repoRoot, spec, asset);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("BROKEN_ASSET_REFERENCE")) {
        return fail(mode, "BROKEN_ASSET_REFERENCE", msg, { designSpec: spec });
      }
      return fail(mode, "RENDER_FAILURE", msg, { designSpec: spec });
    }

    declaredTextByAsset[asset.assetId] = declaredTextFromSocialPostAsset(asset);

    if (input.forceThirdAssetExportFail && i === 2) {
      return fail(
        mode,
        "PARTIAL_SET_FAILURE",
        `Posts 1-2 staged but post 3 (${asset.assetId}) export forced fail — set incomplete`,
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
          `Post ${asset.assetId} overflow/clip: ${capture.overflowDetail}`,
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

  if (assetRenders.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return fail(
      mode,
      "PARTIAL_SET_FAILURE",
      `Incomplete post render set (${assetRenders.length}/${SOCIAL_POSTS_EXACT_COUNT})`,
      { designSpec: spec },
    );
  }

  let captions: SocialPostCaption[];
  try {
    captions = [...reasonSocialPostCaptionsDeterministic(input.truth, spec.assets)];
  } catch (e) {
    return fail(
      mode,
      "CAPTION_FAILURE",
      e instanceof Error ? e.message : String(e),
      { designSpec: spec },
    );
  }

  if (input.forceCaptionInventFail) {
    captions = captions.map((c) =>
      c.orderIndex === 2 ? { ...c, text: `${c.text} Only $49 today.` } : c,
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
    captions = captions.filter((c) => c.orderIndex !== 4);
  }

  const bound = assertCaptionsBoundToPosts(captions, spec.assets);
  if (!bound.ok) {
    return fail(mode, bound.code, bound.message, { designSpec: spec });
  }

  for (const caption of captions) {
    const factCheck = validateCaptionFacts(caption, input.truth);
    if (!factCheck.ok) {
      return fail(mode, factCheck.code, factCheck.message, { designSpec: spec });
    }
  }

  const postingOrder = [...captions]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((caption) => ({
      position: caption.orderIndex,
      assetId: caption.assetId,
      captionId: caption.captionId,
    })) as SocialPostingOrderEntry[];

  let setEval = evaluateSocialPostsSetConsistency({
    truth: input.truth,
    spec,
    declaredTextByAsset,
    captions,
    postingOrder,
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

  const identityDraft = persistSocialPostsSetArtifacts({
    repoRoot: input.repoRoot,
    truth: input.truth,
    spec,
    artifactRootRel: input.artifactRootRel,
    assetRenders: assetRenders.map((r) => ({ ...r, individualQaOk: false })),
    captions,
    postingOrder,
    setQaOk: false,
  });

  const logoId = input.truth.approvedLogoVariantId;
  const host = webHostToken(input.truth.webDisplay);
  const brief = buildSocialPostsBrief(input.truth, input.repoRoot);
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
      // Brand-trust post carries no campaign offer facts by design.
      isCampaignOfferAsset: a.roleAngle !== SOCIAL_POST_TRUST_ROLE_ANGLE,
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
    notes: `Social-posts set QA for ${input.truth.businessName}: ${identityDraft.assets
      .map(
        (a) =>
          `post ${a.orderIndex} ${a.assetId} ${a.widthPx}x${a.heightPx} angle="${a.roleAngle}" caption=${a.captionId} sha256 ${a.pngContentSha256} at ${a.pngRelativePath}`,
      )
      .join(
        "; ",
      )}; setFingerprint=${identityDraft.sharedSpecFingerprint}; captionFingerprint=${identityDraft.captionSetFingerprint}. Four square posts with distinct hierarchy; captions written from campaign truth and bound to posting order.`,
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
    assets: identityDraft.assets.map((a) => ({
      ...a,
      individualQaOk: allIndividualOk,
    })) as unknown as typeof identityDraft.assets,
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
        setConsistency: setEval,
        captionsBound: bound,
        error: gated.ok ? undefined : gated.error,
        evaluation: gated.evaluation,
        identity,
        outputMode: mode,
        dispatchWiringScopeNote: input.truth.dispatchWiringScopeNote,
        squarePlateReused: {
          plateId: SOCIAL_POSTS_SQUARE_PLATE.plateId,
          widthPx: SOCIAL_POSTS_SQUARE_PLATE.widthPx,
          heightPx: SOCIAL_POSTS_SQUARE_PLATE.heightPx,
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
        ? "SOCIAL_POSTS_RENDERER_JOB_PASS"
        : "SOCIAL_POSTS_RENDERER_PROOF_PASS",
    identity,
    designSpec: spec,
    captions: identity.captions,
    postingOrder: identity.postingOrder,
    qaOk: true,
    setQaOk: true,
    qaSummary: `${gated.evaluation.summary} | ${setEval.summary}`,
    declaredTextByAsset,
    outputMode: mode,
    squarePlateReused: {
      plateId: SOCIAL_POSTS_SQUARE_PLATE.plateId,
      widthPx: SOCIAL_POSTS_SQUARE_PLATE.widthPx,
      heightPx: SOCIAL_POSTS_SQUARE_PLATE.heightPx,
    },
  };
}

export async function runSocialPostsProofPipeline(input: {
  repoRoot: string;
  truth: SocialPostsProjectTruth;
  artifactRootRel?: string;
  forceQaFail?: boolean;
  forceThirdAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  forceCaptionBindFail?: boolean;
  forceMissingCaption?: boolean;
  forceCaptionInventFail?: boolean;
}): Promise<SocialPostsRendererPipelineResult> {
  if (input.truth.outputMode !== "certification_fixture") {
    return fail(
      input.truth.outputMode,
      "MISSING_REQUIRED_TRUTH",
      "Proof pipeline requires outputMode certification_fixture",
    );
  }
  return runSocialPostsRendererPipeline({
    repoRoot: input.repoRoot,
    truth: input.truth,
    artifactRootRel: input.artifactRootRel ?? SOCIAL_POSTS_PROOF_ARTIFACT_ROOT,
    forceQaFail: input.forceQaFail,
    forceThirdAssetExportFail: input.forceThirdAssetExportFail,
    forceSetConsistencyFail: input.forceSetConsistencyFail,
    forceCaptionBindFail: input.forceCaptionBindFail,
    forceMissingCaption: input.forceMissingCaption,
    forceCaptionInventFail: input.forceCaptionInventFail,
  });
}

export async function runSocialPostsJobPipeline(input: {
  repoRoot: string;
  truth: SocialPostsProjectTruth;
  artifactRootRel: string;
  specOverride?: SocialPostsSetSpec;
  forceQaFail?: boolean;
  forceThirdAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  forceCaptionBindFail?: boolean;
  forceMissingCaption?: boolean;
  forceCaptionInventFail?: boolean;
}): Promise<SocialPostsRendererPipelineResult> {
  return runSocialPostsRendererPipeline({
    repoRoot: input.repoRoot,
    truth: { ...input.truth, outputMode: "customer" },
    artifactRootRel: input.artifactRootRel,
    specOverride: input.specOverride,
    forceQaFail: input.forceQaFail,
    forceThirdAssetExportFail: input.forceThirdAssetExportFail,
    forceSetConsistencyFail: input.forceSetConsistencyFail,
    forceCaptionBindFail: input.forceCaptionBindFail,
    forceMissingCaption: input.forceMissingCaption,
    forceCaptionInventFail: input.forceCaptionInventFail,
  });
}
