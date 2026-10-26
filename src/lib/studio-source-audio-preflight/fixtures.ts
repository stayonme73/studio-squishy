import { spawnSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

function runFfmpeg(args: string[]): void {
  const run = spawnSync("ffmpeg", ["-y", ...args], { encoding: "utf8" });
  if (run.status !== 0) {
    throw new Error(run.stderr?.slice(-400) || "ffmpeg fixture failed");
  }
}

function writeVideoWithAudio(abs: string, audioFilter: string, seconds = 2): void {
  mkdirSync(path.dirname(abs), { recursive: true });
  runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=1080x1920:d=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    audioFilter,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    abs,
  ]);
  if (!existsSync(abs)) {
    throw new Error(`Fixture missing: ${abs}`);
  }
}

export function writeCleanTalkingHeadFixture(absolutePath: string): string {
  writeVideoWithAudio(
    absolutePath,
    "sine=frequency=220:sample_rate=48000:duration=2,volume=-16dB,lowpass=f=2500",
  );
  return absolutePath;
}

export function writeNoisyTalkingHeadFixture(absolutePath: string): string {
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=1080x1920:d=2",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:sample_rate=48000:duration=2,volume=-16dB",
    "-f",
    "lavfi",
    "-i",
    "anoisesrc=color=white:amplitude=0.008:sample_rate=48000:duration=2",
    "-filter_complex",
    "[1:a][2:a]amix=inputs=2:duration=shortest:normalize=0[a]",
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    absolutePath,
  ]);
  return absolutePath;
}

export function writeSilentTalkingHeadFixture(absolutePath: string): string {
  writeVideoWithAudio(absolutePath, "anullsrc=r=48000:cl=stereo", 1);
  return absolutePath;
}

export function writeClippedTalkingHeadFixture(absolutePath: string): string {
  writeVideoWithAudio(
    absolutePath,
    "sine=frequency=220:sample_rate=48000:duration=1,volume=24dB",
    1,
  );
  return absolutePath;
}

function writePcmTalkingHead(absolutePath: string, samples: Float32Array): string {
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const wavAbs = `${absolutePath}.pcm.wav`;
  const rate = 48000;
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]!));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(wavAbs, Buffer.concat([header, data]));
  runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=1080x1920:d=${(samples.length / rate).toFixed(3)}`,
    "-i",
    wavAbs,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    absolutePath,
  ]);
  return absolutePath;
}

function sineAt(seconds: number, db: number, rate = 48000): Float32Array {
  const n = Math.round(seconds * rate);
  const amp = Math.pow(10, db / 20);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = Math.sin((2 * Math.PI * 220 * i) / rate) * amp;
  }
  return out;
}

/** Two 1-sample 0 dBFS needles in otherwise clean speech-level audio. */
export function writeIsolatedNeedleTalkingHeadFixture(absolutePath: string): string {
  const samples = sineAt(3, -16);
  samples[48000] = 1;
  samples[96000] = -1;
  return writePcmTalkingHead(absolutePath, samples);
}

/** Many short clipped bursts — repeated clusters, not one needle. */
export function writeRepeatedClippingTalkingHeadFixture(absolutePath: string): string {
  const samples = sineAt(2, -16);
  const rate = 48000;
  for (let burst = 0; burst < 8; burst += 1) {
    const start = Math.round((0.15 + burst * 0.22) * rate);
    for (let i = 0; i < 12; i += 1) {
      samples[start + i] = i % 2 === 0 ? 1 : -1;
    }
  }
  return writePcmTalkingHead(absolutePath, samples);
}

/** Sustained flattened ceiling — genuinely damaged speech. */
export function writeFlattenedTalkingHeadFixture(absolutePath: string): string {
  const samples = sineAt(1.2, 6);
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.max(-1, Math.min(1, samples[i]!));
  }
  return writePcmTalkingHead(absolutePath, samples);
}

export function writeSpeechDamagingCleanupFixture(
  sourceAbsolutePath: string,
  destAbsolutePath: string,
): string {
  mkdirSync(path.dirname(destAbsolutePath), { recursive: true });
  runFfmpeg([
    "-i",
    sourceAbsolutePath,
    "-af",
    "highpass=f=3500,volume=-8dB",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    destAbsolutePath,
  ]);
  return destAbsolutePath;
}

export function fixturePath(repoRoot: string, name: string): string {
  return path.join(repoRoot, "tmp", "source-audio-preflight", name);
}
