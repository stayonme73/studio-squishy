import { execFileSync, spawnSync } from "child_process";
import { mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";

const PIP = { left: 524, top: 1240, width: 520, height: 360 };
const UPPER = { left: 40, top: 140, width: 1000, height: 980 };
const FACE = { left: 270, top: 160, width: 540, height: 720 };

async function stats(
  file: string,
  region: { left: number; top: number; width: number; height: number },
) {
  const { data, info } = await sharp(file)
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bright = 0;
  let fruit = 0;
  let skin = 0;
  const count = data.length / info.channels;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (luma > 150) bright += 1;
    const greenLeaf = g > 90 && g > r + 15 && g > b && sat > 0.25;
    const redFruit = r > 140 && r > g + 40 && r > b + 30 && sat > 0.35 && g < 140;
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
  }
  return {
    bright: +(bright / count).toFixed(3),
    fruit: +(fruit / count).toFixed(3),
    skin: +(skin / count).toFixed(3),
  };
}

function measure(video: string, filter: string) {
  const result = spawnSync(
    "ffmpeg",
    ["-ss", "3", "-t", "3", "-i", video, "-af", filter, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${result.stdout}\n${result.stderr}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)/);
  return mean ? Number(mean[1]) : null;
}

async function inspect(label: string, video: string, at: number) {
  const dir = path.join(
    process.cwd(),
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/quality-eyes/_inspect",
  );
  mkdirSync(dir, { recursive: true });
  const frame = path.join(dir, `${label}-${at}.png`);
  execFileSync("ffmpeg", ["-y", "-ss", String(at), "-i", video, "-frames:v", "1", frame], {
    stdio: "pipe",
  });
  console.log(
    JSON.stringify(
      {
        label,
        at,
        pip: await stats(frame, PIP),
        upper: await stats(frame, UPPER),
        face: await stats(frame, FACE),
        mean: measure(video, "volumedetect"),
        dark: measure(video, "lowpass=f=280,volumedetect"),
        voice: measure(video, "highpass=f=400,lowpass=f=2500,volumedetect"),
        air: measure(video, "highpass=f=4000,volumedetect"),
        drone: measure(video, "bandpass=f=220:width_type=h:width=60,volumedetect"),
        mid: measure(video, "bandpass=f=800:width_type=h:width=400,volumedetect"),
      },
      null,
      2,
    ),
  );
}

async function main() {
  const root = path.join(
    process.cwd(),
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack",
  );
  await inspect("A-cherries", path.join(root, "review-loop/clip-02-cherries-loop-1.mp4"), 8);
  await inspect("B-dict", path.join(root, "quality-eyes/B-weak-dictionary.mp4"), 6);
  await inspect("C-heavy", path.join(root, "quality-eyes/C-heavy-unstable.mp4"), 3);
  await inspect("D-drone", path.join(root, "quality-eyes/D-wrong-tone-music.mp4"), 4);
  await inspect("clean-cherries", path.join(root, "quality-eyes/clean-talking-head-cherries.mp4"), 6);
  await inspect("clean-learned", path.join(root, "quality-eyes/clean-speech-learned.mp4"), 4);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
