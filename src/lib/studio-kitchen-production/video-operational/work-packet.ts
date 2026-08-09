import { existsSync, readFileSync } from "fs";
import path from "path";

import type { VideoWorkPacket } from "./types";

export const VIDEO_OPS_PACKAGE_ROOT =
  "docs/launch/kitchen-video-operational-1" as const;

export const VIDEO_OPS_WORK_PACKET_V1_REL =
  `${VIDEO_OPS_PACKAGE_ROOT}/work-packet/work-packet-v1.json` as const;

export const VIDEO_OPS_WORK_PACKET_V2_REL =
  `${VIDEO_OPS_PACKAGE_ROOT}/work-packet/work-packet-v2.json` as const;

export function loadVideoWorkPacket(
  repoRoot: string,
  relativePath: string,
): VideoWorkPacket {
  const abs = path.join(repoRoot, relativePath);
  if (!existsSync(abs)) {
    throw new Error(`Work packet missing at ${relativePath}`);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as VideoWorkPacket;
}

export function loadVideoWorkPacketV1(repoRoot: string): VideoWorkPacket {
  return loadVideoWorkPacket(repoRoot, VIDEO_OPS_WORK_PACKET_V1_REL);
}

export function loadVideoWorkPacketV2(repoRoot: string): VideoWorkPacket {
  return loadVideoWorkPacket(repoRoot, VIDEO_OPS_WORK_PACKET_V2_REL);
}

export type WorkPacketValidationFinding = {
  id: string;
  severity: "fail" | "warn";
  message: string;
};

export function validateVideoWorkPacket(packet: VideoWorkPacket): {
  ok: boolean;
  findings: WorkPacketValidationFinding[];
} {
  const findings: WorkPacketValidationFinding[] = [];

  if (packet.skuId !== "v2-rtu-short-video") {
    findings.push({
      id: "sku",
      severity: "fail",
      message: `Work packet SKU must be v2-rtu-short-video (got ${packet.skuId})`,
    });
  }

  if (packet.exportFormat !== "mp4") {
    findings.push({
      id: "format",
      severity: "fail",
      message: "Export format must be mp4",
    });
  }

  if (packet.aspectRatio !== "vertical" || packet.width !== 1080 || packet.height !== 1920) {
    findings.push({
      id: "aspect",
      severity: "fail",
      message: "Operational proof requires vertical 1080×1920",
    });
  }

  if (
    packet.durationMinSeconds < 15 ||
    packet.durationMaxSeconds > 30 ||
    packet.durationTargetSeconds < packet.durationMinSeconds ||
    packet.durationTargetSeconds > packet.durationMaxSeconds
  ) {
    findings.push({
      id: "duration_target",
      severity: "fail",
      message: "Duration target/band must stay within catalog 15–30s and packet band",
    });
  }

  if (packet.musicAllowed !== false) {
    findings.push({
      id: "music",
      severity: "fail",
      message: "Music must remain unused/unresolved for this operational proof",
    });
  }

  if (packet.stockAllowed !== false) {
    findings.push({
      id: "stock",
      severity: "fail",
      message: "Stock must remain unused/unresolved for this operational proof",
    });
  }

  if (packet.productionMethod !== "capcut") {
    findings.push({
      id: "method",
      severity: "fail",
      message: "productionMethod must be capcut",
    });
  }

  if (packet.productionRoleOwner !== "creative_production") {
    findings.push({
      id: "role",
      severity: "fail",
      message: "productionRoleOwner must be creative_production",
    });
  }

  if (!packet.scenes?.length) {
    findings.push({
      id: "scenes",
      severity: "fail",
      message: "Work packet requires storyboard scenes",
    });
  }

  for (const scene of packet.scenes ?? []) {
    if (scene.endSeconds <= scene.startSeconds) {
      findings.push({
        id: `scene_timing_${scene.sceneNumber}`,
        severity: "fail",
        message: `Scene ${scene.sceneNumber} has invalid timing`,
      });
    }
  }

  return { ok: findings.length === 0, findings };
}

export function assertWorkPacketAssetsExist(
  repoRoot: string,
  packet: VideoWorkPacket,
): { ok: boolean; missing: readonly string[] } {
  const missing: string[] = [];
  for (const scene of packet.scenes) {
    if (!existsSync(path.join(repoRoot, scene.relativePath))) {
      missing.push(scene.relativePath);
    }
  }
  if (packet.voiceArtifact) {
    if (!existsSync(path.join(repoRoot, packet.voiceArtifact.relativePath))) {
      missing.push(packet.voiceArtifact.relativePath);
    }
  }
  return { ok: missing.length === 0, missing };
}
