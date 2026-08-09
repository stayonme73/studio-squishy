/**
 * Kitchen voice generation boundary — narrow provider abstraction.
 * generateVoiceArtifact(...) is the only production entry for ElevenLabs TTS.
 */

import {
  VOICE_PRODUCTION_SKUS,
  VOICE_SCRIPT_WORD_LIMIT,
  type VoiceProductionSku,
} from "./contracts";
import {
  ELEVENLABS_MP3_OUTPUT_FORMAT,
  ELEVENLABS_WAV_OUTPUT_FORMAT,
  elevenLabsCredentialPresence,
  resolveApprovedVoiceConfiguration,
} from "./elevenlabs/config";
import { elevenLabsTextToSpeech } from "./elevenlabs/client";
import type { ElevenLabsAccountCapability, ElevenLabsFetch } from "./elevenlabs/types";
import { discoverElevenLabsAccountCapability } from "./elevenlabs/capability";
import { persistVoiceArtifactBytes, type PersistedVoiceArtifact } from "./persist";

function isVoiceSku(skuId: string): skuId is VoiceProductionSku {
  return (VOICE_PRODUCTION_SKUS as readonly string[]).includes(skuId);
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export type GenerateVoiceArtifactInput = {
  campaignId: string;
  skuId: string;
  approvedScript: string;
  scriptVersionId: string;
  /** Contract formats only. */
  outputFormat: "mp3" | "wav";
  /** Internal synthetic tests must set true. */
  internalTest?: boolean;
  /** Certification fixture path/label (cert package). */
  certificationFixture?: boolean;
  /** Override artifact root (defaults to integration artifacts dir). */
  artifactRoot?: string;
  repoRoot?: string;
  /** Test injection */
  fetchImpl?: ElevenLabsFetch;
  env?: NodeJS.ProcessEnv;
  capability?: ElevenLabsAccountCapability;
  /** Optional override of voice config — must still be approved provider IDs, not clones. */
  voiceConfiguration?: ReturnType<typeof resolveApprovedVoiceConfiguration>;
};

export type GenerateVoiceArtifactSuccess = {
  ok: true;
  provider: "elevenlabs";
  kitchenState: "audio_generated" | "qa_ready";
  /** Generation never auto-passes QA. */
  qaPassed: false;
  customerReady: false;
  artifact: PersistedVoiceArtifact;
  evidence: {
    provider: "elevenlabs";
    providerVoiceId: string;
    providerModelId: string;
    providerRequestId?: string;
    outputFormat: "mp3" | "wav";
    providerOutputFormat: string;
    byteLength: number;
    contentSha256: string;
    scriptVersionId: string;
    skuId: VoiceProductionSku;
    campaignId: string;
    generatedAt: string;
  };
};

export type GenerateVoiceArtifactFailure = {
  ok: false;
  kitchenState: "generation_failed";
  qaPassed: false;
  customerReady: false;
  code:
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
    | "capability_unavailable"
    | "sku_not_voice";
  message: string;
};

export type GenerateVoiceArtifactResult =
  | GenerateVoiceArtifactSuccess
  | GenerateVoiceArtifactFailure;

function fail(
  code: GenerateVoiceArtifactFailure["code"],
  message: string,
): GenerateVoiceArtifactFailure {
  return {
    ok: false,
    kitchenState: "generation_failed",
    qaPassed: false,
    customerReady: false,
    code,
    message,
  };
}

/**
 * Approved script → validate → generate → persist → bind → QA ready (not QA pass).
 */
export async function generateVoiceArtifact(
  input: GenerateVoiceArtifactInput,
): Promise<GenerateVoiceArtifactResult> {
  if (!isVoiceSku(input.skuId)) {
    return fail("sku_not_voice", `SKU ${input.skuId} is not a voice production SKU`);
  }
  const skuId = input.skuId;

  const scriptVersionId = input.scriptVersionId?.trim() ?? "";
  if (!scriptVersionId) {
    return fail("script_version_missing", "scriptVersionId is required — cannot generate unbound audio");
  }

  const script = input.approvedScript ?? "";
  if (!script.trim()) {
    return fail("script_invalid", "Approved final script is required");
  }
  const words = countWords(script);
  if (words > VOICE_SCRIPT_WORD_LIMIT) {
    return fail(
      "script_invalid",
      `Script exceeds ${VOICE_SCRIPT_WORD_LIMIT}-word contract limit (${words} words)`,
    );
  }

  if (input.outputFormat !== "mp3" && input.outputFormat !== "wav") {
    return fail("unsupported_output", "Only mp3 or wav output formats are supported");
  }

  const env = input.env ?? process.env;
  const creds = elevenLabsCredentialPresence(env);
  if (!creds.configured) {
    return fail(
      "credentials_absent",
      "ELEVENLABS_API_KEY is not configured on the server. Add it to .env.local — do not paste keys into chat. Integration boundary is built; live generation is blocked.",
    );
  }

  const capability =
    input.capability ??
    (await discoverElevenLabsAccountCapability({
      env,
      fetchImpl: input.fetchImpl,
    }));

  // Hard-block only on true provider/auth failure — not live_partial (missing user_read).
  if (capability.discoveryMode === "provider_error" && capability.ttsAccessible === false) {
    return fail(
      "capability_unavailable",
      capability.blockingGap ?? "ElevenLabs capability discovery failed",
    );
  }

  if (input.outputFormat === "wav") {
    if (capability.wavSupported === false) {
      return fail(
        "unsupported_output",
        "WAV output is not available on this ElevenLabs account tier. Catalog still promises MP3/WAV — do not conceal this discrepancy. Use mp3 or upgrade plan after owner decision.",
      );
    }
    if (capability.wavSupported === "unknown") {
      return fail(
        "unsupported_output",
        "WAV output is not verified for this account (subscription discovery incomplete). Use mp3 for this package run — do not assume WAV.",
      );
    }
  }

  if (input.outputFormat === "mp3" && capability.mp3Supported === false) {
    return fail("unsupported_output", "MP3 output is not available for this account");
  }

  const voice = input.voiceConfiguration ?? resolveApprovedVoiceConfiguration(env);
  const providerOutputFormat =
    input.outputFormat === "mp3"
      ? ELEVENLABS_MP3_OUTPUT_FORMAT
      : ELEVENLABS_WAV_OUTPUT_FORMAT;

  const tts = await elevenLabsTextToSpeech(
    {
      voiceId: voice.voiceId,
      modelId: voice.modelId,
      text: script,
      outputFormat: providerOutputFormat,
    },
    {
      apiKey: env.ELEVENLABS_API_KEY?.trim(),
      fetchImpl: input.fetchImpl,
    },
  );

  if (!tts.ok) {
    return fail(tts.code, tts.message);
  }

  const persisted = persistVoiceArtifactBytes({
    repoRoot: input.repoRoot ?? process.cwd(),
    campaignId: input.campaignId,
    skuId,
    scriptVersionId,
    extension: input.outputFormat,
    audioBytes: tts.audioBytes,
    providerVoiceId: voice.voiceId,
    providerModelId: voice.modelId,
    providerRequestId: tts.providerRequestId,
    internalTest: input.internalTest === true,
    certificationFixture: input.certificationFixture === true,
    artifactRoot: input.artifactRoot,
  });

  if ("error" in persisted) {
    return fail(persisted.code, persisted.error);
  }

  return {
    ok: true,
    provider: "elevenlabs",
    kitchenState: "qa_ready",
    qaPassed: false,
    customerReady: false,
    artifact: persisted,
    evidence: {
      provider: "elevenlabs",
      providerVoiceId: voice.voiceId,
      providerModelId: voice.modelId,
      providerRequestId: tts.providerRequestId,
      outputFormat: input.outputFormat,
      providerOutputFormat,
      byteLength: persisted.byteLength,
      contentSha256: persisted.contentSha256,
      scriptVersionId,
      skuId,
      campaignId: input.campaignId,
      generatedAt: persisted.generatedAt,
    },
  };
}

/** Map SKU → ElevenLabs production path (provider identity for Kitchen). */
export function voiceSkuProductionProvider(skuId: string): {
  skuId: string;
  provider: "elevenlabs";
  api: "text-to-speech";
  toolId: "ai_voice_tool";
  customerReady: false;
} | null {
  if (!isVoiceSku(skuId)) return null;
  return {
    skuId,
    provider: "elevenlabs",
    api: "text-to-speech",
    toolId: "ai_voice_tool",
    customerReady: false,
  };
}
