/**
 * Local caption/CTA burn-in. Shotstack does not typeset customer-visible words.
 * Words are painted as separate sprites so spaces cannot collapse.
 */

import { execFileSync } from "child_process";

import {
  probeFormatDurationSeconds,
  probeStreamDurations,
  redactFfmpegLog,
  resolveFfmpegExecutable,
  spawnFfmpeg,
  spawnFfmpegWithTimeout,
} from "@/lib/studio-media-runtime/ffmpeg-cli";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
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

function execFfmpegSync(
  args: string[],
  options?: { cwd?: string },
): void {
  try {
    execFileSync(resolveFfmpegExecutable(), args, {
      cwd: options?.cwd,
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const err = error as { message?: string; stderr?: string; stdout?: string };
    const stderr = redactFfmpegLog(err.stderr ?? "").slice(-6000);
    const stdout = redactFfmpegLog(err.stdout ?? "").slice(-2000);
    throw new Error(
      `${err.message ?? "ffmpeg failed"}\nstderr:\n${stderr}${stdout ? `\nstdout:\n${stdout}` : ""}`,
    );
  }
}

export const WINDOWS_BOLD_FONT = "C:/Windows/Fonts/arialbd.ttf";

const BUNDLED_ARIAL_BOLD_FONT = path.join(
  process.cwd(),
  "assets/fonts/caption/arial-bold.ttf",
);

/** Desk Windows Arial, else bundled TTF for hosted Preview/Production (Linux). */
export function resolveCaptionBoldFontPath(): string {
  const env = process.env.STUDIO_CAPTION_BOLD_FONT_PATH?.trim();
  if (env && existsSync(env)) return env;
  if (existsSync(WINDOWS_BOLD_FONT)) return WINDOWS_BOLD_FONT;
  if (existsSync(BUNDLED_ARIAL_BOLD_FONT)) return BUNDLED_ARIAL_BOLD_FONT;
  return WINDOWS_BOLD_FONT;
}

const CAPTION_BOLD_FONT_FAMILY = "StudioCaptionBold";
let cachedCaptionBoldFontFaceStyle: string | null = null;

/** Base64 @font-face so Linux hosted burn matches desk metrics (file:// URLs fail in librsvg). */
function captionBoldFontFaceStyle(): string {
  if (cachedCaptionBoldFontFaceStyle) return cachedCaptionBoldFontFaceStyle;
  const fontPath = resolveCaptionBoldFontPath();
  if (!existsSync(fontPath)) {
    cachedCaptionBoldFontFaceStyle = "";
    return cachedCaptionBoldFontFaceStyle;
  }
  const base64 = readFileSync(fontPath).toString("base64");
  cachedCaptionBoldFontFaceStyle = `@font-face{font-family:'${CAPTION_BOLD_FONT_FAMILY}';src:url('data:font/truetype;base64,${base64}') format('truetype');font-weight:700;font-style:normal;}`;
  return cachedCaptionBoldFontFaceStyle;
}

export const EXACT_WORD_GAP_PX = 28;
export const WORD_GAP_PAD_PX = 12;

export function wordGapForFontSize(fontSize: number): number {
  const spaceWidth = Math.max(10, Math.round(fontSize * 0.38));
  let gap = Math.max(EXACT_WORD_GAP_PX, spaceWidth + WORD_GAP_PAD_PX);
  if (fontSize <= 24) {
    gap = Math.min(gap, Math.max(12, Math.round(fontSize * 0.85)));
  }
  if (fontSize <= 20) {
    gap = Math.max(10, Math.round(fontSize * 0.55));
  }
  return gap;
}

export const CLIP_MAX_SPEECH_WORDS_PER_PAINTED_LINE = 5;

/** Burn-only: keep words, but cap words per painted line (Clip repurposing). */
export function splitSpeechCaptionsForBurn(
  captions: readonly TimedCaption[],
  maxWords = CLIP_MAX_SPEECH_WORDS_PER_PAINTED_LINE,
): TimedCaption[] {
  const out: TimedCaption[] = [];
  for (const caption of captions) {
    if (caption.role === "cta") {
      out.push(caption);
      continue;
    }
    const words = exactWords(caption.text);
    if (words.length <= maxWords) {
      out.push(caption);
      continue;
    }
    const span = Math.max(0.15, caption.end - caption.start);
    const slice = span / words.length;
    for (let index = 0; index < words.length; index += maxWords) {
      const chunk = words.slice(index, index + maxWords);
      const start = caption.start + slice * index;
      const end = caption.start + slice * (index + chunk.length);
      out.push({
        ...caption,
        text: chunk.join(" "),
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        role: out.length === 0 && caption.role === "hook" ? "hook" : "speech",
      });
    }
  }
  return out;
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
  <defs><style>${captionBoldFontFaceStyle()}</style></defs>
  <text x="6" y="${baseline}" font-family="${CAPTION_BOLD_FONT_FAMILY}" font-weight="700" font-size="${fontSize}" fill="${fill}"${strokeAttr}>${escapeXml(word)}</text>
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
  stroke?: string,
): Promise<boolean> {
  const words = exactWords(text);
  if (words.length === 0) return false;
  const gap = wordGapForFontSize(fontSize);
  const sprites = await Promise.all(
    words.map((word) => renderWordSprite(word, fontSize, "#ffffff", stroke)),
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

export const SPEECH_FONT_SIZE_LADDER = [44, 40, 36, 32, 28, 24, 22, 20, 18] as const;

export const CLIP_CAPTION_PRODUCTION_PROBE_V1 = {
  id: "clip-caption-production-v1",
  ladder: SPEECH_FONT_SIZE_LADDER,
  usesFinishClipDecisionList: true,
} as const;

/** Hosted Preview probe — confirms uniform fit/paint repair is deployed (not just Vercel Ready). */
export const CAPTION_UNIFORM_FIT_PROBE_V1 = {
  id: "caption-uniform-fit-v1",
  ladder: SPEECH_FONT_SIZE_LADDER,
  uniformSplitOnly: true,
} as const;

export const CLIP_CERT_CAPTION_REGRESSION_LINES = [
  "I would rather sell 10 things",
  "They think a bigger menu looks",
  "than 50 things we can barely manage.",
] as const;

async function verifyFittedSpeechPaintable(
  fitted: readonly TimedCaption[],
  fontSize: number,
  stroke: string | undefined,
  paintProbeDir: string,
  paintOptions?: { bandHeight?: number; background?: string },
): Promise<boolean> {
  const bandHeight = paintOptions?.bandHeight ?? 160;
  const background = paintOptions?.background ?? "#111111";
  const speech = fitted.filter((caption) => caption.role !== "cta");
  for (const [index, caption] of speech.entries()) {
    if (!(await speechLineFitsFrame(caption.text, OFFER.width, fontSize, stroke))) {
      return false;
    }
    const painted = await paintExactTextLine({
      text: caption.text,
      outputAbsolutePath: path.join(paintProbeDir, `ladder-probe-${index}.png`),
      width: OFFER.width,
      height: bandHeight,
      fontSize,
      fill: "#ffffff",
      background,
      radius: 10,
      stroke,
    });
    if (!painted.ok) return false;
  }
  return true;
}

/** Largest readable size where every speech line fits after word-splitting (stroke-aware). */
export async function resolveUniformSpeechFontSize(
  captions: readonly TimedCaption[],
  stroke?: string,
  paintOptions?: { bandHeight?: number; background?: string },
): Promise<{ ok: true; fontSize: number } | { ok: false; message: string }> {
  const paintProbeDir = mkdtempSync(path.join(tmpdir(), "caption-ladder-probe-"));
  for (const fontSize of SPEECH_FONT_SIZE_LADDER) {
    const fitted = await fitSpeechCaptionsToFrame(captions, { fontSize, stroke });
    if (!Array.isArray(fitted)) continue;
    if (
      await verifyFittedSpeechPaintable(
        fitted,
        fontSize,
        stroke,
        paintProbeDir,
        paintOptions,
      )
    ) {
      return { ok: true, fontSize };
    }
  }
  return {
    ok: false,
    message: "Caption lines could not fit the frame at readable sizes.",
  };
}

/** Keep every spoken word. Break a line only when it cannot fit the frame. */
export async function fitSpeechCaptionsToFrame(
  captions: readonly TimedCaption[],
  options?: { fontSize?: number; stroke?: string },
): Promise<TimedCaption[] | { ok: false; message: string }> {
  const fitted: TimedCaption[] = [];
  for (const caption of captions) {
    if (caption.role === "cta") {
      fitted.push(caption);
      continue;
    }
    const parts = await splitCaptionUntilItFits(caption, options?.fontSize ?? 44, options?.stroke);
    if (!Array.isArray(parts)) return parts;
    fitted.push(...parts);
  }
  return fitted;
}

async function splitCaptionUntilItFits(
  caption: TimedCaption,
  fontSize = 44,
  stroke?: string,
): Promise<TimedCaption[] | { ok: false; message: string }> {
  if (await speechLineFitsFrame(caption.text, OFFER.width, fontSize, stroke)) return [caption];
  const halves = splitTimedCaption(caption);
  if (!halves) {
    const wordCount = exactWords(caption.text).length;
    return {
      ok: false,
      message: `Exact-text line overflow: "${caption.text}" (${wordCount}w max=${CLIP_MAX_SPEECH_WORDS_PER_PAINTED_LINE} dpl=${process.env.VERCEL_DEPLOYMENT_ID ?? "local"})`,
    };
  }
  const left = await splitCaptionUntilItFits(halves[0], fontSize, stroke);
  if (!Array.isArray(left)) return left;
  const right = await splitCaptionUntilItFits(halves[1], fontSize, stroke);
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
      message: `Exact-text line overflow: "${input.text}" (${words.length}w max=${CLIP_MAX_SPEECH_WORDS_PER_PAINTED_LINE} dpl=${process.env.VERCEL_DEPLOYMENT_ID ?? "local"})`,
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

/** Same resolve + paint ladder as assembleBurnedShort, without ffmpeg or end-card work. */
export async function verifySpeechCaptionsBurnPaintLadder(input: {
  captions: readonly TimedCaption[];
  stroke?: string;
  bandHeight?: number;
  background?: string;
  workDirectory?: string;
}): Promise<
  | { ok: true; fontSize: number; fittedCaptions: TimedCaption[] }
  | { ok: false; message: string }
> {
  const captionsForLadder = splitSpeechCaptionsForBurn(input.captions);
  const paintOptions = {
    bandHeight: input.bandHeight ?? 160,
    background: input.background ?? "#111111",
  };
  const speechFont = await resolveUniformSpeechFontSize(
    captionsForLadder,
    input.stroke,
    paintOptions,
  );
  if (!speechFont.ok) return speechFont;
  let speechFontSize = speechFont.fontSize;
  let fittedCaptions: TimedCaption[] | { ok: false; message: string } =
    await fitSpeechCaptionsToFrame(captionsForLadder, {
      fontSize: speechFontSize,
      stroke: input.stroke,
    });
  if (!Array.isArray(fittedCaptions)) return fittedCaptions;

  const workDirectory =
    input.workDirectory ?? mkdtempSync(path.join(tmpdir(), "caption-burn-verify-"));
  mkdirSync(workDirectory, { recursive: true });

  const ladderStart = SPEECH_FONT_SIZE_LADDER.indexOf(
    speechFontSize as (typeof SPEECH_FONT_SIZE_LADDER)[number],
  );
  const ladderFrom =
    ladderStart >= 0 ? SPEECH_FONT_SIZE_LADDER.slice(ladderStart) : SPEECH_FONT_SIZE_LADDER;
  let paintReady = false;
  for (const trySize of ladderFrom) {
    speechFontSize = trySize;
    const refit = await fitSpeechCaptionsToFrame(captionsForLadder, {
      fontSize: trySize,
      stroke: input.stroke,
    });
    if (!Array.isArray(refit)) return refit;
    fittedCaptions = refit;
    const trySpeech = refit.filter((caption) => caption.role !== "cta");
    let failed: { ok: false; message: string } | null = null;
    for (const [index, caption] of trySpeech.entries()) {
      const paintedLine = await paintExactTextLine({
        text: caption.text,
        outputAbsolutePath: path.join(workDirectory, `cap-${trySize}-${index}.png`),
        width: OFFER.width,
        height: paintOptions.bandHeight,
        fontSize: trySize,
        fill: "#ffffff",
        background: paintOptions.background,
        radius: 10,
        stroke: input.stroke,
      });
      if (!paintedLine.ok) {
        failed = paintedLine;
        break;
      }
      if (paintedLine.words.join(" ") !== exactWords(caption.text).join(" ")) {
        failed = { ok: false, message: `Caption ${index} painted words drifted.` };
        break;
      }
    }
    if (!failed) {
      paintReady = true;
      break;
    }
    if (trySize === ladderFrom[ladderFrom.length - 1]) return failed;
  }
  if (!paintReady) {
    return { ok: false, message: "Caption paint failed at all ladder sizes." };
  }
  return { ok: true, fontSize: speechFontSize, fittedCaptions };
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
  /** Production probe: run caption ladder + CTA paint only (no ffmpeg mux). */
  captionsPaintOnly?: boolean;
  /** Hosted Preview chunks: skip ladder/paint when painted-words.json + speech.ass already exist. */
  resumeMuxFromPainted?: boolean;
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
  | {
      ok: true;
      previewMuxChunk: true;
      phase: string;
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
  const boldFontPath = resolveCaptionBoldFontPath();
  if (!existsSync(boldFontPath)) {
    return { ok: false, message: "Local Arial Bold font missing." };
  }

  const clip = input.edl.clips[0];
  if (!clip || input.edl.clips.length !== 1) {
    return { ok: false, message: "Frozen finishing cut must stay one continuous clip." };
  }

  const paintOptions = {
    bandHeight: input.captionBandHeight ?? 160,
    background: input.captionBackground ?? "#111111",
  };

  mkdirSync(input.workDirectory, { recursive: true });
  const captionsForBurn = splitSpeechCaptionsForBurn(input.edl.captions);
  const paintedWordsPath = path.join(input.workDirectory, "painted-words.json");
  const assPath = path.join(input.workDirectory, "speech.ass");

  if (
    !input.captionsPaintOnly &&
    existsSync(input.outputAbsolutePath) &&
    input.resumeMuxFromPainted
  ) {
    const lastSpeech = captionsForBurn.filter((caption) => caption.role !== "cta").at(-1);
    return {
      ok: true,
      outputAbsolutePath: input.outputAbsolutePath,
      assPath,
      paintedWordsPath,
      endCue: chooseTalkingHeadEndCue({
        lastSpeechText: lastSpeech?.text ?? "",
        lastSpeechDurationSeconds: lastSpeech
          ? lastSpeech.end - lastSpeech.start
          : 0,
      }),
    };
  }

  let speechFontSize: number;
  let fittedCaptions: TimedCaption[];
  const canResumeMux =
    input.resumeMuxFromPainted &&
    existsSync(paintedWordsPath) &&
    existsSync(assPath);
  if (canResumeMux) {
    fittedCaptions = captionsForBurn;
    speechFontSize = SPEECH_FONT_SIZE_LADDER[0]!;
  } else {
    const verified = await verifySpeechCaptionsBurnPaintLadder({
      captions: captionsForBurn,
      stroke: input.captionStroke,
      bandHeight: paintOptions.bandHeight,
      background: paintOptions.background,
      workDirectory: path.join(input.workDirectory, "ladder-probe"),
    });
    if (!verified.ok) return verified;
    speechFontSize = verified.fontSize;
    fittedCaptions = verified.fittedCaptions;
    const ass = buildSpeechAss(fittedCaptions);
    writeFileSync(assPath, ass, "utf8");
  }

  const cutPath = path.join(input.workDirectory, "cut.mp4");
  const burnedPath = path.join(input.workDirectory, "burned.mp4");
  const burnedCuedPath = path.join(input.workDirectory, "burned-cued.mp4");
  const cardPath = path.join(input.workDirectory, "end-card.mp4");
  const ctaHold = input.ctaHoldSeconds ?? CTA_HOLD;

  const previewMuxResumable =
    (process.env.VERCEL_ENV === "preview" || process.env.STUDIO_HOSTED_CLIP_WORKER === "1") &&
    Boolean(input.resumeMuxFromPainted);

  /** Strategy B concat-only — bounded wall clock on worker/preview (default 120s). */
  const concatOnlyTimeoutMs = Math.max(
    5_000,
    Number(process.env.STUDIO_HOSTED_CLIP_CONCAT_TIMEOUT_MS ?? 120_000),
  );
  const STRATEGY_B_FILTER =
    "[0:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v0];[1:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v1];[0:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]";

  const muxConcatTracePath = path.join(input.workDirectory, "mux-concat-trace.json");
  function writeMuxConcatTrace(payload: Record<string, unknown>) {
    writeFileSync(
      muxConcatTracePath,
      `${JSON.stringify({ ...payload, at: new Date().toISOString() }, null, 2)}\n`,
    );
  }

  /** Preview resume: durable end_card + burned — run concat only (skip PNG ladder / overlay replay). */
  const concatResumeReady =
    existsSync(cardPath) && (existsSync(burnedPath) || existsSync(burnedCuedPath));
  if (
    previewMuxResumable &&
    !input.captionsPaintOnly &&
    !existsSync(input.outputAbsolutePath) &&
    concatResumeReady
  ) {
    writeMuxConcatTrace({
      branch: "concat_only_attempt",
      hasBurnedCued: existsSync(burnedCuedPath),
      hasEndCard: existsSync(cardPath),
      hasBurned: existsSync(burnedPath),
      outputAbsolutePath: input.outputAbsolutePath,
    });
    const speechForConcat = existsSync(burnedCuedPath) ? burnedCuedPath : burnedPath;
    const inputDurSpeech = probeFormatDurationSeconds(speechForConcat);
    const inputDurCard = probeFormatDurationSeconds(cardPath);
    const expectedDurationSec =
      inputDurSpeech != null && inputDurCard != null
        ? inputDurSpeech + inputDurCard
        : null;
    const progressLogPath = path.join(input.workDirectory, "mux-concat-ffmpeg-progress.log");
    const stderrLogPath = path.join(input.workDirectory, "mux-concat-ffmpeg-stderr.log");
    writeMuxConcatTrace({
      branch: "concat_only_ffmpeg_start",
      strategy: "B_normalized_fps30_crf23",
      concatOnlyTimeoutMs,
      expectedDurationSec,
      speechForConcat,
      cardPath,
      progressLogPath,
      stderrLogPath,
      filterComplex: STRATEGY_B_FILTER,
    });
    const ffmpegArgs = [
      "-y",
      "-i",
      speechForConcat,
      "-i",
      cardPath,
      "-filter_complex",
      STRATEGY_B_FILTER,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      input.outputAbsolutePath,
    ] as const;
    const ffmpegRun = await spawnFfmpegWithTimeout({
      args: ffmpegArgs,
      timeoutMs: concatOnlyTimeoutMs,
      progressLogPath,
      stderrLogPath,
    });
    let progressTail = "";
    if (existsSync(progressLogPath)) {
      progressTail = redactFfmpegLog(readFileSync(progressLogPath, "utf8")).slice(-4000);
    }
    if (ffmpegRun.timedOut || ffmpegRun.terminated) {
      if (existsSync(input.outputAbsolutePath)) {
        try {
          unlinkSync(input.outputAbsolutePath);
        } catch {
          // ignore
        }
      }
      writeMuxConcatTrace({
        branch: "concat_only_timeout",
        elapsedMs: ffmpegRun.elapsedMs,
        timedOut: ffmpegRun.timedOut,
        progressTail,
        stderrTail: ffmpegRun.stderr.slice(-2000),
      });
      return {
        ok: false,
        message: `Preview concat-only mux timed out after ${ffmpegRun.elapsedMs}ms.`,
      };
    }
    if (ffmpegRun.status !== 0) {
      writeMuxConcatTrace({
        branch: "concat_only_failed",
        exitStatus: ffmpegRun.status,
        elapsedMs: ffmpegRun.elapsedMs,
        progressTail,
        stderrTail: ffmpegRun.stderr.slice(-2000),
        stdoutTail: ffmpegRun.stdout.slice(-500),
      });
      return {
        ok: false,
        message: `Preview concat-only mux failed: ${ffmpegRun.stderr.slice(-400)}`,
      };
    }
    if (!existsSync(input.outputAbsolutePath)) {
      writeMuxConcatTrace({ branch: "concat_only_missing_output", progressTail });
      return { ok: false, message: "Preview concat-only output missing after ffmpeg." };
    }
    const outputProbe = probeStreamDurations(input.outputAbsolutePath);
    const formatDur = outputProbe.formatDuration;
    const avDelta =
      outputProbe.videoDuration != null && outputProbe.audioDuration != null
        ? Math.abs(outputProbe.videoDuration - outputProbe.audioDuration)
        : null;
    const durationOk =
      expectedDurationSec != null && formatDur != null
        ? formatDur >= expectedDurationSec - 1 && formatDur <= expectedDurationSec + 2.5
        : formatDur != null && formatDur >= 15 && formatDur <= 25;
    const avSyncOk = avDelta == null || avDelta <= 0.35;
    if (!durationOk || !avSyncOk) {
      writeMuxConcatTrace({
        branch: "concat_only_duration_rejected",
        expectedDurationSec,
        outputProbe,
        avDelta,
        durationOk,
        avSyncOk,
        progressTail,
      });
      try {
        unlinkSync(input.outputAbsolutePath);
      } catch {
        // ignore
      }
      return {
        ok: false,
        message: `Concat output failed duration/sync gate (format=${formatDur ?? "null"}, expected≈${expectedDurationSec ?? "unknown"}, avDelta=${avDelta ?? "null"}).`,
      };
    }
    writeMuxConcatTrace({
      branch: "concat_only_ok",
      strategy: "B_normalized_fps30_crf23",
      elapsedMs: ffmpegRun.elapsedMs,
      outputBytes: readFileSync(input.outputAbsolutePath).length,
      expectedDurationSec,
      outputProbe,
      avDelta,
      progressTail,
      stderrLogPath,
      progressLogPath,
    });
    const resumeSpeech = captionsForBurn.filter((caption) => caption.role !== "cta");
    const lastSpeechResume = resumeSpeech.at(-1);
    return {
      ok: true,
      outputAbsolutePath: input.outputAbsolutePath,
      assPath,
      paintedWordsPath,
      endCue: chooseTalkingHeadEndCue({
        lastSpeechText: lastSpeechResume?.text ?? "",
        lastSpeechDurationSeconds: lastSpeechResume
          ? lastSpeechResume.end - lastSpeechResume.start
          : 0,
      }),
    };
  }

  function previewMuxChunkReturn(
    phase: string,
    endCue: TalkingHeadEndCueChoice,
  ):
    | {
        ok: true;
        previewMuxChunk: true;
        phase: string;
        assPath: string;
        paintedWordsPath: string;
        endCue: TalkingHeadEndCueChoice;
      }
    | null {
    if (!previewMuxResumable) return null;
    return {
      ok: true,
      previewMuxChunk: true,
      phase,
      assPath,
      paintedWordsPath,
      endCue,
    };
  }

  try {
    const painted: Array<{ role: string; text: string; words: string[]; file: string }> = [];
    const speechPngs: Array<{ caption: TimedCaption; fileName: string }> = [];
    const trySpeech = fittedCaptions.filter((caption) => caption.role !== "cta");
    if (canResumeMux) {
      const saved = JSON.parse(readFileSync(paintedWordsPath, "utf8")) as {
        ok?: boolean;
        painted?: Array<{ role: string; text: string; words: string[]; file: string }>;
      };
      if (!saved.ok || !saved.painted?.length) {
        return { ok: false, message: "Invalid painted-words.json for resumeMuxFromPainted." };
      }
      for (const [index, caption] of trySpeech.entries()) {
        const entry = saved.painted.find(
          (row) => row.role !== "cta" && row.text === caption.text,
        );
        const fileName = entry?.file ?? `cap-${index}.png`;
        if (!existsSync(path.join(input.workDirectory, fileName))) {
          return { ok: false, message: `Missing painted PNG ${fileName} for resume mux.` };
        }
        speechPngs.push({ caption, fileName });
      }
      painted.push(...saved.painted);
    } else {
    for (const [index, caption] of trySpeech.entries()) {
      const fileName = `cap-${index}.png`;
      const paintedLine = await paintExactTextLine({
        text: caption.text,
        outputAbsolutePath: path.join(input.workDirectory, fileName),
        width: OFFER.width,
        height: paintOptions.bandHeight,
        fontSize: speechFontSize,
        fill: "#ffffff",
        background: paintOptions.background,
        radius: 10,
        stroke: input.captionStroke,
      });
      if (!paintedLine.ok) return paintedLine;
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
    }
    const speechCaptions = fittedCaptions.filter((caption) => caption.role !== "cta");
    const assTexts = assDialogueTexts(readFileSync(assPath, "utf8"));
    if (
      assTexts.length !== speechCaptions.length ||
      assTexts.some((text, index) => text !== speechCaptions[index]!.text)
    ) {
      return { ok: false, message: "ASS dialogue drifted from approved caption text." };
    }

    const ctaWords = input.approvedCta.trim();
    if (ctaWords && !(canResumeMux && existsSync(path.join(input.workDirectory, "cta-card.png")))) {
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
    if (!(canResumeMux && existsSync(paintedWordsPath))) {
      writeFileSync(
        paintedWordsPath,
        `${JSON.stringify({ ok: true, wordGapPx: EXACT_WORD_GAP_PX, painted }, null, 2)}\n`,
      );
    }

    if (input.captionsPaintOnly) {
      const lastSpeech = speechCaptions.at(-1);
      return {
        ok: true,
        outputAbsolutePath: input.outputAbsolutePath,
        assPath,
        paintedWordsPath,
        endCue: chooseTalkingHeadEndCue({
          lastSpeechText: lastSpeech?.text ?? "",
          lastSpeechDurationSeconds: Math.max(
            0.2,
            (lastSpeech?.end ?? 0) - (lastSpeech?.start ?? 0),
          ),
        }),
      };
    }

    let cutCreatedThisInvocation = false;
    if (!existsSync(cutPath)) {
      if (!existsSync(input.sourceAbsolutePath)) {
        return {
          ok: false,
          message: `Local burn-in failed: source missing before cut: ${input.sourceAbsolutePath}`,
        };
      }
      execFfmpegSync(
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
        { cwd: input.workDirectory },
      );
      cutCreatedThisInvocation = true;
    }

    const lastSpeechAfterCut = speechCaptions[speechCaptions.length - 1];
    const endCueAfterCut = chooseTalkingHeadEndCue({
      lastSpeechText: lastSpeechAfterCut?.text ?? "",
      lastSpeechDurationSeconds: lastSpeechAfterCut
        ? lastSpeechAfterCut.end - lastSpeechAfterCut.start
        : 0,
    });
    if (cutCreatedThisInvocation) {
      const chunkAfterCut = previewMuxChunkReturn("cut", endCueAfterCut);
      if (chunkAfterCut) return chunkAfterCut;
    }

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
    let burnedCreatedThisInvocation = false;
    if (!existsSync(burnedPath)) {
      execFileSync(
        resolveFfmpegExecutable(),
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
      burnedCreatedThisInvocation = true;
    }

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
    if (burnedCreatedThisInvocation && input.approvedCta.trim()) {
      const chunkAfterBurned = previewMuxChunkReturn("burned", endCue);
      if (chunkAfterBurned) return chunkAfterBurned;
    }
    const applyCue = input.applyEndCue !== false;
    const cueWav = path.join(input.workDirectory, "end-cue.wav");
    const cardAudio = path.join(input.workDirectory, "end-card-audio.wav");
    const burnedCued = path.join(input.workDirectory, "burned-cued.mp4");
    let speechForConcat = burnedPath;
    const resumeSpeechForConcat =
      previewMuxResumable && existsSync(burnedCued) ? burnedCued : null;
    if (resumeSpeechForConcat) {
      speechForConcat = resumeSpeechForConcat;
    } else if (!input.approvedCta.trim()) {
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
        resolveFfmpegExecutable(),
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
    } else if (!resumeSpeechForConcat) {
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
        resolveFfmpegExecutable(),
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
    }

    let endCardCreatedThisInvocation = false;
    if (!existsSync(cardPath)) {
      execFileSync(
        resolveFfmpegExecutable(),
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
      endCardCreatedThisInvocation = true;
    }

    if (endCardCreatedThisInvocation) {
      const chunkAfterEndCard = previewMuxChunkReturn("end_card", endCue);
      if (chunkAfterEndCard) return chunkAfterEndCard;
    }

    execFileSync(
      resolveFfmpegExecutable(),
      [
        "-y",
        "-i",
        speechForConcat,
        "-i",
        cardPath,
        "-filter_complex",
        STRATEGY_B_FILTER,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
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

export type AssembleBurnedShortResult = Awaited<ReturnType<typeof assembleBurnedShort>>;

export type AssembleBurnedShortComplete = Extract<
  AssembleBurnedShortResult,
  { ok: true; outputAbsolutePath: string }
>;

export function isAssembleBurnedShortComplete(
  result: AssembleBurnedShortResult,
): result is AssembleBurnedShortComplete {
  return result.ok === true && "outputAbsolutePath" in result;
}
