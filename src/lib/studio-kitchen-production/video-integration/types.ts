/**
 * KITCHEN-VIDEO-INTEGRATION-1 — Shotstack producer types.
 * Shotstack is a producer, not Decision Core.
 */

export type ShotstackEnvName = "stage" | "v1";

export type ShotstackRenderStatus =
  | "queued"
  | "fetching"
  | "rendering"
  | "saving"
  | "done"
  | "failed"
  | "timed_out"
  | "download_failed"
  | "unknown";

/**
 * How captions appear for a scene:
 * - embedded_in_plate: caption already designed into the image; do NOT overlay same string
 * - overlay: Shotstack text clip carries the caption/CTA
 * Captions remain required for the SKU — collision is resolved by choosing one presentation.
 */
export type SceneCaptionPresentation = "embedded_in_plate" | "overlay";

export type ShotstackWorkPacketScene = {
  sceneNumber: number;
  assetId: string;
  relativePath: string;
  startSeconds: number;
  endSeconds: number;
  caption: string;
  captionPresentation?: SceneCaptionPresentation;
  /** Optional overlay style overrides (used for CTA contrast). */
  overlayTextColor?: string;
  overlayFontSize?: number;
  overlayBackgroundColor?: string;
  overlayOffsetY?: number;
  /** Restrained still-image motion. Applied only to the background photograph. */
  motionEffect?: "zoomIn" | "zoomOut" | "slideLeft" | "slideRight";
  /**
   * Stationary full-frame overlay (typically transparent PNG with type).
   * Never receives motionEffect. Required for motion-safe text.
   */
  overlayRelativePath?: string;
  /** Background scale > 1 so zoom/pan cannot reveal empty frame edges. */
  backgroundScale?: number;
};

/** Provider-independent packet shape bound for Shotstack production. */
export type ShotstackWorkPacket = {
  workPacketId: string;
  workPacketVersion: string;
  storyboardVersion: string;
  scriptVersionId: string;
  campaignId: string;
  skuId: "v2-rtu-short-video";
  label: string;
  durationMinSeconds: number;
  durationMaxSeconds: number;
  durationTargetSeconds: number;
  aspectRatio: "vertical";
  width: 1080;
  height: 1920;
  exportFormat: "mp4";
  musicAllowed: false;
  stockAllowed: false;
  productionMethod: "shotstack";
  productionRoleOwner: "creative_production";
  voiceArtifact: {
    relativePath: string;
    contentSha256: string;
  };
  /** Studio-persisted MP4 relative path (not CapCut). */
  exportRelativePath: string;
  /** Last scene caption is the CTA for this fixture. */
  ctaCaptionSceneNumber: number;
  /** Exact CTA string that must appear once (overlay). */
  primaryCtaText?: string;
  /** Shotstack environment required for this packet (v1 = no sandbox watermark). */
  requiredShotstackEnv?: ShotstackEnvName;
  scenes: readonly ShotstackWorkPacketScene[];
  supersedesWorkPacketVersion?: string;
  correctionReason?: string;
  ownerEscalation?: "owner_not_required";
  preserveV1RelativePath?: string;
  preserveV2RelativePath?: string;
  preserveV3RelativePath?: string;
  preserveV4RelativePath?: string;
  /**
   * Explicit narration→visual beat map (V4+). Times are scene start/end seconds
   * aligned to the certified voice track (proportional estimate documented in packet).
   */
  sceneToScriptMap?: readonly {
    sceneNumber: number;
    timeRange: string;
    narrationBeat: string;
    visual: string;
    designedText: string;
    captionBehavior: string;
  }[];
};

export type ShotstackEditPayload = {
  timeline: {
    soundtrack?: {
      src: string;
      volume?: number;
    };
    background?: string;
    tracks: Array<{
      clips: Array<Record<string, unknown>>;
    }>;
  };
  output: {
    format: "mp4";
    size: { width: number; height: number };
    fps: number;
  };
  callback?: string;
};

export type AssetUrlMap = ReadonlyMap<string, string>;

export type ShotstackSubmitResult =
  | { ok: true; providerRenderId: string; rawStatus?: string }
  | {
      ok: false;
      code:
        | "credentials_absent"
        | "submit_rejected"
        | "provider_network_failure"
        | "invalid_request";
      message: string;
      httpStatus?: number;
    };

export type ShotstackPollResult =
  | {
      ok: true;
      status: ShotstackRenderStatus;
      providerStatus: string;
      outputUrl?: string;
      error?: string;
      credits?: number;
      completedAt?: string;
    }
  | {
      ok: false;
      code: "credentials_absent" | "provider_network_failure" | "invalid_request";
      message: string;
      httpStatus?: number;
    };

export type ShotstackDownloadResult =
  | { ok: true; bytes: Buffer; contentType?: string }
  | {
      ok: false;
      code: "download_failed" | "provider_network_failure";
      message: string;
      httpStatus?: number;
    };

export type ShotstackIngestUploadResult =
  | { ok: true; sourceId: string; sourceUrl: string }
  | {
      ok: false;
      code:
        | "credentials_absent"
        | "ingest_failed"
        | "ingest_timeout"
        | "provider_network_failure";
      message: string;
    };

export type ShotstackRenderJobRecord = {
  jobId: string;
  provider: "shotstack";
  providerRenderId: string;
  campaignId: string;
  skuId: string;
  workPacketId: string;
  workPacketVersion: string;
  storyboardVersion: string;
  scriptVersionId: string;
  status: ShotstackRenderStatus;
  submittedAt: string;
  completedAt?: string;
  failureCode?: string;
  failureMessage?: string;
  requestHash: string;
  outputUrl?: string;
  retryCount: number;
  requestedWidth: number;
  requestedHeight: number;
  requestedAspect: "9:16";
  requestedDurationTargetSeconds: number;
  outputFormat: "mp4";
  sourceAssetPaths: readonly string[];
  sourceAssetHashes: Readonly<Record<string, string>>;
  voiceArtifactPath?: string;
  voiceArtifactSha256?: string;
  credits?: number;
};

export type ShotstackOutputArtifactRecord = {
  artifactId: string;
  jobId: string;
  provider: "shotstack";
  providerRenderId: string;
  relativePath: string;
  sha256: string;
  byteLength: number;
  mimeType: "video/mp4";
  width: number;
  height: number;
  durationSeconds: number;
  frameRate?: number;
  codec?: string;
  container: "mp4";
  boundAt: string;
  campaignId: string;
  skuId: string;
  workPacketId: string;
  workPacketVersion: string;
  storyboardVersion: string;
  scriptVersionId: string;
  voiceArtifactSha256?: string;
  qaState: "qa_ready";
  label: string;
  /** Explicit — never escalate in this package. */
  customerReady: false;
  certified: false;
  qaPass: false;
};

export type ShotstackFetch = typeof fetch;

export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
};
