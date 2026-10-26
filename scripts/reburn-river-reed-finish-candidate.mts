/**
 * Narrow reburn of the existing River & Reed cuts.
 * Does not overwrite the certified customer package.
 */
import { createHash } from "crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";

import { exactWords, paintExactTextLine } from "../src/lib/studio-short-form-video-editing/caption-burn";
import type { TimedCaption } from "../src/lib/studio-short-form-video-editing/types";
import {
  clipSpeechCaptionFindings,
  finishClipEditCaptions,
  paintClipCustomerEndCard,
} from "../src/lib/studio-clip-repurposing/caption-finish";

const repo = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(
  repo,
  "data/campaign-design-artifacts/camp-clip-full-cust-cert-20261002/clip-factory",
);
const outRoot = path.join(repo, "docs/launch/studio-clip-repurposing-finish-candidate-1");
const CTA = "Book a River & Reed table tonight";

const shorts = [
  { name: "Clip-Repurposing-Short-01", clipId: "c-56-423" },
  { name: "Clip-Repurposing-Short-02", clipId: "c-17-127" },
  { name: "Clip-Repurposing-Short-03", clipId: "c-82-641" },
];

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
  captions.push({
    start: captions[captions.length - 1]?.end ?? 0,
    end: (captions[captions.length - 1]?.end ?? 0) + 3,
    text: CTA,
    role: "cta",
  });
  return captions;
}

function assTime(value: string): number {
  const [h, m, s] = value.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function sha(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
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

mkdirSync(path.join(outRoot, "shorts"), { recursive: true });
mkdirSync(path.join(outRoot, "copy"), { recursive: true });
copyFileSync(
  path.join(sourceRoot, "customer-package/copy/captions.txt"),
  path.join(outRoot, "copy/captions.txt"),
);
copyFileSync(
  path.join(sourceRoot, "customer-package/copy/titles-hooks.txt"),
  path.join(outRoot, "copy/titles-hooks.txt"),
);
copyFileSync(
  path.join(sourceRoot, "customer-package/copy/hashtags-keywords.txt"),
  path.join(outRoot, "copy/hashtags-keywords.txt"),
);
copyFileSync(
  path.join(sourceRoot, "customer-package/copy/posting-companion.md"),
  path.join(outRoot, "copy/posting-companion.md"),
);

const report: Array<Record<string, unknown>> = [];

for (const short of shorts) {
  const burn = path.join(sourceRoot, "clips", short.clipId, "burn-work");
  const work = path.join(outRoot, "work", short.name);
  mkdirSync(work, { recursive: true });
  const originalLines = parseAss(path.join(burn, "speech.ass")).filter((caption) => caption.role !== "cta");
  const beforeFindings = clipSpeechCaptionFindings(originalLines.map((caption) => caption.text));
  const finished = finishClipEditCaptions({ captions: parseAss(path.join(burn, "speech.ass")) });
  if (!finished.ok) {
    throw new Error(`${short.name} rejected: ${finished.findings.join("; ")}`);
  }
  const speech = finished.edl.captions.filter((caption) => caption.role !== "cta");
  for (const [index, caption] of speech.entries()) {
    const painted = await paintExactTextLine({
      text: caption.text,
      outputAbsolutePath: path.join(work, `cap-${index}.png`),
      width: 1080,
      height: 160,
      fontSize: 44,
      fill: "#ffffff",
      background: "#111111",
      radius: 10,
    });
    if (!painted.ok) throw new Error(`${short.name} caption paint: ${painted.message}`);
    if (painted.words.join(" ") !== exactWords(caption.text).join(" ")) {
      throw new Error(`${short.name} painted words drifted`);
    }
  }
  const cutCopy = path.join(work, "cut.mp4");
  copyFileSync(path.join(burn, "cut.mp4"), cutCopy);
  const overlay = speech.flatMap((_, index) => ["-i", `cap-${index}.png`]);
  let filter = "";
  speech.forEach((caption, index) => {
    const next = index === speech.length - 1 ? "vout" : `v${index + 1}`;
    const prev = index === 0 ? "0:v" : `v${index}`;
    filter += `[${prev}][${index + 1}:v]overlay=0:H-h-72:enable='between(t,${caption.start},${caption.end})'[${next}];`;
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
    file: `docs/launch/studio-clip-repurposing-finish-candidate-1/shorts/${short.name}.mp4`,
    clipId: short.clipId,
    certifiedOriginalUntouched: sha(original),
    candidateSha256: sha(output),
    beforeFindings,
    afterLines: speech.map((caption) => caption.text),
    afterFindings: clipSpeechCaptionFindings(speech.map((caption) => caption.text)),
    spokenWordsPreserved: speech.map((caption) => caption.text).join(" ") ===
      originalLines.map((caption) => caption.text).join(" "),
    probe: info,
    framing: "not cropped; source is already 1080x1920 and the hand reaches the frame edge",
  });
  console.log(short.name, speech.map((caption) => caption.text).join(" | "));
}

writeFileSync(path.join(outRoot, "manifest.json"), `${JSON.stringify({ cta: CTA, shorts: report }, null, 2)}\n`);
console.log("wrote", outRoot);
