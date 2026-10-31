import { execFileSync } from "child_process";

import { resolveFfmpegExecutable } from "@/lib/studio-media-runtime/ffmpeg-cli";
import { readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import {
  assertDeepgramPrivacyLock,
  buildDeepgramFileListenRequest,
  parseDeepgramWords,
  summarizeDeepgramPayload,
} from "./deepgram";
import type { SpeechWord } from "./types";

const LIST_RATE = studioShortFormVideoEditingBuildV1.deepgram.listRateUsdPerMinute;

export type DeepgramTranscriptResult =
  | {
      ok: true;
      words: SpeechWord[];
      durationSeconds: number;
      requestId?: string;
      estimatedUsdList: number;
      estimatedUsdOptOutCeiling: number;
      mipOptOut: true;
    }
  | {
      ok: false;
      code: "KEY_ABSENT" | "PRIVACY_LOCK" | "PROVIDER_REJECTED" | "NO_WORDS";
      message: string;
    };

export async function transcribeFootageFile(input: {
  apiKey: string | null;
  absolutePath: string;
  fetchImpl?: typeof fetch;
}): Promise<DeepgramTranscriptResult> {
  if (!input.apiKey?.trim()) {
    return {
      ok: false,
      code: "KEY_ABSENT",
      message:
        "DEEPGRAM_API_KEY is not configured. Do not substitute another STT. Stop before Shotstack spend.",
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const wavPath = path.join(
    tmpdir(),
    `sfve-deepgram-${Date.now()}.wav`,
  );
  try {
    execFileSync(
      resolveFfmpegExecutable(),
      [
        "-y",
        "-i",
        input.absolutePath,
        "-vn",
        "-map",
        "0:a:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        wavPath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      code: "PROVIDER_REJECTED",
      message: `Could not extract source audio for Deepgram: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const request = buildDeepgramFileListenRequest({
    apiKey: input.apiKey,
    contentType: "audio/wav",
  });
  try {
    assertDeepgramPrivacyLock(request);
  } catch (error) {
    return {
      ok: false,
      code: "PRIVACY_LOCK",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const bytes = readFileSync(wavPath);
  try {
    unlinkSync(wavPath);
  } catch {
    /* ignore */
  }

  let response: Response | null = null;
  let lastFetchError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetchImpl(request.url, {
        method: "POST",
        headers: request.headers,
        body: new Uint8Array(bytes),
      });
      lastFetchError = "";
      break;
    } catch (error) {
      lastFetchError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  if (!response) {
    return {
      ok: false,
      code: "PROVIDER_REJECTED",
      message: `Deepgram fetch failed: ${lastFetchError}`,
    };
  }
  if (!response.ok) {
    const snippet = (await response.text()).slice(0, 240);
    return {
      ok: false,
      code: "PROVIDER_REJECTED",
      message: `Deepgram HTTP ${response.status}: ${snippet}`,
    };
  }
  const json = (await response.json()) as {
    metadata?: { duration?: number; request_id?: string };
  };
  const words = parseDeepgramWords(json);
  if (!words.length) {
    const shape = summarizeDeepgramPayload(json);
    return {
      ok: false,
      code: "NO_WORDS",
      message: `Deepgram returned no English word timestamps. Do not switch STT. Replace the source if it is not English. shape=${JSON.stringify(shape)}`,
    };
  }
  const durationSeconds = Number(json.metadata?.duration ?? 0);
  const minutes = Math.max(durationSeconds, 1) / 60;
  return {
    ok: true,
    words,
    durationSeconds,
    requestId: json.metadata?.request_id,
    estimatedUsdList: Number((minutes * LIST_RATE).toFixed(4)),
    estimatedUsdOptOutCeiling: Number((minutes * LIST_RATE * 2).toFixed(4)),
    mipOptOut: true,
  };
}
