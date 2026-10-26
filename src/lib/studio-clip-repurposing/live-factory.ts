/**
 * Journey adapter for the certified Clip Repurposing factory.
 * Calls existing discover / extract / hitchhike functions.
 * Does not modify live-produce internals.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { studioClipRepurposingLiveUnpublishedJobV1 } from "@/config/studio-clip-repurposing-live-unpublished-job-v1";
import { finishFootageAudio } from "@/lib/studio-short-form-video-editing/audio-finish";
import { assembleBurnedShort, exactWords } from "@/lib/studio-short-form-video-editing/caption-burn";
import { CLIP_CAPTION_PRESENTATION, finishClipDecisionList, paintClipCustomerEndCard } from "./caption-finish";
import { readDeepgramApiKey } from "@/lib/studio-short-form-video-editing/deepgram";
import { buildEditDecisionList } from "@/lib/studio-short-form-video-editing/edl";
import { buildFootageShotstackPayload } from "@/lib/studio-short-form-video-editing/footage-payload";
import { evaluateFootageProbe } from "@/lib/studio-short-form-video-editing/gates";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import {
  watchPerformanceForEdit,
  type SpokenPerformanceMap,
} from "@/lib/studio-short-form-video-editing/performance-watch";
import { probeFootageSource } from "@/lib/studio-short-form-video-editing/probe";
import { resolveFootageRenderEnv } from "@/lib/studio-short-form-video-editing/render-env";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import { transcribeFootageFile } from "@/lib/studio-short-form-video-editing/transcribe";
import type { FootageIntake, SpeechWord } from "@/lib/studio-short-form-video-editing/types";
import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
  shotstackSubmitRender,
} from "@/lib/studio-kitchen-production/video-integration/client";
import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";
import { shotstackUploadLocalFile } from "@/lib/studio-kitchen-production/video-integration/media-ingest";

import { assembleClip549ValuePackage } from "@/lib/studio-549-clip-repurposing-value-delivery/package";
import { clip549CustomerShortFileName } from "@/lib/studio-final-delivery-room/content";
import type { ClipCustomerOutcome } from "./customer-outcome";
import type { ClipCustomerPipelineInput, ClipProducedFile } from "./customer-pipeline";
import { extractVerticalWindow, restorePortraitIfLandscape } from "./extract-window";
import { applySetRevision, discoverClipSet } from "./set-discovery";
import type {
  LongSourceSentences,
  SetCandidate,
  SetDiscoverySuccess,
  SetRevision,
} from "./types";

const PAD_BEFORE = 6;
const PAD_AFTER = 8;

export function approvedClipRepurposingCta(input: {
  ctaText: string;
  setRevision?: SetRevision;
}): string {
  if (input.setRevision?.kind === "cta_change" && input.setRevision.ctaText.trim()) {
    return input.setRevision.ctaText.trim();
  }
  return input.ctaText.trim();
}

/** First-cut may reuse a finished file. A CTA change must remake it. */
export function shouldReuseCertifiedClip(input: {
  outputExists: boolean;
  spendExists: boolean;
  priorApprovedCta?: string | null;
  requestedCta: string;
  forceNewRender?: boolean;
}): boolean {
  if (input.forceNewRender) return false;
  if (!input.outputExists || !input.spendExists) return false;
  if (
    input.priorApprovedCta != null &&
    input.priorApprovedCta !== input.requestedCta
  ) {
    return false;
  }
  return true;
}

export type CertifiedClipFactoryPrepare =
  | {
      ok: true;
      sourceDurationSeconds: number;
      sentences: LongSourceSentences["sentences"];
      designatedSourceException: boolean;
      deepgramUsdList: number;
      deepgramReused: boolean;
      discover: ClipCustomerPipelineInput["discover"];
      produce: ClipCustomerPipelineInput["produce"];
    }
  | { ok: false; failureCode: string; message: string };

export type ClipFactorySpend = {
  deepgramUsdList: number;
  deepgramReused: boolean;
  performanceWatchUsd: number;
  shotstackCredits: number;
  renders: number;
  reusedRenders: number;
  elapsedMs: number;
  renderEnv: string;
};

function workDir(repoRoot: string, campaignId: string): string {
  return path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    campaignId,
    "clip-factory",
  );
}

function isDesignatedCertSource(sourceRelativePath: string): boolean {
  return (
    sourceRelativePath.replace(/\\/g, "/") ===
    studioClipRepurposingLiveUnpublishedJobV1.designatedSourceRelativePath
  );
}

function offsetWords(
  words: readonly SpeechWord[],
  extractStart: number,
  extractEnd: number,
): SpeechWord[] {
  return words
    .filter((word) => word.end > extractStart && word.start < extractStart + 180 && word.start < extractEnd)
    .map((word) => ({
      ...word,
      start: Number(Math.max(0, word.start - extractStart).toFixed(3)),
      end: Number(Math.max(0.01, word.end - extractStart).toFixed(3)),
    }));
}

function spokenMapFor(
  candidate: SetCandidate,
  extractStart: number,
  sentences: LongSourceSentences["sentences"],
  extractEnd: number,
): SpokenPerformanceMap {
  const ideaSentences = sentences.filter(
    (sentence) =>
      sentence.end > candidate.windowStart && sentence.start < candidate.windowEnd,
  );
  const leftover = sentences.find(
    (sentence) =>
      sentence.start >= candidate.windowEnd &&
      sentence.start < extractEnd &&
      sentence.start - candidate.windowEnd <= 10,
  );
  return {
    idea: candidate.claim,
    beats: ideaSentences.map((sentence) => ({
      start: Number((sentence.start - extractStart).toFixed(3)),
      end: Number((sentence.end - extractStart).toFixed(3)),
      text: sentence.text,
    })),
    leftover: leftover
      ? {
          start: Number((leftover.start - extractStart).toFixed(3)),
          end: Number((leftover.end - extractStart).toFixed(3)),
          text: leftover.text,
        }
      : undefined,
  };
}

async function produceOneCertifiedClip(input: {
  repoRoot: string;
  clipDir: string;
  candidate: SetCandidate;
  extractAbs: string;
  extractStart: number;
  words: SpeechWord[];
  opening: number;
  exit: number;
  ctaText: string;
  forceNewRender?: boolean;
}): Promise<
  | { ok: true; relativePath: string; contentSha256: string; credits: number; renders: number; reused: boolean }
  | { ok: false; message: string }
> {
  const outputAbs = path.join(input.clipDir, "production.mp4");
  const spendAbs = path.join(input.clipDir, "spend.json");
  if (
    shouldReuseCertifiedClip({
      outputExists: existsSync(outputAbs),
      spendExists: existsSync(spendAbs),
      priorApprovedCta: existsSync(spendAbs)
        ? ((JSON.parse(readFileSync(spendAbs, "utf8")) as { approvedCta?: string }).approvedCta ??
          null)
        : null,
      requestedCta: input.ctaText,
      forceNewRender: input.forceNewRender,
    })
  ) {
    const prior = JSON.parse(readFileSync(spendAbs, "utf8")) as {
      outputSha256?: string;
      credits?: number;
    };
    return {
      ok: true,
      relativePath: path.relative(input.repoRoot, outputAbs).replace(/\\/g, "/"),
      contentSha256: prior.outputSha256 ?? createHash("sha256").update(readFileSync(outputAbs)).digest("hex"),
      credits: prior.credits ?? 0,
      renders: 0,
      reused: true,
    };
  }

  const localWords = offsetWords(
    input.words,
    input.extractStart,
    input.extractStart + 180,
  );
  const intake: FootageIntake = {
    skuId: "v2-rtu-short-form-video-edit",
    sourceRelativePath: path.relative(input.repoRoot, input.extractAbs),
    ctaText: input.ctaText,
    mustKeepLine: input.candidate.claim,
    rightsCleared: true,
    language: "en",
  };
  const probe = probeFootageSource(input.extractAbs);
  if ("error" in probe) return { ok: false, message: probe.error };
  const edl = buildEditDecisionList({
    words: localWords,
    intake,
    sourceDurationSeconds: probe.durationSeconds,
    lockContinuousRange: { start: input.opening, end: input.exit },
  });
  if (!edl.ok) return { ok: false, message: edl.message };
  const captionFinish = finishClipDecisionList(edl, localWords, {
    start: input.opening,
    end: input.exit,
  });
  if (!captionFinish.ok) {
    return { ok: false, message: `Clip caption finish rejected: ${captionFinish.findings.join("; ")}` };
  }

  const finished = finishFootageAudio({
    sourceAbsolutePath: input.extractAbs,
    outputAbsolutePath: path.join(input.clipDir, "audio-finished.mp4"),
  });
  if (!finished.ok) return { ok: false, message: finished.message };
  const upright = restorePortraitIfLandscape(finished.outputAbsolutePath);
  if (!upright.ok) return { ok: false, message: upright.message };

  const burned = await assembleBurnedShort({
    sourceAbsolutePath: finished.outputAbsolutePath,
    edl: captionFinish.edl,
    workDirectory: path.join(input.clipDir, "burn-work"),
    outputAbsolutePath: path.join(input.clipDir, "local-text-proof.mp4"),
    approvedCta: input.ctaText,
    transcriptWordsInRange: exactWords(edl.clips[0]?.text ?? ""),
    captionBackground: CLIP_CAPTION_PRESENTATION.background,
    captionStroke: CLIP_CAPTION_PRESENTATION.stroke,
    captionBottomPx: CLIP_CAPTION_PRESENTATION.bottomPx,
    captionBandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
    paintEndCard: paintClipCustomerEndCard,
  });
  if (!burned.ok) return { ok: false, message: burned.message };

  const renderEnv = resolveFootageRenderEnv(process.env);
  const shotstackKey = readShotstackApiKey(process.env, renderEnv.envName);
  if (!shotstackKey) {
    return { ok: false, message: "Shotstack key absent. Do not paste keys into chat." };
  }
  const uploaded = await shotstackUploadLocalFile({
    absolutePath: burned.outputAbsolutePath,
    apiKey: shotstackKey,
    envName: renderEnv.envName,
  });
  if (!uploaded.ok) return { ok: false, message: uploaded.message };
  const built = buildFootageShotstackPayload({
    sourceUrl: uploaded.sourceUrl,
    edl,
    textAlreadyBurned: true,
  });
  if (!built.ok) return { ok: false, message: built.findings.join("; ") };
  const submit = await shotstackSubmitRender(built.payload, {
    apiKey: shotstackKey,
    envName: renderEnv.envName,
    retry: { maxAttempts: 1, baseDelayMs: 0 },
  });
  if (!submit.ok) return { ok: false, message: submit.message };
  const poll = await shotstackPollUntilDone(submit.providerRenderId, {
    apiKey: shotstackKey,
    envName: renderEnv.envName,
    maxAttempts: 60,
    delayMs: 2000,
  });
  if (!poll.ok || poll.status === "timed_out" || poll.status === "failed" || !poll.outputUrl) {
    return { ok: false, message: poll.ok ? poll.error ?? poll.status : poll.message };
  }
  const download = await shotstackDownloadMp4(poll.outputUrl);
  if (!download.ok) return { ok: false, message: download.message };
  writeFileSync(outputAbs, download.bytes);
  const contentSha256 = createHash("sha256").update(download.bytes).digest("hex");
  writeFileSync(
    spendAbs,
    `${JSON.stringify(
      {
        providerRenderId: submit.providerRenderId,
        credits: poll.credits ?? null,
        renderEnv: renderEnv.envName,
        outputSha256: contentSha256,
        candidateId: input.candidate.id,
        approvedCta: input.ctaText,
      },
      null,
      2,
    )}\n`,
  );
  return {
    ok: true,
    relativePath: path.relative(input.repoRoot, outputAbs).replace(/\\/g, "/"),
    contentSha256,
    credits: Number(poll.credits ?? 0),
    renders: 1,
    reused: false,
  };
}

export async function prepareCertifiedClipRepurposingFactory(input: {
  repoRoot: string;
  campaignId: string;
  sourceAbsolutePath: string;
  sourceRelativePath: string;
  ctaText: string;
}): Promise<CertifiedClipFactoryPrepare> {
  applyDotenvLocal(input.repoRoot);
  const started = Date.now();
  const root = workDir(input.repoRoot, input.campaignId);
  mkdirSync(root, { recursive: true });
  const designated = isDesignatedCertSource(input.sourceRelativePath);
  const transcriptAbs = path.join(root, "transcript-words.json");

  let words: SpeechWord[];
  let sourceDurationSeconds: number;
  let deepgramUsdList = 0;
  let deepgramReused = false;

  if (existsSync(transcriptAbs)) {
    const saved = JSON.parse(readFileSync(transcriptAbs, "utf8")) as {
      words: SpeechWord[];
      durationSeconds: number;
      estimatedUsdList?: number;
    };
    words = saved.words;
    sourceDurationSeconds = saved.durationSeconds;
    deepgramUsdList = saved.estimatedUsdList ?? 0;
    deepgramReused = true;
  } else {
    const apiKey = readDeepgramApiKey();
    const transcript = await transcribeFootageFile({
      apiKey,
      absolutePath: input.sourceAbsolutePath,
    });
    if (!transcript.ok) {
      return {
        ok: false,
        failureCode: "TRANSCRIBE_FAILED",
        message: transcript.message,
      };
    }
    words = transcript.words;
    sourceDurationSeconds = transcript.durationSeconds;
    deepgramUsdList = transcript.estimatedUsdList;
    writeFileSync(
      transcriptAbs,
      `${JSON.stringify(
        {
          durationSeconds: transcript.durationSeconds,
          requestId: transcript.requestId,
          estimatedUsdList: transcript.estimatedUsdList,
          words: transcript.words,
        },
        null,
        2,
      )}\n`,
    );
  }

  const sentences = buildTranscriptSentences(words);
  const spend: ClipFactorySpend = {
    deepgramUsdList,
    deepgramReused,
    performanceWatchUsd: 0,
    shotstackCredits: 0,
    renders: 0,
    reusedRenders: 0,
    elapsedMs: 0,
    renderEnv: resolveFootageRenderEnv(process.env).envName,
  };

  const produce: ClipCustomerPipelineInput["produce"] = async (request) => {
    let selected = [...request.selected];
    if (request.applyRevision && request.setRevision && request.setRevision.kind === "swap_clip") {
      const discovered = discoverClipSet({ sourceDurationSeconds, sentences });
      if (discovered.ok) {
        const revised = applySetRevision(discovered as SetDiscoverySuccess, request.setRevision);
        if (revised.ok) selected = [...revised.selected];
      }
    }
    selected = selected.slice(0, request.outcome.fileCount);
    const files: ClipProducedFile[] = [];
    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || null;

    for (const candidate of selected) {
      const clipDir = path.join(root, "clips", candidate.id);
      mkdirSync(clipDir, { recursive: true });
      const extractStart = Math.max(0, candidate.windowStart - PAD_BEFORE);
      const extractEnd = Math.min(sourceDurationSeconds, candidate.windowEnd + PAD_AFTER);
      const extractAbs = path.join(clipDir, "extract-vertical.mp4");
      if (!existsSync(extractAbs)) {
        const extracted = extractVerticalWindow({
          sourceAbsolutePath: input.sourceAbsolutePath,
          outputAbsolutePath: extractAbs,
          startSeconds: extractStart,
          endSeconds: extractEnd,
        });
        if (!extracted.ok) {
          throw new Error(extracted.message);
        }
      }
      const probe = probeFootageSource(extractAbs);
      if ("error" in probe) throw new Error(probe.error);
      const probeGate = evaluateFootageProbe(probe);
      if (probeGate) throw new Error(probeGate.message);

      let opening = Number((candidate.windowStart - extractStart).toFixed(3));
      let exit = Number((candidate.windowEnd - extractStart).toFixed(3));
      const watchAbs = path.join(clipDir, "performance-watch.json");
      if (anthropicKey && !existsSync(watchAbs)) {
        const watch = await watchPerformanceForEdit({
          sourceAbsolutePath: extractAbs,
          frameDirectory: path.join(clipDir, "watch-frames"),
          apiKey: anthropicKey,
          spokenMap: spokenMapFor(candidate, extractStart, sentences, extractEnd),
        });
        writeFileSync(watchAbs, `${JSON.stringify(watch, null, 2)}\n`);
        spend.performanceWatchUsd += watch.estimatedUsd ?? 0;
        if (watch.ok) {
          opening = watch.openingSourceSeconds;
          exit = watch.exitSourceSeconds;
        }
      } else if (existsSync(watchAbs)) {
        const watch = JSON.parse(readFileSync(watchAbs, "utf8")) as {
          ok?: boolean;
          openingSourceSeconds?: number;
          exitSourceSeconds?: number;
          estimatedUsd?: number;
        };
        if (watch.ok && watch.openingSourceSeconds != null && watch.exitSourceSeconds != null) {
          opening = watch.openingSourceSeconds;
          exit = watch.exitSourceSeconds;
        }
      }

      const produced = await produceOneCertifiedClip({
        repoRoot: input.repoRoot,
        clipDir,
        candidate,
        extractAbs,
        extractStart,
        words,
        opening,
        exit,
        ctaText: approvedClipRepurposingCta({
          ctaText: input.ctaText,
          setRevision: request.setRevision,
        }),
        forceNewRender: request.setRevision?.kind === "cta_change",
      });
      if (!produced.ok) throw new Error(produced.message);
      spend.shotstackCredits += produced.credits;
      spend.renders += produced.renders;
      if (produced.reused) spend.reusedRenders += 1;
      files.push({
        clipId: candidate.id,
        idea: candidate.idea,
        relativePath: produced.relativePath,
        contentSha256: produced.contentSha256,
        width: 1080,
        height: 1920,
      });
    }

    spend.elapsedMs = Date.now() - started;
    const spendAbs = path.join(root, "factory-spend.json");
    const priorSpend = existsSync(spendAbs)
      ? (JSON.parse(readFileSync(spendAbs, "utf8")) as Partial<ClipFactorySpend>)
      : null;
    const recorded: ClipFactorySpend = priorSpend
      ? {
          deepgramUsdList: spend.deepgramUsdList || priorSpend.deepgramUsdList || 0,
          deepgramReused: spend.deepgramReused || Boolean(priorSpend.deepgramReused),
          performanceWatchUsd:
            (priorSpend.performanceWatchUsd ?? 0) + spend.performanceWatchUsd,
          shotstackCredits: (priorSpend.shotstackCredits ?? 0) + spend.shotstackCredits,
          renders: (priorSpend.renders ?? 0) + spend.renders,
          reusedRenders: (priorSpend.reusedRenders ?? 0) + spend.reusedRenders,
          elapsedMs: (priorSpend.elapsedMs ?? 0) + spend.elapsedMs,
          renderEnv: spend.renderEnv,
        }
      : spend;
    writeFileSync(spendAbs, `${JSON.stringify(recorded, null, 2)}\n`);
    writeFileSync(
      path.join(root, "set-result.json"),
      `${JSON.stringify({ outcome: request.outcome, files }, null, 2)}\n`,
    );
    const valuePackage = assembleClip549ValuePackage({
      repoRoot: input.repoRoot,
      outputDir: path.join(root, "customer-package"),
      identity: {
        customerName: input.campaignId,
        projectName: "Clip Repurposing",
        orderLabel: input.campaignId,
        deliveredOn: new Date().toISOString().slice(0, 10),
        ctaText: approvedClipRepurposingCta({
          ctaText: input.ctaText,
          setRevision: request.setRevision,
        }),
      },
      delivered: files.map((file, index) => ({
        clipId: file.clipId,
        fileName: clip549CustomerShortFileName(index),
        spokenIdea: file.idea,
        durationLabel: "",
      })),
      sourceMp4AbsolutePaths: files.map((file) =>
        path.join(input.repoRoot, file.relativePath),
      ),
    });
    if (!valuePackage.ok) {
      throw new Error(valuePackage.message);
    }
    return files;
  };

  return {
    ok: true,
    sourceDurationSeconds,
    sentences,
    designatedSourceException: designated,
    deepgramUsdList,
    deepgramReused,
    discover: discoverClipSet,
    produce,
  };
}
