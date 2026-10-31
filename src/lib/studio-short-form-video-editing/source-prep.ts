import { execFileSync } from "child_process";

import {
  resolveFfmpegExecutable,
  resolveFfprobeExecutable,
} from "@/lib/studio-media-runtime/ffmpeg-cli";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

export const LIVE_PROOF_SOURCE_REL =
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/source-talking-head.mp4" as const;

export const LIVE_PROOF_SOURCE_META = {
  title: "Daniel speaking English",
  author: "Wikitongues, Inc",
  license: "CC BY-SA 4.0",
  language: "en" as const,
  nativeVertical: true as const,
  sourcePage: "https://commons.wikimedia.org/wiki/File:Daniel_speaking_English.webm",
  downloadUrl:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Daniel_speaking_English.webm",
  testUse:
    "Studio live-proof only. Not a customer deliverable. Attribution required. First 90 seconds of the phone recording — the full file exceeds the 3:00 source cap.",
  customerCta: "Read the project notes",
  rightsClearedForTest: true,
  keepFirstSeconds: 165,
  leadingSilenceSeconds: 2,
  editorialProofVersion: 2,
} as const;

function probeRawVideo(
  absolutePath: string,
): { width: number; height: number; duration: number } | { error: string } {
  try {
    const json = execFileSync(
      resolveFfprobeExecutable(),
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        absolutePath,
      ],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(json) as {
      streams?: Array<{ width?: number; height?: number }>;
      format?: { duration?: string };
    };
    const width = Number(parsed.streams?.[0]?.width);
    const height = Number(parsed.streams?.[0]?.height);
    const duration = Number(parsed.format?.duration);
    if (!width || !height || !Number.isFinite(duration)) {
      return { error: "Could not probe raw source dimensions." };
    }
    return { width, height, duration };
  } catch (error) {
    return {
      error: `ffprobe failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function ensureLiveProofSource(input: {
  repoRoot: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; absolutePath: string; relativePath: string; prepared: boolean }
  | { ok: false; message: string }
> {
  const relativePath = LIVE_PROOF_SOURCE_REL;
  const absolutePath = path.join(input.repoRoot, relativePath);
  const identityPath = path.join(
    path.dirname(absolutePath),
    "source-identity.json",
  );
  const identity = {
    title: LIVE_PROOF_SOURCE_META.title,
    language: LIVE_PROOF_SOURCE_META.language,
    page: LIVE_PROOF_SOURCE_META.sourcePage,
    nativeVertical: true,
    editorialProofVersion: LIVE_PROOF_SOURCE_META.editorialProofVersion,
  };
  if (existsSync(absolutePath) && existsSync(identityPath)) {
    try {
      const current = JSON.parse(readFileSync(identityPath, "utf8")) as {
        page?: string;
        language?: string;
        nativeVertical?: boolean;
        editorialProofVersion?: number;
      };
      if (
        current.page === identity.page &&
        current.language === identity.language &&
        current.nativeVertical === true &&
        current.editorialProofVersion === identity.editorialProofVersion
      ) {
        return { ok: true, absolutePath, relativePath, prepared: false };
      }
    } catch {
      /* replace stale source */
    }
  }
  if (existsSync(absolutePath)) {
    try {
      unlinkSync(absolutePath);
    } catch {
      /* replace below */
    }
  }

  const workDir = path.dirname(absolutePath);
  mkdirSync(workDir, { recursive: true });
  const rawWebm = path.join(workDir, "source-raw.webm");
  if (!existsSync(rawWebm)) {
    const fetchImpl = input.fetchImpl ?? fetch;
    const response = await fetchImpl(LIVE_PROOF_SOURCE_META.downloadUrl, {
      headers: {
        "User-Agent": "StudioLiveProof/1.0 (owner-authorized test source)",
        Accept: "*/*",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      return {
        ok: false,
        message: `Source download failed HTTP ${response.status}`,
      };
    }
    writeFileSync(rawWebm, Buffer.from(await response.arrayBuffer()));
  }

  const probe = probeRawVideo(rawWebm);
  if ("error" in probe) {
    return { ok: false, message: probe.error };
  }
  if (probe.height <= probe.width) {
    return {
      ok: false,
      message:
        "Source is not native-vertical. Do not center-crop landscape for first cert. Do not claim face-follow.",
    };
  }

  const silence = LIVE_PROOF_SOURCE_META.leadingSilenceSeconds;
  const scale =
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1";
  try {
    execFileSync(
      resolveFfmpegExecutable(),
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=black:s=1080x1920:d=${silence}`,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=48000:cl=stereo:d=${silence}`,
        "-i",
        rawWebm,
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=1080x1920:d=2.5",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo:d=2.5",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=1080x1920:d=2",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo:d=2",
        "-filter_complex",
        [
          `[2:v]trim=start=0:end=45,setpts=PTS-STARTPTS,${scale}[v1]`,
          `[2:a]atrim=start=0:end=45,asetpts=PTS-STARTPTS[a1]`,
          `[2:v]trim=start=15:end=35,setpts=PTS-STARTPTS,${scale}[v2]`,
          `[2:a]atrim=start=15:end=35,asetpts=PTS-STARTPTS[a2]`,
          `[2:v]trim=start=80:end=165,setpts=PTS-STARTPTS,${scale}[v3]`,
          `[2:a]atrim=start=80:end=165,asetpts=PTS-STARTPTS[a3]`,
          "[0:v][1:a][v1][a1][3:v][4:a][v2][a2][5:v][6:a][v3][a3]concat=n=6:v=1:a=1[v][a]",
        ].join(";"),
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
        "-shortest",
        absolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `ffmpeg source prep failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (!existsSync(absolutePath)) {
    return { ok: false, message: "Prepared source MP4 missing after ffmpeg." };
  }
  writeFileSync(identityPath, `${JSON.stringify(identity, null, 2)}\n`);
  return { ok: true, absolutePath, relativePath, prepared: true };
}
