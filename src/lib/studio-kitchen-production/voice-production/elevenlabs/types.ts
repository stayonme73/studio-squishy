export type ElevenLabsFailureCode =
  | "credentials_absent"
  | "configuration_failure"
  | "provider_network_failure"
  | "rate_or_usage_failure"
  | "invalid_request"
  | "unsupported_output"
  | "empty_audio"
  | "persistence_failure"
  | "script_invalid"
  | "script_version_missing"
  | "capability_unavailable";

export type ElevenLabsTtsRequest = {
  voiceId: string;
  modelId: string;
  text: string;
  outputFormat: string;
};

export type ElevenLabsTtsSuccess = {
  ok: true;
  audioBytes: Buffer;
  contentType: string | null;
  /** Provider request id when exposed safely (header). Never an API key. */
  providerRequestId?: string;
  byteLength: number;
};

export type ElevenLabsTtsFailure = {
  ok: false;
  code: ElevenLabsFailureCode;
  /** Safe operator message — must never include API key material. */
  message: string;
  httpStatus?: number;
};

export type ElevenLabsTtsResult = ElevenLabsTtsSuccess | ElevenLabsTtsFailure;

export type ElevenLabsAccountCapability = {
  discoveredAt: string;
  credentialsPresent: boolean;
  ttsAccessible: boolean | "unknown";
  mp3Supported: boolean | "unknown";
  /**
   * WAV/PCM high-rate output often requires Pro+.
   * `unknown` when credentials absent or discovery incomplete.
   */
  wavSupported: boolean | "unknown";
  wavSupportNote: string;
  subscriptionTier: string | "unknown";
  commercialUseNote: string;
  availableVoiceCount: number | "unknown";
  approvedVoiceId: string;
  approvedModelId: string;
  /** Contract discrepancy when catalog promises WAV but account cannot. */
  catalogWavDiscrepancy: boolean;
  /**
   * live — full user/subscription discovery succeeded
   * live_partial — key works for TTS but lacks user_read/voices scope (common on restricted keys)
   * credentials_absent / provider_error — cannot proceed (or hard auth failure)
   */
  discoveryMode: "live" | "live_partial" | "credentials_absent" | "provider_error";
  blockingGap?: string;
};

/** Injected fetch for tests — never logs secrets. */
export type ElevenLabsFetch = typeof fetch;
