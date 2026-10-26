/**
 * Flagship music: Eleven Music instrumental when a usable key is present.
 * No trending-song scrape. Original pad is proof-only fallback.
 * Never prints, copies into source, or commits secrets.
 */

import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { composeElevenMusicInstrumental } from "@/lib/studio-kitchen-production/music-production/eleven-music";

export type ElevenCredentialInspect = {
  thisWorkspacePresent: boolean;
  usable: boolean;
  classification: "usable" | "owner_external";
  locations: Array<{
    label: string;
    present: boolean;
    http: number | null;
    reason: string | null;
  }>;
};

function readEnvNamedValue(filePath: string, name: string): string | null {
  if (!existsSync(filePath)) return null;
  const text = readFileSync(filePath, "utf8");
  const match = text.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, "m"));
  if (!match) return null;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value.trim() || null;
}

/**
 * Inspect approved Studio env locations. Does not return or log the secret.
 * Does not write a sibling key into this workspace.
 */
export async function inspectApprovedElevenLabsCredential(input?: {
  repoRoot?: string;
  home?: string;
}): Promise<ElevenCredentialInspect> {
  const repoRoot = input?.repoRoot ?? process.cwd();
  const home = input?.home ?? process.env.USERPROFILE ?? "";
  const files = [
    { label: "this_workspace", file: path.join(repoRoot, ".env.local") },
    {
      label: "sibling_room_4c",
      file: path.join(home, "studio-squishy-room-4c", ".env.local"),
    },
    {
      label: "sibling_kitchen_foundation",
      file: path.join(home, "studio-squishy-kitchen-foundation-1", ".env.local"),
    },
    {
      label: "sibling_studio_squishy",
      file: path.join(home, "studio-squishy", ".env.local"),
    },
  ];
  const locations: ElevenCredentialInspect["locations"] = [];
  for (const row of files) {
    const value = readEnvNamedValue(row.file, "ELEVENLABS_API_KEY");
    if (!value) {
      locations.push({
        label: row.label,
        present: false,
        http: null,
        reason: "absent",
      });
      continue;
    }
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": value },
      });
      const snippet = (await response.text())
        .slice(0, 180)
        .replace(/sk_[a-zA-Z0-9]+|xi-api-key/gi, "[redacted]");
      let reason: string | null = null;
      if (response.ok) reason = null;
      else if (/API key ID used as API key/i.test(snippet)) {
        reason = "stored_value_is_key_id_not_secret";
      } else if (response.status === 401) {
        reason = "invalid_or_revoked";
      } else {
        reason = `http_${response.status}`;
      }
      locations.push({
        label: row.label,
        present: true,
        http: response.status,
        reason,
      });
    } catch {
      locations.push({
        label: row.label,
        present: true,
        http: null,
        reason: "probe_failed",
      });
    }
  }
  const thisWorkspacePresent = Boolean(
    locations.find((row) => row.label === "this_workspace")?.present,
  );
  const thisWorkspace = locations.find((row) => row.label === "this_workspace");
  const thisWorkspaceUsable =
    thisWorkspace?.present === true &&
    thisWorkspace.reason !== "stored_value_is_key_id_not_secret";
  return {
    thisWorkspacePresent,
    usable: thisWorkspaceUsable,
    classification: thisWorkspaceUsable ? "usable" : "owner_external",
    locations,
  };
}

export const FLAGSHIP_MUSIC_PROMPT =
  "Original instrumental bed under an upbeat person talking to camera about a favorite English word and cherries. Light, warm, positive, conversational energy with a gentle bounce. Soft acoustic guitar or bright keys. Adult, not childish, not corporate, not cheesy, not sentimental, not dramatic, not memorial, not reflective. No choir, no vocals, no lyrics, no recognizable melody, no trailer drums, no EDM. Stay underneath speech. Do not reference any artist, song, or copyrighted tune." as const;

export const FLAGSHIP_UPBEAT_BED_REL =
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/music/flagship-bed-upbeat-eleven.mp3" as const;

export type FlagshipMusicResult =
  | {
      ok: true;
      method: "eleven_music" | "original_rights_safe_pad";
      absolutePath: string;
      relativePath: string;
      used: boolean;
      note: string;
      credential: ElevenCredentialInspect | null;
      estimatedCredits: number | null;
      creditHeaders: Record<string, string> | null;
    }
  | { ok: false; message: string };

export function writeOriginalRightsSafePad(input: {
  outputAbsolutePath: string;
  durationSeconds: number;
}): { ok: true } | { ok: false; message: string } {
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const duration = Math.max(8, Math.min(40, input.durationSeconds));
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=220:sample_rate=48000:duration=${duration}`,
        "-af",
        `volume=0.08,lowpass=f=800,afade=t=in:st=0:d=0.8,afade=t=out:st=${Math.max(1, duration - 1.2)}:d=1.0`,
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Original pad failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (!existsSync(input.outputAbsolutePath)) {
    return { ok: false, message: "Original pad file missing." };
  }
  return { ok: true };
}

export async function resolveFlagshipMusicBed(input: {
  repoRoot: string;
  durationSeconds: number;
  preferOff?: boolean;
  reuseExisting?: boolean;
  relativePath?: string;
  prompt?: string;
  reuseAbsolutePath?: string;
}): Promise<FlagshipMusicResult> {
  const credential = await inspectApprovedElevenLabsCredential({
    repoRoot: input.repoRoot,
  });
  if (input.preferOff) {
    return {
      ok: true,
      method: "original_rights_safe_pad",
      absolutePath: "",
      relativePath: "",
      used: false,
      note: "Music omitted because it would make this piece worse, or revision asked to remove it.",
      credential,
      estimatedCredits: null,
      creditHeaders: null,
    };
  }
  if (input.reuseAbsolutePath && existsSync(input.reuseAbsolutePath)) {
    return {
      ok: true,
      method: "eleven_music",
      absolutePath: input.reuseAbsolutePath,
      relativePath: path.relative(input.repoRoot, input.reuseAbsolutePath).replace(/\\/g, "/"),
      used: true,
      note: "Reused a coordinated-set Eleven Music bed. Did not remint.",
      credential,
      estimatedCredits: 0,
      creditHeaders: null,
    };
  }
  const relativePath = input.relativePath ?? FLAGSHIP_UPBEAT_BED_REL;
  const absolutePath = path.join(input.repoRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  if (input.reuseExisting && existsSync(absolutePath)) {
    return {
      ok: true,
      method: "eleven_music",
      absolutePath,
      relativePath,
      used: true,
      note: "Reused the already-minted upbeat Eleven Music bed. Did not remint.",
      credential,
      estimatedCredits: 0,
      creditHeaders: null,
    };
  }

  const eleven = await composeElevenMusicInstrumental({
    prompt: input.prompt ?? FLAGSHIP_MUSIC_PROMPT,
    durationMs: Math.round(Math.max(8, input.durationSeconds) * 1000),
    outputRelativePath: relativePath,
    repoRoot: input.repoRoot,
    accountTier: "Starter",
  });
  if (eleven.ok) {
    writeFileSync(
      path.join(path.dirname(absolutePath), "music-rights.json"),
      `${JSON.stringify(
        {
          ...eleven.rights,
          estimatedCredits: eleven.estimatedCredits,
          creditHeaders: eleven.creditHeaders,
        },
        null,
        2,
      )}\n`,
    );
    return {
      ok: true,
      method: "eleven_music",
      absolutePath: eleven.absolutePath,
      relativePath: eleven.relativePath,
      used: true,
      note: "Eleven Music instrumental, embedded only. Not a standalone track.",
      credential,
      estimatedCredits: eleven.estimatedCredits,
      creditHeaders: eleven.creditHeaders,
    };
  }

  const pad = writeOriginalRightsSafePad({
    outputAbsolutePath: absolutePath,
    durationSeconds: input.durationSeconds,
  });
  if (!pad.ok) return pad;
  writeFileSync(
    path.join(path.dirname(absolutePath), "music-rights.json"),
    `${JSON.stringify(
      {
        method: "original_rights_safe_pad",
        reason: eleven.message,
        commercialMusicNotMinted: true,
        credential,
        note: "Proof-only original pad. Not sold as competitive Reel music.",
      },
      null,
      2,
    )}\n`,
  );
  return {
    ok: true,
    method: "original_rights_safe_pad",
    absolutePath,
    relativePath,
    used: true,
    note: `Eleven Music unavailable (${eleven.message}). Original pad used only to prove duck/mix. Not sold as commercial music.`,
    credential,
    estimatedCredits: null,
    creditHeaders: null,
  };
}

export function measureAudioVolume(absolutePath: string): {
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
} {
  const volume = spawnSync(
    "ffmpeg",
    ["-i", absolutePath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${volume.stdout ?? ""}\n${volume.stderr ?? ""}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

/** Ordinary-speaker bed. Still under speech. Must actually read as music. */
export const FLAGSHIP_MUSIC_TARGET_MEAN_DB = -20 as const;

export function planFlagshipMusicGain(bedMeanVolumeDb: number): number {
  const raw = 10 ** ((FLAGSHIP_MUSIC_TARGET_MEAN_DB - bedMeanVolumeDb) / 20);
  return Math.min(6, Math.max(0.8, raw));
}

export function leadingMusicSilenceSeconds(absolutePath: string): number {
  const result = spawnSync(
    "ffmpeg",
    ["-i", absolutePath, "-af", "silencedetect=noise=-38dB:d=0.35", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const start = text.match(/silence_start:\s*([0-9.]+)/);
  const end = text.match(/silence_end:\s*([0-9.]+)/);
  if (start && end && Number(start[1]) < 0.05) {
    return Math.min(8, Number(end[1]));
  }
  return 0;
}

export const FLAGSHIP_MUSIC_CUE_GAP_SECONDS = 0.25 as const;
export const FLAGSHIP_MUSIC_FADE_OUT_SECONDS = 0.9 as const;

export function planFlagshipMusicFade(speechEndSeconds: number): {
  fadeOutStartSeconds: number;
  fadeOutDurationSeconds: number;
  silenceBeforeCueSeconds: number;
  musicEndsAtSeconds: number;
  cueAtSeconds: number;
} {
  const silenceBeforeCueSeconds = FLAGSHIP_MUSIC_CUE_GAP_SECONDS;
  const fadeOutDurationSeconds = FLAGSHIP_MUSIC_FADE_OUT_SECONDS;
  const fadeOutStartSeconds = Math.max(0.4, speechEndSeconds);
  const musicEndsAtSeconds = fadeOutStartSeconds + fadeOutDurationSeconds;
  return {
    fadeOutStartSeconds,
    fadeOutDurationSeconds,
    silenceBeforeCueSeconds,
    musicEndsAtSeconds,
    cueAtSeconds: musicEndsAtSeconds + silenceBeforeCueSeconds,
  };
}

export function buildFlagshipMusicMixFilter(input: {
  gain: number;
  speechEndSeconds: number;
  totalDurationSeconds: number;
}): string {
  const fadeIn = 0.25;
  const fade = planFlagshipMusicFade(input.speechEndSeconds);
  const hold = Math.max(input.totalDurationSeconds, fade.cueAtSeconds + 0.4);
  return [
    `[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=0:${hold.toFixed(2)},asetpts=PTS-STARTPTS,volume=${input.gain.toFixed(3)},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fade.fadeOutStartSeconds.toFixed(2)}:d=${fade.fadeOutDurationSeconds.toFixed(2)}[bed]`,
    `[0:a][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.97[a]`,
  ].join(";");
}

export type FlagshipMusicMixResult =
  | {
      ok: true;
      gain: number;
      bedMeanVolumeDb: number | null;
      bedMaxVolumeDb: number | null;
      plannedBedMeanDb: number | null;
    }
  | { ok: false; message: string };

export function mixMusicUnderSpeech(input: {
  videoAbsolutePath: string;
  musicAbsolutePath: string;
  outputAbsolutePath: string;
  speechEndSeconds: number;
}): FlagshipMusicMixResult {
  if (!existsSync(input.videoAbsolutePath) || !existsSync(input.musicAbsolutePath)) {
    return { ok: false, message: "Music mix inputs missing." };
  }
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const bedVolume = measureAudioVolume(input.musicAbsolutePath);
  if (bedVolume.meanVolumeDb == null) {
    return { ok: false, message: "Could not measure the music bed level." };
  }
  const gain = planFlagshipMusicGain(bedVolume.meanVolumeDb);
  const plannedBedMeanDb = bedVolume.meanVolumeDb + 20 * Math.log10(gain);
  if (plannedBedMeanDb < -40) {
    return {
      ok: false,
      message: `Music gain still inaudible (planned mean ${plannedBedMeanDb.toFixed(1)} dB).`,
    };
  }
  let videoDuration = input.speechEndSeconds;
  try {
    const probe = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        input.videoAbsolutePath,
      ],
      { encoding: "utf8" },
    );
    const parsed = Number(probe.trim());
    if (Number.isFinite(parsed) && parsed > 1) videoDuration = parsed;
  } catch {
    /* keep speech end */
  }
  const filter = buildFlagshipMusicMixFilter({
    gain,
    speechEndSeconds: input.speechEndSeconds,
    totalDurationSeconds: videoDuration,
  });
  const skipSilence = leadingMusicSilenceSeconds(input.musicAbsolutePath);
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        "-stream_loop",
        "-1",
        "-ss",
        skipSilence.toFixed(3),
        "-i",
        input.musicAbsolutePath,
        "-filter_complex",
        filter,
        "-map",
        "0:v",
        "-map",
        "[a]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-t",
        videoDuration.toFixed(3),
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Music mix failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {
    ok: true,
    gain,
    bedMeanVolumeDb: bedVolume.meanVolumeDb,
    bedMaxVolumeDb: bedVolume.maxVolumeDb,
    plannedBedMeanDb,
  };
}
