/**
 * Local caption/CTA burn-in. Shotstack does not typeset customer-visible words.
 * Words are painted as separate sprites so spaces cannot collapse.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

import { FLAGSHIP_MUSIC_FADE_OUT_SECONDS } from "@/lib/studio-flagship-short-form-edit/music";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import {
  chooseTalkingHeadEndCue,
  mixEndCueOntoEndCardAudio,
  mixEndCueUnderLastSpeech,
  writeEndCueDecision,
  writeTalkingHeadEndCueWav,
  type TalkingHeadEndCueChoice,
} from "./end-cue";
import type { EditDecisionList, TimedCaption } from "./types";

const OFFER = studioShortFormVideoEditingBuildV1.offer;
const CTA_HOLD = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;

export const WINDOWS_BOLD_FONT = "C:/Windows/Fonts/arialbd.ttf";
export const EXACT_WORD_GAP_PX = 28;
export const WORD_GAP_PAD_PX = 12;

export function wordGapForFontSize(fontSize: number): number {
  const spaceWidth = Math.max(10, Math.round(fontSize * 0.38));
  return Math.max(EXACT_WORD_GAP_PX, spaceWidth + WORD_GAP_PAD_PX);
}

export function exactWords(text: string): string[] {
  return text
    .replace(/[\u2000-\u200b\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

export function evaluateExactTextQa(input: {
  captions: readonly TimedCaption[];
  approvedCta: string;
  transcriptWordsInRange: readonly string[];
}): { ok: true } | { ok: false; findings: string[] } {
  const findings: string[] = [];
  const cta = input.captions.find((caption) => caption.role === "cta");
  const speech = input.captions.filter((caption) => caption.role !== "cta");
  if (!cta) {
    if (input.approvedCta.trim()) findings.push("cta_missing");
  } else if (cta.text.trim() !== input.approvedCta.trim()) {
    findings.push("cta_not_exact");
  } else if (cta.text.includes("Readed") || /theproject|notess/.test(cta.text)) {
    findings.push("cta_known_corruption");
  }

  const spoken = speech.flatMap((caption) => exactWords(caption.text));
  const expected = input.transcriptWordsInRange.map((word) =>
    word.replace(/[.,!?]/g, ""),
  );
  const spokenBare = spoken.map((word) => word.replace(/[.,!?]/g, ""));
  if (spokenBare.join(" ").toLowerCase() !== expected.join(" ").toLowerCase()) {
    findings.push("caption_words_do_not_match_transcript");
  }
  for (const caption of speech) {
    if (caption.text.includes(" ") === false && exactWords(caption.text).length > 1) {
      findings.push("spaces_removed");
    }
  }
  return findings.length ? { ok: false, findings } : { ok: true };
}

export function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function stabilizeOpeningCaptionPresentation(
  captions: readonly TimedCaption[],
): TimedCaption[] {
  let openingHeld = false;
  return captions.map((caption) => {
    if (caption.role === "cta") return { ...caption };
    if (openingHeld) return { ...caption };
    openingHeld = true;
    return { ...caption, start: 0 };
  });
}

export function buildSpeechAss(captions: readonly TimedCaption[]): string {
  const speech = stabilizeOpeningCaptionPresentation(captions).filter(
    (caption) => caption.role !== "cta",
  );
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${OFFER.width}
PlayResY: ${OFFER.height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Speech,Arial,46,&H00FFFFFF,&H000000FF,&H00111111,&H64111111,-1,0,0,0,100,100,0,0,1,2,0,2,48,48,210,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = speech
    .map(
      (caption) =>
        `Dialogue: 0,${assTime(caption.start)},${assTime(caption.end)},Speech,,0,0,0,,${escapeAss(caption.text)}`,
    )
    .join("\n");
  return `${header}${events}\n`;
}

export function assDialogueTexts(ass: string): string[] {
  return ass
    .split(/\r?\n/)
    .filter((line) => line.startsWith("Dialogue:"))
    .map((line) => line.split(",").slice(9).join(","));
}

function escapeAss(text: string): string {
  return text.replace(/[{}\\]/g, (char) => `\\${char}`);
}

function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const whole = Math.floor(s);
  const cs = Math.min(99, Math.round((s - whole) * 100));
  return `${h}:${String(m).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

const SPRITE_HEIGHT_EM = 1.75;
const SPRITE_BASELINE_EM = 1.2;
const HORIZONTAL_INK_THRESHOLD = 12;

function horizontalInkRange(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { left: number; right: number } | null {
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + (channels - 1)] ?? 0;
      if (alpha > HORIZONTAL_INK_THRESHOLD) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < left) return null;
  return { left: Math.max(0, left - 1), right: Math.min(width - 1, right + 1) };
}

async function renderWordSprite(
  word: string,
  fontSize: number,
  fill: string,
  stroke?: string,
): Promise<{ buffer: Buffer; width: number; height: number; baseline: number }> {
  const width = Math.max(48, Math.ceil(word.length * fontSize * 0.78) + 32);
  const height = Math.ceil(fontSize * SPRITE_HEIGHT_EM);
  const baseline = Math.round(fontSize * SPRITE_BASELINE_EM);
  const strokeAttr = stroke
    ? ` stroke="${stroke}" stroke-width="5" paint-order="stroke fill"`
    : "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="6" y="${baseline}" font-family="Arial" font-weight="700" font-size="${fontSize}" fill="${fill}"${strokeAttr}>${escapeXml(word)}</text>
</svg>`;
  const raw = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const range = horizontalInkRange(
    raw.data,
    raw.info.width,
    raw.info.height,
    raw.info.channels,
  );
  if (!range) {
    return { buffer: await sharp(Buffer.from(svg)).png().toBuffer(), width, height, baseline };
  }
  const croppedWidth = range.right - range.left + 1;
  const buffer = await sharp(raw.data, {
    raw: {
      width: raw.info.width,
      height: raw.info.height,
      channels: raw.info.channels,
    },
  })
    .extract({
      left: range.left,
      top: 0,
      width: croppedWidth,
      height,
    })
    .png()
    .toBuffer();
  return { buffer, width: croppedWidth, height, baseline };
}

export async function speechLineFitsFrame(
  text: string,
  width = OFFER.width,
  fontSize = 44,
): Promise<boolean> {
  const words = exactWords(text);
  if (words.length === 0) return false;
  const gap = wordGapForFontSize(fontSize);
  const sprites = await Promise.all(
    words.map((word) => renderWordSprite(word, fontSize, "#ffffff")),
  );
  const contentWidth =
    sprites.reduce((sum, sprite) => sum + sprite.width, 0) + gap * (sprites.length - 1);
  return contentWidth + 36 * 2 <= width;
}

function splitTimedCaption(caption: TimedCaption): [TimedCaption, TimedCaption] | null {
  const words = exactWords(caption.text);
  if (words.length < 2) return null;
  const mid = Math.ceil(words.length / 2);
  const leftWords = words.slice(0, mid);
  const rightWords = words.slice(mid);
  const span = Math.max(0.2, caption.end - caption.start);
  const cut = Number((caption.start + span * (leftWords.length / words.length)).toFixed(3));
  return [
    {
      ...caption,
      text: leftWords.join(" "),
      end: Math.max(caption.start + 0.05, cut),
    },
    {
      ...caption,
      text: rightWords.join(" "),
      start: cut,
      role: caption.role === "hook" ? "speech" : caption.role,
    },
  ];
}

/** Keep every spoken word. Break a line only when it cannot fit the frame. */
export async function fitSpeechCaptionsToFrame(
  captions: readonly TimedCaption[],
): Promise<TimedCaption[] | { ok: false; message: string }> {
  const fitted: TimedCaption[] = [];
  for (const caption of captions) {
    if (caption.role === "cta") {
      fitted.push(caption);
      continue;
    }
    const parts = await splitCaptionUntilItFits(caption);
    if (!Array.isArray(parts)) return parts;
    fitted.push(...parts);
  }
  return fitted;
}

async function splitCaptionUntilItFits(
  caption: TimedCaption,
): Promise<TimedCaption[] | { ok: false; message: string }> {
  if (await speechLineFitsFrame(caption.text)) return [caption];
  const halves = splitTimedCaption(caption);
  if (!halves) {
    return { ok: false, message: `Exact-text line overflow: "${caption.text}"` };
  }
  const left = await splitCaptionUntilItFits(halves[0]);
  if (!Array.isArray(left)) return left;
  const right = await splitCaptionUntilItFits(halves[1]);
  if (!Array.isArray(right)) return right;
  return [...left, ...right];
}

export async function paintExactTextLine(input: {
  text: string;
  outputAbsolutePath: string;
  width: number;
  height: number;
  fontSize: number;
  fill: string;
  background: string;
  radius?: number;
  wordGapPx?: number;
  stroke?: string;
}): Promise<
  | {
      ok: true;
      words: string[];
      wordGapPx: number;
      contentWidth: number;
      sharedSpriteHeight: number;
      sharedBaseline: number;
    }
  | { ok: false; message: string }
> {
  const words = exactWords(input.text);
  if (words.length === 0) {
    return { ok: false, message: "Exact-text paint received no words." };
  }
  if (words.join(" ") !== exactWords(input.text).join(" ")) {
    return { ok: false, message: "Painted words drifted from source text." };
  }
  const gap = input.wordGapPx ?? wordGapForFontSize(input.fontSize);
  const sprites = await Promise.all(
    words.map((word) =>
      renderWordSprite(word, input.fontSize, input.fill, input.stroke),
    ),
  );
  const contentWidth =
    sprites.reduce((sum, sprite) => sum + sprite.width, 0) + gap * (sprites.length - 1);
  const padX = 36;
  if (contentWidth + padX * 2 > input.width) {
    return {
      ok: false,
      message: `Exact-text line overflow: "${input.text}"`,
    };
  }
  const startX = Math.round((input.width - contentWidth) / 2);
  const composites: sharp.OverlayOptions[] = [];
  let cursor = startX;
  const spriteHeight = sprites[0]?.height ?? 0;
  const lineTop = Math.round((input.height - spriteHeight) / 2);
  if (sprites.some((sprite) => sprite.height !== spriteHeight)) {
    return { ok: false, message: "Word sprites do not share one line height." };
  }
  for (const sprite of sprites) {
    composites.push({
      input: sprite.buffer,
      left: cursor,
      top: lineTop,
    });
    cursor += sprite.width + gap;
  }
  const hideBox =
    input.background === "transparent" || input.background === "none";
  if (hideBox) {
    await sharp({
      create: {
        width: input.width,
        height: input.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toFile(input.outputAbsolutePath);
  } else {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${input.width}" height="${input.height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="8" width="${input.width - 40}" height="${input.height - 16}" rx="${input.radius}" fill="${input.background}"/>
</svg>`;
    await sharp(Buffer.from(svg))
      .composite(composites)
      .png()
      .toFile(input.outputAbsolutePath);
  }
  if (cursor - gap - startX !== contentWidth && words.length > 0) {
    /* cursor lands one gap past last word; contentWidth is the used span */
  }
  if (spriteHeight < 8) {
    return { ok: false, message: "Word sprites rendered empty." };
  }
  return {
    ok: true,
    words,
    wordGapPx: gap,
    contentWidth,
    sharedSpriteHeight: spriteHeight,
    sharedBaseline: sprites[0]?.baseline ?? 0,
  };
}

export async function paintExactCtaCard(input: {
  text: string;
  outputAbsolutePath: string;
  width: number;
  height: number;
  fontSize: number;
  wordGapPx?: number;
  fill?: string;
  background?: string;
}): Promise<
  | { ok: true; words: string[]; wordGapPx: number }
  | { ok: false; message: string }
> {
  const linePath = `${input.outputAbsolutePath}.line.png`;
  const line = await paintExactTextLine({
    text: input.text,
    outputAbsolutePath: linePath,
    width: input.width - 120,
    height: 160,
    fontSize: input.fontSize,
    fill: input.fill ?? "#ffffff",
    background: input.background ?? "#1F4A44",
    radius: 16,
    wordGapPx: input.wordGapPx,
  });
  if (!line.ok) {
    return line;
  }
  const card = await sharp({
    create: {
      width: input.width,
      height: input.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: linePath,
        left: 60,
        top: Math.round((input.height - 160) / 2),
      },
    ])
    .png()
    .toFile(input.outputAbsolutePath);
  void card;
  return { ok: true, words: line.words, wordGapPx: line.wordGapPx };
}

export async function assembleBurnedShort(input: {
  sourceAbsolutePath: string;
  edl: EditDecisionList;
  workDirectory: string;
  outputAbsolutePath: string;
  approvedCta: string;
  transcriptWordsInRange: readonly string[];
  ctaHoldSeconds?: number;
  captionBackground?: string;
  captionStroke?: string;
  captionBottomPx?: number;
  captionBandHeight?: number;
  ctaFill?: string;
  ctaBackground?: string;
  applyEndCue?: boolean;
  paintEndCard?: (input: {
    text: string;
    outputAbsolutePath: string;
    width: number;
    height: number;
  }) => Promise<{ ok: true; words: string[] } | { ok: false; message: string }>;
}): Promise<
  | {
      ok: true;
      outputAbsolutePath: string;
      assPath: string;
      paintedWordsPath: string;
      endCue: TalkingHeadEndCueChoice;
    }
  | { ok: false; message: string; findings?: string[] }
> {
  if (!input.edl.ok) {
    return { ok: false, message: "EDL is not ok." };
  }
  const qa = evaluateExactTextQa({
    captions: input.edl.captions,
    approvedCta: input.approvedCta,
    transcriptWordsInRange: input.transcriptWordsInRange,
  });
  if (!qa.ok) {
    return {
      ok: false,
      message: `Exact-text QA failed: ${qa.findings.join("; ")}`,
      findings: qa.findings,
    };
  }
  if (!existsSync(WINDOWS_BOLD_FONT)) {
    return { ok: false, message: "Local Arial Bold font missing." };
  }

  const clip = input.edl.clips[0];
  if (!clip || input.edl.clips.length !== 1) {
    return { ok: false, message: "Frozen finishing cut must stay one continuous clip." };
  }

  const fittedCaptions = await fitSpeechCaptionsToFrame(input.edl.captions);
  if (!Array.isArray(fittedCaptions)) return fittedCaptions;

  mkdirSync(input.workDirectory, { recursive: true });
  const assPath = path.join(input.workDirectory, "speech.ass");
  const ass = buildSpeechAss(fittedCaptions);
  const assTexts = assDialogueTexts(ass);
  const speechCaptions = fittedCaptions.filter((caption) => caption.role !== "cta");
  if (
    assTexts.length !== speechCaptions.length ||
    assTexts.some((text, index) => text !== speechCaptions[index]!.text)
  ) {
    return { ok: false, message: "ASS dialogue drifted from approved caption text." };
  }
  writeFileSync(assPath, ass, "utf8");

  const cutPath = path.join(input.workDirectory, "cut.mp4");
  const burnedPath = path.join(input.workDirectory, "burned.mp4");
  const cardPath = path.join(input.workDirectory, "end-card.mp4");
  const ctaHold = input.ctaHoldSeconds ?? CTA_HOLD;
  const paintedWordsPath = path.join(input.workDirectory, "painted-words.json");

  try {
    const painted: Array<{ role: string; text: string; words: string[]; file: string }> = [];
    const speechPngs: Array<{ caption: TimedCaption; fileName: string }> = [];
    for (const [index, caption] of speechCaptions.entries()) {
      const fileName = `cap-${index}.png`;
      const paintedLine = await paintExactTextLine({
        text: caption.text,
        outputAbsolutePath: path.join(input.workDirectory, fileName),
        width: OFFER.width,
        height: input.captionBandHeight ?? 160,
        fontSize: 44,
        fill: "#ffffff",
        background: input.captionBackground ?? "#111111",
        radius: 10,
        stroke: input.captionStroke,
      });
      if (!paintedLine.ok) {
        return paintedLine;
      }
      if (paintedLine.words.join(" ") !== exactWords(caption.text).join(" ")) {
        return { ok: false, message: `Caption ${index} painted words drifted.` };
      }
      painted.push({
        role: caption.role,
        text: caption.text,
        words: paintedLine.words,
        file: fileName,
      });
      speechPngs.push({ caption, fileName });
    }

    const ctaWords = input.approvedCta.trim();
    if (ctaWords) {
      const ctaPng = path.join(input.workDirectory, "cta-card.png");
      const ctaPaint = input.paintEndCard
        ? await input.paintEndCard({
            text: ctaWords,
            outputAbsolutePath: ctaPng,
            width: OFFER.width,
            height: OFFER.height,
          })
        : await paintExactCtaCard({
            text: ctaWords,
            outputAbsolutePath: ctaPng,
            width: OFFER.width,
            height: OFFER.height,
            fontSize: 48,
            fill: input.ctaFill,
            background: input.ctaBackground,
          });
      if (!ctaPaint.ok) {
        return ctaPaint;
      }
      if (ctaPaint.words.join(" ") !== exactWords(ctaWords).join(" ")) {
        return { ok: false, message: "CTA painted words drifted from approved text." };
      }
      painted.push({
        role: "cta",
        text: ctaWords,
        words: ctaPaint.words,
        file: "cta-card.png",
      });
    }
    writeFileSync(
      paintedWordsPath,
      `${JSON.stringify({ ok: true, wordGapPx: EXACT_WORD_GAP_PX, painted }, null, 2)}\n`,
    );

    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(clip.sourceTrim),
        "-i",
        input.sourceAbsolutePath,
        "-t",
        String(clip.sourceLength),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        cutPath,
      ],
      { stdio: "pipe" },
    );

    const overlayInputs = speechPngs.flatMap(({ fileName }) => ["-i", fileName]);
    const captionBottomPx = input.captionBottomPx ?? 72;
    let filter = "";
    let lastLabel = "0:v";
    const stableCaptions = stabilizeOpeningCaptionPresentation(
      speechPngs.map((entry) => entry.caption),
    );
    speechPngs.forEach((entry, index) => {
      const nextLabel = index === speechPngs.length - 1 ? "vout" : `v${index + 1}`;
      const inputIndex = index + 1;
      const caption = stableCaptions[index] ?? entry.caption;
      filter += `[${lastLabel}][${inputIndex}:v]overlay=0:H-h-${captionBottomPx}:enable='between(t,${caption.start},${caption.end})'[${nextLabel}];`;
      lastLabel = nextLabel;
    });
    if (!speechPngs.length) {
      return { ok: false, message: "No speech captions to burn." };
    }
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        "cut.mp4",
        ...overlayInputs,
        "-filter_complex",
        filter.slice(0, -1),
        "-map",
        "[vout]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "burned.mp4",
      ],
      { stdio: "pipe", cwd: input.workDirectory },
    );

    const lastSpeech = speechCaptions[speechCaptions.length - 1];
    const endCue = chooseTalkingHeadEndCue({
      lastSpeechText: lastSpeech?.text ?? "",
      lastSpeechDurationSeconds: lastSpeech
        ? lastSpeech.end - lastSpeech.start
        : 0,
    });
    writeEndCueDecision({
      workDirectory: input.workDirectory,
      choice: endCue,
      lastSpeechText: lastSpeech?.text ?? "",
    });
    const applyCue = input.applyEndCue !== false;
    const cueWav = path.join(input.workDirectory, "end-cue.wav");
    const cardAudio = path.join(input.workDirectory, "end-card-audio.wav");
    const burnedCued = path.join(input.workDirectory, "burned-cued.mp4");
    let speechForConcat = burnedPath;
    if (!input.approvedCta.trim()) {
      if (applyCue) {
        const cueWritten = writeTalkingHeadEndCueWav({
          id: endCue.id,
          outputAbsolutePath: cueWav,
        });
        if (!cueWritten.ok) return cueWritten;
        const underSpeech = mixEndCueUnderLastSpeech({
          videoAbsolutePath: burnedPath,
          cueAbsolutePath: cueWav,
          outputAbsolutePath: burnedCued,
          speechDurationSeconds: clip.sourceLength,
        });
        if (!underSpeech.ok) return underSpeech;
        speechForConcat = burnedCued;
      }
      execFileSync(
        "ffmpeg",
        ["-y", "-i", speechForConcat, "-c", "copy", input.outputAbsolutePath],
        { stdio: "pipe" },
      );
      return {
        ok: true,
        outputAbsolutePath: input.outputAbsolutePath,
        assPath,
        paintedWordsPath,
        endCue,
      };
    }
    if (applyCue) {
      const cueWritten = writeTalkingHeadEndCueWav({
        id: endCue.id,
        outputAbsolutePath: cueWav,
      });
      if (!cueWritten.ok) return cueWritten;
      const underSpeech = mixEndCueUnderLastSpeech({
        videoAbsolutePath: burnedPath,
        cueAbsolutePath: cueWav,
        outputAbsolutePath: burnedCued,
        speechDurationSeconds: clip.sourceLength,
      });
      if (!underSpeech.ok) return underSpeech;
      speechForConcat = burnedCued;
      const cardMix = mixEndCueOntoEndCardAudio({
        cueAbsolutePath: cueWav,
        outputAbsolutePath: cardAudio,
        holdSeconds: ctaHold,
        delaySeconds: FLAGSHIP_MUSIC_FADE_OUT_SECONDS,
      });
      if (!cardMix.ok) return cardMix;
    } else {
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `anullsrc=r=48000:cl=stereo:d=${ctaHold}`,
          "-c:a",
          "pcm_s16le",
          cardAudio,
        ],
        { stdio: "pipe", cwd: input.workDirectory },
      );
    }

    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        "cta-card.png",
        "-i",
        "end-card-audio.wav",
        "-t",
        String(ctaHold),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-shortest",
        "end-card.mp4",
      ],
      { stdio: "pipe", cwd: input.workDirectory },
    );

    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        speechForConcat,
        "-i",
        cardPath,
        "-filter_complex",
        "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
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
      message: `Local burn-in failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (!existsSync(input.outputAbsolutePath)) {
    return { ok: false, message: "Burned short missing after ffmpeg." };
  }
  const lastSpeech = fittedCaptions.filter((caption) => caption.role !== "cta").at(-1);
  const endCue = chooseTalkingHeadEndCue({
    lastSpeechText: lastSpeech?.text ?? "",
    lastSpeechDurationSeconds: lastSpeech ? lastSpeech.end - lastSpeech.start : 0,
  });
  return {
    ok: true,
    outputAbsolutePath: input.outputAbsolutePath,
    assPath,
    paintedWordsPath,
    endCue,
  };
}
