import { existsSync, readFileSync } from "fs";
import path from "path";

import type { ShotstackWorkPacket } from "./types";
import { validateShotstackWorkPacket } from "./payload";

export const VIDEO_INTEGRATION_PACKAGE_ROOT =
  "docs/launch/kitchen-video-integration-1" as const;

export const VIDEO_INTEGRATION_WORK_PACKET_V1_REL =
  `${VIDEO_INTEGRATION_PACKAGE_ROOT}/work-packet/work-packet-v1.json` as const;

export const VIDEO_INTEGRATION_WORK_PACKET_V2_REL =
  `${VIDEO_INTEGRATION_PACKAGE_ROOT}/work-packet/work-packet-v2.json` as const;

export function loadShotstackWorkPacket(
  repoRoot: string,
  relativePath: string,
): ShotstackWorkPacket {
  const abs = path.join(repoRoot, relativePath);
  if (!existsSync(abs)) {
    throw new Error(`Shotstack work packet missing at ${relativePath}`);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as ShotstackWorkPacket;
}

export function loadShotstackWorkPacketV1(repoRoot: string): ShotstackWorkPacket {
  return loadShotstackWorkPacket(repoRoot, VIDEO_INTEGRATION_WORK_PACKET_V1_REL);
}

export function loadShotstackWorkPacketV2(repoRoot: string): ShotstackWorkPacket {
  return loadShotstackWorkPacket(repoRoot, VIDEO_INTEGRATION_WORK_PACKET_V2_REL);
}

export function assertShotstackPacketAssetsExist(
  repoRoot: string,
  packet: ShotstackWorkPacket,
): { ok: boolean; missing: readonly string[] } {
  const missing: string[] = [];
  for (const scene of packet.scenes) {
    if (!existsSync(path.join(repoRoot, scene.relativePath))) {
      missing.push(scene.relativePath);
    }
    if (
      scene.overlayRelativePath &&
      !existsSync(path.join(repoRoot, scene.overlayRelativePath))
    ) {
      missing.push(scene.overlayRelativePath);
    }
  }
  if (packet.voiceArtifact?.relativePath) {
    if (!existsSync(path.join(repoRoot, packet.voiceArtifact.relativePath))) {
      missing.push(packet.voiceArtifact.relativePath);
    }
  }
  if (packet.musicArtifact?.relativePath) {
    if (!existsSync(path.join(repoRoot, packet.musicArtifact.relativePath))) {
      missing.push(packet.musicArtifact.relativePath);
    }
    if (
      packet.musicArtifact.rightsRecordRelativePath &&
      !existsSync(path.join(repoRoot, packet.musicArtifact.rightsRecordRelativePath))
    ) {
      missing.push(packet.musicArtifact.rightsRecordRelativePath);
    }
  }
  return { ok: missing.length === 0, missing };
}

export function gateShotstackWorkPacket(packet: ShotstackWorkPacket): {
  ok: boolean;
  findings: string[];
} {
  return validateShotstackWorkPacket(packet);
}
