/**
 * Live-proof Deepgram isolation. Never prints the key.
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

function summarize(payload) {
  const alt = payload?.results?.channels?.[0]?.alternatives?.[0];
  return {
    httpOk: true,
    topKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
    resultKeys: payload?.results ? Object.keys(payload.results) : [],
    transcriptLength: alt?.transcript?.length ?? 0,
    transcriptPreview: String(alt?.transcript ?? "").slice(0, 80),
    wordCount: alt?.words?.length ?? 0,
    utteranceCount: payload?.results?.utterances?.length ?? 0,
    duration: payload?.metadata?.duration,
    requestId: payload?.metadata?.request_id,
    models: payload?.metadata?.models,
    error: payload?.err_msg ?? payload?.err_code ?? payload?.error,
  };
}

function volumeOf(file) {
  const result = execFileSync(
    "ffmpeg",
    ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const text = `${result}`;
  return {
    mean: (text.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1] ?? null,
    max: (text.match(/max_volume:\s*(-?[\d.]+)/) || [])[1] ?? null,
  };
}

const repo = process.cwd();
applyDotenvLocal(repo);
const key = process.env.DEEPGRAM_API_KEY?.trim() ?? "";
const src = path.join(
  repo,
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/source-talking-head.mp4",
);
const wav = path.join(tmpdir(), "sfve-deepgram-diag.wav");

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    src,
    "-vn",
    "-map",
    "0:a:0",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    wav,
  ],
  { stdio: "pipe" },
);

const wavBytes = readFileSync(wav);
const report = {
  keyPresent: Boolean(key),
  keyLength: key.length,
  wavBytes: wavBytes.length,
  wavVolume: volumeOf(wav),
  sourceVolume: volumeOf(src),
  cases: {},
};

async function postFile(name, url, contentType, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": contentType,
      Accept: "application/json",
    },
    body,
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { error: "non-json", snippet: text.slice(0, 200) };
  }
  report.cases[name] = {
    status: response.status,
    ...(response.ok ? summarize(payload) : { snippet: text.slice(0, 240) }),
  };
}

const query = new URLSearchParams({
  model: "nova-3",
  language: "en",
  smart_format: "true",
  punctuate: "true",
  utterances: "true",
  mip_opt_out: "true",
}).toString();

await postFile(
  "wav-uint8",
  `https://api.deepgram.com/v1/listen?${query}`,
  "audio/wav",
  new Uint8Array(wavBytes),
);

await postFile(
  "wav-blob",
  `https://api.deepgram.com/v1/listen?${query}`,
  "audio/wav",
  new Blob([wavBytes], { type: "audio/wav" }),
);

const mp4 = readFileSync(src);
await postFile(
  "mp4-blob",
  `https://api.deepgram.com/v1/listen?${query}`,
  "video/mp4",
  new Blob([mp4], { type: "video/mp4" }),
);

const detectQuery = new URLSearchParams({
  model: "nova-3",
  detect_language: "true",
  smart_format: "true",
  punctuate: "true",
  utterances: "true",
  mip_opt_out: "true",
}).toString();

await postFile(
  "wav-detect-lang",
  `https://api.deepgram.com/v1/listen?${detectQuery}`,
  "audio/wav",
  new Blob([wavBytes], { type: "audio/wav" }),
);

const control = await fetch(
  `https://api.deepgram.com/v1/listen?${query}`,
  {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url: "https://dpgr.am/spacewalk.wav" }),
  },
);
const controlText = await control.text();
let controlPayload;
try {
  controlPayload = JSON.parse(controlText);
} catch {
  controlPayload = { error: "non-json", snippet: controlText.slice(0, 200) };
}
report.cases.spacewalkUrl = {
  status: control.status,
  ...(control.ok ? summarize(controlPayload) : { snippet: controlText.slice(0, 240) }),
};

const out = path.join(
  repo,
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/deepgram-diag.json",
);
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`wrote ${path.relative(repo, out)}`);
console.log(JSON.stringify(report, null, 2));
