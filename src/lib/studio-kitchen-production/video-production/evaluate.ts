import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { evaluateVideoArtifactBindings } from "./artifact-binding";
import { evaluateCustomerAssetTruth } from "./asset-truth";
import {
  VIDEO_ALLOWED_EXTENSIONS,
  VIDEO_DURATION_MAX_SECONDS,
  VIDEO_DURATION_MIN_SECONDS,
  VIDEO_PRODUCTION_SKUS,
} from "./contracts";
import type {
  VideoQualityBrief,
  VideoQualityEvaluation,
  VideoQualityFinding,
  VideoQualityJudgmentAttestations,
  VideoQualitySubmission,
} from "./types";

const VIDEO_SKU_SET = new Set<string>(VIDEO_PRODUCTION_SKUS);

export function isVideoProductionSku(skuId: string): boolean {
  return VIDEO_SKU_SET.has(skuId);
}

/** Video QA gate for marketing_video / short-video SKUs — not voice SKUs. */
export function requiresVideoQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk =
    task.phase === "creative" ||
    task.phase === "creative_production" ||
    task.phase === "qa";
  if (!phaseOk) return false;
  if (task.familyId !== "video_audio") return false;
  return task.relatedServiceIds.some((id) => isVideoProductionSku(id));
}

function pushFail(
  findings: VideoQualityFinding[],
  id: string,
  checkKind: VideoQualityFinding["checkKind"],
  message: string,
): void {
  findings.push({ id, severity: "fail", checkKind, message });
}

export function defaultVideoQualityBrief(
  skuId: string,
  campaignId: string,
  scriptVersionId: string,
): VideoQualityBrief {
  return {
    skuId,
    campaignId,
    scriptVersionId,
    allowedExtensions: VIDEO_ALLOWED_EXTENSIONS,
    durationMinSeconds: VIDEO_DURATION_MIN_SECONDS,
    durationMaxSeconds: VIDEO_DURATION_MAX_SECONDS,
    assemblyCapability: "present_and_usable",
    requireArtifactBinding: true,
    musicUsed: false,
    musicRightsResolved: false,
  };
}

export function evaluateVideoQuality(input: {
  brief: VideoQualityBrief;
  submission: VideoQualitySubmission;
  checkedAt?: string;
}): VideoQualityEvaluation {
  const findings: VideoQualityFinding[] = [];
  const { brief, submission } = input;

  if (submission.skuId !== brief.skuId || !isVideoProductionSku(submission.skuId)) {
    pushFail(
      findings,
      "sku_mismatch",
      "sku_scope",
      `Submission SKU ${submission.skuId} is not the short-video production SKU under test`,
    );
  }

  if (submission.campaignId !== brief.campaignId) {
    pushFail(
      findings,
      "campaign_mismatch",
      "campaign_scope",
      "Submission campaignId does not match brief campaign",
    );
  }

  if (!submission.scriptVersionId.trim() || submission.scriptVersionId !== brief.scriptVersionId) {
    pushFail(
      findings,
      "script_version_mismatch",
      "script_version",
      "scriptVersionId must match the approved locked script/copy version",
    );
  }

  const assetTruth = evaluateCustomerAssetTruth(submission.assetInputKind);
  findings.push(...assetTruth.findings);

  if (brief.assemblyCapability === "integration_required") {
    pushFail(
      findings,
      "assembly_not_integrated",
      "generation_capability",
      "Studio MP4 assembly is INTEGRATION REQUIRED — cannot claim Studio-generated customer video",
    );
  }

  if (
    submission.claimsStudioAssembledVideo &&
    brief.assemblyCapability === "integration_required"
  ) {
    pushFail(
      findings,
      "phantom_studio_assembly",
      "phantom_file",
      "Cannot claim Studio-assembled MP4 while assembly remains integration_required",
    );
  }

  if (submission.renderState === "render_failed") {
    pushFail(
      findings,
      "render_failed",
      "render_state",
      "Failed render cannot become QA READY",
    );
  }

  if (submission.renderState === "render_pending" || submission.renderState === "not_started") {
    pushFail(
      findings,
      "render_incomplete",
      "render_state",
      "Render must complete successfully before QA READY",
    );
  }

  if (brief.musicUsed && !brief.musicRightsResolved) {
    pushFail(
      findings,
      "music_unresolved",
      "music_rights",
      "MUSIC CAPABILITY = UNRESOLVED — music cannot be relied on until rights are certain",
    );
  }

  if (brief.requireVoiceArtifact) {
    const voiceHash = submission.voiceArtifactSha256?.trim().toLowerCase();
    if (!voiceHash) {
      pushFail(
        findings,
        "voice_required_missing",
        "voice_artifact",
        "Voice-over is required for this submission but no certified voice artifact hash was provided",
      );
    }
  }

  const artifacts = submission.artifacts ?? [];
  if (artifacts.length === 0) {
    pushFail(
      findings,
      "artifact_required",
      "artifact_path",
      "A bound MP4 artifact is required for short-video QA",
    );
  }

  for (const artifact of artifacts) {
    const ext = artifact.extension.replace(/^\./, "").toLowerCase();
    if (!brief.allowedExtensions.includes(ext)) {
      pushFail(
        findings,
        `format_${artifact.id}`,
        "format",
        `Artifact ${artifact.id} extension .${ext} is not the promised MP4 format`,
      );
    }

    if (artifact.declaredDurationSeconds != null) {
      if (
        artifact.declaredDurationSeconds < brief.durationMinSeconds ||
        artifact.declaredDurationSeconds > brief.durationMaxSeconds
      ) {
        pushFail(
          findings,
          `duration_${artifact.id}`,
          "duration",
          `Artifact ${artifact.id} duration ${artifact.declaredDurationSeconds}s outside ${brief.durationMinSeconds}–${brief.durationMaxSeconds}s contract`,
        );
      }
    }

    if (brief.requireVoiceArtifact && submission.voiceArtifactSha256) {
      const expected = submission.voiceArtifactSha256.trim().toLowerCase();
      const declared = artifact.voiceArtifactSha256?.trim().toLowerCase();
      if (declared && declared !== expected) {
        pushFail(
          findings,
          `voice_bind_${artifact.id}`,
          "voice_artifact",
          `Artifact ${artifact.id} voice hash does not match the referenced certified voice artifact`,
        );
      }
    }
  }

  if (brief.requireArtifactBinding !== false && artifacts.length > 0) {
    const bind = evaluateVideoArtifactBindings({
      repoRoot: brief.artifactRepoRoot ?? process.cwd(),
      artifacts,
      scriptVersionId: brief.scriptVersionId,
      campaignId: brief.campaignId,
      skuId: brief.skuId,
      requireBinding: true,
    });
    findings.push(...bind.findings);
  }

  const deterministicFailCount = findings.filter((f) => f.severity === "fail").length;
  const ok = deterministicFailCount === 0;

  return {
    skuId: brief.skuId,
    ok,
    findings,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    deterministicFailCount,
    judgmentRequired: true,
    assemblyCapability: brief.assemblyCapability,
    summary: ok
      ? "Deterministic video checks passed — human visual/listening judgment still required for QA PASS"
      : `Deterministic video checks failed (${deterministicFailCount})`,
  };
}

export function validateVideoQualityAttestations(
  attestations: VideoQualityJudgmentAttestations,
): { ok: boolean; missing: readonly string[] } {
  const required: Array<keyof VideoQualityJudgmentAttestations> = [
    "pacingReviewed",
    "visualHierarchyReviewed",
    "textLegibilityReviewed",
    "captionAccuracyReviewed",
    "timingReviewed",
    "transitionsReviewed",
    "compositionReviewed",
    "brandingReviewed",
    "imageVideoQualityReviewed",
    "audioBalanceReviewed",
    "voiceIntelligibilityReviewed",
    "musicAppropriatenessReviewed",
    "noAwkwardCutsReviewed",
    "noAccidentalBlackFramesReviewed",
    "noStretchedCroppedAssetsReviewed",
    "noUnreadableMobileTextReviewed",
    "noMisleadingContentReviewed",
    "commercialUsabilityReviewed",
    "viewingMatchesBoundArtifact",
  ];
  const missing = required.filter((k) => attestations[k] !== true);
  return { ok: missing.length === 0, missing };
}

/**
 * QA PASS requires deterministic ok + full human attestations bound to the artifact.
 * Metadata / incomplete checklist cannot pass.
 */
export function gateVideoQualityForQaPass(input: {
  brief: VideoQualityBrief;
  submission: VideoQualitySubmission;
  attestations: VideoQualityJudgmentAttestations;
  checkedAt?: string;
}): {
  evaluation: VideoQualityEvaluation;
  attestationsOk: boolean;
  gatePassed: boolean;
  customerReady: false;
} {
  const evaluation = evaluateVideoQuality({
    brief: input.brief,
    submission: input.submission,
    checkedAt: input.checkedAt,
  });
  const attest = validateVideoQualityAttestations(input.attestations);
  const gatePassed = evaluation.ok && attest.ok;
  return {
    evaluation,
    attestationsOk: attest.ok,
    gatePassed,
    customerReady: false,
  };
}
