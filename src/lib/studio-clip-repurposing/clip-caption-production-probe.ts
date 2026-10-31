/**
 * Production-faithful caption burn probe: finishClipDecisionList + assembleBurnedShort.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  assembleBurnedShort,
  exactWords,
  splitSpeechCaptionsForBurn,
  verifySpeechCaptionsBurnPaintLadder,
  CLIP_CAPTION_PRODUCTION_PROBE_V1,
} from "@/lib/studio-short-form-video-editing/caption-burn";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import type { EditDecisionList, SpeechWord, TimedCaption } from "@/lib/studio-short-form-video-editing/types";

import {
  CLIP_CAPTION_PRESENTATION,
  paintClipCustomerEndCard,
} from "./caption-finish";
import { finishCertifiedClipCaptionEdl } from "./clip-caption-finish-edl";
import { applyFrozenPositiveSelection } from "./frozen-positive-selection";
import { FROZEN_POSITIVE_SELECTION_IDS } from "./frozen-selection";
import { discoverClipSet } from "./set-discovery";
import type { LongSourceSentences, SetCandidate } from "./types";

const PAD_BEFORE = 6;

function readPerformanceWatchOpeningExit(
  clipDir: string,
  fallback: { opening: number; exit: number },
): { opening: number; exit: number } {
  const watchAbs = path.join(clipDir, "performance-watch.json");
  if (!existsSync(watchAbs)) return fallback;
  try {
    const watch = JSON.parse(readFileSync(watchAbs, "utf8")) as {
      ok?: boolean;
      openingSourceSeconds?: number;
      exitSourceSeconds?: number;
    };
    if (watch.ok && watch.openingSourceSeconds != null && watch.exitSourceSeconds != null) {
      return { opening: watch.openingSourceSeconds, exit: watch.exitSourceSeconds };
    }
  } catch {
    /* use fallback */
  }
  return fallback;
}

export function buildFinishedClipCaptionEdlForProbe(input: {
  repoRoot: string;
  campaignId: string;
  words: readonly SpeechWord[];
  candidate: SetCandidate;
  ctaText: string;
  extractStart?: number;
  opening?: number;
  exit?: number;
}):
  | { ok: true; clipId: string; edl: EditDecisionList; usedExtractProbe: boolean }
  | { ok: false; clipId: string; message: string } {
  const extractStart = input.extractStart ?? Math.max(0, input.candidate.windowStart - PAD_BEFORE);
  const clipDir = path.join(
    input.repoRoot,
    "data/campaign-design-artifacts",
    input.campaignId,
    "clip-factory",
    "clips",
    input.candidate.id,
  );
  const extractAbs = path.join(clipDir, "extract-vertical.mp4");
  const opening =
    input.opening ??
    Number((input.candidate.windowStart - extractStart).toFixed(3));
  const exit =
    input.exit ?? Number((input.candidate.windowEnd - extractStart).toFixed(3));
  const finished = finishCertifiedClipCaptionEdl({
    words: input.words,
    extractAbsolutePath: existsSync(extractAbs) ? extractAbs : null,
    extractStart,
    opening,
    exit,
    ctaText: input.ctaText,
    mustKeepLine: input.candidate.claim,
    sourceRelativePath: path.relative(input.repoRoot, extractAbs),
  });
  if (!finished.ok) {
    return { ok: false, clipId: input.candidate.id, message: finished.message };
  }
  return {
    ok: true,
    clipId: input.candidate.id,
    edl: finished.edl,
    usedExtractProbe: existsSync(extractAbs),
  };
}

export async function verifyFinishedClipCaptionsForBurn(input: {
  captions: readonly TimedCaption[];
  edl: EditDecisionList;
  clipDir: string;
  approvedCta: string;
  transcriptWordsInRange: readonly string[];
}): Promise<
  | { ok: true; fontSize: number; speechLineCount: number; assembledBurn: boolean }
  | { ok: false; message: string }
> {
  const verified = await verifySpeechCaptionsBurnPaintLadder({
    captions: splitSpeechCaptionsForBurn(input.captions),
    stroke: CLIP_CAPTION_PRESENTATION.stroke,
    bandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
    background: CLIP_CAPTION_PRESENTATION.background,
    workDirectory: path.join(input.clipDir, "probe-ladder"),
  });
  if (!verified.ok) return verified;

  const sourceCandidates = [
    path.join(input.clipDir, "audio-finished.mp4"),
    path.join(input.clipDir, "extract-vertical.mp4"),
  ];
  const sourceAbsolutePath = sourceCandidates.find((candidate) => existsSync(candidate));
  if (!sourceAbsolutePath) {
    return {
      ok: true,
      fontSize: verified.fontSize,
      speechLineCount: verified.fittedCaptions.filter((caption) => caption.role !== "cta")
        .length,
      assembledBurn: false,
    };
  }

  const burned = await assembleBurnedShort({
    sourceAbsolutePath,
    edl: input.edl,
    workDirectory: path.join(input.clipDir, "probe-burn-work"),
    outputAbsolutePath: path.join(input.clipDir, "probe-local-text-proof.mp4"),
    approvedCta: input.approvedCta,
    transcriptWordsInRange: input.transcriptWordsInRange,
    captionBackground: CLIP_CAPTION_PRESENTATION.background,
    captionStroke: CLIP_CAPTION_PRESENTATION.stroke,
    captionBottomPx: CLIP_CAPTION_PRESENTATION.bottomPx,
    captionBandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
    paintEndCard: paintClipCustomerEndCard,
    captionsPaintOnly: true,
  });
  if (!burned.ok) {
    return burned;
  }

  return {
    ok: true,
    fontSize: verified.fontSize,
    speechLineCount: verified.fittedCaptions.filter((caption) => caption.role !== "cta").length,
    assembledBurn: true,
  };
}

export async function runClipCaptionProductionProbe(input: {
  repoRoot: string;
  campaignId: string;
  words: readonly SpeechWord[];
  sourceDurationSeconds: number;
  ctaText: string;
  /** Match factory: only force frozen ids when the designated cert source is in use. */
  forceFrozenSelection?: boolean;
}): Promise<{
  ok: boolean;
  stamp: typeof CLIP_CAPTION_PRODUCTION_PROBE_V1;
  clips: Array<
    | {
        clipId: string;
        ok: true;
        fontSize: number;
        speechLineCount: number;
        usedExtractProbe: boolean;
        assembledBurn: boolean;
        speechLines: string[];
      }
    | { clipId: string; ok: false; message: string }
  >;
}> {
  const discoveryInput: LongSourceSentences = {
    sourceDurationSeconds: input.sourceDurationSeconds,
    sentences: buildTranscriptSentences([...input.words]),
  };
  let discovery = discoverClipSet(discoveryInput);
  if (!discovery.ok) {
    return {
      ok: false,
      stamp: CLIP_CAPTION_PRODUCTION_PROBE_V1,
      clips: [
        {
          clipId: "discovery",
          ok: false,
          message: discovery.findings.join("; "),
        },
      ],
    };
  }
  const forceFrozen = input.forceFrozenSelection ?? true;
  if (forceFrozen) {
    const frozen = applyFrozenPositiveSelection(discovery, discoveryInput);
    if (!frozen.ok) {
      return {
        ok: false,
        stamp: CLIP_CAPTION_PRODUCTION_PROBE_V1,
        clips: [
          {
            clipId: "frozen-selection",
            ok: false,
            message: frozen.findings.join("; "),
          },
        ],
      };
    }
    discovery = frozen;
  }

  const factoryRoot = path.join(
    input.repoRoot,
    "data/campaign-design-artifacts",
    input.campaignId,
    "clip-factory",
  );

  const clips: Array<
    | {
        clipId: string;
        ok: true;
        fontSize: number;
        speechLineCount: number;
        usedExtractProbe: boolean;
        assembledBurn: boolean;
        speechLines: string[];
      }
    | { clipId: string; ok: false; message: string }
  > = [];

  const selected = discovery.selected.slice(0, FROZEN_POSITIVE_SELECTION_IDS.length);

  for (const candidate of selected) {
    const clipDir = path.join(factoryRoot, "clips", candidate.id);
    const extractStart = Math.max(0, candidate.windowStart - PAD_BEFORE);
    const fallbackOpening = Number((candidate.windowStart - extractStart).toFixed(3));
    const fallbackExit = Number((candidate.windowEnd - extractStart).toFixed(3));
    const { opening, exit } = readPerformanceWatchOpeningExit(clipDir, {
      opening: fallbackOpening,
      exit: fallbackExit,
    });
    const built = buildFinishedClipCaptionEdlForProbe({
      repoRoot: input.repoRoot,
      campaignId: input.campaignId,
      words: input.words,
      candidate,
      ctaText: input.ctaText,
      extractStart,
      opening,
      exit,
    });
    if (!built.ok) {
      clips.push({ clipId: built.clipId, ok: false, message: built.message });
      continue;
    }
    const speechLines = built.edl.captions
      .filter((caption) => caption.role !== "cta")
      .map((caption) => caption.text);
    const verified = await verifyFinishedClipCaptionsForBurn({
      captions: built.edl.captions,
      edl: built.edl,
      clipDir,
      approvedCta: input.ctaText,
      transcriptWordsInRange: exactWords(built.edl.clips[0]?.text ?? ""),
    });
    if (!verified.ok) {
      clips.push({ clipId: built.clipId, ok: false, message: verified.message });
      continue;
    }
    clips.push({
      clipId: built.clipId,
      ok: true,
      fontSize: verified.fontSize,
      speechLineCount: verified.speechLineCount,
      usedExtractProbe: built.usedExtractProbe,
      assembledBurn: verified.assembledBurn,
      speechLines,
    });
  }

  return {
    ok:
      clips.length === FROZEN_POSITIVE_SELECTION_IDS.length &&
      clips.every((clip) => clip.ok),
    stamp: CLIP_CAPTION_PRODUCTION_PROBE_V1,
    clips,
  };
}
