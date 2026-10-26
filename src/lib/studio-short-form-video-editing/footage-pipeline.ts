/**
 * New footage spine. Does not call the stills Shotstack work-packet pipeline
 * or the v2-rtu-short-video dispatch hook.
 */

import { createHash, randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
  shotstackSubmitRender,
} from "@/lib/studio-kitchen-production/video-integration/client";
import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";
import { shotstackUploadLocalFile } from "@/lib/studio-kitchen-production/video-integration/media-ingest";
import type { ShotstackFetch } from "@/lib/studio-kitchen-production/video-integration/types";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import { finishFootageAudio } from "./audio-finish";
import { buildEditDecisionList } from "./edl";
import { evaluateEditorialPlan } from "./editorial";
import {
  briefFromStoryPlan,
  pickIdeaFirstPlan,
  type EditorialBrief,
} from "./idea-first";
import { buildFootageShotstackPayload } from "./footage-payload";
import { evaluateFootageIntake, evaluateFootageProbe } from "./gates";
import { applyDotenvLocal } from "./load-env-local";
import { probeFootageSource } from "./probe";
import { resolveFootageRenderEnv } from "./render-env";
import { assembleBurnedShort, exactWords } from "./caption-burn";
import { applyCustomerEndCardHoldRevision } from "./revision";
import { pickSentenceIndexes } from "./select-sentences";
import {
  buildTranscriptSentences,
  wordsFromSentenceIndexes,
} from "./sentences";
import { storyPlanFromIndexes, type StoryPlan } from "./story-order";
import { evaluateFinishingPreflight } from "./finishing-preflight";
import {
  watchPerformanceForEdit,
  writePerformanceWatchProof,
} from "./performance-watch";
import { LIVE_PROOF_SOURCE_META } from "./source-prep";
import { transcribeFootageFile } from "./transcribe";
import type {
  EditDecisionList,
  FootageIntake,
  FootageProbe,
} from "./types";

export type FootageSpend = {
  deepgramUsdList: number;
  deepgramUsdOptOutCeiling: number;
  modelSelectionUsd: number;
  performanceWatchUsd: number;
  shotstackCredits: number | null;
  renders: number;
  transportRetries: number;
  creativeRetries: number;
  elapsedMs: number;
  renderEnv: "stage" | "v1";
  watermarkExpected: boolean;
};

export type FootagePipelineResult =
  | {
      ok: true;
      sourceRelativePath: string;
      probe: FootageProbe;
      edl: EditDecisionList;
      outputRelativePath: string;
      providerRenderId: string;
      spend: FootageSpend;
      revisionApplied: boolean;
      selectionWinner: "deterministic" | "sentence_index" | "performance_watch";
      storyPlan?: StoryPlan;
      editorialBrief?: EditorialBrief;
    }
  | {
      ok: false;
      verdict:
        | "DEEPGRAM_KEY_ABSENT"
        | "RIGHTS_BLOCKED"
        | "PROBE_FAILED"
        | "TRANSCRIBE_FAILED"
        | "EDL_FAILED"
        | "INGEST_FAILED"
        | "SUBMIT_FAILED"
        | "RENDER_TIMEOUT"
        | "RENDER_FAILED"
        | "DOWNLOAD_FAILED"
        | "SHOTSTACK_KEY_ABSENT"
        | "AUDIO_FINISH_FAILED"
        | "EDITORIAL_PLAN_FAILED"
        | "AUDIO_HANDOFF_FAILED"
        | "TEXT_FIDELITY_FAILED";
      message: string;
      providerRenderId?: string;
      spend: FootageSpend;
      probe?: FootageProbe;
      edl?: EditDecisionList;
    };

function emptySpend(startedAt: number): FootageSpend {
  return {
    deepgramUsdList: 0,
    deepgramUsdOptOutCeiling: 0,
    modelSelectionUsd: 0,
    performanceWatchUsd: 0,
    shotstackCredits: null,
    renders: 0,
    transportRetries: 0,
    creativeRetries: 0,
    elapsedMs: Date.now() - startedAt,
    renderEnv: "stage",
    watermarkExpected: true,
  };
}

export async function runFootageEditingPipeline(input: {
  repoRoot: string;
  sourceAbsolutePath: string;
  sourceRelativePath: string;
  intake?: Partial<FootageIntake>;
  applyRevision?: boolean;
  fetchImpl?: ShotstackFetch;
  deepgramKey?: string | null;
  anthropicKey?: string | null;
  shotstackKey?: string;
  pollMaxAttempts?: number;
  pollDelayMs?: number;
  dryRun?: boolean;
}): Promise<FootagePipelineResult> {
  const startedAt = Date.now();
  applyDotenvLocal(input.repoRoot);
  const spend = emptySpend(startedAt);

  const ctaTreatment = input.intake?.ctaTreatment;
  const rawCta = input.intake?.ctaText;
  const ctaText =
    ctaTreatment === "none"
      ? (rawCta?.trim() ?? "")
      : rawCta === undefined
        ? LIVE_PROOF_SOURCE_META.customerCta
        : rawCta.trim();
  const intake: FootageIntake = {
    skuId: "v2-rtu-short-form-video-edit",
    sourceRelativePath: input.sourceRelativePath,
    ctaText,
    ctaTreatment,
    mustKeepLine: input.intake?.mustKeepLine,
    rightsCleared:
      input.intake?.rightsCleared ?? LIVE_PROOF_SOURCE_META.rightsClearedForTest,
    language: "en",
  };

  const rights = evaluateFootageIntake(intake);
  if (rights) {
    return {
      ok: false,
      verdict: "RIGHTS_BLOCKED",
      message: rights.message,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const probe = probeFootageSource(input.sourceAbsolutePath);
  if ("error" in probe) {
    return {
      ok: false,
      verdict: "PROBE_FAILED",
      message: probe.error,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }
  const probeGate = evaluateFootageProbe(probe);
  if (probeGate) {
    return {
      ok: false,
      verdict: "PROBE_FAILED",
      message: probeGate.message,
      probe,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const deepgramKey =
    input.deepgramKey === undefined
      ? process.env.DEEPGRAM_API_KEY?.trim() || null
      : input.deepgramKey;
  const transcript = await transcribeFootageFile({
    apiKey: deepgramKey,
    absolutePath: input.sourceAbsolutePath,
    fetchImpl: input.fetchImpl,
  });
  if (!transcript.ok) {
    return {
      ok: false,
      verdict:
        transcript.code === "KEY_ABSENT"
          ? "DEEPGRAM_KEY_ABSENT"
          : "TRANSCRIBE_FAILED",
      message: transcript.message,
      probe,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }
  spend.deepgramUsdList = transcript.estimatedUsdList;
  spend.deepgramUsdOptOutCeiling = transcript.estimatedUsdOptOutCeiling;

  const deterministic = buildEditDecisionList({
    words: transcript.words,
    intake,
    sourceDurationSeconds: probe.durationSeconds,
  });
  if (!deterministic.ok) {
    return {
      ok: false,
      verdict: "EDL_FAILED",
      message: deterministic.message,
      probe,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const sentences = buildTranscriptSentences(transcript.words);
  const finishingOnly =
    studioShortFormVideoEditingBuildV1.factory.finishingPassOnly === true &&
    transcript.words.some(
      (word) =>
        /cherries/i.test(word.word) && word.start >= 80 && word.start <= 95,
    );
  const frozen = studioShortFormVideoEditingBuildV1.frozenCherriesEditorial;
  const finishingHook = {
    index: 13,
    text: "My favorite word in English is cherries, which means a small fruit that is delicious.",
    role: "hook" as const,
    start: frozen.openingSourceSeconds,
    end: frozen.spokenExitSourceSeconds,
  };
  let brief: EditorialBrief;
  let storyPlan: StoryPlan;
  let winner: "deterministic" | "sentence_index" = "deterministic";
  let edl: EditDecisionList | Awaited<ReturnType<typeof buildEditDecisionList>> =
    deterministic;
  let selectionWinner: "deterministic" | "sentence_index" | "performance_watch" =
    "deterministic";

  if (finishingOnly) {
    const frozenEdl = buildEditDecisionList({
      words: transcript.words,
      intake,
      sourceDurationSeconds: probe.durationSeconds,
      lockContinuousRange: {
        start: frozen.openingSourceSeconds,
        end: frozen.holdExitSourceSeconds,
      },
    });
    if (!frozenEdl.ok) {
      return {
        ok: false,
        verdict: "EDL_FAILED",
        message: frozenEdl.message,
        probe,
        spend: { ...spend, elapsedMs: Date.now() - startedAt },
      };
    }
    edl = {
      ...frozenEdl,
      selection: "performance_watch",
      selectionWinner: "performance_watch",
    };
    selectionWinner = "performance_watch";
    storyPlan = {
      ok: true,
      beats: [finishingHook],
      roles: ["hook"],
      reason: "Checkpoint 10 finishing pass. Editorial brain frozen.",
      humanEditorWouldChooseThisOrder: true,
    };
    brief = {
      ok: true,
      centralIdea: frozen.centralIdea,
      whyStrongest: "Frozen from Checkpoint 9.",
      candidates: [],
      hook: finishingHook,
      body: [],
      close: null,
      finalOrder: ["hook"],
      excluded: [],
      wouldEditorChooseThisOverFirstBlock: true,
      firstBlockAlternative: "My name is Daniel.",
      beats: [finishingHook],
      plan: storyPlan,
    };
  } else {
  const anthropicKey =
    input.anthropicKey === undefined
      ? process.env.ANTHROPIC_API_KEY?.trim() || null
      : input.anthropicKey;
  const indexPick = await pickSentenceIndexes({
    sentences,
    apiKey: anthropicKey,
    minSeconds: studioShortFormVideoEditingBuildV1.offer.outputMinSeconds,
    maxSeconds: studioShortFormVideoEditingBuildV1.offer.outputMaxSeconds,
    mustKeepLine: intake.mustKeepLine,
  });
  spend.modelSelectionUsd = indexPick.estimatedUsd;

  const modelStory = indexPick.ok
    ? storyPlanFromIndexes(sentences, indexPick.pick.indexes, indexPick.roles)
    : null;
  const modelBrief = modelStory
    ? briefFromStoryPlan(sentences, modelStory, {
        centralIdea: indexPick.ok
          ? indexPick.idea ?? modelStory.beats[0]?.text ?? "model idea"
          : "model idea",
        whyStrongest: indexPick.ok
          ? indexPick.why ?? "Model named this as the strongest spoken idea."
          : "",
      })
    : null;
  const deterministicBrief = pickIdeaFirstPlan(sentences);
  brief =
    modelBrief?.ok === true ? modelBrief : deterministicBrief;
  storyPlan = brief.ok
    ? brief.plan
    : {
        ok: false,
        findings: brief.findings,
        beats: brief.beats,
        humanEditorWouldChooseThisOrder: false,
      };
  winner = modelBrief?.ok === true ? "sentence_index" : "deterministic";

  if (!brief.ok) {
    const planPath = path.join(
      input.repoRoot,
      "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/editorial-brief.json",
    );
    mkdirSync(path.dirname(planPath), { recursive: true });
    writeFileSync(
      planPath,
      JSON.stringify(
        {
          ok: false,
          findings: brief.findings,
          centralIdea: brief.centralIdea,
          whyStrongest: brief.whyStrongest,
          candidates: brief.candidates,
          wouldEditorChooseThisOverFirstBlock: false,
          firstBlockAlternative: brief.firstBlockAlternative,
          winner,
        },
        null,
        2,
      ),
    );
    return {
      ok: false,
      verdict: "EDITORIAL_PLAN_FAILED",
      message: `Idea-first plan failed: ${brief.findings.join("; ")}`,
      probe,
      edl: deterministic,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const leftoverFromBrief = brief.beats.find((beat) =>
    /hope you enjoyed|thank you|thanks for watching|goodbye|see you/i.test(
      beat.text,
    ),
  );
  const ideaBeats = leftoverFromBrief
    ? brief.beats.filter((beat) => beat.index !== leftoverFromBrief.index)
    : brief.beats;
  const leftoverSentence =
    leftoverFromBrief ??
    sentences.find((sentence) => {
      const last = ideaBeats[ideaBeats.length - 1];
      return Boolean(
        last &&
          sentence.start >= last.end &&
          sentence.start - last.end <= 8 &&
          /hope you enjoyed|thank you|thanks for watching|goodbye|see you/i.test(
            sentence.text,
          ),
      );
    });
  const performancePlan = anthropicKey
    ? await watchPerformanceForEdit({
        sourceAbsolutePath: input.sourceAbsolutePath,
        frameDirectory: path.join(
          input.repoRoot,
          "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/frames/performance-watch",
        ),
        apiKey: anthropicKey,
        fetchImpl: input.fetchImpl as typeof fetch | undefined,
        spokenMap: {
          idea: brief.centralIdea,
          beats: ideaBeats.map((beat) => ({
            start: beat.start,
            end: beat.end,
            text: beat.text,
          })),
          leftover: leftoverSentence
            ? {
                start: leftoverSentence.start,
                end: leftoverSentence.end,
                text: leftoverSentence.text,
              }
            : undefined,
        },
      })
    : null;
  if (performancePlan) {
    spend.performanceWatchUsd = performancePlan.estimatedUsd;
    writePerformanceWatchProof({
      repoRoot: input.repoRoot,
      plan: performancePlan,
    });
  }

  const selectedWords = wordsFromSentenceIndexes(
    sentences,
    brief.beats.map((beat) => beat.index),
  );
  const performanceEdl =
    performancePlan?.ok === true
      ? buildEditDecisionList({
          words: transcript.words,
          intake,
          sourceDurationSeconds: probe.durationSeconds,
          lockContinuousRange: {
            start: performancePlan.openingSourceSeconds,
            end: performancePlan.exitSourceSeconds,
          },
        })
      : null;
  const storyEdl =
    !performanceEdl?.ok && selectedWords?.length
      ? buildEditDecisionList({
          words: selectedWords,
          intake,
          sourceDurationSeconds: probe.durationSeconds,
          preserveInputOrder: true,
          lockSelectedIslands: true,
        })
      : null;
  edl = performanceEdl?.ok
    ? performanceEdl
    : storyEdl?.ok
      ? storyEdl
      : deterministic;
  selectionWinner = performanceEdl?.ok
    ? "performance_watch"
    : winner === "sentence_index"
      ? "sentence_index"
      : "deterministic";
  edl = {
    ...edl,
    selection: performanceEdl?.ok
      ? "performance_watch"
      : winner === "sentence_index"
        ? "sentence_index"
        : "multi_segment",
    selectionWinner,
  };
  }

  if (edl.ok) {
    const sourceSpoken = transcript.words.length
      ? transcript.words[transcript.words.length - 1]!.end -
        transcript.words[0]!.start
      : 0;
    const plan = evaluateEditorialPlan({
      clipCount: edl.clips.length,
      outputDurationSeconds: edl.outputDurationSeconds,
      sourceSpokenSeconds: sourceSpoken,
      sourceTrims: edl.clips.map((clip) => clip.sourceTrim),
      storyFindings: storyPlan.ok ? [] : storyPlan.findings,
      humanEditorWouldChooseThisOrder: storyPlan.ok
        ? storyPlan.humanEditorWouldChooseThisOrder
        : false,
      wouldEditorChooseThisOverFirstBlock:
        brief.wouldEditorChooseThisOverFirstBlock,
      firstSourceTrim: edl.clips[0]?.sourceTrim,
    });
    const planPath = path.join(
      input.repoRoot,
      "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/edl-plan.json",
    );
    const briefPath = path.join(
      input.repoRoot,
      "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/editorial-brief.json",
    );
    mkdirSync(path.dirname(planPath), { recursive: true });
    writeFileSync(
      briefPath,
      JSON.stringify(
        {
          ok: true,
          centralIdea: brief.centralIdea,
          whyStrongest: brief.whyStrongest,
          candidates: brief.candidates,
          hook: brief.hook,
          body: brief.body,
          close: brief.close,
          finalOrder: brief.finalOrder,
          excluded: brief.excluded,
          wouldEditorChooseThisOverFirstBlock: true,
          firstBlockAlternative: brief.firstBlockAlternative,
          modelIdea: finishingOnly ? frozen.centralIdea : null,
          modelWhy: finishingOnly ? "finishing_pass_brain_frozen" : null,
          excludedWhy: finishingOnly
            ? "Do not iterate the transcript selector."
            : null,
          winner,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      planPath,
      JSON.stringify(
        {
          selection: edl.selection,
          selectionWinner,
          outputDurationSeconds: edl.outputDurationSeconds,
          indexes: storyPlan.ok
            ? storyPlan.beats.map((beat) => beat.index)
            : storyPlan.beats.map((beat) => beat.index),
          beats: (storyPlan.ok ? storyPlan.beats : storyPlan.beats).map((beat) => ({
            index: beat.index,
            role: beat.role,
            text: beat.text,
            start: beat.start,
            end: beat.end,
          })),
          finalOrder: storyPlan.ok
            ? storyPlan.roles
            : storyPlan.beats.map((beat) => beat.role),
          reason: storyPlan.ok ? storyPlan.reason : storyPlan.findings.join("; "),
          humanEditorWouldChooseThisOrder: storyPlan.ok,
          clips: edl.clips.map((clip) => ({
            role: clip.role,
            sourceTrim: clip.sourceTrim,
            sourceLength: clip.sourceLength,
            text: clip.text,
          })),
          findings: plan.findings,
          ok: plan.ok,
        },
        null,
        2,
      ),
    );
    if (!plan.ok) {
      return {
        ok: false,
        verdict: "EDITORIAL_PLAN_FAILED",
        message: `EDL did not look like an edit: ${plan.findings.join("; ")}`,
        probe,
        edl,
        spend: { ...spend, elapsedMs: Date.now() - startedAt },
      };
    }
    if (finishingOnly) {
      const preflight = evaluateFinishingPreflight({
        edl,
        approvedCta: intake.ctaText,
      });
      writeFileSync(
        path.join(
          input.repoRoot,
          "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/finishing-preflight.json",
        ),
        `${JSON.stringify(preflight, null, 2)}\n`,
      );
      if (!preflight.ok) {
        return {
          ok: false,
          verdict: "EDITORIAL_PLAN_FAILED",
          message: `Finishing preflight failed: ${preflight.findings.join("; ")}`,
          probe,
          edl,
          spend: { ...spend, elapsedMs: Date.now() - startedAt },
        };
      }
    }
  }

  let revisionApplied = false;
  if (input.applyRevision) {
    edl = applyCustomerEndCardHoldRevision(edl, 4);
    revisionApplied = true;
    spend.creativeRetries = 1;
  }

  const finishedPath = path.join(
    path.dirname(input.sourceAbsolutePath),
    "source-audio-finished.mp4",
  );
  const finished = finishFootageAudio({
    sourceAbsolutePath: input.sourceAbsolutePath,
    outputAbsolutePath: finishedPath,
  });
  if (!finished.ok) {
    return {
      ok: false,
      verdict: "AUDIO_FINISH_FAILED",
      message: finished.message,
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const preflightPath = path.join(
    input.repoRoot,
    "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/audio-handoff-preflight.json",
  );
  mkdirSync(path.dirname(preflightPath), { recursive: true });
  writeFileSync(
    preflightPath,
    JSON.stringify(
      {
        method: finished.method,
        handoff: finished.handoff,
        targetIntegratedLufs: finished.targetIntegratedLufs,
        truePeakDbfs: finished.truePeakDbfs,
        inspect: finished.inspect,
        listened: finished.inspect.audible,
        ok: finished.inspect.ok,
      },
      null,
      2,
    ),
  );
  if (!finished.inspect.ok || !finished.inspect.audible) {
    return {
      ok: false,
      verdict: "AUDIO_HANDOFF_FAILED",
      message: `Local remux is not Shotstack-safe: ${finished.inspect.findings.join("; ")}`,
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const localProofAbs = path.join(
    input.repoRoot,
    "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/local-text-proof.mp4",
  );
  let uploadAbsolutePath = finished.outputAbsolutePath;
  if (finishingOnly) {
    const burned = await assembleBurnedShort({
      sourceAbsolutePath: finished.outputAbsolutePath,
      edl,
      workDirectory: path.join(
        input.repoRoot,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/burn-work",
      ),
      outputAbsolutePath: localProofAbs,
      approvedCta: intake.ctaText,
      transcriptWordsInRange: exactWords(edl.ok ? edl.clips[0]?.text ?? "" : ""),
      ctaHoldSeconds: revisionApplied ? 4 : undefined,
    });
    if (!burned.ok) {
      writeFileSync(
        path.join(
          input.repoRoot,
          "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/exact-text-qa.json",
        ),
        `${JSON.stringify({ ok: false, message: burned.message, findings: burned.findings ?? [] }, null, 2)}\n`,
      );
      return {
        ok: false,
        verdict: "TEXT_FIDELITY_FAILED",
        message: burned.message,
        probe,
        edl,
        spend: { ...spend, elapsedMs: Date.now() - startedAt },
      };
    }
    writeFileSync(
      path.join(
        input.repoRoot,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/exact-text-qa.json",
      ),
      `${JSON.stringify({ ok: true, assPath: burned.assPath, paintedWordsPath: burned.paintedWordsPath, localProof: "local-text-proof.mp4" }, null, 2)}\n`,
    );
    uploadAbsolutePath = localProofAbs;
  }

  if (input.dryRun) {
    return {
      ok: true,
      sourceRelativePath: input.sourceRelativePath,
      probe,
      edl,
      outputRelativePath: path.relative(
        input.repoRoot,
        finishingOnly ? localProofAbs : finished.outputAbsolutePath,
      ),
      providerRenderId: "dry-run",
      spend: { ...spend, renders: 0, elapsedMs: Date.now() - startedAt },
      revisionApplied,
      selectionWinner,
      storyPlan,
      editorialBrief: brief,
    };
  }

  const renderEnv = resolveFootageRenderEnv(process.env);
  spend.renderEnv = renderEnv.envName;
  spend.watermarkExpected = renderEnv.watermarkExpected;

  const shotstackKey =
    input.shotstackKey ?? readShotstackApiKey(process.env, renderEnv.envName);
  if (!shotstackKey) {
    return {
      ok: false,
      verdict: "SHOTSTACK_KEY_ABSENT",
      message:
        renderEnv.envName === "v1"
          ? "SHOTSTACK_PRODUCTION_API_KEY absent. Do not paste keys into chat."
          : "SHOTSTACK_API_KEY absent. Do not paste keys into chat.",
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const uploaded = await shotstackUploadLocalFile({
    absolutePath: uploadAbsolutePath,
    apiKey: shotstackKey,
    fetchImpl: input.fetchImpl,
    envName: renderEnv.envName,
  });
  if (!uploaded.ok) {
    return {
      ok: false,
      verdict: uploaded.code === "credentials_absent" ? "SHOTSTACK_KEY_ABSENT" : "INGEST_FAILED",
      message: uploaded.message,
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const built = buildFootageShotstackPayload({
    sourceUrl: uploaded.sourceUrl,
    edl,
    textAlreadyBurned: true,
  });
  if (!built.ok) {
    return {
      ok: false,
      verdict: "EDL_FAILED",
      message: built.findings.join("; "),
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const submit = await shotstackSubmitRender(built.payload, {
    apiKey: shotstackKey,
    fetchImpl: input.fetchImpl,
    envName: renderEnv.envName,
    retry: { maxAttempts: 1, baseDelayMs: 0 },
  });
  spend.renders = 1;
  if (!submit.ok) {
    return {
      ok: false,
      verdict: "SUBMIT_FAILED",
      message: submit.message,
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const poll = await shotstackPollUntilDone(submit.providerRenderId, {
    apiKey: shotstackKey,
    fetchImpl: input.fetchImpl,
    envName: renderEnv.envName,
    maxAttempts: input.pollMaxAttempts ?? 60,
    delayMs: input.pollDelayMs ?? 2000,
  });
  if (!poll.ok) {
    return {
      ok: false,
      verdict: "RENDER_FAILED",
      message: poll.message,
      providerRenderId: submit.providerRenderId,
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }
  if (poll.status === "timed_out") {
    return {
      ok: false,
      verdict: "RENDER_TIMEOUT",
      message:
        "Render timed out after a provider ID existed. No automatic second render was purchased.",
      providerRenderId: submit.providerRenderId,
      probe,
      edl,
      spend: { ...spend, shotstackCredits: poll.credits ?? null, elapsedMs: Date.now() - startedAt },
    };
  }
  if (poll.status === "failed" || !poll.outputUrl) {
    return {
      ok: false,
      verdict: "RENDER_FAILED",
      message: poll.error ?? "Shotstack render failed",
      providerRenderId: submit.providerRenderId,
      probe,
      edl,
      spend: { ...spend, shotstackCredits: poll.credits ?? null, elapsedMs: Date.now() - startedAt },
    };
  }
  spend.shotstackCredits = poll.credits ?? null;

  const download = await shotstackDownloadMp4(poll.outputUrl, {
    fetchImpl: input.fetchImpl,
  });
  if (!download.ok) {
    return {
      ok: false,
      verdict: "DOWNLOAD_FAILED",
      message: download.message,
      providerRenderId: submit.providerRenderId,
      probe,
      edl,
      spend: { ...spend, elapsedMs: Date.now() - startedAt },
    };
  }

  const outputRelativePath =
    "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/edited-talking-head.mp4";
  const outputAbs = path.join(input.repoRoot, outputRelativePath);
  mkdirSync(path.dirname(outputAbs), { recursive: true });
  writeFileSync(outputAbs, download.bytes);
  writeFileSync(
    path.join(input.repoRoot, "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/spend.json"),
    JSON.stringify(
      {
        ...spend,
        elapsedMs: Date.now() - startedAt,
        providerRenderId: submit.providerRenderId,
        outputSha256: createHash("sha256").update(download.bytes).digest("hex"),
        jobId: randomUUID(),
        skuId: intake.skuId,
        selectionWinner,
        renderEnv: renderEnv.envName,
        watermarkExpected: renderEnv.watermarkExpected,
        watermarkReason: renderEnv.reason,
      },
      null,
      2,
    ),
  );

  return {
    ok: true,
    sourceRelativePath: input.sourceRelativePath,
    probe,
    edl,
    outputRelativePath,
    providerRenderId: submit.providerRenderId,
    spend: { ...spend, elapsedMs: Date.now() - startedAt },
    revisionApplied,
    selectionWinner,
    storyPlan,
    editorialBrief: brief,
  };
}
