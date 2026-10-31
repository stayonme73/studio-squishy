import { execFileSync } from "child_process";
import { existsSync, unlinkSync } from "fs";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import {
  resolveFfmpegExecutable,
  resolveFfprobeExecutable,
  spawnFfmpeg,
} from "@/lib/studio-media-runtime/ffmpeg-cli";

const TARGET = studioShortFormVideoEditingBuildV1.audioFinish;

export type AudioFinishResult =
  | {
      ok: true;
      outputAbsolutePath: string;
      method: typeof TARGET.method;
      handoff: typeof TARGET.handoff;
      targetIntegratedLufs: number;
      truePeakDbfs: number;
      measuredIntegratedLufs: number | null;
      measuredTruePeakDbfs: number | null;
      inspect: AudioHandoffInspect;
    }
  | { ok: false; message: string };

export type AudioHandoffInspect = {
  ok: boolean;
  findings: string[];
  hasAudio: boolean;
  codec: string | null;
  sampleRateHz: number | null;
  channels: number | null;
  durationSeconds: number | null;
  videoCodec: string | null;
  pixelFormat: string | null;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  audible: boolean;
};

function parseLoudnormJson(stderr: string): {
  input_i?: string;
  input_tp?: string;
  input_lra?: string;
  input_thresh?: string;
  target_offset?: string;
} | null {
  const start = stderr.lastIndexOf("{");
  const end = stderr.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(stderr.slice(start, end + 1)) as {
      input_i?: string;
      input_tp?: string;
      input_lra?: string;
      input_thresh?: string;
      target_offset?: string;
    };
  } catch {
    return null;
  }
}

function parseProbeStreams(absolutePath: string): {
  audio: {
    codec: string | null;
    sampleRateHz: number | null;
    channels: number | null;
  };
  video: { codec: string | null; pixelFormat: string | null };
  durationSeconds: number | null;
} {
  const raw = execFileSync(
    resolveFfprobeExecutable(),
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name,sample_rate,channels,pix_fmt",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      absolutePath,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(raw) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      sample_rate?: string;
      channels?: number;
      pix_fmt?: string;
    }>;
    format?: { duration?: string };
  };
  const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  return {
    audio: {
      codec: audio?.codec_name ?? null,
      sampleRateHz: audio?.sample_rate ? Number(audio.sample_rate) : null,
      channels: audio?.channels ?? null,
    },
    video: {
      codec: video?.codec_name ?? null,
      pixelFormat: video?.pix_fmt ?? null,
    },
    durationSeconds: parsed.format?.duration ? Number(parsed.format.duration) : null,
  };
}

function measureVolume(absolutePath: string): {
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
} {
  const volume = spawnFfmpeg(
    ["-i", absolutePath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${volume.stdout ?? ""}\n${volume.stderr ?? ""}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

export function inspectAudioHandoffFile(absolutePath: string): AudioHandoffInspect {
  const findings: string[] = [];
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      findings: ["handoff_file_missing"],
      hasAudio: false,
      codec: null,
      sampleRateHz: null,
      channels: null,
      durationSeconds: null,
      videoCodec: null,
      pixelFormat: null,
      meanVolumeDb: null,
      maxVolumeDb: null,
      audible: false,
    };
  }

  let streams: ReturnType<typeof parseProbeStreams>;
  try {
    streams = parseProbeStreams(absolutePath);
  } catch (error) {
    return {
      ok: false,
      findings: [
        `probe_failed:${error instanceof Error ? error.message : String(error)}`,
      ],
      hasAudio: false,
      codec: null,
      sampleRateHz: null,
      channels: null,
      durationSeconds: null,
      videoCodec: null,
      pixelFormat: null,
      meanVolumeDb: null,
      maxVolumeDb: null,
      audible: false,
    };
  }

  const volume = measureVolume(absolutePath);
  const hasAudio = Boolean(streams.audio.codec);
  const audible =
    volume.meanVolumeDb != null &&
    volume.meanVolumeDb > -45 &&
    volume.maxVolumeDb != null &&
    volume.maxVolumeDb > -20;

  if (!hasAudio) findings.push("no_audio_stream");
  if (streams.audio.codec && streams.audio.codec !== "aac") {
    findings.push(`audio_codec_${streams.audio.codec}`);
  }
  if (streams.audio.sampleRateHz !== TARGET.sampleRateHz) {
    findings.push(`sample_rate_${streams.audio.sampleRateHz ?? "missing"}`);
  }
  if (streams.audio.channels !== TARGET.channels) {
    findings.push(`channels_${streams.audio.channels ?? "missing"}`);
  }
  if (!streams.durationSeconds || streams.durationSeconds < 1) {
    findings.push("duration_missing_or_short");
  }
  if (streams.video.codec && streams.video.codec !== "h264") {
    findings.push(`video_codec_${streams.video.codec}`);
  }
  if (streams.video.pixelFormat && streams.video.pixelFormat !== "yuv420p") {
    findings.push(`pix_fmt_${streams.video.pixelFormat}`);
  }
  if (!audible) findings.push("audio_not_audible");
  if (volume.maxVolumeDb != null && volume.maxVolumeDb > 0) {
    findings.push("clipping");
  }

  return {
    ok: findings.length === 0,
    findings,
    hasAudio,
    codec: streams.audio.codec,
    sampleRateHz: streams.audio.sampleRateHz,
    channels: streams.audio.channels,
    durationSeconds: streams.durationSeconds,
    videoCodec: streams.video.codec,
    pixelFormat: streams.video.pixelFormat,
    meanVolumeDb: volume.meanVolumeDb,
    maxVolumeDb: volume.maxVolumeDb,
    audible,
  };
}

export function finishFootageAudio(input: {
  sourceAbsolutePath: string;
  outputAbsolutePath: string;
}): AudioFinishResult {
  if (!existsSync(input.sourceAbsolutePath)) {
    return { ok: false, message: "Audio-finish source missing." };
  }

  const measuredRun = spawnFfmpeg(
    [
      "-y",
      "-i",
      input.sourceAbsolutePath,
      "-af",
      `loudnorm=I=${TARGET.targetIntegratedLufs}:TP=${TARGET.truePeakDbfs}:LRA=${TARGET.loudnessRangeLu}:print_format=json`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const measured = parseLoudnormJson(
    `${measuredRun.stderr ?? ""}\n${measuredRun.stdout ?? ""}`,
  );
  if (!measured && measuredRun.status !== 0) {
    return {
      ok: false,
      message: `loudnorm measure failed: ${measuredRun.stderr || "no measurement"}`,
    };
  }

  const filter = measured?.input_i
    ? `loudnorm=I=${TARGET.targetIntegratedLufs}:TP=${TARGET.truePeakDbfs}:LRA=${TARGET.loudnessRangeLu}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`
    : `loudnorm=I=${TARGET.targetIntegratedLufs}:TP=${TARGET.truePeakDbfs}:LRA=${TARGET.loudnessRangeLu}`;

  const wavPath = `${input.outputAbsolutePath}.loudnorm.wav`;
  try {
    execFileSync(
      resolveFfmpegExecutable(),
      [
        "-y",
        "-i",
        input.sourceAbsolutePath,
        "-vn",
        "-af",
        filter,
        "-ar",
        String(TARGET.sampleRateHz),
        "-ac",
        String(TARGET.channels),
        wavPath,
      ],
      { stdio: "pipe" },
    );
    execFileSync(
      resolveFfmpegExecutable(),
      [
        "-y",
        "-i",
        input.sourceAbsolutePath,
        "-i",
        wavPath,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        String(TARGET.sampleRateHz),
        "-ac",
        String(TARGET.channels),
        "-b:a",
        TARGET.audioBitrate,
        "-movflags",
        "+faststart",
        "-shortest",
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `loudnorm remux failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  } finally {
    if (existsSync(wavPath)) {
      try {
        unlinkSync(wavPath);
      } catch {
        /* leave the wav if Windows still has it open */
      }
    }
  }

  if (!existsSync(input.outputAbsolutePath)) {
    return { ok: false, message: "Audio-finished MP4 missing." };
  }

  const inspect = inspectAudioHandoffFile(input.outputAbsolutePath);
  if (!inspect.ok) {
    return {
      ok: false,
      message: `Audio handoff remux failed local inspect: ${inspect.findings.join("; ")}`,
    };
  }

  return {
    ok: true,
    outputAbsolutePath: input.outputAbsolutePath,
    method: TARGET.method,
    handoff: TARGET.handoff,
    targetIntegratedLufs: TARGET.targetIntegratedLufs,
    truePeakDbfs: TARGET.truePeakDbfs,
    measuredIntegratedLufs: measured?.input_i ? Number(measured.input_i) : null,
    measuredTruePeakDbfs: measured?.input_tp ? Number(measured.input_tp) : null,
    inspect,
  };
}
