/**
 * Print edited-file speech words only. Never prints the key.
 */
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

function applyDotenvLocal(repoRoot) {
  const abs = path.join(repoRoot, ".env.local");
  if (!existsSync(abs)) return;
  for (const line of readFileSync(abs, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

const repo = process.cwd();
applyDotenvLocal(repo);
const key = process.env.DEEPGRAM_API_KEY?.trim() ?? "";
const src = path.join(
  repo,
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/edited-talking-head.mp4",
);
const wav = path.join(tmpdir(), "sfve-edited-diag.wav");
execFileSync(
  "ffmpeg",
  ["-y", "-i", src, "-vn", "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav],
  { stdio: "pipe" },
);
const bytes = readFileSync(wav);
const query = new URLSearchParams({
  model: "nova-3",
  language: "en",
  smart_format: "true",
  punctuate: "true",
  utterances: "true",
  mip_opt_out: "true",
}).toString();
const response = await fetch(`https://api.deepgram.com/v1/listen?${query}`, {
  method: "POST",
  headers: {
    Authorization: `Token ${key}`,
    "Content-Type": "audio/wav",
    Accept: "application/json",
  },
  body: new Blob([bytes], { type: "audio/wav" }),
});
const payload = await response.json();
const alt = payload?.results?.channels?.[0]?.alternatives?.[0];
const words = (alt?.words ?? []).map((w) => w.punctuated_word ?? w.word);
const report = {
  status: response.status,
  duration: payload?.metadata?.duration,
  wordCount: words.length,
  transcript: alt?.transcript ?? "",
  firstTwentyWords: words.slice(0, 20),
  joinedPreview: words.slice(0, 12).join(" "),
};
const out = path.join(
  repo,
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/edited-speech.json",
);
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
