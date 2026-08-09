/**
 * Persist + bind Shotstack MP4. QA READY only — never QA PASS / CUSTOMER READY / CERTIFIED.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { probeMp4WithFfprobe } from "../video-operational/bind-export";

import type {
  ShotstackOutputArtifactRecord,
  ShotstackRenderJobRecord,
  ShotstackWorkPacket,
} from "./types";

export function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function persistShotstackMp4(input: {
  repoRoot: string;
  relativePath: string;
  bytes: Buffer;
}): { ok: true; absolutePath: string; sha256: string; byteLength: number } | { ok: false; error: string } {
  if (input.bytes.length < 1000) {
    return { ok: false, error: "MP4 bytes too small to be a real render" };
  }
  // Reject obvious placeholder / .bin.mp4 patterns (tiny or non-media wrappers)
  if (input.relativePath.toLowerCase().includes("not-a-deliverable")) {
    return { ok: false, error: "Refusing to bind non-deliverable fixture path" };
  }

  const abs = path.join(input.repoRoot, input.relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, input.bytes);
  return {
    ok: true,
    absolutePath: abs,
    sha256: sha256Bytes(input.bytes),
    byteLength: input.bytes.length,
  };
}

export function bindShotstackArtifact(input: {
  repoRoot: string;
  packet: ShotstackWorkPacket;
  job: ShotstackRenderJobRecord;
  bytes: Buffer;
}):
  | { ok: true; artifact: ShotstackOutputArtifactRecord; absolutePath: string }
  | { ok: false; error: string; findings: string[] } {
  const findings: string[] = [];
  if (input.job.status !== "done") {
    return {
      ok: false,
      error: "Cannot bind artifact unless render status is done",
      findings: ["render_not_done"],
    };
  }
  if (input.job.skuId !== "v2-rtu-short-video") {
    findings.push("sku_mismatch");
  }

  const persisted = persistShotstackMp4({
    repoRoot: input.repoRoot,
    relativePath: input.packet.exportRelativePath,
    bytes: input.bytes,
  });
  if (!persisted.ok) {
    return { ok: false, error: persisted.error, findings: ["persist_failed"] };
  }

  const probe = probeMp4WithFfprobe(persisted.absolutePath);
  if ("error" in probe) {
    try {
      unlinkSync(persisted.absolutePath);
    } catch {
      /* ignore */
    }
    return { ok: false, error: probe.error, findings: ["probe_failed"] };
  }
  if (!probe.hasVideo) findings.push("missing_video_stream");
  if (!probe.hasAudio) findings.push("missing_audio_stream");
  if (probe.width !== input.packet.width || probe.height !== input.packet.height) {
    findings.push(
      `dimension_mismatch_${probe.width}x${probe.height}_expected_${input.packet.width}x${input.packet.height}`,
    );
  }
  if (
    probe.durationSeconds < input.packet.durationMinSeconds - 0.75 ||
    probe.durationSeconds > input.packet.durationMaxSeconds + 0.75
  ) {
    findings.push(
      `duration_out_of_band_${probe.durationSeconds.toFixed(2)}s`,
    );
  }
  if (findings.length) {
    try {
      unlinkSync(persisted.absolutePath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      error: "Bound MP4 failed validation",
      findings,
    };
  }

  const artifact: ShotstackOutputArtifactRecord = {
    artifactId: `shotstack-${input.job.providerRenderId}`,
    jobId: input.job.jobId,
    provider: "shotstack",
    providerRenderId: input.job.providerRenderId,
    relativePath: input.packet.exportRelativePath,
    sha256: persisted.sha256,
    byteLength: persisted.byteLength,
    mimeType: "video/mp4",
    width: probe.width,
    height: probe.height,
    durationSeconds: probe.durationSeconds,
    frameRate: probe.frameRate,
    codec: probe.codec,
    container: "mp4",
    boundAt: new Date().toISOString(),
    campaignId: input.packet.campaignId,
    skuId: input.packet.skuId,
    workPacketId: input.packet.workPacketId,
    workPacketVersion: input.packet.workPacketVersion,
    storyboardVersion: input.packet.storyboardVersion,
    scriptVersionId: input.packet.scriptVersionId,
    voiceArtifactSha256: input.packet.voiceArtifact.contentSha256,
    qaState: "qa_ready",
    label: input.packet.label,
    customerReady: false,
    certified: false,
    qaPass: false,
  };

  return { ok: true, artifact, absolutePath: persisted.absolutePath };
}

export function writeArtifactBindingManifest(
  repoRoot: string,
  artifact: ShotstackOutputArtifactRecord,
): string {
  const rel = artifact.relativePath.replace(/\.mp4$/i, ".binding.json");
  const abs = path.join(repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return rel;
}

export function writeRenderJobManifest(
  repoRoot: string,
  job: ShotstackRenderJobRecord,
): string {
  const folder =
    job.workPacketVersion === "wp-v2"
      ? "docs/launch/kitchen-video-integration-1/artifacts/v2"
      : "docs/launch/kitchen-video-integration-1/artifacts/v1";
  const jobRel = `${folder}/render-job-${job.providerRenderId}.json`;
  const abs = path.join(repoRoot, jobRel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  return jobRel;
}

export function assertV1Preserved(
  repoRoot: string,
  packet: ShotstackWorkPacket,
): { ok: boolean; message: string } {
  if (!packet.preserveV1RelativePath) {
    return { ok: true, message: "no_v1_preserve_required" };
  }
  if (!existsSync(path.join(repoRoot, packet.preserveV1RelativePath))) {
    return {
      ok: false,
      message: `V1 artifact missing at ${packet.preserveV1RelativePath}`,
    };
  }
  return { ok: true, message: "v1_preserved" };
}
