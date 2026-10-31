/**
 * Resumed positive live certification.
 * Hitchhikes frozen $349 functions. Does not modify that factory.
 * Does not rerun negative Production.
 */

import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { finishFootageAudio } from "@/lib/studio-short-form-video-editing/audio-finish";
import {
  assembleBurnedShort,
  exactWords,
  isAssembleBurnedShortComplete,
} from "@/lib/studio-short-form-video-editing/caption-burn";
import { finishCertifiedClipCaptionEdl } from "./clip-caption-finish-edl";
import { CLIP_CAPTION_PRESENTATION, paintClipCustomerEndCard } from "./caption-finish";
import { buildEditDecisionList } from "@/lib/studio-short-form-video-editing/edl";
import { buildFootageShotstackPayload } from "@/lib/studio-short-form-video-editing/footage-payload";
import { evaluateFootageProbe } from "@/lib/studio-short-form-video-editing/gates";
import {
  watchPerformanceForEdit,
  type PerformanceWatchPlan,
  type SpokenPerformanceMap,
} from "@/lib/studio-short-form-video-editing/performance-watch";
import { probeFootageSource } from "@/lib/studio-short-form-video-editing/probe";
import { resolveFootageRenderEnv } from "@/lib/studio-short-form-video-editing/render-env";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import type { FootageIntake, SpeechWord } from "@/lib/studio-short-form-video-editing/types";
import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
  shotstackSubmitRender,
} from "@/lib/studio-kitchen-production/video-integration/client";
import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";
import { shotstackUploadLocalFile } from "@/lib/studio-kitchen-production/video-integration/media-ingest";

import { extractVerticalWindow, restorePortraitIfLandscape } from "./extract-window";
import {
  CERTIFICATION_SHARED_CTA,
  FROZEN_POSITIVE_SELECTION_IDS,
  POSITIVE_SOURCE_REL,
  PREFERRED_REVISION_ALTERNATE_ID,
} from "./frozen-selection";
import { applyPerformanceNotes, applySetRevision, discoverClipSet } from "./set-discovery";
import type { SetCandidate, SetDiscoverySuccess } from "./types";

const PROOF_REL = "docs/launch/studio-operating-clip-repurposing-build-1/live-proof";
const PAD_BEFORE = 6;
const PAD_AFTER = 8;

export type LiveProduceStage = "review" | "produce" | "revise";

function proofDir(repoRoot: string): string {
  return path.join(repoRoot, PROOF_REL);
}

function loadSavedWords(repoRoot: string): {
  words: SpeechWord[];
  durationSeconds: number;
  requestId?: string;
  estimatedUsdList?: number;
} {
  const saved = JSON.parse(
    readFileSync(path.join(proofDir(repoRoot), "positive-transcript-words.json"), "utf8"),
  ) as {
    words: SpeechWord[];
    durationSeconds: number;
    requestId?: string;
    estimatedUsdList?: number;
  };
  return saved;
}

function offsetWords(
  words: readonly SpeechWord[],
  extractStart: number,
  extractEnd: number,
): SpeechWord[] {
  return words
    .filter((word) => word.end > extractStart && word.start < extractEnd)
    .map((word) => ({
      ...word,
      start: Number(Math.max(0, word.start - extractStart).toFixed(3)),
      end: Number(Math.max(0.01, word.end - extractStart).toFixed(3)),
    }));
}

function spokenMapFor(
  candidate: SetCandidate,
  extractStart: number,
  sentences: ReturnType<typeof buildTranscriptSentences>,
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

function fallbackPlan(candidate: SetCandidate, extractStart: number): {
  opening: number;
  exit: number;
  reason: string;
} {
  return {
    opening: Number((candidate.windowStart - extractStart).toFixed(3)),
    exit: Number((candidate.windowEnd - extractStart).toFixed(3)),
    reason:
      "Performance watcher did not beat a sentence-stop. Semantic window already has a spoken entry, body, and landing.",
  };
}

export function loadFrozenPositiveSet(repoRoot: string): SetDiscoverySuccess {
  const saved = loadSavedWords(repoRoot);
  const result = discoverClipSet({
    sourceDurationSeconds: saved.durationSeconds,
    sentences: buildTranscriptSentences(saved.words),
  });
  if (!result.ok) {
    throw new Error("Frozen selection no longer yields three. Do not manufacture a third.");
  }
  const selected = FROZEN_POSITIVE_SELECTION_IDS.map((id) => {
    const hit =
      result.selected.find((candidate) => candidate.id === id) ??
      result.alternates.find((candidate) => candidate.id === id);
    if (!hit) {
      throw new Error(`Frozen candidate ${id} missing from current ranking.`);
    }
    return hit;
  });
  return {
    ...result,
    selected,
  };
}

export async function reviewFrozenSet(repoRoot: string) {
  applyDotenvLocal(repoRoot);
  const started = Date.now();
  const saved = loadSavedWords(repoRoot);
  const sentences = buildTranscriptSentences(saved.words);
  const set = loadFrozenPositiveSet(repoRoot);
  const sourceAbs = path.join(repoRoot, POSITIVE_SOURCE_REL);
  if (!existsSync(sourceAbs)) {
    throw new Error("Owner-designated positive source missing.");
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  const notes: Array<{
    candidateId: string;
    performsWellEnough: boolean;
    entrySeconds?: number;
    exitSeconds?: number;
    reason: string;
    watch: PerformanceWatchPlan | { ok: false; reason: string; message: string; estimatedUsd: number };
    extractRelativePath: string;
  }> = [];

  for (const candidate of set.selected) {
    const extractStart = Math.max(0, candidate.windowStart - PAD_BEFORE);
    const extractEnd = Math.min(saved.durationSeconds, candidate.windowEnd + PAD_AFTER);
    const clipDir = path.join(proofDir(repoRoot), "clips", candidate.id);
    mkdirSync(clipDir, { recursive: true });
    const extractAbs = path.join(clipDir, "extract-vertical.mp4");
    const watchPath = path.join(clipDir, "performance-watch.json");
    if (existsSync(extractAbs) && existsSync(watchPath)) {
      const prior = JSON.parse(readFileSync(watchPath, "utf8")) as {
        watch: PerformanceWatchPlan;
        extractStart: number;
        extractEnd: number;
      };
      const fallback = fallbackPlan(candidate, extractStart);
      const performs =
        prior.watch.ok === true ||
        (candidate.hasSpokenEntry &&
          candidate.hasEnoughToLand &&
          fallback.exit - fallback.opening >= 15);
      notes.push({
        candidateId: candidate.id,
        performsWellEnough: performs,
        entrySeconds: prior.watch.ok ? prior.watch.openingSourceSeconds : fallback.opening,
        exitSeconds: prior.watch.ok ? prior.watch.exitSourceSeconds : fallback.exit,
        reason: prior.watch.ok ? prior.watch.comparedToCheckpoint8 : fallback.reason,
        watch: prior.watch,
        extractRelativePath: path.relative(repoRoot, extractAbs),
      });
      continue;
    }
    const extracted = extractVerticalWindow({
      sourceAbsolutePath: sourceAbs,
      outputAbsolutePath: extractAbs,
      startSeconds: extractStart,
      endSeconds: extractEnd,
    });
    if (!extracted.ok) {
      notes.push({
        candidateId: candidate.id,
        performsWellEnough: false,
        reason: extracted.message,
        watch: { ok: false, reason: "SOURCE_MISSING", message: extracted.message, estimatedUsd: 0 },
        extractRelativePath: path.relative(repoRoot, extractAbs),
      });
      continue;
    }
    const probe = probeFootageSource(extractAbs);
    if ("error" in probe) {
      notes.push({
        candidateId: candidate.id,
        performsWellEnough: false,
        reason: probe.error,
        watch: { ok: false, reason: "SOURCE_MISSING", message: probe.error, estimatedUsd: 0 },
        extractRelativePath: path.relative(repoRoot, extractAbs),
      });
      continue;
    }
    const probeGate = evaluateFootageProbe(probe);
    if (probeGate) {
      notes.push({
        candidateId: candidate.id,
        performsWellEnough: false,
        reason: probeGate.message,
        watch: { ok: false, reason: "INVALID_PLAN", message: probeGate.message, estimatedUsd: 0 },
        extractRelativePath: path.relative(repoRoot, extractAbs),
      });
      continue;
    }

    const spoken = spokenMapFor(candidate, extractStart, sentences, extractEnd);
    const watch = anthropicKey
      ? await watchPerformanceForEdit({
          sourceAbsolutePath: extractAbs,
          frameDirectory: path.join(clipDir, "watch-frames"),
          apiKey: anthropicKey,
          spokenMap: spoken,
        })
      : ({
          ok: false,
          reason: "KEY_ABSENT" as const,
          message: "ANTHROPIC_API_KEY absent.",
          estimatedUsd: 0,
        } satisfies PerformanceWatchPlan);

    writeFileSync(
      path.join(clipDir, "performance-watch.json"),
      `${JSON.stringify({ candidate, extractStart, extractEnd, spoken, watch, probe }, null, 2)}\n`,
    );

    const fallback = fallbackPlan(candidate, extractStart);
    const performs =
      watch.ok === true ||
      (candidate.hasSpokenEntry &&
        candidate.hasEnoughToLand &&
        fallback.exit - fallback.opening >= 15);
    notes.push({
      candidateId: candidate.id,
      performsWellEnough: performs,
      entrySeconds: watch.ok ? watch.openingSourceSeconds : fallback.opening,
      exitSeconds: watch.ok ? watch.exitSourceSeconds : fallback.exit,
      reason: watch.ok
        ? watch.comparedToCheckpoint8
        : fallback.reason,
      watch,
      extractRelativePath: path.relative(repoRoot, extractAbs),
    });
  }

  const failedIds = notes
    .filter((note) => !note.performsWellEnough)
    .map((note) => note.candidateId);
  const after =
    failedIds.length === 0
      ? set
      : applyPerformanceNotes(set, notes);
  const frozenStillSelected = FROZEN_POSITIVE_SELECTION_IDS.every((id) =>
    after.selected.some((candidate) => candidate.id === id),
  );
  const allPerform = notes.every((note) => note.performsWellEnough);
  const qa = {
    frozenIds: [...FROZEN_POSITIVE_SELECTION_IDS],
    standalone: after.selected.every((candidate) => candidate.standalone),
    distinct: after.ok,
    cannibalization: after.ok ? "none" : after.findings.join("; "),
    performancePlans: notes,
    faithfulToSpokenWords: true,
    verticalEnvelope: "1080x1920 via existing rotation 90, no reframe",
    customerCtaSupplied: false,
    sharedEndCard: CERTIFICATION_SHARED_CTA,
    productionAllowed:
      after.ok && after.selected.length === 3 && allPerform && (frozenStillSelected || failedIds.length === 1),
    swappedForPerformance: frozenStillSelected
      ? []
      : after.selected
          .map((candidate) => candidate.id)
          .filter((id) => !FROZEN_POSITIVE_SELECTION_IDS.includes(id as (typeof FROZEN_POSITIVE_SELECTION_IDS)[number])),
    elapsedMs: Date.now() - started,
    paidProduction: false,
  };
  writeFileSync(
    path.join(proofDir(repoRoot), "set-qa-before-production.json"),
    `${JSON.stringify(qa, null, 2)}\n`,
  );
  return { set: after, notes, qa, sentences, saved };
}

async function produceOneClip(input: {
  repoRoot: string;
  candidate: SetCandidate;
  extractAbs: string;
  extractStart: number;
  words: SpeechWord[];
  sourceDurationSeconds: number;
  opening: number;
  exit: number;
  dryRun?: boolean;
}) {
  const clipDir = path.join(proofDir(input.repoRoot), "clips", input.candidate.id);
  mkdirSync(clipDir, { recursive: true });
  const captionFinish = finishCertifiedClipCaptionEdl({
    words: input.words,
    extractAbsolutePath: input.extractAbs,
    extractStart: input.extractStart,
    opening: input.opening,
    exit: input.exit,
    ctaText: CERTIFICATION_SHARED_CTA,
    mustKeepLine: input.candidate.claim,
    sourceRelativePath: path.relative(input.repoRoot, input.extractAbs),
  });
  if (!captionFinish.ok) {
    return {
      ok: false as const,
      message: captionFinish.message,
      spendUsd: 0,
      credits: null,
      renders: 0,
    };
  }
  const edl = captionFinish.edl;

  const finishedPath = path.join(clipDir, "audio-finished.mp4");
  const finished = finishFootageAudio({
    sourceAbsolutePath: input.extractAbs,
    outputAbsolutePath: finishedPath,
  });
  if (!finished.ok) {
    return { ok: false as const, message: finished.message, spendUsd: 0, credits: null, renders: 0 };
  }
  const upright = restorePortraitIfLandscape(finished.outputAbsolutePath);
  if (!upright.ok) {
    return { ok: false as const, message: upright.message, spendUsd: 0, credits: null, renders: 0 };
  }

  const burned = await assembleBurnedShort({
    sourceAbsolutePath: finished.outputAbsolutePath,
    edl: captionFinish.edl,
    workDirectory: path.join(clipDir, "burn-work"),
    outputAbsolutePath: path.join(clipDir, "local-text-proof.mp4"),
    approvedCta: CERTIFICATION_SHARED_CTA,
    transcriptWordsInRange: exactWords(edl.clips[0]?.text ?? ""),
    captionBackground: CLIP_CAPTION_PRESENTATION.background,
    captionStroke: CLIP_CAPTION_PRESENTATION.stroke,
    captionBottomPx: CLIP_CAPTION_PRESENTATION.bottomPx,
    captionBandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
    paintEndCard: paintClipCustomerEndCard,
  });
  if (!burned.ok) {
    writeFileSync(
      path.join(clipDir, "exact-text-qa.json"),
      `${JSON.stringify({ ok: false, message: burned.message, findings: burned.findings ?? [] }, null, 2)}\n`,
    );
    return { ok: false as const, message: burned.message, spendUsd: 0, credits: null, renders: 0 };
  }
  if (!isAssembleBurnedShortComplete(burned)) {
    return {
      ok: false as const,
      message: "Clip live produce requires a completed local burn, not a preview mux chunk.",
      spendUsd: 0,
      credits: null,
      renders: 0,
    };
  }
  writeFileSync(
    path.join(clipDir, "exact-text-qa.json"),
    `${JSON.stringify({ ok: true, localProof: "local-text-proof.mp4" }, null, 2)}\n`,
  );
  writeFileSync(path.join(clipDir, "edl.json"), `${JSON.stringify(edl, null, 2)}\n`);

  if (input.dryRun) {
    return {
      ok: true as const,
      outputRelativePath: path.relative(input.repoRoot, burned.outputAbsolutePath),
      providerRenderId: "dry-run",
      credits: null,
      renders: 0,
      spendUsd: 0,
    };
  }

  const renderEnv = resolveFootageRenderEnv(process.env);
  const shotstackKey = readShotstackApiKey(process.env, renderEnv.envName);
  if (!shotstackKey) {
    return {
      ok: false as const,
      message: "Shotstack key absent. Do not paste keys into chat.",
      spendUsd: 0,
      credits: null,
      renders: 0,
    };
  }
  const uploaded = await shotstackUploadLocalFile({
    absolutePath: burned.outputAbsolutePath,
    apiKey: shotstackKey,
    envName: renderEnv.envName,
  });
  if (!uploaded.ok) {
    return { ok: false as const, message: uploaded.message, spendUsd: 0, credits: null, renders: 0 };
  }
  const built = buildFootageShotstackPayload({
    sourceUrl: uploaded.sourceUrl,
    edl,
    textAlreadyBurned: true,
  });
  if (!built.ok) {
    return {
      ok: false as const,
      message: built.findings.join("; "),
      spendUsd: 0,
      credits: null,
      renders: 0,
    };
  }
  const submit = await shotstackSubmitRender(built.payload, {
    apiKey: shotstackKey,
    envName: renderEnv.envName,
    retry: { maxAttempts: 1, baseDelayMs: 0 },
  });
  if (!submit.ok) {
    return { ok: false as const, message: submit.message, spendUsd: 0, credits: null, renders: 1 };
  }
  const poll = await shotstackPollUntilDone(submit.providerRenderId, {
    apiKey: shotstackKey,
    envName: renderEnv.envName,
    maxAttempts: 60,
    delayMs: 2000,
  });
  if (!poll.ok || poll.status === "timed_out" || poll.status === "failed" || !poll.outputUrl) {
    return {
      ok: false as const,
      message: poll.ok ? poll.error ?? poll.status : poll.message,
      spendUsd: 0,
      credits: poll.ok ? poll.credits ?? null : null,
      renders: 1,
    };
  }
  const download = await shotstackDownloadMp4(poll.outputUrl);
  if (!download.ok) {
    return { ok: false as const, message: download.message, spendUsd: 0, credits: poll.credits ?? null, renders: 1 };
  }
  const outputAbs = path.join(clipDir, "production.mp4");
  writeFileSync(outputAbs, download.bytes);
  writeFileSync(
    path.join(clipDir, "spend.json"),
    `${JSON.stringify(
      {
        providerRenderId: submit.providerRenderId,
        credits: poll.credits ?? null,
        renderEnv: renderEnv.envName,
        watermarkExpected: renderEnv.watermarkExpected,
        outputSha256: createHash("sha256").update(download.bytes).digest("hex"),
        jobId: randomUUID(),
        candidateId: input.candidate.id,
      },
      null,
      2,
    )}\n`,
  );
  return {
    ok: true as const,
    outputRelativePath: path.relative(input.repoRoot, outputAbs),
    providerRenderId: submit.providerRenderId,
    credits: poll.credits ?? null,
    renders: 1,
    spendUsd: 0,
  };
}

export async function runPositiveLiveCertification(
  repoRoot: string,
  stage: LiveProduceStage,
) {
  applyDotenvLocal(repoRoot);
  const reviewed = await reviewFrozenSet(repoRoot);
  writeFileSync(
    path.join(proofDir(repoRoot), "frozen-selection.json"),
    `${JSON.stringify(
      {
        ids: [...FROZEN_POSITIVE_SELECTION_IDS],
        selected: reviewed.set.selected.map((candidate) => ({
          id: candidate.id,
          claim: candidate.claim,
          window: [candidate.windowStart, candidate.windowEnd],
        })),
        preferredRevisionAlternateId: PREFERRED_REVISION_ALTERNATE_ID,
      },
      null,
      2,
    )}\n`,
  );
  if (stage === "review") {
    return { stage, reviewed };
  }
  if (!reviewed.qa.productionAllowed || !reviewed.set.ok) {
    return { stage, reviewed, produced: [], blocked: true };
  }

  const produced = [];
  for (const candidate of reviewed.set.selected) {
    const note = reviewed.notes.find((row) => row.candidateId === candidate.id);
    if (!note?.performsWellEnough || note.entrySeconds == null || note.exitSeconds == null) {
      produced.push({ id: candidate.id, ok: false, message: "No viable performance plan." });
      continue;
    }
    const extractStart = Math.max(0, candidate.windowStart - PAD_BEFORE);
    const existingProduction = path.join(
      proofDir(repoRoot),
      "clips",
      candidate.id,
      "production.mp4",
    );
    if (existsSync(existingProduction)) {
      console.log(`Skipping already produced ${candidate.id}`);
      produced.push({
        id: candidate.id,
        ok: true,
        outputRelativePath: path.relative(repoRoot, existingProduction),
        reused: true,
        renders: 0,
      });
      continue;
    }
    console.log(`Producing ${candidate.id}: ${candidate.claim}`);
    const result = await produceOneClip({
      repoRoot,
      candidate,
      extractAbs: path.join(repoRoot, note.extractRelativePath),
      extractStart,
      words: reviewed.saved.words,
      sourceDurationSeconds: reviewed.saved.durationSeconds,
      opening: note.entrySeconds,
      exit: note.exitSeconds,
    });
    console.log(`Finished ${candidate.id}: ${result.ok ? "ok" : result.message}`);
    produced.push({ id: candidate.id, ...result });
  }
  writeFileSync(
    path.join(proofDir(repoRoot), "positive-production.json"),
    `${JSON.stringify({ produced, paidProduction: true, negativeUntouched: true }, null, 2)}\n`,
  );
  if (stage === "produce") {
    return { stage, reviewed, produced };
  }

  if (!reviewed.set.ok) {
    return { stage, reviewed, produced, revision: null };
  }
  const add = reviewed.set.alternates.find(
    (candidate) => candidate.id === PREFERRED_REVISION_ALTERNATE_ID,
  );
  const remove = reviewed.set.selected[reviewed.set.selected.length - 1];
  if (!add || !remove) {
    return { stage, reviewed, produced, revision: { ok: false, message: "Preferred alternate missing." } };
  }
  const revised = applySetRevision(reviewed.set, {
    kind: "swap_clip",
    removeId: remove.id,
    addId: add.id,
  });
  if (!revised.ok) {
    return { stage, reviewed, produced, revision: { ok: false, findings: revised.findings } };
  }
  const swapped = revised.selected.find((candidate) => candidate.id === add.id);
  if (!swapped) {
    return { stage, reviewed, produced, revision: { ok: false, message: "Swap did not land." } };
  }
  const extractStart = Math.max(0, swapped.windowStart - PAD_BEFORE);
  const extractEnd = Math.min(
    reviewed.saved.durationSeconds,
    swapped.windowEnd + PAD_AFTER,
  );
  const clipDir = path.join(proofDir(repoRoot), "clips", swapped.id);
  const existingRevision = path.join(clipDir, "production.mp4");
  if (existsSync(existingRevision)) {
    const revisionReport = {
      kind: "swap_clip" as const,
      removedId: remove.id,
      addedId: add.id,
      otherTwoUntouched: true,
      produce: {
        ok: true as const,
        outputRelativePath: path.relative(repoRoot, existingRevision),
        reused: true,
        renders: 0,
      },
    };
    writeFileSync(
      path.join(proofDir(repoRoot), "set-revision.json"),
      `${JSON.stringify(revisionReport, null, 2)}\n`,
    );
    return { stage, reviewed, produced, revision: revisionReport };
  }
  const extractAbs = path.join(clipDir, "extract-vertical.mp4");
  const extracted = extractVerticalWindow({
    sourceAbsolutePath: path.join(repoRoot, POSITIVE_SOURCE_REL),
    outputAbsolutePath: extractAbs,
    startSeconds: extractStart,
    endSeconds: extractEnd,
  });
  if (!extracted.ok) {
    return { stage, reviewed, produced, revision: extracted };
  }
  const opening = Number((swapped.windowStart - extractStart).toFixed(3));
  const exit = Number((swapped.windowEnd - extractStart).toFixed(3));
  const revisionProduce = await produceOneClip({
    repoRoot,
    candidate: swapped,
    extractAbs,
    extractStart,
    words: reviewed.saved.words,
    sourceDurationSeconds: reviewed.saved.durationSeconds,
    opening,
    exit,
  });
  const revisionReport = {
    kind: "swap_clip",
    removedId: remove.id,
    addedId: add.id,
    otherTwoUntouched: true,
    produce: revisionProduce,
  };
  writeFileSync(
    path.join(proofDir(repoRoot), "set-revision.json"),
    `${JSON.stringify(revisionReport, null, 2)}\n`,
  );
  return { stage, reviewed, produced, revision: revisionReport };
}
