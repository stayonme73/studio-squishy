import { createHash } from "crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";

import type { VideoOperationalExportMeta, VideoWorkPacket } from "./types";

export function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export type FfprobeVideoSummary = {
  durationSeconds: number;
  width: number;
  height: number;
  frameRate?: number;
  codec?: string;
  hasVideo: boolean;
  hasAudio: boolean;
};

export function probeMp4WithFfprobe(absolutePath: string): FfprobeVideoSummary | { error: string } {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate",
        "-of",
        "json",
        absolutePath,
      ],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(out) as {
      format?: { duration?: string };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
      }>;
    };
    const video = parsed.streams?.find((s) => s.codec_type === "video");
    const audio = parsed.streams?.find((s) => s.codec_type === "audio");
    if (!video?.width || !video.height) {
      return { error: "No video stream / dimensions" };
    }
    let frameRate: number | undefined;
    if (video.r_frame_rate && video.r_frame_rate.includes("/")) {
      const [a, b] = video.r_frame_rate.split("/").map(Number);
      if (a && b) frameRate = a / b;
    }
    return {
      durationSeconds: Number(parsed.format?.duration ?? 0),
      width: video.width,
      height: video.height,
      frameRate,
      codec: video.codec_name,
      hasVideo: true,
      hasAudio: Boolean(audio),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Bind a CapCut-exported MP4 to the work packet. Fails on phantom/missing/non-video files.
 */
export function bindCapCutExport(input: {
  repoRoot: string;
  packet: VideoWorkPacket;
  qaState?: VideoOperationalExportMeta["qaState"];
}): VideoOperationalExportMeta | { error: string; findings: string[] } {
  const findings: string[] = [];
  const abs = path.join(input.repoRoot, input.packet.exportRelativePath);
  if (!existsSync(abs)) {
    return {
      error: `Export missing at ${input.packet.exportRelativePath}`,
      findings: ["phantom_or_missing_mp4"],
    };
  }
  const st = statSync(abs);
  if (st.size <= 0) {
    return { error: "Export is empty", findings: ["empty_mp4"] };
  }

  const probe = probeMp4WithFfprobe(abs);
  if ("error" in probe) {
    return { error: probe.error, findings: ["not_decodable_video"] };
  }
  if (!probe.hasVideo) findings.push("missing_video_stream");
  if (input.packet.voiceArtifact && !probe.hasAudio) {
    findings.push("missing_audio_stream_for_required_voice");
  }
  if (probe.width !== input.packet.width || probe.height !== input.packet.height) {
    findings.push(
      `dimensions ${probe.width}x${probe.height} != ${input.packet.width}x${input.packet.height}`,
    );
  }
  if (
    probe.durationSeconds < input.packet.durationMinSeconds ||
    probe.durationSeconds > input.packet.durationMaxSeconds
  ) {
    findings.push(
      `duration ${probe.durationSeconds}s outside ${input.packet.durationMinSeconds}-${input.packet.durationMaxSeconds}`,
    );
  }

  // Reject non-mp4 extension / obvious placeholders
  if (!input.packet.exportRelativePath.toLowerCase().endsWith(".mp4")) {
    findings.push("extension_not_mp4");
  }
  const head = readFileSync(abs).subarray(0, 12);
  // ISO BMFF typically has 'ftyp' at byte 4
  if (head.toString("ascii", 4, 8) !== "ftyp") {
    findings.push("not_isom_mp4_container");
  }

  if (findings.length) {
    return { error: findings.join("; "), findings };
  }

  const meta: VideoOperationalExportMeta = {
    relativePath: input.packet.exportRelativePath,
    contentSha256: sha256File(abs),
    byteLength: st.size,
    durationSeconds: probe.durationSeconds,
    width: probe.width,
    height: probe.height,
    frameRate: probe.frameRate,
    codec: probe.codec,
    workPacketVersion: input.packet.workPacketVersion,
    storyboardVersion: input.packet.storyboardVersion,
    scriptVersionId: input.packet.scriptVersionId,
    campaignId: input.packet.campaignId,
    skuId: input.packet.skuId,
    voiceArtifactSha256: input.packet.voiceArtifact?.contentSha256,
    productionMethod: "capcut",
    qaState: input.qaState ?? "qa_ready",
    label: input.packet.label,
  };
  return meta;
}

export function writeExportBindingManifest(
  repoRoot: string,
  meta: VideoOperationalExportMeta,
  manifestRelativePath: string,
): void {
  const abs = path.join(repoRoot, manifestRelativePath);
  writeFileSync(abs, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

export function gateQaReadyFromBoundExport(input: {
  meta: VideoOperationalExportMeta;
  packet: VideoWorkPacket;
  expectedCampaignId: string;
  expectedSkuId: string;
}): {
  ok: boolean;
  qaReady: boolean;
  qaPass: false;
  customerReady: false;
  findings: string[];
} {
  const findings: string[] = [];
  if (input.meta.campaignId !== input.expectedCampaignId) {
    findings.push("campaign_mismatch");
  }
  if (input.meta.skuId !== input.expectedSkuId) {
    findings.push("sku_mismatch");
  }
  if (input.meta.workPacketVersion !== input.packet.workPacketVersion) {
    findings.push("work_packet_version_mismatch");
  }
  if (input.meta.scriptVersionId !== input.packet.scriptVersionId) {
    findings.push("script_version_mismatch");
  }
  if (input.meta.productionMethod !== "capcut") {
    findings.push("production_method_not_capcut");
  }
  if (input.packet.voiceArtifact) {
    if (input.meta.voiceArtifactSha256 !== input.packet.voiceArtifact.contentSha256) {
      findings.push("voice_hash_mismatch");
    }
  }
  if (input.meta.qaState === "qa_pass_blocked_until_cert") {
    // still can be QA READY operationally; qa_pass remains false
  }
  const ok = findings.length === 0;
  return {
    ok,
    qaReady: ok && input.meta.qaState === "qa_ready",
    qaPass: false,
    customerReady: false,
    findings,
  };
}
