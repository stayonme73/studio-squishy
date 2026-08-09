/**
 * ElevenLabs TTS configuration — server-side only.
 * Never export API key values. Never serialize secrets into campaign records.
 */

/** Public default voice ID (ElevenLabs Rachel) — candidate only; not quality-certified. */
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/** Stable multilingual TTS model — not a beta/experimental production path. */
export const DEFAULT_ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

export const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

/** MP3 format available across common paid tiers. */
export const ELEVENLABS_MP3_OUTPUT_FORMAT = "mp3_44100_128" as const;

/**
 * WAV/PCM 44.1kHz typically requires Pro+. Do not assume availability —
 * capability discovery must confirm before offering WAV generation.
 */
export const ELEVENLABS_WAV_OUTPUT_FORMAT = "wav_44100" as const;

export type ElevenLabsOutputFormat =
  | typeof ELEVENLABS_MP3_OUTPUT_FORMAT
  | typeof ELEVENLABS_WAV_OUTPUT_FORMAT;

export type ApprovedVoiceConfiguration = {
  provider: "elevenlabs";
  voiceId: string;
  modelId: string;
  /** Config source — never contains secrets. */
  source: "env" | "default_candidate";
};

export type ElevenLabsCredentialPresence = {
  configured: boolean;
  /** Always redacted — never the raw key. */
  apiKeyPresent: boolean;
  envVarName: "ELEVENLABS_API_KEY";
};

/**
 * Read API key from process.env. Return value is for server fetch only —
 * callers must not log, persist, or return it in error payloads.
 */
export function readElevenLabsApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const key = env.ELEVENLABS_API_KEY?.trim();
  return key || undefined;
}

export function elevenLabsCredentialPresence(
  env: NodeJS.ProcessEnv = process.env,
): ElevenLabsCredentialPresence {
  const key = readElevenLabsApiKey(env);
  return {
    configured: Boolean(key),
    apiKeyPresent: Boolean(key),
    envVarName: "ELEVENLABS_API_KEY",
  };
}

/**
 * Deterministic approved voice configuration.
 * Customers cannot supply arbitrary clone IDs through this path.
 */
export function resolveApprovedVoiceConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ApprovedVoiceConfiguration {
  const fromEnv = env.ELEVENLABS_VOICE_ID?.trim();
  const modelFromEnv = env.ELEVENLABS_MODEL_ID?.trim();
  return {
    provider: "elevenlabs",
    voiceId: fromEnv || DEFAULT_ELEVENLABS_VOICE_ID,
    modelId: modelFromEnv || DEFAULT_ELEVENLABS_MODEL_ID,
    source: fromEnv ? "env" : "default_candidate",
  };
}

/** Strip any accidental secret fields from objects destined for records/logs. */
export function redactSecretsForEvidence<T extends Record<string, unknown>>(obj: T): T {
  const blocked = /api[_-]?key|authorization|xi-api-key|secret|token/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (blocked.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 20 && /sk_|xi[-_]/i.test(v)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = v;
  }
  return out as T;
}
