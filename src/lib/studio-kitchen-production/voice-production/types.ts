/**
 * Runtime audio-quality evaluation for voice SKUs (ap-001 / v2-rtu-voice).
 * Deterministic checks ≠ listening judgment. Metadata alone cannot prove audio quality.
 */

export type AudioQualityFinding = {
  id: string;
  severity: "fail" | "warn";
  message: string;
  checkKind:
    | "script_limit"
    | "script_required"
    | "format"
    | "artifact_path"
    | "artifact_binding"
    | "generation_capability"
    | "phantom_file"
    | "judgment_attestation"
    | "scope";
};

export type AudioGenerationCapability =
  | "integration_required"
  | "present_and_usable"
  | "manual_operational_authorized";

export type AudioArtifactRef = {
  id: string;
  relativePath: string;
  extension: string;
  contentSha256?: string;
  /** Script version this audio claims to render. */
  scriptVersionId: string;
  byteLength?: number;
  /** Declared duration seconds when known — optional. */
  declaredDurationSeconds?: number;
};

export type AudioQualityBrief = {
  skuId: string;
  scriptWordLimit: number;
  allowedExtensions: readonly string[];
  generationCapability: AudioGenerationCapability;
  /** Repo root for hash binding (defaults to cwd). */
  artifactRepoRoot?: string;
  requireArtifactBinding?: boolean;
};

export type AudioQualitySubmission = {
  /** Final approved script text (word-count source of truth). */
  scriptText: string;
  scriptVersionId: string;
  /**
   * Studio-generated claim. When true and generationCapability is integration_required,
   * QA must fail unless a real bound artifact is also present AND capability is upgraded.
   */
  claimsStudioGeneratedAudio: boolean;
  artifacts: readonly AudioArtifactRef[];
};

/**
 * Listening judgment attestations — all required for voice qa_pass.
 * Checklist/metadata alone cannot certify audio quality.
 */
export type AudioQualityJudgmentAttestations = {
  scriptFidelityReviewed: boolean;
  pronunciationReviewed: boolean;
  namesReviewed: boolean;
  numbersReviewed: boolean;
  priceReviewed: boolean;
  dateReviewed: boolean;
  timeReviewed: boolean;
  phoneReviewed: boolean;
  urlReviewed: boolean;
  acronymReviewed: boolean;
  pacingReviewed: boolean;
  naturalnessReviewed: boolean;
  intelligibilityReviewed: boolean;
  emphasisReviewed: boolean;
  unwantedArtifactsReviewed: boolean;
  excessiveSilenceReviewed: boolean;
  clippingReviewed: boolean;
  usableVolumeReviewed: boolean;
  beginningEndCompleteReviewed: boolean;
  commercialUsabilityReviewed: boolean;
  /** Listening judgment tied to bound file hash/path. */
  listeningMatchesBoundArtifact: boolean;
  /**
   * Legacy aggregate fields — still accepted when true, but the granular
   * fields above are authoritative for qa_pass.
   */
  pacingNaturalnessReviewed?: boolean;
  artifactsClippingSilenceReviewed?: boolean;
  notes: string;
};

export type AudioQualityEvaluation = {
  skuId: string;
  ok: boolean;
  findings: readonly AudioQualityFinding[];
  checkedAt: string;
  deterministicFailCount: number;
  judgmentRequired: true;
  generationCapability: AudioGenerationCapability;
  summary: string;
};

export type AudioQualityEvidence = {
  evaluation: AudioQualityEvaluation;
  attestations: AudioQualityJudgmentAttestations;
  gatePassed: boolean;
};

export type AudioQualityQaPayload = {
  brief: AudioQualityBrief;
  submission: AudioQualitySubmission;
  attestations: AudioQualityJudgmentAttestations;
};
