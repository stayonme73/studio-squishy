/**
 * Second-pass River & Reed finish.
 * Overlays corrected captions on the existing cuts.
 * Does not overwrite certified originals or candidate 1.
 */
import { createHash } from "crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";

import { exactWords, paintExactTextLine } from "../src/lib/studio-short-form-video-editing/caption-burn";
import type { TimedCaption } from "../src/lib/studio-short-form-video-editing/types";
import {
  CLIP_CAPTION_PRESENTATION,
  clipSpeechCaptionFindings,
  finishClipTimedSpeech,
  paintClipCustomerEndCard,
} from "../src/lib/studio-clip-repurposing/caption-finish";

const repo = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(
  repo,
  "data/campaign-design-artifacts/camp-clip-full-cust-cert-20261002/clip-factory",
);
const outRoot = path.join(repo, "docs/launch/studio-clip-repurposing-finish-candidate-2");
const priorRoot = path.join(repo, "docs/launch/studio-clip-repurposing-finish-candidate-1");
const CTA = "Book a River & Reed table tonight";

const shorts = [
  { name: "Clip-Repurposing-Short-01", clipId: "c-56-423" },
  { name: "Clip-Repurposing-Short-02", clipId: "c-17-127" },
  { name: "Clip-Repurposing-Short-03", clipId: "c-82-641" },
];

function bare(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9&]/g, "");
}

function parseAss(file: string): TimedCaption[] {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const captions: TimedCaption[] = [];
  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;
    const parts = line.split(",");
    const start = assTime(parts[1] ?? "");
    const end = assTime(parts[2] ?? "");
    const text = parts.slice(9).join(",").trim();
    captions.push({
      start,
      end,
      text,
      role: captions.length === 0 ? "hook" : "speech",
    });
  }
  return captions;
}

function assTime(value: string): number {
  const [h, m, s] = value.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function sha(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function alignSpokenWords(phrase: string): Array<{ text: string; start: number; end: number }> {
  const transcript = JSON.parse(readFileSync(path.join(sourceRoot, "transcript-words.json"), "utf8")) as {
    words: Array<{ word: string; start: number; end: number; punctuatedWord?: string }>;
  };
  const wanted = exactWords(phrase).map(bare);
  const words = transcript.words;
  let found = -1;
  for (let index = 0; index <= words.length - wanted.length; index += 1) {
    const matches = wanted.every(
      (token, offset) => bare(words[index + offset]?.punctuatedWord || words[index + offset]?.word || "") === token,
    );
    if (matches) {
      found = index;
      break;
    }
  }
  if (found < 0) throw new Error(`Spoken words not found in the existing transcript: ${phrase.slice(0, 48)}`);
  const slice = words.slice(found, found + wanted.length);
  const origin = slice[0]!.start;
  return slice.map((word) => ({
    text: (word.punctuatedWord || word.word).trim(),
    start: Number((word.start - origin).toFixed(3)),
    end: Number((word.end - origin).toFixed(3)),
  }));
}

function probe(file: string): { width: number; height: number; duration: number; video: string; audio: string } {
  const raw = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height", "-of", "json", file],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(raw) as {
    format?: { duration?: string };
    streams?: Array<{ codec_name?: string; width?: number; height?: number }>;
  };
  const video = parsed.streams?.find((stream) => stream.width);
  const audio = parsed.streams?.find((stream) => stream.codec_name && !stream.width);
  return {
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    duration: Number(parsed.format?.duration ?? 0),
    video: video?.codec_name ?? "",
    audio: audio?.codec_name ?? "",
  };
}

const protectedFiles = [
  ...shorts.map((short) => path.join(sourceRoot, "customer-package/shorts", `${short.name}.mp4`)),
  ...shorts.map((short) => path.join(priorRoot, "shorts", `${short.name}.mp4`)),
];
const protectedBefore = new Map(protectedFiles.map((file) => [file, sha(file)]));

mkdirSync(path.join(outRoot, "shorts"), { recursive: true });
mkdirSync(path.join(outRoot, "copy"), { recursive: true });
for (const name of ["captions.txt", "titles-hooks.txt", "hashtags-keywords.txt", "posting-companion.md"]) {
  copyFileSync(path.join(sourceRoot, "customer-package/copy", name), path.join(outRoot, "copy", name));
}

const report: Array<Record<string, unknown>> = [];

for (const short of shorts) {
  const burn = path.join(sourceRoot, "clips", short.clipId, "burn-work");
  const work = path.join(outRoot, "work", short.name);
  mkdirSync(work, { recursive: true });
  const originalLines = parseAss(path.join(burn, "speech.ass"));
  const spokenText = originalLines.map((caption) => caption.text).join(" ");
  const beforeFindings = clipSpeechCaptionFindings(originalLines.map((caption) => caption.text));
  const timed = alignSpokenWords(spokenText);
  const lastWordEnd = timed[timed.length - 1]?.end ?? 0;
  const finished = finishClipTimedSpeech({
    words: timed,
    expectedSpokenText: spokenText,
    cta: {
      start: lastWordEnd,
      end: lastWordEnd + 2.5,
      text: CTA,
      role: "cta",
    },
  });
  if (!finished.ok) throw new Error(`${short.name} rejected: ${finished.findings.join("; ")}`);
  const speech = finished.captions.filter((caption) => caption.role !== "cta");
  for (const [index, caption] of speech.entries()) {
    const painted = await paintExactTextLine({
      text: caption.text,
      outputAbsolutePath: path.join(work, `cap-${index}.png`),
      width: 1080,
      height: CLIP_CAPTION_PRESENTATION.bandHeight,
      fontSize: CLIP_CAPTION_PRESENTATION.fontSize,
      fill: "#ffffff",
      stroke: CLIP_CAPTION_PRESENTATION.stroke,
      background: CLIP_CAPTION_PRESENTATION.background,
      radius: 0,
    });
    if (!painted.ok) throw new Error(`${short.name} caption paint: ${painted.message}`);
    if (painted.words.join(" ") !== exactWords(caption.text).join(" ")) {
      throw new Error(`${short.name} painted words drifted`);
    }
  }
  copyFileSync(path.join(burn, "cut.mp4"), path.join(work, "cut.mp4"));
  const overlay = speech.flatMap((_, index) => ["-i", `cap-${index}.png`]);
  let filter = "";
  speech.forEach((caption, index) => {
    const next = index === speech.length - 1 ? "vout" : `v${index + 1}`;
    const prev = index === 0 ? "0:v" : `v${index}`;
    filter += `[${prev}][${index + 1}:v]overlay=0:H-h-${CLIP_CAPTION_PRESENTATION.bottomPx}:enable='between(t,${caption.start},${caption.end})'[${next}];`;
  });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      "cut.mp4",
      ...overlay,
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
    { cwd: work, stdio: "pipe" },
  );
  const card = await paintClipCustomerEndCard({
    text: CTA,
    outputAbsolutePath: path.join(work, "cta-card.png"),
    width: 1080,
    height: 1920,
  });
  if (!card.ok) throw new Error(card.message);
  if (card.words.join(" ") !== exactWords(CTA).join(" ")) throw new Error("end card words drifted");
  copyFileSync(path.join(burn, "end-card-audio.wav"), path.join(work, "end-card-audio.wav"));
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
      "3",
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
    { cwd: work, stdio: "pipe" },
  );
  const output = path.join(outRoot, "shorts", `${short.name}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      path.join(work, "burned.mp4"),
      "-i",
      path.join(work, "end-card.mp4"),
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
      output,
    ],
    { stdio: "pipe" },
  );
  const info = probe(output);
  if (info.width !== 1080 || info.height !== 1920 || info.video !== "h264" || info.audio !== "aac") {
    throw new Error(`${short.name} playback probe failed ${JSON.stringify(info)}`);
  }
  const original = path.join(sourceRoot, "customer-package/shorts", `${short.name}.mp4`);
  report.push({
    file: `docs/launch/studio-clip-repurposing-finish-candidate-2/shorts/${short.name}.mp4`,
    clipId: short.clipId,
    certifiedOriginalUntouched: sha(original),
    candidateSha256: sha(output),
    beforeFindings,
    afterLines: speech.map((caption) => ({
      text: caption.text,
      start: caption.start,
      end: caption.end,
    })),
    afterFindings: clipSpeechCaptionFindings(speech.map((caption) => caption.text)),
    spokenWordsPreserved:
      speech.map((caption) => caption.text).join(" ") === spokenText,
    probe: info,
    framing: "not cropped; source is already 1080x1920 and the hand reaches the frame edge",
    audio: "copied from the existing cut; loudnorm was not run again",
    captionPresentation: CLIP_CAPTION_PRESENTATION,
  });
  console.log(short.name, speech.map((caption) => `${caption.start}-${caption.end} ${caption.text}`).join(" | "));
}

for (const [file, before] of protectedBefore) {
  if (sha(file) !== before) throw new Error(`Protected file changed: ${file}`);
}

writeFileSync(
  path.join(outRoot, "manifest.json"),
  `${JSON.stringify({ cta: CTA, protectedFilesUnchanged: true, shorts: report }, null, 2)}\n`,
);
console.log("wrote", outRoot);
