/**
 * Video QA types for short-video production path.
 * Deterministic checks ≠ visual/listening judgment. Metadata alone cannot pass.
 */

export type VideoQualityFinding = {
  id: string;
  severity: "fail" | "warn";
  message: string;
  checkKind:
    | "sku_scope"
    | "campaign_scope"
    | "assets_required"
    | "format"
    | "duration"
    | "dimensions"
    | "aspect_ratio"
    | "audio_stream"
    | "artifact_path"
    | "artifact_binding"
    | "script_version"
    | "voice_artifact"
    | "stock_media"
    | "music_rights"
    | "render_state"
    | "phantom_file"
    | "generation_capability"
    | "judgment_attestation";
};

export type VideoAssemblyCapability =
  | "integration_required"
  | "present_and_usable"
  | "manual_operational_authorized";

export type VideoRenderState =
  | "not_started"
  | "render_pending"
  | "render_failed"
  | "render_completed";

export type VideoAssetInputKind =
  | "customer_footage"
  | "customer_photos"
  | "logo_and_copy_only"
  | "no_usable_media"
  | "insufficient_resolution"
  | "requested_unavailable_footage"
  | "approved_studio_stock_ai";

export type VideoArtifactRef = {
  id: string;
  relativePath: string;
  extension: string;
  contentSha256?: string;
  byteLength?: number;
  scriptVersionId: string;
  campaignId: string;
  skuId: string;
  declaredDurationSeconds?: number;
  declaredWidth?: number;
  declaredHeight?: number;
  declaredAspectRatio?: "vertical" | "square" | "landscape";
  declaredFrameRate?: number;
  hasAudioStream?: boolean;
  /** Bound certified voice MP3 hash when voice-over is used. */
  voiceArtifactSha256?: string;
  productionMethod: "capcut" | "unknown";
  sourceAssetRefs: readonly string[];
};

export type VideoQualityBrief = {
  skuId: string;
  campaignId: string;
  scriptVersionId: string;
  allowedExtensions: readonly string[];
  durationMinSeconds: number;
  durationMaxSeconds: number;
  assemblyCapability: VideoAssemblyCapability;
  artifactRepoRoot?: string;
  requireArtifactBinding?: boolean;
  /** When true, a bound certified voice MP3 hash is required. */
  requireVoiceArtifact?: boolean;
  /** When true, music presence requires resolved rights (currently fails). */
  musicUsed?: boolean;
  musicRightsResolved?: boolean;
};

export type VideoQualitySubmission = {
  scriptVersionId: string;
  campaignId: string;
  skuId: string;
  assetInputKind: VideoAssetInputKind;
  /** Claim that Studio assembled/exported the MP4. */
  claimsStudioAssembledVideo: boolean;
  renderState: VideoRenderState;
  artifacts: readonly VideoArtifactRef[];
  /** Optional reference to certified voice MP3 hash. */
  voiceArtifactSha256?: string;
};

/**
 * Human visual/listening judgment — all required for video qa_pass.
 * Checklist/metadata alone cannot certify video quality.
 */
export type VideoQualityJudgmentAttestations = {
  pacingReviewed: boolean;
  visualHierarchyReviewed: boolean;
  textLegibilityReviewed: boolean;
  captionAccuracyReviewed: boolean;
  timingReviewed: boolean;
  transitionsReviewed: boolean;
  compositionReviewed: boolean;
  brandingReviewed: boolean;
  imageVideoQualityReviewed: boolean;
  audioBalanceReviewed: boolean;
  voiceIntelligibilityReviewed: boolean;
  musicAppropriatenessReviewed: boolean;
  noAwkwardCutsReviewed: boolean;
  noAccidentalBlackFramesReviewed: boolean;
  noStretchedCroppedAssetsReviewed: boolean;
  noUnreadableMobileTextReviewed: boolean;
  noMisleadingContentReviewed: boolean;
  commercialUsabilityReviewed: boolean;
  /** Judgment tied to bound file hash/path. */
  viewingMatchesBoundArtifact: boolean;
  notes: string;
};

export type VideoQualityEvaluation = {
  skuId: string;
  ok: boolean;
  findings: readonly VideoQualityFinding[];
  checkedAt: string;
  deterministicFailCount: number;
  judgmentRequired: true;
  assemblyCapability: VideoAssemblyCapability;
  summary: string;
};

export type VideoQualityEvidence = {
  evaluation: VideoQualityEvaluation;
  attestations: VideoQualityJudgmentAttestations;
  gatePassed: boolean;
};

export type VideoQualityQaPayload = {
  brief: VideoQualityBrief;
  submission: VideoQualitySubmission;
  attestations: VideoQualityJudgmentAttestations;
};
