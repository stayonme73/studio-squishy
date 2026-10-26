import {
  SOURCE_AUDIO_CUSTOMER_NOTICE,
  STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
} from "@/config/studio-source-audio-preflight-v1";

export type SourceAudioGateOutcome =
  | "PASS"
  | "NOTICE_AND_CHOICE"
  | "REPLACEMENT_REQUIRED";

export type SourceAudioClippingCluster = {
  startSeconds: number;
  endSeconds: number;
  durationMs: number;
  hitCount: number;
  peak: number;
  clippedDensity: number;
};

export type SourceAudioClippingScan = {
  durationSeconds: number;
  sampleRate: number;
  sampleCount: number;
  hitCount: number;
  peak: number;
  clippedSampleRatio: number;
  clusters: readonly SourceAudioClippingCluster[];
  clustersPerMinute: number;
};

export type SourceAudioClippingKind =
  | "none"
  | "isolated_needles"
  | "sustained_plateau"
  | "repeated_clusters"
  | "widespread_ratio";

export type SourceAudioMeasurement = {
  hasAudio: boolean;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  hissMeanDb: number | null;
  speechToHissDb: number | null;
  clipping?: SourceAudioClippingScan;
  clippingKind?: SourceAudioClippingKind;
};

export type SourceAudioGateResult = {
  packageId: typeof STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID;
  outcome: SourceAudioGateOutcome;
  measurement: SourceAudioMeasurement;
  customerNotice: typeof SOURCE_AUDIO_CUSTOMER_NOTICE | null;
  reason: string;
};

export type SourceAudioPreflightRecord = {
  packageId: typeof STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID;
  skuId: string;
  outcome: SourceAudioGateOutcome;
  customerNotice?: string;
  customerAcknowledgedLimitation?: boolean;
  proceedWithThisSource?: boolean;
  acknowledgedAt?: string;
  selectedSourceRelativePath?: string;
  cleanupPassesAttempted?: number;
  cleanupKept?: boolean;
  revertedToOriginal?: boolean;
};

export type SourceAudioPrepareResult =
  | {
      ok: true;
      outcome: SourceAudioGateOutcome;
      sourceAbsolutePath: string;
      sourceRelativePath: string;
      cleanupPassesAttempted: number;
      cleanupKept: boolean;
      revertedToOriginal: boolean;
    }
  | {
      ok: false;
      outcome: SourceAudioGateOutcome;
      failureCode:
        | "SOURCE_AUDIO_REPLACEMENT_REQUIRED"
        | "SOURCE_AUDIO_CUSTOMER_CHOICE_REQUIRED"
        | "SOURCE_AUDIO_PREFLIGHT_FAILED";
      message: string;
    };
