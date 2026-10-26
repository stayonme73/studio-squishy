/**
 * Live set discovery only. No Shotstack. No $349 factory mutation.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import {
  assertDeepgramPrivacyLock,
  buildDeepgramFileListenRequest,
  parseDeepgramWords,
  readDeepgramApiKey,
  summarizeDeepgramPayload,
} from "@/lib/studio-short-form-video-editing/deepgram";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";

import { discoverClipSet } from "./set-discovery";

const LIST_RATE = studioShortFormVideoEditingBuildV1.deepgram.listRateUsdPerMinute;

export async function transcribeExistingWav(input: {
  apiKey: string;
  wavAbsolutePath: string;
}): Promise<
  | {
      ok: true;
      words: ReturnType<typeof parseDeepgramWords>;
      durationSeconds: number;
      requestId?: string;
      estimatedUsdList: number;
      estimatedUsdOptOutCeiling: number;
    }
  | { ok: false; message: string }
> {
  const request = buildDeepgramFileListenRequest({
    apiKey: input.apiKey,
    contentType: "audio/wav",
  });
  assertDeepgramPrivacyLock(request);
  const bytes = readFileSync(input.wavAbsolutePath);
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: new Uint8Array(bytes),
  });
  if (!response.ok) {
    const snippet = (await response.text()).slice(0, 240);
    return { ok: false, message: `Deepgram HTTP ${response.status}: ${snippet}` };
  }
  const json = (await response.json()) as {
    metadata?: { duration?: number; request_id?: string };
  };
  const words = parseDeepgramWords(json);
  if (!words.length) {
    return {
      ok: false,
      message: `Deepgram returned no words. shape=${JSON.stringify(summarizeDeepgramPayload(json))}`,
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
  };
}

export async function runLiveDiscover(repoRoot: string) {
  applyDotenvLocal(repoRoot);
  const apiKey = readDeepgramApiKey();
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY absent. Do not switch STT.");
  }
  const proof = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof",
  );
  mkdirSync(proof, { recursive: true });

  const jobs = [
    {
      label: "positive",
      durationHint: 815.4007,
      wav: path.join(proof, "positive-source.wav"),
    },
    {
      label: "negative",
      durationHint: 366.6758,
      wav: path.join(proof, "negative-source.wav"),
    },
  ] as const;

  const report: Record<string, unknown> = {
    designatedByOwner: true,
    rightsClearedForPackage: true,
    nativeVerticalViaRotation90: true,
    storedPixels: "1920x1080",
    displayedPixels: "1080x1920",
    paidProduction: false,
    sources: {},
  };

  for (const job of jobs) {
    const started = Date.now();
    const transcript = await transcribeExistingWav({
      apiKey,
      wavAbsolutePath: job.wav,
    });
    if (!transcript.ok) {
      (report.sources as Record<string, unknown>)[job.label] = {
        ok: false,
        message: transcript.message,
      };
      continue;
    }
    const sentences = buildTranscriptSentences(transcript.words);
    const discovery = discoverClipSet({
      sourceDurationSeconds: transcript.durationSeconds,
      sentences,
    });
    writeFileSync(
      path.join(proof, `${job.label}-transcript-words.json`),
      `${JSON.stringify(
        {
          requestId: transcript.requestId,
          durationSeconds: transcript.durationSeconds,
          estimatedUsdList: transcript.estimatedUsdList,
          estimatedUsdOptOutCeiling: transcript.estimatedUsdOptOutCeiling,
          wordCount: transcript.words.length,
          words: transcript.words,
        },
        null,
        2,
      )}\n`,
    );
    const compact = {
      label: job.label,
      ok: discovery.ok,
      productionAllowed: discovery.productionAllowed,
      viableCount: discovery.viableCount,
      setQuestionPass: discovery.setQuestionPass,
      findings: discovery.ok ? [] : [...discovery.findings],
      deepgramUsdList: transcript.estimatedUsdList,
      deepgramUsdOptOutCeiling: transcript.estimatedUsdOptOutCeiling,
      deepgramRequestId: transcript.requestId,
      sourceSeconds: transcript.durationSeconds,
      sentenceCount: sentences.length,
      elapsedMs: Date.now() - started,
      selected: discovery.selected.map((candidate) => ({
        id: candidate.id,
        idea: candidate.idea,
        bodyText: candidate.bodyText,
        score: candidate.setValueScore,
        shortForm: candidate.shortFormScore,
        window: [candidate.windowStart, candidate.windowEnd],
        standalone: candidate.standalone,
      })),
      alternates: discovery.alternates.map((candidate) => ({
        id: candidate.id,
        idea: candidate.idea,
        score: candidate.setValueScore,
        window: [candidate.windowStart, candidate.windowEnd],
      })),
      rejected: discovery.rejected
        .filter((candidate) => candidate.rejectionReason !== "window_too_short")
        .slice(0, 40)
        .map((candidate) => ({
          idea: candidate.idea,
          reason: candidate.rejectionReason,
          score: candidate.setValueScore,
        })),
    };
    writeFileSync(
      path.join(proof, `${job.label}-set-discovery.json`),
      `${JSON.stringify(compact, null, 2)}\n`,
    );
    (report.sources as Record<string, unknown>)[job.label] = compact;
  }

  writeFileSync(
    path.join(proof, "set-qa-before-production.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

