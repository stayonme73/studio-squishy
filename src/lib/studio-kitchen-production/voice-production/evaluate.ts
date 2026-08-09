import { createHash } from "crypto";
import { existsSync, readFileSync, statSync } from "fs";
import path from "path";

import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import {
  VOICE_ALLOWED_AUDIO_EXTENSIONS,
  VOICE_PRODUCTION_SKUS,
  VOICE_SCRIPT_WORD_LIMIT,
} from "./contracts";
import type {
  AudioQualityBrief,
  AudioQualityEvaluation,
  AudioQualityFinding,
  AudioQualityJudgmentAttestations,
  AudioQualitySubmission,
} from "./types";

const VOICE_SKU_SET = new Set<string>(VOICE_PRODUCTION_SKUS);

export function isVoiceProductionSku(skuId: string): boolean {
  return VOICE_SKU_SET.has(skuId);
}

/**
 * Audio QA gate for voice SKUs on creative/qa phases.
 * Does not gate marketing_video / CapCut short-video paths.
 */
export function requiresAudioQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk =
    task.phase === "creative" ||
    task.phase === "creative_production" ||
    task.phase === "qa" ||
    task.phase === "copy";
  if (!phaseOk) return false;
  if (task.familyId !== "video_audio") return false;
  return task.relatedServiceIds.some((id) => isVoiceProductionSku(id));
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function pushFail(
  findings: AudioQualityFinding[],
  id: string,
  checkKind: AudioQualityFinding["checkKind"],
  message: string,
): void {
  findings.push({ id, severity: "fail", checkKind, message });
}

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export function evaluateAudioQuality(input: {
  brief: AudioQualityBrief;
  submission: AudioQualitySubmission;
  checkedAt?: string;
}): AudioQualityEvaluation {
  const findings: AudioQualityFinding[] = [];
  const { brief, submission } = input;
  const limit = brief.scriptWordLimit || VOICE_SCRIPT_WORD_LIMIT;
  const script = submission.scriptText ?? "";

  if (!script.trim()) {
    pushFail(findings, "script_required", "script_required", "Approved script text is required");
  } else {
    const words = countWords(script);
    if (words > limit) {
      pushFail(
        findings,
        "script_word_limit",
        "script_limit",
        `Script exceeds ${limit}-word contract limit (${words} words)`,
      );
    }
  }

  if (!submission.scriptVersionId.trim()) {
    pushFail(
      findings,
      "script_version_missing",
      "script_required",
      "scriptVersionId is required to bind audio to an approved script version",
    );
  }

  const artifacts = submission.artifacts ?? [];

  // Honest production truth: voice SKUs cannot QA-pass while generation remains unwired.
  if (brief.generationCapability === "integration_required") {
    pushFail(
      findings,
      "generation_not_integrated",
      "generation_capability",
      "Studio AI voice generation is integration_required — cannot QA-pass or certify customer voice deliverables until an approved vendor/path is wired",
    );
  } else if (
    submission.claimsStudioGeneratedAudio &&
    brief.generationCapability !== "present_and_usable" &&
    brief.generationCapability !== "manual_operational_authorized"
  ) {
    pushFail(
      findings,
      "generation_claim_unsupported",
      "generation_capability",
      "claimsStudioGeneratedAudio requires present_and_usable or authorized manual-operational generation",
    );
  }

  if (artifacts.length === 0) {
    pushFail(
      findings,
      "audio_artifact_missing",
      "phantom_file",
      "No audio artifact registered — cannot QA-pass or certify a voice deliverable without an actual file",
    );
  }

  const repoRoot = brief.artifactRepoRoot ?? process.cwd();
  const requireBinding = brief.requireArtifactBinding !== false;

  for (const artifact of artifacts) {
    if (!artifact.relativePath.trim()) {
      pushFail(
        findings,
        `path_${artifact.id}`,
        "artifact_path",
        `Artifact ${artifact.id} missing evidence path`,
      );
      continue;
    }
    const ext = artifact.extension.toLowerCase().replace(/^\./, "");
    const allowed = (brief.allowedExtensions.length
      ? brief.allowedExtensions
      : VOICE_ALLOWED_AUDIO_EXTENSIONS
    ).map((e) => e.toLowerCase());
    if (!allowed.includes(ext)) {
      pushFail(
        findings,
        `format_${artifact.id}`,
        "format",
        `Artifact ${artifact.id} extension .${ext} not in allowed set (${allowed.join(", ")})`,
      );
    }
    if (artifact.scriptVersionId !== submission.scriptVersionId) {
      pushFail(
        findings,
        `script_bind_${artifact.id}`,
        "artifact_binding",
        `Artifact ${artifact.id} scriptVersionId does not match submission script version`,
      );
    }

    const abs = path.join(repoRoot, artifact.relativePath);
    if (!existsSync(abs)) {
      pushFail(
        findings,
        `missing_file_${artifact.id}`,
        "phantom_file",
        `Audio file missing on disk at ${artifact.relativePath} — production must not claim a file exists when none exists`,
      );
      continue;
    }

    if (requireBinding) {
      const declared = artifact.contentSha256?.trim().toLowerCase();
      const actual = sha256File(abs);
      if (!declared) {
        pushFail(
          findings,
          `hash_missing_${artifact.id}`,
          "artifact_binding",
          `Artifact ${artifact.id} missing contentSha256 — QA cannot certify unbound audio metadata`,
        );
      } else if (declared !== actual) {
        pushFail(
          findings,
          `hash_mismatch_${artifact.id}`,
          "artifact_binding",
          `Artifact ${artifact.id} contentSha256 does not match file bytes`,
        );
      }
      const bytes = statSync(abs).size;
      if (bytes <= 0) {
        pushFail(
          findings,
          `empty_${artifact.id}`,
          "phantom_file",
          `Artifact ${artifact.id} is empty`,
        );
      }
    }
  }

  const fails = findings.filter((f) => f.severity === "fail");
  return {
    skuId: brief.skuId,
    ok: fails.length === 0,
    findings,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    deterministicFailCount: fails.length,
    judgmentRequired: true,
    generationCapability: brief.generationCapability,
    summary: fails.length
      ? `Audio-quality failed (${fails.length}): ${fails
          .slice(0, 6)
          .map((f) => f.message)
          .join("; ")}`
      : "Deterministic audio checks passed. Listening judgment attestations still required.",
  };
}

export function validateAudioQualityAttestations(
  attestations: AudioQualityJudgmentAttestations | undefined,
): { ok: true } | { ok: false; error: string; findings: AudioQualityFinding[] } {
  const findings: AudioQualityFinding[] = [];
  if (!attestations) {
    return {
      ok: false,
      error:
        "Voice-family QA pass requires audioQuality payload with listening judgment attestations.",
      findings: [
        {
          id: "attestations_missing",
          severity: "fail",
          checkKind: "judgment_attestation",
          message: "Audio judgment attestations missing",
        },
      ],
    };
  }

  const required: Array<[keyof AudioQualityJudgmentAttestations, string]> = [
    ["scriptFidelityReviewed", "Exact script fidelity must be reviewed by listening"],
    ["pronunciationReviewed", "Pronunciation (names/brands/numbers) must be reviewed"],
    ["pacingNaturalnessReviewed", "Pacing/naturalness must be reviewed"],
    ["intelligibilityReviewed", "Intelligibility must be reviewed"],
    ["artifactsClippingSilenceReviewed", "Artifacts/clipping/silence must be reviewed"],
    ["listeningMatchesBoundArtifact", "Listening judgment must be tied to the bound audio file"],
  ];

  for (const [key, message] of required) {
    if (key === "notes") continue;
    if (attestations[key] !== true) {
      pushFail(findings, `attestation_${key}`, "judgment_attestation", message);
    }
  }

  const notes = attestations.notes.trim();
  if (notes.length < 40) {
    pushFail(
      findings,
      "attestation_notes_thin",
      "judgment_attestation",
      "Listening notes must explain audio judgment (min 40 characters) — looks_good=true is not sufficient",
    );
  }
  if (
    !/sha256|contentsha|bound file|hash/i.test(notes) &&
    attestations.listeningMatchesBoundArtifact
  ) {
    pushFail(
      findings,
      "attestation_notes_unbound",
      "judgment_attestation",
      "Listening notes must reference the bound artifact hash/path",
    );
  }

  if (findings.length) {
    return { ok: false, error: findings.map((f) => f.message).join("; "), findings };
  }
  return { ok: true };
}

export function gateAudioQualityForQaPass(input: {
  brief: AudioQualityBrief;
  submission: AudioQualitySubmission;
  attestations: AudioQualityJudgmentAttestations;
  checkedAt?: string;
}):
  | {
      ok: true;
      evaluation: AudioQualityEvaluation;
      attestations: AudioQualityJudgmentAttestations;
    }
  | {
      ok: false;
      error: string;
      evaluation: AudioQualityEvaluation;
      findings: readonly AudioQualityFinding[];
    } {
  const evaluation = evaluateAudioQuality({
    brief: input.brief,
    submission: input.submission,
    checkedAt: input.checkedAt,
  });
  const attestation = validateAudioQualityAttestations(input.attestations);
  if (!evaluation.ok) {
    return {
      ok: false,
      error: evaluation.summary,
      evaluation,
      findings: evaluation.findings,
    };
  }
  if (!attestation.ok) {
    return {
      ok: false,
      error: attestation.error,
      evaluation,
      findings: attestation.findings,
    };
  }
  return { ok: true, evaluation, attestations: input.attestations };
}

export function defaultVoiceAudioBrief(skuId: string): AudioQualityBrief {
  return {
    skuId,
    scriptWordLimit: VOICE_SCRIPT_WORD_LIMIT,
    allowedExtensions: [...VOICE_ALLOWED_AUDIO_EXTENSIONS],
    generationCapability: "integration_required",
    requireArtifactBinding: true,
  };
}
