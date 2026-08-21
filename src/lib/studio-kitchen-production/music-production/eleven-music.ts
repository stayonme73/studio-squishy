/**
 * Kitchen Eleven Music adapter — instrumental generation with rights evidence.
 * Music is Studio-controlled Output under the account's Music Commercial Rights.
 * Deliver only embedded in finished video; do not redistribute standalone.
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  ELEVENLABS_API_BASE,
  readElevenLabsApiKey,
} from "../voice-production/elevenlabs/config";

export const ELEVEN_MUSIC_MODEL_IDS = ["music_v1", "music_v2"] as const;
export type ElevenMusicModelId = (typeof ELEVEN_MUSIC_MODEL_IDS)[number];

export type ElevenMusicRightsRecord = {
  schemaVersion: 1;
  provider: "elevenlabs";
  product: "eleven_music";
  modelId: ElevenMusicModelId;
  generationId: string | null;
  generationDate: string;
  accountTier: string;
  accountEligibilityNote: string;
  sourceAudioRelativePath: string;
  sourceAudioSha256: string;
  durationMs: number;
  prompt: string;
  forceInstrumental: true;
  commercialUseAuthority: string;
  clientCampaignUseAuthority: string;
  attributionRequired: false;
  editingTrimmingPermission: string;
  platformRestrictions: readonly string[];
  standaloneRedistributionProhibited: true;
  musicLibraryResaleProhibited: true;
  termsUrls: readonly { label: string; url: string; notedEffectiveDate: string }[];
  creditsEstimateNote: string;
};

export type ComposeInstrumentalInput = {
  prompt: string;
  durationMs: number;
  modelId?: ElevenMusicModelId;
  outputRelativePath: string;
  repoRoot: string;
  accountTier: string;
  fetchImpl?: typeof fetch;
};

export type ComposeInstrumentalResult =
  | {
      ok: true;
      absolutePath: string;
      relativePath: string;
      contentSha256: string;
      byteLength: number;
      generationId: string | null;
      requestId: string | null;
      durationMs: number;
      modelId: ElevenMusicModelId;
      rights: ElevenMusicRightsRecord;
    }
  | { ok: false; code: string; message: string };

function buildRightsRecord(input: {
  modelId: ElevenMusicModelId;
  generationId: string | null;
  generationDate: string;
  accountTier: string;
  relativePath: string;
  sha256: string;
  durationMs: number;
  prompt: string;
}): ElevenMusicRightsRecord {
  return {
    schemaVersion: 1,
    provider: "elevenlabs",
    product: "eleven_music",
    modelId: input.modelId,
    generationId: input.generationId,
    generationDate: input.generationDate,
    accountTier: input.accountTier,
    accountEligibilityNote:
      "Owner-confirmed Starter plan, Individual Use Only — Tagia as individual Studio owner. Music Commercial Rights table: online and offline commercial media except film, television, radio, and Studio Games. No attribution required.",
    sourceAudioRelativePath: input.relativePath,
    sourceAudioSha256: input.sha256,
    durationMs: input.durationMs,
    prompt: input.prompt,
    forceInstrumental: true,
    commercialUseAuthority:
      "Starter Music Commercial Rights — commercial online/offline media use permitted excluding film, television, radio, and Studio Games (Music Model-Specific Terms / Commercial Rights table, owner-confirmed 2026-08-21).",
    clientCampaignUseAuthority:
      "Owner-confirmed: delivering one finished promotional MP4 with embedded music to a client is permitted under Starter commercial media use; not a music-library or model-resale use.",
    attributionRequired: false,
    editingTrimmingPermission:
      "Trim, fade, volume adjust, and embed under video permitted for campaign production under paid Music commercial rights.",
    platformRestrictions: [
      "No film, television, radio, or Studio Games under Starter",
      "No standalone distribution to music streaming platforms (Spotify, Apple Music, etc.)",
      "No resale, redistribution, or sublicensing of the music as a standalone asset",
      "No music library/repository of Outputs for licensing to third parties",
      "Starter designated Individual Use Only — account must remain individual owner subscription",
    ],
    standaloneRedistributionProhibited: true,
    musicLibraryResaleProhibited: true,
    termsUrls: [
      {
        label: "Music Terms",
        url: "https://elevenlabs.io/music-terms",
        notedEffectiveDate: "2026-05-26",
      },
      {
        label: "Eleven Music Model-Specific Terms",
        url: "https://elevenlabs.io/eleven-music-model-specific-terms",
        notedEffectiveDate: "2026-05-26",
      },
      {
        label: "Publish / commercial-use help",
        url: "https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform",
        notedEffectiveDate: "retrieved-2026-08-21",
      },
    ],
    creditsEstimateNote:
      "Public pricing ~900 credits/minute; 22–24s ≈ 330–360 credits per generation.",
  };
}

/**
 * Compose one instrumental track. Does not print API keys.
 */
export async function composeElevenMusicInstrumental(
  input: ComposeInstrumentalInput,
): Promise<ComposeInstrumentalResult> {
  const apiKey = readElevenLabsApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "credentials_absent",
      message: "ELEVENLABS_API_KEY absent",
    };
  }
  if (input.durationMs < 3000 || input.durationMs > 600000) {
    return {
      ok: false,
      code: "invalid_duration",
      message: "durationMs must be 3000–600000",
    };
  }
  const modelId = input.modelId ?? "music_v2";
  const fetchImpl = input.fetchImpl ?? fetch;
  const generationDate = new Date().toISOString();

  const response = await fetchImpl(`${ELEVENLABS_API_BASE}/v1/music`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      music_length_ms: input.durationMs,
      model_id: modelId,
      force_instrumental: true,
    }),
  });

  if (!response.ok) {
    const snippet = (await response.text()).slice(0, 400).replace(
      /xi-api-key|sk_[a-zA-Z0-9]+/gi,
      "[redacted]",
    );
    return {
      ok: false,
      code: `http_${response.status}`,
      message: snippet || `Eleven Music HTTP ${response.status}`,
    };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) {
    return {
      ok: false,
      code: "empty_audio",
      message: "Eleven Music returned empty or tiny payload",
    };
  }

  const abs = path.join(input.repoRoot, input.outputRelativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const generationId =
    response.headers.get("song-id") ||
    response.headers.get("x-song-id") ||
    response.headers.get("request-id") ||
    null;
  const requestId = response.headers.get("request-id");

  const rights = buildRightsRecord({
    modelId,
    generationId,
    generationDate,
    accountTier: input.accountTier,
    relativePath: input.outputRelativePath,
    sha256,
    durationMs: input.durationMs,
    prompt: input.prompt,
  });

  return {
    ok: true,
    absolutePath: abs,
    relativePath: input.outputRelativePath,
    contentSha256: sha256,
    byteLength: bytes.length,
    generationId,
    requestId,
    durationMs: input.durationMs,
    modelId,
    rights,
  };
}

export const SCENARIO_3_MUSIC_PROMPT =
  "Warm inviting instrumental for a handmade textile studio open weekend. Soft acoustic guitar and gentle organic textures, light hand percussion pulse, friendly and welcoming. Noticeable but soft opening entrance, then spacious mid section with room for on-screen event text, clean natural ending suitable for a short fade. No vocals, no choir, no lyrics, no singing. No trailer risers, no epic cinematic drums, no EDM drop. Not aggressive. Original instrumental only; do not reference any artist, song title, album, or copyrighted melody." as const;
