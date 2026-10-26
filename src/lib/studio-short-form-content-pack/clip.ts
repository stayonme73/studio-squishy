import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";
import {
  chooseFlagshipBrollTreatment,
  cutFlagshipRange,
  evaluateFlagshipBroll,
  overlayFlagshipBroll,
  type FlagshipBrollTreatment,
} from "@/lib/studio-flagship-short-form-edit/broll";
import { inspectFlagshipRender } from "@/lib/studio-flagship-short-form-edit/inspect";
import {
  mixMusicUnderSpeech,
  resolveFlagshipMusicBed,
} from "@/lib/studio-flagship-short-form-edit/music";
import { resolveStudioSourcedBroll } from "@/lib/studio-flagship-short-form-edit/studio-stock";
import { applyHookPunchIn } from "@/lib/studio-flagship-short-form-edit/visual";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { finishFootageAudio } from "@/lib/studio-short-form-video-editing/audio-finish";
import { assembleBurnedShort, exactWords } from "@/lib/studio-short-form-video-editing/caption-burn";
import { buildEditDecisionList } from "@/lib/studio-short-form-video-editing/edl";
import { evaluateFootageProbe } from "@/lib/studio-short-form-video-editing/gates";
import { probeFootageSource } from "@/lib/studio-short-form-video-editing/probe";
import { transcribeFootageFile } from "@/lib/studio-short-form-video-editing/transcribe";
import type { FootageIntake } from "@/lib/studio-short-form-video-editing/types";
import type { StudioVideoCreativeDirectionV1 } from "@/lib/studio-video-creative-direction/contract";

import {
  distinctiveBrollTokens,
  evaluatePackClipEditorialQa,
  planBrollForSemanticThought,
  planStandaloneSpeechRange,
  planSurroundingReviewWindow,
} from "./editorial-completeness";
import type { ContentPackIdentifiedClip } from "./intake";
import type { PackCorrectionInstruction } from "./machine-corrections";
import {
  decidePackEndingTreatment,
  finishPackEndingAudio,
  measureCtaFadeMeanDb,
  packEndStingAbsolutePath,
  probeMediaDuration,
} from "./ending-audio";
import { classifyPackClipTone, musicPromptForTone, type PackMusicDecision } from "./music-decision";

export type PackClipCorrection = Pick<
  PackCorrectionInstruction,
  "omitBroll" | "omitMusic" | "brollTreatment"
> & {
  forceApprovedEndCue?: boolean;
  approvedEndCueMixDb?: number;
};

export type PackClipSpend = {
  deepgramUsd: number;
  elevenCredits: number;
  stockMediaUsd: number;
  elapsedMs: number;
};

export type PackClipResult = {
  ok: true;
  clipId: string;
  label: string;
  spokenIdea: string;
  outputRelativePath: string;
  musicUsed: boolean;
  musicMethod: string;
  musicShared: boolean;
  brollUsed: boolean;
  brollReason: string;
  brollTreatment: FlagshipBrollTreatment | null;
  brollStartSeconds: number | null;
  brollEndSeconds: number | null;
  brollToken: string | null;
  brollThoughtText: string | null;
  openingText: string;
  endingText: string;
  inspect: ReturnType<typeof inspectFlagshipRender>;
  spend: PackClipSpend;
};

export async function runContentPackClip(input: {
  repoRoot: string;
  workDir: string;
  outputRelativePath: string;
  sourceAbsolutePath: string;
  clip: ContentPackIdentifiedClip;
  ctaText: string;
  musicDecision: PackMusicDecision;
  sharedMusicAbsolutePath?: string | null;
  correction?: PackClipCorrection | null;
  direction?: StudioVideoCreativeDirectionV1 | null;
}): Promise<PackClipResult | { ok: false; message: string; spend: PackClipSpend }> {
  const startedAt = Date.now();
  const spend: PackClipSpend = {
    deepgramUsd: 0,
    elevenCredits: 0,
    stockMediaUsd: 0,
    elapsedMs: 0,
  };
  applyDotenvLocal(input.repoRoot);
  mkdirSync(input.workDir, { recursive: true });

  const identifiedPath = path.join(input.workDir, "identified.mp4");
  const start = input.clip.startSeconds ?? 0;
  const end = input.clip.endSeconds;
  const review =
    end != null && end > start
      ? planSurroundingReviewWindow({
          identifiedStartSeconds: start,
          identifiedEndSeconds: end,
        })
      : null;
  if (review) {
    const cut = cutFlagshipRange({
      sourceAbsolutePath: input.sourceAbsolutePath,
      outputAbsolutePath: identifiedPath,
      startSeconds: review.startSeconds,
      durationSeconds: review.reviewSeconds,
    });
    if (!cut.ok) return { ok: false, message: cut.message, spend: done(spend, startedAt) };
  } else if (existsSync(input.sourceAbsolutePath)) {
    copyFileSync(input.sourceAbsolutePath, identifiedPath);
  } else {
    return { ok: false, message: `Source missing for ${input.clip.id}.`, spend: done(spend, startedAt) };
  }

  const probe = probeFootageSource(identifiedPath);
  if ("error" in probe) {
    return { ok: false, message: probe.error, spend: done(spend, startedAt) };
  }
  const gate = evaluateFootageProbe(probe);
  if (gate) return { ok: false, message: gate.message, spend: done(spend, startedAt) };

  const transcript = await transcribeFootageFile({
    apiKey: process.env.DEEPGRAM_API_KEY?.trim() || null,
    absolutePath: identifiedPath,
  });
  if (!transcript.ok) {
    return { ok: false, message: transcript.message, spend: done(spend, startedAt) };
  }
  spend.deepgramUsd = transcript.estimatedUsdList;
  const snapped = planStandaloneSpeechRange({
    words: transcript.words,
    minSeconds: pack.outputMinSeconds,
    maxSeconds: pack.outputMaxSeconds,
    anchorStartSeconds: review ? start - review.startSeconds : undefined,
    anchorEndSeconds: review && end != null ? end - review.startSeconds : undefined,
  });
  if (!snapped.ok) {
    return { ok: false, message: snapped.message, spend: done(spend, startedAt) };
  }
  const spokenIdea = snapped.text;
  const qa = evaluatePackClipEditorialQa({
    openingText: snapped.openingText,
    endingText: snapped.endingText,
    spokenIdea,
  });
  if (qa.length) {
    return {
      ok: false,
      message: `Standalone short QA failed: ${qa.join("; ")}`,
      spend: done(spend, startedAt),
    };
  }

  const intake: FootageIntake = {
    skuId: "v2-rtu-short-form-video-edit",
    sourceRelativePath: input.clip.sourceRelativePath,
    ctaText: input.ctaText,
    rightsCleared: true,
    language: "en",
  };
  const rangeStart = snapped.start;
  const rangeEnd = snapped.end;
  if (rangeEnd - rangeStart < pack.outputMinSeconds) {
    return {
      ok: false,
      message: `Identified clip ${input.clip.label} is under 15 seconds after sentence snap.`,
      spend: done(spend, startedAt),
    };
  }

  let edl = buildEditDecisionList({
    words: transcript.words,
    intake,
    sourceDurationSeconds: probe.durationSeconds,
    lockContinuousRange: { start: rangeStart, end: rangeEnd },
  });
  if (!edl.ok) {
    return { ok: false, message: edl.message, spend: done(spend, startedAt) };
  }

  const finished = finishFootageAudio({
    sourceAbsolutePath: identifiedPath,
    outputAbsolutePath: path.join(input.workDir, "audio-finished.mp4"),
  });
  if (!finished.ok) {
    return { ok: false, message: finished.message, spend: done(spend, startedAt) };
  }

  const speechEnd = edl.clips[0]?.sourceLength ?? rangeEnd - rangeStart;
  const speechOrigin = edl.clips[0]?.sourceTrim ?? rangeStart;
  const rangeCutPath = path.join(input.workDir, "range-cut.mp4");
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
  let brollUsed = false;
  let brollReason = "No matching stock. Talking-head stays.";
  let brollTreatment: FlagshipBrollTreatment | null = null;
  let brollStartSeconds: number | null = null;
  let brollEndSeconds: number | null = null;
  let brollToken: string | null = null;
  let brollThoughtText: string | null = null;
  const studio = await resolveStudioSourcedBroll({
    repoRoot: input.repoRoot,
    spokenIdea: `${input.clip.label} ${spokenIdea}`,
  });
  if (!studio.ok) return { ok: false, message: studio.message, spend: done(spend, startedAt) };
  if (
    input.correction?.omitBroll ||
    input.correction?.brollTreatment === "none" ||
    input.direction?.broll.use === false
  ) {
    brollReason = input.direction?.broll.use === false
      ? "Creative-Direction Contract omits B-roll."
      : "Quality required talking-head only. B-roll omitted.";
  } else if (studio.use) {
    const evaluated = evaluateFlagshipBroll({
      asset: studio.asset,
      spokenIdea,
    });
    if (!evaluated.ok) {
      return { ok: false, message: evaluated.message, spend: done(spend, startedAt) };
    }
    if (evaluated.use) {
      const tokens = distinctiveBrollTokens(evaluated.asset.supportsSpokenIdea);
      if (!tokens.length) {
        brollReason =
          "Stock only matches generic language words. Talking-head stays.";
      } else {
      const withBroll = path.join(input.workDir, "with-broll.mp4");
      const aligned = planBrollForSemanticThought({
        words: transcript.words,
        tokens,
        rangeStart,
        speechEnd,
      });
      if (!aligned.ok) {
        return { ok: false, message: aligned.message, spend: done(spend, startedAt) };
      }
      const outputStart = aligned.start;
      const outputEnd = aligned.end;
      brollStartSeconds = aligned.start;
      brollEndSeconds = aligned.end;
      brollToken = aligned.token;
      brollThoughtText = aligned.thoughtText;
      const over = overlayFlagshipBroll({
        videoAbsolutePath: picture,
        brollAbsolutePath: evaluated.asset.absolutePath,
        outputAbsolutePath: withBroll,
        startSeconds: outputStart,
        endSeconds: outputEnd,
        treatment:
          input.correction?.brollTreatment === "picture_in_picture" ||
          input.correction?.brollTreatment === "short_fullframe"
            ? input.correction.brollTreatment
            : chooseFlagshipBrollTreatment(evaluated.asset),
        mediaKind: evaluated.asset.mediaKind,
      });
      if (!over.ok) return { ok: false, message: over.message, spend: done(spend, startedAt) };
      picture = withBroll;
      brollUsed = true;
      brollTreatment = over.treatment;
      brollReason = "Studio Pexels catalog clip supports the spoken idea.";
      spend.stockMediaUsd = 0;
      }
    } else {
      brollReason = evaluated.reason;
    }
  } else {
    brollReason = studio.reason;
  }

  const burnEdl = {
    ...edl,
    clips: edl.clips.map((clip) => ({ ...clip, sourceTrim: 0 })),
  };
  const punchedPicture = path.join(input.workDir, "punched-picture.mp4");
  if (input.direction?.visualEmphasis.hookPunchIn === true) {
    const punch = applyHookPunchIn({
      videoAbsolutePath: picture,
      outputAbsolutePath: punchedPicture,
      hookSeconds: 2.2,
    });
    if (!punch.ok) return { ok: false, message: punch.message, spend: done(spend, startedAt) };
  } else {
    copyFileSync(picture, punchedPicture);
  }

  const approvedCta = input.direction?.cta.text?.trim() || input.ctaText;
  const burned = await assembleBurnedShort({
    sourceAbsolutePath: punchedPicture,
    edl: burnEdl,
    workDirectory: path.join(input.workDir, "burn"),
    outputAbsolutePath: path.join(input.workDir, "burned.mp4"),
    approvedCta,
    transcriptWordsInRange: exactWords(
      edl.captions
        .filter((caption) => caption.role !== "cta")
        .map((caption) => caption.text)
        .join(" "),
    ),
    captionBackground: pack.visual.captionBackground,
    captionStroke: pack.visual.captionStroke,
    ctaFill: pack.visual.ctaFill,
    ctaBackground: pack.visual.ctaBackground,
    applyEndCue: false,
  });
  if (!burned.ok) {
    return { ok: false, message: burned.message, spend: done(spend, startedAt) };
  }

  let current = burned.outputAbsolutePath;
  const tone = classifyPackClipTone(spokenIdea);
  const musicOff =
    input.correction?.omitMusic === true ||
    input.musicDecision.mode === "omit" ||
    input.direction?.music.use === false;
  const shared =
    input.musicDecision.mode === "shared_set_bed" && input.sharedMusicAbsolutePath
      ? input.sharedMusicAbsolutePath
      : null;
  const music = await resolveFlagshipMusicBed({
    repoRoot: input.repoRoot,
    durationSeconds: edl.outputDurationSeconds,
    preferOff: musicOff,
    reuseAbsolutePath: shared ?? undefined,
    reuseExisting: input.musicDecision.mode === "shared_set_bed" && !shared,
    relativePath:
      input.musicDecision.mode === "per_clip"
        ? `${pack.stampDir}/music/${input.clip.id}.mp3`
        : undefined,
    prompt: musicPromptForTone(
      input.musicDecision.mode === "shared_set_bed" && input.musicDecision.tone
        ? input.musicDecision.tone
        : tone,
      spokenIdea,
    ),
  });
  if (!music.ok) return { ok: false, message: music.message, spend: done(spend, startedAt) };
  spend.elevenCredits = music.estimatedCredits ?? 0;
  if (music.used && music.absolutePath) {
    const mixed = path.join(input.workDir, "mixed.mp4");
    const mix = mixMusicUnderSpeech({
      videoAbsolutePath: current,
      musicAbsolutePath: music.absolutePath,
      outputAbsolutePath: mixed,
      speechEndSeconds: speechEnd,
    });
    if (!mix.ok) return { ok: false, message: mix.message, spend: done(spend, startedAt) };
    current = mixed;
    const fadeMeanDb = measureCtaFadeMeanDb({
      videoAbsolutePath: mixed,
      speechEndSeconds: speechEnd,
    });
    const ending = decidePackEndingTreatment({ fadeMeanDb });
    if (ending.treatment === "fade_plus_subtle_cue" || input.correction?.forceApprovedEndCue) {
      const withCue = path.join(input.workDir, "ending-cued.mp4");
      const finished = finishPackEndingAudio({
        videoAbsolutePath: mixed,
        speechAudioAbsolutePath: path.join(input.workDir, "range-cut.mp4"),
        musicAbsolutePath: music.absolutePath,
        outputAbsolutePath: withCue,
        workDirectory: path.join(input.workDir, "ending-audio"),
        speechEndSeconds: speechEnd,
        totalDurationSeconds: probeMediaDuration(mixed),
        useCue: true,
        cueMixDb: input.correction?.approvedEndCueMixDb ?? pack.endingAudio.subtleCueMixDb,
        stingAbsolutePath: packEndStingAbsolutePath(input.repoRoot),
      });
      if (!finished.ok) {
        return { ok: false, message: finished.message, spend: done(spend, startedAt) };
      }
      current = withCue;
    }
  }

  const finalAbs = path.join(input.repoRoot, input.outputRelativePath);
  mkdirSync(path.dirname(finalAbs), { recursive: true });
  copyFileSync(current, finalAbs);
  const inspect = inspectFlagshipRender({
    repoRoot: input.repoRoot,
    videoAbsolutePath: finalAbs,
    workDirectory: path.join(input.workDir, "watch"),
  });
  return {
    ok: true,
    clipId: input.clip.id,
    label: input.clip.label,
    spokenIdea,
    outputRelativePath: input.outputRelativePath,
    musicUsed: music.used,
    musicMethod: music.method,
    musicShared: Boolean(shared) || (input.musicDecision.mode === "shared_set_bed" && music.used),
    brollUsed,
    brollReason,
    brollTreatment,
    brollStartSeconds,
    brollEndSeconds,
    brollToken,
    brollThoughtText,
    openingText: snapped.openingText,
    endingText: snapped.endingText,
    inspect,
    spend: done(spend, startedAt),
  };
}

function done(spend: PackClipSpend, startedAt: number): PackClipSpend {
  return { ...spend, elapsedMs: Date.now() - startedAt };
}
