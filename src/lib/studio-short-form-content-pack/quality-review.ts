/**
 * Quality watches the rendered short. Transcripts, tests, frames, meters,
 * and config are supporting evidence only. They do not pass a short alone.
 */

import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";

import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import { transcribeFootageFile } from "@/lib/studio-short-form-video-editing/transcribe";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import {
  isCompleteThought,
  isLeadInFragment,
  planBrollForSemanticThought,
} from "./editorial-completeness";
import { classifyPackClipTone } from "./music-decision";
import {
  classifyBrollVisualFromPixels,
  classifyHeardMusic,
  decideBrollHelpfulness,
  decideMusicFit,
  visualMatchDecision,
  type BrollHelpDecision,
  type BrollVisualKind,
  type HeardMusicKind,
} from "./quality-creative";

export type QualityFindingCode =
  | "inspect_not_rendered_mp4"
  | "begin_not_clean_thought"
  | "end_not_complete_thought"
  | "trailing_fragment"
  | "broll_keyword_only"
  | "broll_left_before_thought_finished"
  | "broll_into_next_thought"
  | "broll_not_aligned_to_thought"
  | "broll_does_not_improve"
  | "broll_unstable_size"
  | "broll_obstructs_speaker"
  | "broll_caption_competition"
  | "broll_visually_heavy"
  | "broll_abrupt"
  | "broll_visual_mismatch"
  | "broll_weak_generic"
  | "broll_bouncing"
  | "broll_placement_inconsistent"
  | "music_inaudible"
  | "music_over_speech"
  | "music_wrong_tone"
  | "ending_missing_cta"
  | "ending_music_not_faded"
  | "captions_not_readable"
  | "captions_not_synced";

export type QualityFinding = {
  code: QualityFindingCode;
  detail: string;
};

export type QualityFrameSample = {
  atSeconds: number;
  role:
    | "opening"
    | "thought_start"
    | "thought_last_word"
    | "next_thought"
    | "keyword"
    | "ending";
  overlayPresent: boolean;
  overlayWidth: number;
  overlayHeight: number;
  faceOccupied: boolean;
  captionBright: boolean;
  champagnePresent: boolean;
  /** Champagne pack end-card or Clip teal-and-white CTA card. */
  ctaTreatmentPresent?: boolean;
  visualKind: BrollVisualKind;
  overlayLeft: number;
  overlayTop: number;
};

export type RenderedShortEvidence = {
  renderedAbsolutePath: string;
  durationSeconds: number;
  words: readonly SpeechWord[];
  openingText: string;
  endingText: string;
  spokenText: string;
  frames: readonly QualityFrameSample[];
  meanVolumeDb: number | null;
  endingVolumeDb: number | null;
  midVolumeDb: number | null;
  darkBandDb: number | null;
  brightBandDb: number | null;
  voiceBandDb: number | null;
  peakMinusMeanDb: number | null;
  heardMusicKind?: HeardMusicKind;
};

export type QualityReview = {
  pass: boolean;
  findings: QualityFinding[];
  inspectedRenderedMp4: true;
  openingText: string;
  endingText: string;
  brollSeenInRender: boolean;
  brollVisualKind: BrollVisualKind;
  brollHelpDecision: BrollHelpDecision;
  heardMusicKind: HeardMusicKind;
};

const PIP = { left: 524, top: 1320, width: 520, height: 360 };
const CHEST = { left: 40, top: 1320, width: 400, height: 360 };
const FACE = { left: 270, top: 160, width: 540, height: 720 };
const UPPER = { left: 40, top: 140, width: 1000, height: 980 };
const CAPTION = { left: 80, top: 1640, width: 920, height: 240 };
const CTA = { left: 160, top: 720, width: 760, height: 520 };

function wordBare(word: SpeechWord): string {
  return (word.punctuatedWord ?? word.word).toLowerCase().replace(/[.,!?]/g, "");
}

export function evaluateQualityFromEvidence(
  evidence: RenderedShortEvidence,
): QualityReview {
  const findings: QualityFinding[] = [];
  if (!evidence.renderedAbsolutePath || !evidence.words.length || !evidence.frames.length) {
    findings.push({
      code: "inspect_not_rendered_mp4",
      detail: "Quality refuses a pass from timestamps, tests, or config alone.",
    });
    return {
      pass: false,
      findings,
      inspectedRenderedMp4: true,
      openingText: evidence.openingText,
      endingText: evidence.endingText,
      brollSeenInRender: false,
      brollVisualKind: "talking_head",
      brollHelpDecision: "insufficient",
      heardMusicKind: "unknown",
    };
  }

  if (!isCompleteThought(evidence.openingText) || isLeadInFragment(evidence.openingText)) {
    findings.push({
      code: "begin_not_clean_thought",
      detail: `Rendered opening is not a clean thought: ${evidence.openingText}`,
    });
  }
  if (!isCompleteThought(evidence.endingText)) {
    findings.push({
      code: "end_not_complete_thought",
      detail: `Rendered ending is not a complete thought: ${evidence.endingText}`,
    });
  }
  if (
    /\b(which means|i learned this language|and i am|i am from)\s*$/i.test(
      evidence.spokenText.replace(/[.!?]+$/, ""),
    )
  ) {
    findings.push({
      code: "trailing_fragment",
      detail: "Rendered short ends on a trailing fragment.",
    });
  }

  const overlayFrames = evidence.frames.filter((frame) => frame.overlayPresent);
  const thoughtStart = evidence.frames.find((frame) => frame.role === "thought_start");
  const lastWord = evidence.frames.find((frame) => frame.role === "thought_last_word");
  const nextThought = evidence.frames.find((frame) => frame.role === "next_thought");
  const keyword = evidence.frames.find((frame) => frame.role === "keyword");
  const brollOnIdea = Boolean(
    thoughtStart?.overlayPresent || lastWord?.overlayPresent || keyword?.overlayPresent,
  );
  const brollSeenInRender = brollOnIdea;
  if (brollOnIdea && lastWord && !lastWord.overlayPresent) {
    findings.push({
      code: "broll_left_before_thought_finished",
      detail: "Rendered B-roll is gone before the represented thought finishes.",
    });
  }
  if (brollOnIdea && nextThought?.overlayPresent) {
    findings.push({
      code: "broll_into_next_thought",
      detail: "Rendered B-roll continues into the next spoken thought.",
    });
  }
  if (
    brollSeenInRender &&
    keyword?.overlayPresent &&
    thoughtStart &&
    !thoughtStart.overlayPresent &&
    lastWord &&
    !lastWord.overlayPresent
  ) {
    findings.push({
      code: "broll_keyword_only",
      detail: "Rendered B-roll appears only on a keyword, not the full idea.",
    });
  }
  if (
    brollSeenInRender &&
    thoughtStart &&
    lastWord &&
    !thoughtStart.overlayPresent &&
    !lastWord.overlayPresent
  ) {
    findings.push({
      code: "broll_not_aligned_to_thought",
      detail: "Rendered B-roll is not on the spoken idea it should support.",
    });
  }
  const widths = overlayFrames.map((frame) => frame.overlayWidth).filter((width) => width > 0);
  if (widths.length >= 2 && Math.max(...widths) - Math.min(...widths) > 80) {
    findings.push({
      code: "broll_unstable_size",
      detail: "Rendered B-roll changes size between frames.",
    });
  }
  if (overlayFrames.some((frame) => frame.faceOccupied)) {
    findings.push({
      code: "broll_obstructs_speaker",
      detail: "Rendered B-roll covers the speaker's face.",
    });
  }
  if (overlayFrames.some((frame) => frame.captionBright && frame.overlayPresent)) {
    const heavy = overlayFrames.some(
      (frame) => frame.overlayWidth * frame.overlayHeight > 1080 * 1920 * 0.22,
    );
    if (heavy) {
      findings.push({
        code: "broll_caption_competition",
        detail: "Rendered B-roll and captions compete in the same viewing area.",
      });
    }
  }
  if (
    overlayFrames.some(
      (frame) => frame.overlayWidth * frame.overlayHeight > 1080 * 1920 * 0.28,
    )
  ) {
    findings.push({
      code: "broll_visually_heavy",
      detail: "Rendered B-roll occupies too much of the frame.",
    });
  }
  if (brollSeenInRender && overlayFrames.length === 1 && evidence.frames.length >= 4) {
    findings.push({
      code: "broll_abrupt",
      detail: "Rendered B-roll appears as a one-frame flash.",
    });
  }
  const overlayKindFrames = brollSeenInRender
    ? evidence.frames.filter((frame) => frame.overlayPresent)
    : [];
  const brollVisualKind =
    overlayKindFrames.find((frame) => frame.visualKind !== "talking_head")?.visualKind ??
    "talking_head";
  const visualDecision = visualMatchDecision({
    spokenText: evidence.spokenText,
    visualKind: brollVisualKind,
  });
  if (visualDecision === "mismatch") {
    findings.push({
      code: "broll_visual_mismatch",
      detail: `Rendered B-roll looks like ${brollVisualKind}, which does not represent the spoken thought.`,
    });
  }
  if (visualDecision === "omit_weak") {
    findings.push({
      code: "broll_weak_generic",
      detail: "No strong B-roll visual exists for this spoken thought. Omit rather than force a weaker insert.",
    });
  }
  const lefts = overlayKindFrames.map((frame) => frame.overlayLeft).filter((value) => value > 0);
  const tops = overlayKindFrames.map((frame) => frame.overlayTop).filter((value) => value > 0);
  if (lefts.length >= 2 && Math.max(...lefts) - Math.min(...lefts) > 48) {
    findings.push({
      code: "broll_placement_inconsistent",
      detail: "Rendered B-roll placement jumps between frames.",
    });
  }
  if (tops.length >= 2 && Math.max(...tops) - Math.min(...tops) > 48) {
    findings.push({
      code: "broll_bouncing",
      detail: "Rendered B-roll visually bounces between frames.",
    });
  }

  const presentationDefects = findings
    .map((finding) => finding.code)
    .filter((code) =>
      /unstable|bounc|heavy|obstruct|caption_competition|placement/.test(code),
    );
  const help = decideBrollHelpfulness({
    visualDecision,
    presentationDefects,
    timingDefects: [],
  });
  if (help === "omit" || help === "switch_treatment") {
    if (!findings.some((finding) => finding.code === "broll_does_not_improve")) {
      findings.push({
        code: "broll_does_not_improve",
        detail:
          help === "omit"
            ? "This B-roll does not improve the finished viewing experience. Prefer no B-roll."
            : "B-roll treatment is the problem. Switch treatment or omit.",
      });
    }
  }

  if (evidence.meanVolumeDb != null && evidence.meanVolumeDb < -34) {
    findings.push({
      code: "music_inaudible",
      detail: `Rendered mix mean ${evidence.meanVolumeDb.toFixed(1)} dB is too quiet for ordinary playback.`,
    });
  }
  if (
    evidence.midVolumeDb != null &&
    evidence.meanVolumeDb != null &&
    evidence.midVolumeDb > -9
  ) {
    findings.push({
      code: "music_over_speech",
      detail: "Rendered mix is too hot under speech.",
    });
  }
  const tone = classifyPackClipTone(evidence.spokenText);
  const heardMusicKind =
    evidence.heardMusicKind ??
    classifyHeardMusic({
      meanDb: evidence.meanVolumeDb,
      darkBandDb: evidence.darkBandDb,
      brightBandDb: evidence.brightBandDb,
      voiceBandDb: evidence.voiceBandDb,
      peakMinusMeanDb: evidence.peakMinusMeanDb,
    });
  const musicFit = decideMusicFit({ spokenTone: tone, heard: heardMusicKind });
  if (musicFit === "mismatch") {
    findings.push({
      code: "music_wrong_tone",
      detail: `Spoken tone ${tone} does not fit heard music ${heardMusicKind}. Omit rather than remint endlessly.`,
    });
  }

  const ending = evidence.frames.find((frame) => frame.role === "ending");
  const ctaTreatmentPresent =
    ending?.ctaTreatmentPresent ?? ending?.champagnePresent ?? false;
  if (ending && !ctaTreatmentPresent) {
    findings.push({
      code: "ending_missing_cta",
      detail: "Rendered ending does not show the CTA treatment.",
    });
  }
  if (
    evidence.endingVolumeDb != null &&
    evidence.midVolumeDb != null &&
    evidence.endingVolumeDb > evidence.midVolumeDb - 1
  ) {
    findings.push({
      code: "ending_music_not_faded",
      detail: "Rendered music does not fade before the end cue.",
    });
  }

  const spokenFrames = evidence.frames.filter((frame) => frame.role !== "ending");
  if (spokenFrames.length && spokenFrames.every((frame) => !frame.captionBright)) {
    findings.push({
      code: "captions_not_readable",
      detail: "Rendered speech frames do not show readable captions.",
    });
  }

  return {
    pass: findings.length === 0,
    findings,
    inspectedRenderedMp4: true,
    openingText: evidence.openingText,
    endingText: evidence.endingText,
    brollSeenInRender,
    brollVisualKind,
    brollHelpDecision: help,
    heardMusicKind,
  };
}

async function regionStats(
  file: string,
  region: { left: number; top: number; width: number; height: number },
): Promise<{
  mean: number;
  std: number;
  brightRatio: number;
  champagne: boolean;
  clipCard: boolean;
  plate: boolean;
  colorfulRatio: number;
  fruitRatio: number;
  skinRatio: number;
  overlayLeft: number;
  overlayTop: number;
  overlayWidth: number;
  overlayHeight: number;
}> {
  const { data, info } = await sharp(file)
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let bright = 0;
  let champagne = 0;
  let clipTeal = 0;
  let clipInk = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let colorMinX = info.width;
  let colorMinY = info.height;
  let colorMaxX = -1;
  let colorMaxY = -1;
  let colorful = 0;
  let fruit = 0;
  let skin = 0;
  const values: number[] = [];
  const width = info.width;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luma;
    values.push(luma);
    const pixel = i / info.channels;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (luma > 150) {
      bright += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (sat > 0.28 && luma > 40) {
      colorful += 1;
      if (x < colorMinX) colorMinX = x;
      if (y < colorMinY) colorMinY = y;
      if (x > colorMaxX) colorMaxX = x;
      if (y > colorMaxY) colorMaxY = y;
    }
    const greenLeaf = g > 75 && g >= r - 5 && g > b + 5 && sat > 0.2 && luma < 200;
    const redFruit = r > 120 && r > g + 28 && r > b + 18 && sat > 0.28 && g < 155;
    if (greenLeaf || redFruit) fruit += 1;
    if (
      r > 90 &&
      g > 60 &&
      b > 45 &&
      r > b &&
      Math.abs(r - g) < 55 &&
      sat < 0.45 &&
      luma > 50 &&
      luma < 200
    ) {
      skin += 1;
    }
    if (r > 160 && r < 230 && g > 150 && g < 210 && b > 120 && b < 190 && r > b + 10) {
      champagne += 1;
    }
    const teal =
      g > r + 12 &&
      b > r + 8 &&
      g > 40 &&
      g < 140 &&
      b > 35 &&
      b < 130 &&
      luma > 20 &&
      luma < 115;
    if (teal) clipTeal += 1;
    const ink = luma > 190 && (Math.max(r, g, b) - Math.min(r, g, b)) < 48;
    if (ink) clipInk += 1;
  }
  const count = values.length || 1;
  const mean = sum / count;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / count;
  const paperBox = maxX >= minX && maxX - minX + 1 > 200 && maxY - minY + 1 > 120;
  const colorBox =
    colorMaxX >= colorMinX &&
    colorMaxX - colorMinX + 1 > 200 &&
    colorMaxY - colorMinY + 1 > 120;
  return {
    mean,
    std: Math.sqrt(variance),
    brightRatio: bright / count,
    champagne: champagne / count > 0.04,
    clipCard: clipTeal / count >= 0.08 && clipInk / count >= 0.006,
    colorfulRatio: colorful / count,
    fruitRatio: fruit / count,
    skinRatio: skin / count,
    overlayLeft: colorMinX < info.width ? colorMinX : minX < info.width ? minX : 0,
    overlayTop: colorMinY < info.height ? colorMinY : minY < info.height ? minY : 0,
    overlayWidth:
      colorMaxX >= colorMinX
        ? colorMaxX - colorMinX + 1
        : maxX >= minX
          ? maxX - minX + 1
          : 0,
    overlayHeight:
      colorMaxY >= colorMinY
        ? colorMaxY - colorMinY + 1
        : maxY >= minY
          ? maxY - minY + 1
          : 0,
    plate:
      (bright / count > 0.45 && paperBox && Math.sqrt(variance) > 28) ||
      (colorful / count > 0.12 && colorBox) ||
      fruit / count >= 0.045,
  };
}

function overlayLikely(
  pip: {
    mean: number;
    std: number;
    brightRatio: number;
    plate: boolean;
    fruitRatio: number;
  },
  chest?: { mean: number; std: number; brightRatio: number },
): boolean {
  if (!pip.plate) return false;
  if (pip.fruitRatio >= 0.045) return true;
  if (!chest) return pip.mean > 64;
  return pip.mean > chest.mean + 16 || pip.brightRatio > chest.brightRatio + 0.05;
}

/** Speaker hand/torso in the PiP box is not a fruit insert. Real cherries stay low-skin. */
export function pipInsertNotSpeakerBody(input: {
  speakerPresent: boolean;
  overlayLikely: boolean;
  pipSkinRatio: number;
  pipFruitRatio: number;
}): boolean {
  if (!input.overlayLikely) return false;
  if (!input.speakerPresent) return true;
  // Hands, neck, and a fingertip on a white shirt score as fruit.
  // A real cherries insert stays low-skin and high-fruit.
  if (input.pipSkinRatio >= 0.10) return false;
  if (input.pipFruitRatio < 0.16) return false;
  return true;
}

function upperInsertLikely(upper: {
  brightRatio: number;
  fruitRatio: number;
  skinRatio: number;
  std: number;
}): boolean {
  if (upper.fruitRatio >= 0.04 && upper.skinRatio < 0.45) return true;
  return (
    upper.brightRatio >= 0.5 &&
    upper.skinRatio < 0.3 &&
    upper.fruitRatio < 0.08 &&
    upper.std > 28
  );
}

function faceInsertLikely(face: {
  brightRatio: number;
  fruitRatio: number;
  skinRatio: number;
  std: number;
}): boolean {
  if (face.skinRatio >= 0.4) return false;
  return face.fruitRatio >= 0.03 || (face.brightRatio >= 0.45 && face.std > 28);
}

function measureWindowDb(
  videoAbsolutePath: string,
  start: number,
  duration: number,
  filter = "volumedetect",
): number | null {
  const result = spawnSync(
    "ffmpeg",
    [
      "-ss",
      String(Math.max(0, start)),
      "-t",
      String(duration),
      "-i",
      videoAbsolutePath,
      "-af",
      filter,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const text = `${result.stdout}\n${result.stderr}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)/);
  return mean ? Number(mean[1]) : null;
}

function pickSampleTimes(words: readonly SpeechWord[], durationSeconds: number): Array<{
  atSeconds: number;
  role: QualityFrameSample["role"];
}> {
  const sentences = buildTranscriptSentences(words);
  const opening = sentences[0];
  const closing = sentences[sentences.length - 1];
  const cherries = planBrollForSemanticThought({
    words,
    tokens: ["cherries", "fruit"],
    rangeStart: 0,
    speechEnd: durationSeconds,
  });
  const english = planBrollForSemanticThought({
    words,
    tokens: ["english", "language"],
    rangeStart: 0,
    speechEnd: durationSeconds,
  });
  const plan = cherries.ok ? cherries : english.ok ? english : null;
  const thought = plan
    ? sentences.find((sentence) => sentence.text === plan.thoughtText) ?? sentences[0]
    : sentences[0];
  const last = thought?.words[thought.words.length - 1];
  const next = thought
    ? sentences[sentences.indexOf(thought) + 1]
    : null;
  const keywordWord = thought?.words.find((word) =>
    /^(cherries|english|language)$/i.test(wordBare(word)),
  );
  const samples: Array<{ atSeconds: number; role: QualityFrameSample["role"] }> = [];
  if (opening) samples.push({ atSeconds: opening.start + 0.12, role: "opening" });
  if (plan) samples.push({ atSeconds: plan.start + 0.12, role: "thought_start" });
  if (plan) {
    samples.push({
      atSeconds: (plan.start + plan.end) / 2,
      role: "keyword",
    });
  }
  if (last) samples.push({ atSeconds: Math.max(last.start, last.end - 0.08), role: "thought_last_word" });
  if (next) samples.push({ atSeconds: next.start + 0.18, role: "next_thought" });
  if (keywordWord) {
    samples.push({
      atSeconds: (keywordWord.start + keywordWord.end) / 2,
      role: "keyword",
    });
  }
  samples.push({
    atSeconds: Math.max(0.2, durationSeconds - 0.45),
    role: "ending",
  });
  return samples.filter((sample) => sample.atSeconds >= 0 && sample.atSeconds < durationSeconds);
}

export async function inspectQualityPng(framePath: string) {
  const pip = await regionStats(framePath, PIP);
  const chest = await regionStats(framePath, CHEST);
  const face = await regionStats(framePath, FACE);
  const upper = await regionStats(framePath, UPPER);
  const caption = await regionStats(framePath, CAPTION);
  const cta = await regionStats(framePath, CTA);
  const speakerPresent = face.skinRatio >= 0.22;
  const pipLikely = overlayLikely(pip, chest);
  const pipOverlay = pipInsertNotSpeakerBody({
    speakerPresent,
    overlayLikely: pipLikely,
    pipSkinRatio: pip.skinRatio,
    pipFruitRatio: pip.fruitRatio,
  });
  const upperOverlay = !speakerPresent && upperInsertLikely(upper);
  const faceOverlay = !speakerPresent && faceInsertLikely(face);
  const overlay = pipOverlay || upperOverlay || faceOverlay;
  const source = upperOverlay || faceOverlay ? upper : pip;
  const classified = classifyBrollVisualFromPixels({
    brightRatio: source.brightRatio,
    colorfulRatio: source.colorfulRatio,
    fruitRatio: source.fruitRatio,
    plate: source.plate || overlay,
    skinRatio: overlay ? source.skinRatio : Math.max(source.skinRatio, face.skinRatio),
    std: source.std,
  });
  const visualKind = overlay ? classified : "talking_head";
  return {
    pipOverlay,
    upperOverlay,
    faceOverlay,
    speakerPresent,
    overlay,
    overlayPresent: overlay && visualKind !== "talking_head",
    visualKind,
    source,
    caption,
    cta,
    faceSkin: face.skinRatio,
    pipFruit: pip.fruitRatio,
    pipSkin: pip.skinRatio,
  };
}

export async function collectRenderedShortEvidence(input: {
  repoRoot: string;
  videoAbsolutePath: string;
  workDir: string;
}): Promise<RenderedShortEvidence | { ok: false; message: string }> {
  if (!existsSync(input.videoAbsolutePath)) {
    return { ok: false, message: `Rendered short missing: ${input.videoAbsolutePath}` };
  }
  applyDotenvLocal(input.repoRoot);
  mkdirSync(input.workDir, { recursive: true });
  const duration = Number(
    execFileSync(
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
    ).trim(),
  );
  const transcript = await transcribeFootageFile({
    apiKey: process.env.DEEPGRAM_API_KEY?.trim() || null,
    absolutePath: input.videoAbsolutePath,
  });
  if (!transcript.ok) return { ok: false, message: transcript.message };
  const sentences = buildTranscriptSentences(transcript.words);
  const openingText = sentences[0]?.text ?? "";
  const endingText = sentences[sentences.length - 1]?.text ?? "";
  const spokenText = sentences.map((sentence) => sentence.text).join(" ");
  const samples = pickSampleTimes(transcript.words, duration);
  const frames: QualityFrameSample[] = [];
  for (const [index, sample] of samples.entries()) {
    const framePath = path.join(input.workDir, `q-${index}-${sample.role}.png`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(sample.atSeconds),
        "-i",
        input.videoAbsolutePath,
        "-frames:v",
        "1",
        framePath,
      ],
      { stdio: "pipe" },
    );
    const inspected = await inspectQualityPng(framePath);
    const {
      overlayPresent,
      overlay,
      upperOverlay,
      faceOverlay,
      visualKind,
      source,
      caption,
      cta,
    } = inspected;
    frames.push({
      atSeconds: sample.atSeconds,
      role: sample.role,
      overlayPresent,
      overlayWidth:
        upperOverlay || faceOverlay
          ? Math.max(source.overlayWidth, 1)
          : overlay
            ? PIP.width
            : 0,
      overlayHeight:
        upperOverlay || faceOverlay
          ? Math.max(source.overlayHeight, 1)
          : overlay
            ? PIP.height
            : 0,
      faceOccupied: overlay && faceOverlay,
      captionBright: caption.brightRatio > 0.02,
      champagnePresent: cta.champagne,
      ctaTreatmentPresent: cta.champagne || cta.clipCard,
      visualKind: overlayPresent ? visualKind : "talking_head",
      overlayLeft:
        upperOverlay || faceOverlay
          ? UPPER.left + source.overlayLeft
          : overlay
            ? PIP.left
            : 0,
      overlayTop:
        upperOverlay || faceOverlay
          ? UPPER.top + source.overlayTop
          : overlay
            ? PIP.top
            : 0,
    });
  }
  const meanVolumeDb = measureWindowDb(input.videoAbsolutePath, 0, duration);
  const midVolumeDb = measureWindowDb(
    input.videoAbsolutePath,
    Math.max(1, duration * 0.4),
    1.2,
  );
  const endingVolumeDb = measureWindowDb(
    input.videoAbsolutePath,
    Math.max(0, duration - 0.8),
    0.7,
  );
  const bandStart = Math.min(Math.max(2, duration * 0.25), Math.max(0.4, duration - 3.2));
  const darkBandDb = measureWindowDb(
    input.videoAbsolutePath,
    bandStart,
    3,
    "bandpass=f=220:width_type=h:width=60,volumedetect",
  );
  const brightBandDb = measureWindowDb(
    input.videoAbsolutePath,
    bandStart,
    3,
    "highpass=f=4000,volumedetect",
  );
  const voiceBandDb = measureWindowDb(
    input.videoAbsolutePath,
    bandStart,
    3,
    "highpass=f=400,lowpass=f=2500,volumedetect",
  );
  return {
    renderedAbsolutePath: input.videoAbsolutePath,
    durationSeconds: duration,
    words: transcript.words,
    openingText,
    endingText,
    spokenText,
    frames,
    meanVolumeDb,
    midVolumeDb,
    endingVolumeDb,
    darkBandDb,
    brightBandDb,
    voiceBandDb,
    peakMinusMeanDb:
      midVolumeDb != null && meanVolumeDb != null
        ? Math.abs(midVolumeDb - meanVolumeDb)
        : null,
  };
}

export async function reviewRenderedShort(input: {
  repoRoot: string;
  videoAbsolutePath: string;
  workDir: string;
}): Promise<QualityReview | { ok: false; message: string }> {
  const evidence = await collectRenderedShortEvidence(input);
  if ("ok" in evidence) return evidence;
  return evaluateQualityFromEvidence(evidence);
}
