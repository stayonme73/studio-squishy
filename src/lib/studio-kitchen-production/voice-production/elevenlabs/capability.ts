/**
 * Discover what the configured ElevenLabs account can actually produce.
 * Do not hard-code WAV availability — Pro+ is often required for wav_44100.
 *
 * Restricted API keys may lack user_read / voices permissions while still
 * allowing Text-to-Speech. That is live_partial — not a hard generation block.
 */

import {
  elevenLabsCredentialPresence,
  resolveApprovedVoiceConfiguration,
} from "./config";
import { elevenLabsGetJson } from "./client";
import type { ElevenLabsAccountCapability, ElevenLabsFetch } from "./types";

type UserSubscriptionShape = {
  subscription?: {
    tier?: string;
    status?: string;
    can_extend_character_limit?: boolean;
  };
  subscription_tier?: string;
};

function tierAllowsHighRateWav(tier: string): boolean | "unknown" {
  const t = tier.toLowerCase().trim();
  if (!t || t === "unknown") return "unknown";
  // ElevenLabs docs: PCM/WAV 44.1kHz requires Pro tier or above.
  if (/\b(pro|scale|business|enterprise)\b/.test(t)) return true;
  if (/\b(free|starter|creator|trial)\b/.test(t)) return false;
  return "unknown";
}

function isMissingScopeFailure(message: string): boolean {
  return /missing endpoint permission|missing_permissions|user_read/i.test(message);
}

function isInvalidApiKeyFailure(message: string): boolean {
  return /invalid api key/i.test(message);
}

/**
 * Live or credentials-absent discovery. Never returns API key material.
 */
export async function discoverElevenLabsAccountCapability(options?: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: ElevenLabsFetch;
  baseUrl?: string;
  now?: string;
}): Promise<ElevenLabsAccountCapability> {
  const env = options?.env ?? process.env;
  const creds = elevenLabsCredentialPresence(env);
  const voice = resolveApprovedVoiceConfiguration(env);
  const discoveredAt = options?.now ?? new Date().toISOString();

  const commercialUseNote =
    "ElevenLabs documents that paid plans include commercial license for non-Beta Services when the user holds rights to underlying content. Confirm active paid plan before customer production. Beta/experimental paths are forbidden for customer deliverables.";

  if (!creds.configured) {
    return {
      discoveredAt,
      credentialsPresent: false,
      ttsAccessible: "unknown",
      mp3Supported: "unknown",
      wavSupported: "unknown",
      wavSupportNote:
        "WAV capability unknown — ELEVENLABS_API_KEY absent. Catalog still promises MP3/WAV; do not conceal discrepancy once discovery runs.",
      subscriptionTier: "unknown",
      commercialUseNote,
      availableVoiceCount: "unknown",
      approvedVoiceId: voice.voiceId,
      approvedModelId: voice.modelId,
      catalogWavDiscrepancy: false,
      discoveryMode: "credentials_absent",
      blockingGap:
        "Configure server-side ELEVENLABS_API_KEY (and optional ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID) in .env.local. Do not paste keys into chat.",
    };
  }

  const user = await elevenLabsGetJson("/v1/user", {
    apiKey: env.ELEVENLABS_API_KEY?.trim(),
    fetchImpl: options?.fetchImpl,
    baseUrl: options?.baseUrl,
  });

  if (!user.ok) {
    // Restricted keys often cannot read /v1/user but can still synthesize speech.
    if (isMissingScopeFailure(user.message) && !isInvalidApiKeyFailure(user.message)) {
      return {
        discoveredAt,
        credentialsPresent: true,
        ttsAccessible: "unknown",
        mp3Supported: true,
        wavSupported: "unknown",
        wavSupportNote:
          "WAV eligibility unknown — API key lacks user_read so subscription tier could not be discovered. Do not claim WAV until verified. MP3 path remains the supported production default for this package.",
        subscriptionTier: "unknown",
        commercialUseNote,
        availableVoiceCount: "unknown",
        approvedVoiceId: voice.voiceId,
        approvedModelId: voice.modelId,
        catalogWavDiscrepancy: false,
        discoveryMode: "live_partial",
        blockingGap:
          "Partial discovery: key lacks user_read/voices scope. MP3 generation may proceed; WAV account truth unresolved.",
      };
    }

    return {
      discoveredAt,
      credentialsPresent: true,
      ttsAccessible: false,
      mp3Supported: "unknown",
      wavSupported: "unknown",
      wavSupportNote: "Could not discover WAV support — user endpoint failed.",
      subscriptionTier: "unknown",
      commercialUseNote,
      availableVoiceCount: "unknown",
      approvedVoiceId: voice.voiceId,
      approvedModelId: voice.modelId,
      catalogWavDiscrepancy: false,
      discoveryMode: "provider_error",
      blockingGap: user.message,
    };
  }

  const userJson = user.json as UserSubscriptionShape;
  const tier =
    userJson.subscription?.tier ??
    userJson.subscription_tier ??
    "unknown";
  const wavSupported = tierAllowsHighRateWav(String(tier));

  const voices = await elevenLabsGetJson("/v1/voices", {
    apiKey: env.ELEVENLABS_API_KEY?.trim(),
    fetchImpl: options?.fetchImpl,
    baseUrl: options?.baseUrl,
  });

  let voiceCount: number | "unknown" = "unknown";
  if (voices.ok) {
    const v = voices.json as { voices?: unknown[] };
    if (Array.isArray(v.voices)) voiceCount = v.voices.length;
  }

  const catalogWavDiscrepancy = wavSupported === false;

  return {
    discoveredAt,
    credentialsPresent: true,
    ttsAccessible: true,
    // MP3 128kbps 44.1kHz is the documented default across common tiers.
    mp3Supported: true,
    wavSupported,
    wavSupportNote:
      wavSupported === true
        ? "Account tier appears eligible for high-rate WAV/PCM output per ElevenLabs docs."
        : wavSupported === false
          ? "CONTRACT DISCREPANCY: Catalog promises MP3/WAV, but this account tier likely cannot export wav_44100 (Pro+ typically required). MP3 remains available. Do not silently change the customer contract."
          : "WAV eligibility unclear from tier string — treat WAV as unconfirmed.",
    subscriptionTier: String(tier),
    commercialUseNote,
    availableVoiceCount: voiceCount,
    approvedVoiceId: voice.voiceId,
    approvedModelId: voice.modelId,
    catalogWavDiscrepancy,
    discoveryMode: "live",
    blockingGap: catalogWavDiscrepancy
      ? "WAV promised by catalog may be unavailable on this plan — owner decision required before claiming full format compliance."
      : undefined,
  };
}
