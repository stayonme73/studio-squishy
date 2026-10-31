/**
 * $349 flagship candidate path. Does not hitchhike Clip Repurposing.
 * Reuses the certified footage brain; adds music mix, optional B-roll, punch-in,
 * and a creative revision that can change the opening.
 */

import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { finishFootageAudio } from "@/lib/studio-short-form-video-editing/audio-finish";
import {
  assembleBurnedShort,
  exactWords,
  isAssembleBurnedShortComplete,
} from "@/lib/studio-short-form-video-editing/caption-burn";
import { buildEditDecisionList } from "@/lib/studio-short-form-video-editing/edl";
import { evaluateFootageIntake, evaluateFootageProbe } from "@/lib/studio-short-form-video-editing/gates";
import { briefFromStoryPlan, pickIdeaFirstPlan } from "@/lib/studio-short-form-video-editing/idea-first";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { watchPerformanceForEdit } from "@/lib/studio-short-form-video-editing/performance-watch";
import { probeFootageSource } from "@/lib/studio-short-form-video-editing/probe";
import { applyCustomerEndCardHoldRevision } from "@/lib/studio-short-form-video-editing/revision";
import { pickSentenceIndexes } from "@/lib/studio-short-form-video-editing/select-sentences";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import { storyPlanFromIndexes } from "@/lib/studio-short-form-video-editing/story-order";
import { transcribeFootageFile } from "@/lib/studio-short-form-video-editing/transcribe";
import type { FootageIntake } from "@/lib/studio-short-form-video-editing/types";

import {
  chooseFlagshipBrollTreatment,
  cutFlagshipRange,
  evaluateFlagshipBroll,
  overlayFlagshipBroll,
  type FlagshipBrollAsset,
  type FlagshipBrollTreatment,
} from "./broll";
import { inspectFlagshipRender } from "./inspect";
import { mixMusicUnderSpeech, resolveFlagshipMusicBed, type ElevenCredentialInspect } from "./music";
import { resolveStudioSourcedBroll } from "./studio-stock";
import { describeFlagshipRevision, type FlagshipRevisionRequest } from "./revision";
import {
  FLAGSHIP_SOURCE_META,
  FLAGSHIP_SOURCE_REL,
  prepareFlagshipCustomerStyleSource,
} from "./source-prep";
import { applyHookPunchIn } from "./visual";

export type FlagshipSpend = {
  deepgramUsd: number;
  modelSelectionUsd: number;
  performanceWatchUsd: number;
  elevenMusicAttempted: boolean;
  elevenUsable: boolean;
  elevenCredits: number | null;
  stockMediaUsd: number;
  shotstackRenders: number;
  elapsedMs: number;
};

export type FlagshipPipelineResult =
  | {
      ok: true;
      outputRelativePath: string;
      hookText: string;
      hookIndex: number | null;
      centralIdea: string;
      revisionApplied: boolean;
      revisionKind: FlagshipRevisionRequest["kind"] | null;
      musicMethod: string;
      musicUsed: boolean;
      musicCredential: ElevenCredentialInspect | null;
      brollUsed: boolean;
      brollReason: string;
      brollSource: "customer" | "studio_pexels" | "none";
      brollTreatment: FlagshipBrollTreatment | null;
      punchInApplied: boolean;
      inspect: ReturnType<typeof inspectFlagshipRender>;
      spend: FlagshipSpend;
    }
  | { ok: false; message: string; spend: FlagshipSpend };

export async function runFlagshipShortFormEdit(input: {
  repoRoot: string;
  revision?: FlagshipRevisionRequest;
  priorHookIndex?: number | null;
  broll?: FlagshipBrollAsset | null;
  musicOff?: boolean;
}): Promise<FlagshipPipelineResult> {
  const startedAt = Date.now();
  applyDotenvLocal(input.repoRoot);
  const spend: FlagshipSpend = {
    deepgramUsd: 0,
    modelSelectionUsd: 0,
    performanceWatchUsd: 0,
    elevenMusicAttempted: true,
    elevenUsable: false,
    elevenCredits: null,
    stockMediaUsd: 0,
    shotstackRenders: 0,
    elapsedMs: 0,
  };
  const proofDir = path.join(
    input.repoRoot,
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1",
  );
  mkdirSync(proofDir, { recursive: true });

  const source = prepareFlagshipCustomerStyleSource({ repoRoot: input.repoRoot });
  if (!source.ok) {
    return { ok: false, message: source.message, spend: done(spend, startedAt) };
  }

  const intake: FootageIntake = {
    skuId: "v2-rtu-short-form-video-edit",
    sourceRelativePath: FLAGSHIP_SOURCE_REL,
    ctaText: FLAGSHIP_SOURCE_META.customerCta,
    rightsCleared: true,
    language: "en",
  };
  const rights = evaluateFootageIntake(intake);
  if (rights) {
    return { ok: false, message: rights.message, spend: done(spend, startedAt) };
  }
  const probe = probeFootageSource(source.absolutePath);
  if ("error" in probe) {
    return { ok: false, message: probe.error, spend: done(spend, startedAt) };
  }
  const probeGate = evaluateFootageProbe(probe);
  if (probeGate) {
    return { ok: false, message: probeGate.message, spend: done(spend, startedAt) };
  }

  const transcript = await transcribeFootageFile({
    apiKey: process.env.DEEPGRAM_API_KEY?.trim() || null,
    absolutePath: source.absolutePath,
  });
  if (!transcript.ok) {
    return { ok: false, message: transcript.message, spend: done(spend, startedAt) };
  }
  spend.deepgramUsd = transcript.estimatedUsdList;

  const sentences = buildTranscriptSentences(transcript.words);
  const excludeIndexes =
    input.revision?.kind === "different_opening" && input.priorHookIndex != null
      ? [input.priorHookIndex]
      : [];
  const indexPick = await pickSentenceIndexes({
    sentences,
    apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
    minSeconds: studioShortFormVideoEditingBuildV1.offer.outputMinSeconds,
    maxSeconds: studioShortFormVideoEditingBuildV1.offer.outputMaxSeconds,
    excludeIndexes,
  });
  spend.modelSelectionUsd = indexPick.estimatedUsd;

  const modelStory = indexPick.ok
    ? storyPlanFromIndexes(sentences, indexPick.pick.indexes, indexPick.roles)
    : null;
  const modelBrief = modelStory
    ? briefFromStoryPlan(sentences, modelStory, {
        centralIdea: indexPick.ok
          ? indexPick.idea ?? modelStory.beats[0]?.text ?? "spoken idea"
          : "spoken idea",
        whyStrongest: indexPick.ok
          ? indexPick.why ?? "Model named this as the strongest spoken idea."
          : "",
      })
    : null;
  let brief = modelBrief?.ok === true ? modelBrief : pickIdeaFirstPlan(sentences);
  if (!brief.ok) {
    const densest = buildEditDecisionList({
      words: transcript.words,
      intake,
      sourceDurationSeconds: probe.durationSeconds,
    });
    if (!densest.ok) {
      return {
        ok: false,
        message: `Idea-first plan failed: ${brief.findings.join("; ")}`,
        spend: done(spend, startedAt),
      };
    }
    const clip = densest.clips[0]!;
    const hookBeat = {
      index: 0,
      role: "hook" as const,
      start: clip.sourceTrim,
      end: clip.sourceTrim + clip.sourceLength,
      text: clip.text,
    };
    brief = {
      ok: true,
      centralIdea: clip.text.slice(0, 120),
      whyStrongest:
        "Deterministic densest spoken window. Idea-first found no sellable close on this source.",
      candidates: [],
      hook: hookBeat,
      body: [],
      close: null,
      finalOrder: ["hook"],
      excluded: [],
      wouldEditorChooseThisOverFirstBlock: true,
      firstBlockAlternative: clip.text,
      beats: [hookBeat],
      plan: {
        ok: true,
        beats: [hookBeat],
        roles: ["hook"],
        reason: "deterministic_flagship_fallback",
        humanEditorWouldChooseThisOrder: true,
      },
    };
  }

  const leftoverRe =
    /hope you enjoyed|thank you|thanks for watching|goodbye|see you/i;
  const liveBeats = brief.beats.filter((beat) => !leftoverRe.test(beat.text));
  if (
    liveBeats.length &&
    liveBeats.length !== brief.beats.length &&
    brief.ok
  ) {
    brief = {
      ...brief,
      beats: liveBeats,
      hook: liveBeats[0]!,
      close: liveBeats[liveBeats.length - 1] ?? null,
    };
  }
  if (
    excludeIndexes.length &&
    brief.ok &&
    excludeIndexes.includes(brief.hook.index)
  ) {
    const remaining = sentences.filter(
      (sentence) => !excludeIndexes.includes(sentence.index),
    );
    const alt = pickIdeaFirstPlan(remaining);
    if (alt.ok && !excludeIndexes.includes(alt.hook.index)) {
      brief = alt;
    } else if (remaining[0]) {
      const altBeat = {
        index: remaining[0].index,
        role: "hook" as const,
        start: remaining[0].start,
        end: Math.min(remaining[0].end + 18, remaining[remaining.length - 1]!.end),
        text: remaining[0].text,
      };
      brief = {
        ...brief,
        centralIdea: remaining[0].text,
        whyStrongest: "Revision forced a different spoken opening.",
        hook: altBeat,
        beats: [altBeat],
      };
    }
  }

  const inRangeBeats = brief.beats.filter(
    (beat) => beat.end <= probe.durationSeconds && beat.start >= 0,
  );
  const performance = inRangeBeats.length
    ? await watchPerformanceForEdit({
        sourceAbsolutePath: source.absolutePath,
        frameDirectory: path.join(proofDir, "frames/performance-watch"),
        apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
        spokenMap: {
          idea: brief.centralIdea,
          beats: inRangeBeats.map((beat) => ({
            start: beat.start,
            end: beat.end,
            text: beat.text,
          })),
        },
      })
    : {
        ok: false as const,
        reason: "INVALID_PLAN" as const,
        message: "No in-range beats for performance watch.",
        estimatedUsd: 0,
      };
  spend.performanceWatchUsd = performance.estimatedUsd;

  const fallbackStart = inRangeBeats[0]?.start ?? 8;
  const fallbackEnd = inRangeBeats[inRangeBeats.length - 1]?.end ?? Math.min(
    probe.durationSeconds - 0.2,
    fallbackStart + 22,
  );
  let rangeStart =
    performance.ok === true ? performance.openingSourceSeconds : fallbackStart;
  let rangeEnd =
    performance.ok === true ? performance.exitSourceSeconds : fallbackEnd;
  if (rangeEnd - rangeStart < 15) {
    rangeEnd = Math.min(probe.durationSeconds - 0.05, rangeStart + 20);
  }
  if (rangeEnd - rangeStart > 30) {
    rangeEnd = rangeStart + 28;
  }
  if (rangeEnd <= rangeStart + 15) {
    rangeStart = Math.max(0, probe.durationSeconds - 22);
    rangeEnd = Math.min(probe.durationSeconds - 0.05, rangeStart + 20);
  }
  let edl = buildEditDecisionList({
    words: transcript.words,
    intake,
    sourceDurationSeconds: probe.durationSeconds,
    lockContinuousRange: { start: rangeStart, end: rangeEnd },
  });
  if (!edl.ok || edl.clips.length !== 1) {
    const start = Math.max(0, brief.hook.start);
    const end = Math.min(probe.durationSeconds - 0.05, start + 20);
    edl = buildEditDecisionList({
      words: transcript.words,
      intake,
      sourceDurationSeconds: probe.durationSeconds,
      lockContinuousRange: { start, end },
    });
  }
  if (!edl.ok || edl.clips.length !== 1) {
    return {
      ok: false,
      message: !edl.ok
        ? edl.message
        : "Flagship burn needs one continuous cut.",
      spend: done(spend, startedAt),
    };
  }

  const ctaHold =
    input.revision?.kind === "adjust_cta_hold"
      ? 2
      : studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
  if (input.revision?.kind === "adjust_cta_hold") {
    edl = applyCustomerEndCardHoldRevision(edl, ctaHold);
  }

  const suffix = input.revision ? `revised-${input.revision.kind}` : "first-cut";
  const workDir = path.join(proofDir, "work", suffix);
  mkdirSync(workDir, { recursive: true });

  const finished = finishFootageAudio({
    sourceAbsolutePath: source.absolutePath,
    outputAbsolutePath: path.join(workDir, "audio-finished.mp4"),
  });
  if (!finished.ok) {
    return { ok: false, message: finished.message, spend: done(spend, startedAt) };
  }

  const speechEnd = edl.clips[0]?.sourceLength ?? 15;
  const speechOrigin = edl.clips[0]?.sourceTrim ?? rangeStart;
  const rangeCutPath = path.join(workDir, "range-cut.mp4");
  const rangeCut = cutFlagshipRange({
    sourceAbsolutePath: finished.outputAbsolutePath,
    outputAbsolutePath: rangeCutPath,
    startSeconds: speechOrigin,
    durationSeconds: speechEnd,
  });
  if (!rangeCut.ok) {
    return { ok: false, message: rangeCut.message, spend: done(spend, startedAt) };
  }
  let picture = rangeCutPath;
  let brollAsset =
    input.revision?.kind === "remove_broll" ? null : input.broll ?? null;
  let brollSource: "customer" | "studio_pexels" | "none" = brollAsset
    ? "customer"
    : "none";
  let studioSkipReason: string | null = null;
  if (!brollAsset && input.revision?.kind !== "remove_broll") {
    const studio = await resolveStudioSourcedBroll({
      repoRoot: input.repoRoot,
      spokenIdea: `${brief.hook?.text ?? ""} ${brief.centralIdea}`,
    });
    if (!studio.ok) {
      return { ok: false, message: studio.message, spend: done(spend, startedAt) };
    }
    if (studio.use) {
      brollAsset = studio.asset;
      brollSource = "studio_pexels";
      spend.stockMediaUsd = 0;
    } else {
      studioSkipReason = studio.reason;
    }
  }
  const brollEval = evaluateFlagshipBroll({
    asset: brollAsset,
    spokenIdea: `${brief.hook?.text ?? ""} ${brief.centralIdea}`,
  });
  let brollUsed = false;
  let brollReason = "none";
  if (!brollEval.ok) {
    return { ok: false, message: brollEval.message, spend: done(spend, startedAt) };
  }
  let brollTreatment: FlagshipBrollTreatment | null = null;
  if (brollEval.use) {
    const withBroll = path.join(workDir, "with-broll.mp4");
    const storyCaption = edl.captions.find((caption) => {
      if (caption.role === "cta") return false;
      const text = caption.text.toLowerCase();
      return brollEval.asset.supportsSpokenIdea
        .toLowerCase()
        .split(/[\s,/]+/)
        .filter((token) => token.length > 3)
        .some((token) => text.includes(token));
    });
    const outputStart = storyCaption
      ? storyCaption.start + 0.08
      : Math.min(6.2, Math.max(3.6, speechEnd * 0.32));
    const outputEnd = Math.min(speechEnd - 1.2, outputStart + 2.2);
    const treatment = chooseFlagshipBrollTreatment(brollEval.asset);
    const over = overlayFlagshipBroll({
      videoAbsolutePath: picture,
      brollAbsolutePath: brollEval.asset.absolutePath,
      outputAbsolutePath: withBroll,
      startSeconds: outputStart,
      endSeconds: outputEnd,
      treatment,
      mediaKind: brollEval.asset.mediaKind,
    });
    if (!over.ok) {
      return { ok: false, message: over.message, spend: done(spend, startedAt) };
    }
    picture = withBroll;
    brollUsed = true;
    brollTreatment = over.treatment;
    brollReason =
      brollSource === "studio_pexels"
        ? "Studio Pexels catalog clip supports the spoken idea. Embedded only."
        : "Customer-supplied asset supports the spoken idea.";
  } else {
    brollReason = studioSkipReason ?? brollEval.reason;
    brollSource = "none";
  }

  const burnEdl = {
    ...edl,
    clips: edl.clips.map((clip) => ({ ...clip, sourceTrim: 0 })),
  };
  const burned = await assembleBurnedShort({
    sourceAbsolutePath: picture,
    edl: burnEdl,
    workDirectory: path.join(workDir, "burn"),
    outputAbsolutePath: path.join(workDir, "burned.mp4"),
    approvedCta: intake.ctaText,
    transcriptWordsInRange: exactWords(
      edl.captions
        .filter((caption) => caption.role !== "cta")
        .map((caption) => caption.text)
        .join(" "),
    ),
    ctaHoldSeconds: ctaHold,
  });
  if (!burned.ok) {
    return { ok: false, message: burned.message, spend: done(spend, startedAt) };
  }
  if (!isAssembleBurnedShortComplete(burned)) {
    return {
      ok: false,
      message: "Flagship pipeline requires a completed local burn, not a preview mux chunk.",
      spend: done(spend, startedAt),
    };
  }

  const punchedPath = path.join(workDir, "punched.mp4");
  const punch = applyHookPunchIn({
    videoAbsolutePath: burned.outputAbsolutePath,
    outputAbsolutePath: punchedPath,
    hookSeconds: 2.2,
  });
  if (!punch.ok) {
    return { ok: false, message: punch.message, spend: done(spend, startedAt) };
  }

  let current = punchedPath;
  const musicOff =
    input.musicOff === true || input.revision?.kind === "change_music";
  const music = await resolveFlagshipMusicBed({
    repoRoot: input.repoRoot,
    durationSeconds: edl.outputDurationSeconds,
    preferOff: musicOff,
  });
  if (!music.ok) {
    return { ok: false, message: music.message, spend: done(spend, startedAt) };
  }
  spend.elevenUsable = music.method === "eleven_music";
  spend.elevenCredits = music.estimatedCredits;
  if (music.used && music.absolutePath) {
    const mixed = path.join(workDir, "mixed.mp4");
    const mix = mixMusicUnderSpeech({
      videoAbsolutePath: current,
      musicAbsolutePath: music.absolutePath,
      outputAbsolutePath: mixed,
      speechEndSeconds: speechEnd,
    });
    if (!mix.ok) {
      return { ok: false, message: mix.message, spend: done(spend, startedAt) };
    }
    current = mixed;
  }

  const finalRel = `docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/${suffix}.mp4`;
  const finalAbs = path.join(input.repoRoot, finalRel);
  const copied = assembleCopy(current, finalAbs);
  if (!copied.ok) return { ok: false, message: copied.message, spend: done(spend, startedAt) };

  const inspect = inspectFlagshipRender({
    repoRoot: input.repoRoot,
    videoAbsolutePath: finalAbs,
    workDirectory: path.join(proofDir, "watch", suffix),
  });

  const hookIndex = brief.hook?.index ?? brief.beats[0]?.index ?? null;
  const result = {
    ok: true as const,
    outputRelativePath: finalRel,
    hookText: brief.hook?.text ?? brief.beats[0]?.text ?? "",
    hookIndex,
    centralIdea: brief.centralIdea,
    revisionApplied: Boolean(input.revision),
    revisionKind: input.revision?.kind ?? null,
    musicMethod: music.method,
    musicUsed: music.used,
    musicCredential: music.credential,
    brollUsed,
    brollReason,
    brollSource,
    brollTreatment,
    punchInApplied: true,
    inspect,
    spend: done(spend, startedAt),
  };
  writeFileSync(
    path.join(proofDir, `${suffix}.json`),
    `${JSON.stringify(
      {
        ...result,
        revisionNote: input.revision
          ? describeFlagshipRevision(input.revision)
          : null,
        source: FLAGSHIP_SOURCE_REL,
        excludeCherriesCertCut: true,
      },
      null,
      2,
    )}\n`,
  );
  return result;
}

function assembleCopy(
  fromAbs: string,
  toAbs: string,
): { ok: true } | { ok: false; message: string } {
  try {
    mkdirSync(path.dirname(toAbs), { recursive: true });
    copyFileSync(fromAbs, toAbs);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: `Copy failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function done(spend: FlagshipSpend, startedAt: number): FlagshipSpend {
  return { ...spend, elapsedMs: Date.now() - startedAt };
}
